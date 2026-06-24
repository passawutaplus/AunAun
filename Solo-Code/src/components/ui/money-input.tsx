import * as React from "react";
import { Input } from "@/components/ui/input";

interface MoneyInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type"
> {
  value: number | null | undefined;
  onChange: (value: number) => void;
}

/**
 * MoneyInput — แสดงตัวเลขพร้อม comma แยกหลักพันขณะพิมพ์
 * เก็บค่าจริงเป็น number, format เฉพาะ display
 */
export const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ value, onChange, className, ...rest }, ref) => {
    const [focused, setFocused] = React.useState(false);
    const [raw, setRaw] = React.useState<string>(value != null ? String(value) : "");

    React.useEffect(() => {
      if (!focused) setRaw(value != null ? String(value) : "");
    }, [value, focused]);

    const display = React.useMemo(() => {
      if (focused) return raw;
      const n = Number(raw);
      if (!raw || Number.isNaN(n)) return "";
      return n.toLocaleString("en-US");
    }, [raw, focused]);

    return (
      <Input
        {...rest}
        ref={ref}
        type="text"
        inputMode="decimal"
        value={display}
        onFocus={(e) => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          rest.onBlur?.(e);
        }}
        onChange={(e) => {
          const cleaned = e.target.value.replace(/[^\d.]/g, "");
          setRaw(cleaned);
          const n = Number(cleaned);
          onChange(Number.isNaN(n) ? 0 : n);
        }}
        className={className}
      />
    );
  },
);
MoneyInput.displayName = "MoneyInput";
