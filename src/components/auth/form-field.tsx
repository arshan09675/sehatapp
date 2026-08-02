import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Labeled input with inline validation errors, wired for accessibility
 * (aria-invalid + aria-describedby). Server-driven errors come from the
 * action state of useActionState.
 */
export function FormField({
  id,
  label,
  hint,
  errors,
  ...inputProps
}: React.ComponentProps<typeof Input> & {
  id: string;
  label: string;
  hint?: string;
  errors?: string[];
}) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const hasError = !!errors?.length;

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        aria-invalid={hasError || undefined}
        aria-describedby={hasError ? errorId : hint ? hintId : undefined}
        {...inputProps}
      />
      {hint && !hasError && (
        <p id={hintId} className="text-muted-foreground text-xs">
          {hint}
        </p>
      )}
      {hasError && (
        <p id={errorId} className="text-destructive text-xs">
          {errors[0]}
        </p>
      )}
    </div>
  );
}
