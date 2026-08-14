import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { FieldError } from "@/components/ui/FieldError";
import { scorePassword } from "@/lib/passwordStrength";
import { cn } from "@/lib/utils";

type Props = {
  id?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  placeholder?: string;
  autoComplete?: string;
  minLength?: number;
  required?: boolean;
  invalid?: boolean;
  error?: string | null;
  showStrength?: boolean;
  className?: string;
  inputClassName?: string;
};

const STRENGTH_BAR: Record<string, string> = {
  empty: "bg-muted",
  weak: "bg-destructive",
  fair: "bg-amber-500",
  good: "bg-emerald-500/80",
  strong: "bg-emerald-600",
};

export function PasswordField({
  id,
  value,
  onChange,
  onBlur,
  onFocus,
  placeholder = "••••••••",
  autoComplete = "current-password",
  minLength = 8,
  required,
  invalid,
  error,
  showStrength = false,
  className,
  inputClassName,
}: Props) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;
  const strengthId = `${inputId}-strength`;
  const [show, setShow] = useState(false);
  const strength = scorePassword(value);
  const hasError = Boolean(invalid || error);

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="relative">
        <Input
          id={inputId}
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          onFocus={onFocus}
          placeholder={placeholder}
          autoComplete={autoComplete}
          minLength={minLength}
          required={required}
          aria-invalid={hasError || undefined}
          aria-describedby={
            [error ? errorId : null, showStrength ? strengthId : null]
              .filter(Boolean)
              .join(" ") || undefined
          }
          className={cn(
            "h-11 rounded-xl pr-10 bg-background/60 backdrop-blur border-border/60 focus-visible:ring-primary/40",
            hasError && "border-destructive focus-visible:ring-destructive/30",
            inputClassName,
          )}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={show ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {showStrength ? (
        <div id={strengthId} className="space-y-1" aria-live="polite">
          {value ? (
            <div className="flex gap-1 h-1">
              {[1, 2, 3, 4].map((i) => {
                const filled =
                  strength.level === "strong"
                    ? true
                    : strength.level === "good"
                      ? i <= 3
                      : strength.level === "fair"
                        ? i <= 2
                        : i <= 1;
                return (
                  <span
                    key={i}
                    className={cn(
                      "flex-1 rounded-full transition-colors",
                      filled ? STRENGTH_BAR[strength.level] : "bg-muted",
                    )}
                  />
                );
              })}
            </div>
          ) : null}
          <p className="text-[11px] text-muted-foreground">
            {value
              ? `ความแข็งแรง: ${strength.label}${!strength.meetsMinLength ? " — อย่างน้อย 8 ตัว" : ""}`
              : `อย่างน้อย ${minLength} ตัวอักษร · ผสมตัวพิมพ์ใหญ่ ตัวเลข หรือสัญลักษณ์จะแข็งแรงขึ้น`}
          </p>
        </div>
      ) : null}

      <FieldError id={errorId} message={error} />
    </div>
  );
}

export default PasswordField;
