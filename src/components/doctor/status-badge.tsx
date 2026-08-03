import {
  STATUS_BADGE_CLASS,
  STATUS_LABEL,
  type AppointmentStatus,
} from "@/lib/appointments";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-[11px] py-1 text-xs font-semibold whitespace-nowrap",
        STATUS_BADGE_CLASS[status],
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
