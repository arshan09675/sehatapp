/**
 * The development driver: prints what would be sent and reports success.
 *
 * This is the first console.* in src/ and it is deliberate — it is a driver's
 * output, not stray debug logging. It exists so the whole pipeline (render →
 * claim → send → log) can be verified end to end before any provider account
 * exists, so it prints everything a real send would carry: recipient, template
 * id, rendered body, and the structured variables a WhatsApp driver would use
 * instead of the body.
 *
 * Encoding and segment count are printed too. They are the difference between
 * a reminder costing one SMS and three, and the cause is usually invisible —
 * one non-GSM-7 character in a name. Better to see it in dev than on a bill.
 */

import { smsMetrics } from "../gsm7";
import type {
  NotificationDriver,
  NotificationMessage,
  SendResult,
} from "../types";

export function createConsoleDriver(): NotificationDriver {
  return {
    channel: "sms",
    name: "console",

    async send(message: NotificationMessage): Promise<SendResult> {
      const { encoding, units, segments } = smsMetrics(message.body);

      // A single call rather than one per line: concurrent sends would
      // otherwise interleave and make the log unreadable.
      console.info(
        [
          `[notify:console] sms -> ${message.to}`,
          `  template  ${message.template}`,
          `  encoding  ${encoding}, ${units} units, ${segments} segment${segments === 1 ? "" : "s"}`,
          `  body      ${message.body}`,
          `  vars      ${JSON.stringify(message.variables)}`,
        ].join("\n"),
      );

      return { ok: true };
    },
  };
}
