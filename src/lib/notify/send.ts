import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

import { createConsoleDriver } from "./drivers/console";
import { renderTemplate, type AppointmentContext } from "./templates";
import type {
  NotificationDriver,
  NotifyOutcome,
  SendResult,
  TemplateId,
} from "./types";

/**
 * The send pipeline: render, claim, drive, record.
 *
 *   render template
 *     -> resolve destination   (none: log 'failed', stop)
 *     -> CLAIM a notifications row as 'queued'
 *          (unique violation: an equivalent send already exists, stop)
 *     -> driver.send()
 *     -> UPDATE the claimed row to 'sent' or 'failed'
 *
 * Claiming *before* sending is what makes the reminder cron idempotent. The
 * notifications_once index (0006) is taken at insert time, so two overlapping
 * runs cannot both reach the driver — the guarantee lives in Postgres, not in
 * application logic that a retry could race.
 *
 * Everything is written with createAdminClient(). That is forced rather than
 * chosen: notifications has a single SELECT policy (notif_own_read,
 * 0001_init.sql:346) and no INSERT or UPDATE policy at all, so the anon client
 * writes nothing and reports no error. The same applies to reading the other
 * party's profiles.phone, which profiles_select_own hides.
 *
 * send() never throws. A notification is not worth failing a booking over.
 */

/** Postgres unique_violation — here, notifications_once rejecting a re-claim. */
const UNIQUE_VIOLATION = "23505";

/** error is text, but there is no reason to store a provider's stack trace. */
const ERROR_LIMIT = 500;

type DriverFactory = () => NotificationDriver;

/**
 * Adding a provider is one file plus one line here. Nothing downstream of this
 * map knows which driver is configured — see docs/NOTIFICATIONS.md.
 */
const DRIVERS: Record<string, DriverFactory> = {
  console: createConsoleDriver,
};

function resolveDriver(): NotificationDriver {
  const name = process.env.NOTIFY_DRIVER?.trim() || "console";
  const factory = DRIVERS[name];
  if (!factory) {
    throw new Error(
      `Unknown NOTIFY_DRIVER "${name}". Available: ${Object.keys(DRIVERS).join(", ")}.`,
    );
  }
  return factory();
}

export type SendRequest = {
  template: TemplateId;
  /** The recipient's profiles.id — notifications.profile_id. */
  profileId: string;
  /**
   * Where to send. Null when the profile has no phone on file, which is rare
   * (requireRole redirects to /complete-profile) but reachable: the
   * handle_new_user trigger copies auth.users.phone through unvalidated.
   */
  to: string | null;
  appointmentId: string;
  context: AppointmentContext;
};

export async function send(request: SendRequest): Promise<NotifyOutcome> {
  try {
    return await runSend(request);
  } catch (cause) {
    // Reached only if the admin client or the driver registry is misconfigured.
    console.error(
      `[notify] ${request.template} to ${request.profileId} could not be attempted:`,
      cause,
    );
    return "failed";
  }
}

async function runSend(request: SendRequest): Promise<NotifyOutcome> {
  const driver = resolveDriver();
  const { body, variables } = renderTemplate(request.template, request.context);
  const payload = { body, variables };

  const admin = createAdminClient();

  const row = {
    profile_id: request.profileId,
    appointment_id: request.appointmentId,
    channel: driver.channel,
    template: request.template,
    payload,
    to_addr: request.to,
  };

  if (!request.to) {
    // Still logged: BUILD_PLAN's acceptance criterion is that failures are
    // visible in the table, and "we never had a number for them" is the most
    // likely failure in production.
    await admin
      .from("notifications")
      .insert({ ...row, status: "failed", error: "no_destination" });
    return "failed";
  }

  const { data: claimed, error: claimError } = await admin
    .from("notifications")
    .insert({ ...row, status: "queued" })
    .select("id")
    .single();

  if (claimError) {
    if (claimError.code === UNIQUE_VIOLATION) return "skipped";
    console.error(
      `[notify] could not claim ${request.template} for appointment ${request.appointmentId}:`,
      claimError.message,
    );
    return "failed";
  }

  let result: SendResult;
  try {
    result = await driver.send({
      to: request.to,
      template: request.template,
      body,
      variables,
    });
  } catch (cause) {
    result = {
      ok: false,
      error: cause instanceof Error ? cause.message : String(cause),
    };
  }

  await admin
    .from("notifications")
    .update(
      result.ok
        ? {
            status: "sent",
            sent_at: new Date().toISOString(),
            provider_id: result.providerId ?? null,
          }
        : { status: "failed", error: result.error.slice(0, ERROR_LIMIT) },
    )
    .eq("id", claimed.id);

  return result.ok ? "sent" : "failed";
}
