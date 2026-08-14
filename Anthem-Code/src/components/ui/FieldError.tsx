import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  id?: string;
  message?: string | null;
  className?: string;
};

/** Inline field error — place near the control; wire with aria-describedby / aria-invalid. */
export function FieldError({ id, message, className }: Props) {
  if (!message) return null;
  return (
    <p
      id={id}
      role="alert"
      className={cn("flex items-start gap-1 text-xs text-destructive thai-body", className)}
    >
      <CircleAlert className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>{message}</span>
    </p>
  );
}

export default FieldError;
