import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn("font-heading text-[23px] font-bold text-white", className)}
    >
      Sehat<span className="text-[#7CA0FF]">Book</span>
    </span>
  );
}
