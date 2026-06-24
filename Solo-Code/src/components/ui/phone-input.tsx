import * as React from "react";
import { Input } from "@/components/ui/input";

interface PhoneInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type"
> {
  value: string | null | undefined;
  onChange: (value: string) => void;
}

/**
 * PhoneInput — auto-format เบอร์โทรไทย: 08X-XXX-XXXX หรือ 0X-XXXX-XXXX
 * เก็บเป็น string แบบมีขีดให้แสดงสวย, รับ paste และตัวเลขล้วนได้
 */
function formatThaiPhone(input: string): string {
  const digits = input.replace(/\D/g, "").slice(0, 10);
  if (digits.length === 0) return "";
  // มือถือ 10 หลัก 0XX-XXX-XXXX
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value, onChange, ...rest }, ref) => {
    const display = formatThaiPhone(value ?? "");
    return (
      <Input
        {...rest}
        ref={ref}
        type="tel"
        inputMode="tel"
        value={display}
        onChange={(e) => onChange(formatThaiPhone(e.target.value))}
      />
    );
  },
);
PhoneInput.displayName = "PhoneInput";
