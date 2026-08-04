/**
 * The notification vocabulary: channels, template ids, and the driver contract.
 *
 * Kept free of imports so both halves can depend on it without a cycle —
 * templates.ts renders into these shapes, drivers consume them, and notify.ts
 * sits in the middle.
 */

/** Mirrors the channel CHECK on the notifications table (0001_init.sql:125). */
export type NotificationChannel = "sms" | "whatsapp" | "email";

export const TEMPLATE_IDS = [
  "booking_requested_patient",
  "booking_requested_doctor",
  "booking_confirmed_patient",
  "booking_cancelled_patient",
  "booking_cancelled_doctor",
  "reminder_patient",
  "reminder_doctor",
] as const;

export type TemplateId = (typeof TEMPLATE_IDS)[number];

/**
 * Substitutions for one message.
 *
 * Strings only, deliberately: WhatsApp Cloud API template parameters are
 * positional strings, so anything richer would not survive that driver.
 */
export type TemplateVariables = Record<string, string>;

export type RenderedTemplate = {
  /** Free text, ready to send. */
  body: string;
  /** The same content unrendered, for providers that take structured params. */
  variables: TemplateVariables;
};

export type NotificationMessage = RenderedTemplate & {
  /** E.164 phone, or an email address on the email channel. */
  to: string;
  template: TemplateId;
};

export type SendResult =
  { ok: true; providerId?: string } | { ok: false; error: string };

/**
 * What a provider must implement. One driver per channel.
 *
 * An SMS driver sends `body` and ignores `variables`; a WhatsApp driver sends
 * `template` + `variables` and ignores `body`, because the Cloud API does not
 * accept free text for business-initiated messages. Both shapes travel on every
 * message so neither templates.ts nor any call site changes when a driver is
 * added — see docs/NOTIFICATIONS.md.
 */
export interface NotificationDriver {
  readonly channel: NotificationChannel;
  /** Appears in the notifications log and the dev console prefix. */
  readonly name: string;
  send(message: NotificationMessage): Promise<SendResult>;
}

/**
 * The result of one send attempt.
 * - `sent`    — the driver accepted it; a row is logged with status='sent'.
 * - `skipped` — an equivalent send is already queued or sent; nothing logged.
 * - `failed`  — no destination, or the driver rejected it; logged as 'failed'.
 */
export type NotifyOutcome = "sent" | "skipped" | "failed";
