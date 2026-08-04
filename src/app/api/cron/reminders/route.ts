import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import {
  minutesFromEnv,
  reminderWindow,
  sendDueReminders,
  DEFAULT_LEAD_MINUTES,
  DEFAULT_WINDOW_MINUTES,
} from "@/lib/notify";

/**
 * Reminder sweep. Sends the ~3h-ahead reminder to both the patient and the
 * doctor for every appointment falling in this run's window.
 *
 * Scheduled hourly from vercel.json. Vercel Cron issues a GET and attaches
 * `Authorization: Bearer $CRON_SECRET` when that variable is set, so the route
 * needs no session — which is just as well, since there is no user here and
 * lib/notify reads through the service-role client.
 *
 * NOTE: Vercel's Hobby plan caps cron jobs at one run per day, which would
 * leave this catching a single hour's worth of appointments. docs/NOTIFICATIONS.md
 * covers driving the same URL from Supabase pg_cron or an external scheduler
 * instead; nothing in this file changes either way.
 *
 * Running it twice over the same window is safe — see sendDueReminders.
 */

// The sweep is a handful of queries plus one send per party. 60s is Vercel's
// Hobby ceiling and far more than this needs.
export const maxDuration = 60;

function authorized(request: NextRequest, secret: string): boolean {
  const header = request.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);
  // timingSafeEqual throws on a length mismatch, so check that first. Leaking
  // the token's length is unavoidable and harmless; leaking a prefix is not.
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Refuse rather than run unauthenticated: this endpoint reads every
    // patient's appointments and spends real money once a provider is wired.
    return NextResponse.json(
      { error: "CRON_SECRET is not configured." },
      { status: 500 },
    );
  }

  if (!authorized(request, secret)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const window = reminderWindow(
    new Date(),
    minutesFromEnv(process.env.REMINDER_LEAD_MINUTES, DEFAULT_LEAD_MINUTES),
    minutesFromEnv(process.env.REMINDER_WINDOW_MINUTES, DEFAULT_WINDOW_MINUTES),
  );

  try {
    const run = await sendDueReminders(window);
    const summary = {
      ...run,
      from: window.from.toISOString(),
      to: window.to.toISOString(),
    };
    // Surfaces in the Vercel cron log, where the response body is not kept.
    console.info("[notify:cron] reminders", summary);
    return NextResponse.json(summary);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    console.error("[notify:cron] reminders failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
