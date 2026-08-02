import Image from "next/image";

import { cn } from "@/lib/utils";

/** Doctor photo thumbnail with an initials fallback. */
export function DoctorAvatar({
  photoUrl,
  name,
  size = 36,
  className,
}: {
  photoUrl: string | null;
  name: string;
  size?: number;
  className?: string;
}) {
  if (photoUrl) {
    return (
      <Image
        src={photoUrl}
        alt={`Photo of ${name}`}
        width={size}
        height={size}
        className={cn("rounded-full object-cover", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <span
      aria-hidden
      className={cn(
        "bg-muted text-muted-foreground inline-flex items-center justify-center rounded-full text-xs font-medium",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {initials || "?"}
    </span>
  );
}
