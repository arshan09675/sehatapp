import { cn } from "@/lib/utils";

/**
 * The reference's `.toggle`: 40×24 track, 18px knob, 16px travel, 150ms.
 * The hidden checkbox is the real control (so it submits with the form and
 * keeps keyboard behaviour); the two spans are painted from `peer-checked`.
 */
export function ToggleSwitch({
  className,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <label className={cn("relative block h-6 w-10 flex-none", className)}>
      <input
        type="checkbox"
        className="peer absolute inset-0 z-[2] m-0 size-full cursor-pointer opacity-0"
        {...props}
      />
      <span
        aria-hidden
        className="peer-checked:bg-brand peer-focus-visible:outline-brand absolute inset-0 rounded-full bg-[#CBD2E0] transition-colors duration-150 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute top-[3px] left-[3px] size-[18px] rounded-full bg-white shadow-[0_1px_2px_rgb(0_0_0/0.2)] transition-transform duration-150 peer-checked:translate-x-4 motion-reduce:transition-none"
      />
    </label>
  );
}
