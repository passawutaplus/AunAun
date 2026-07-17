import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { isDisplayCurrencyEnabled } from "@/lib/aplus1Launch";
import {
  readDisplayCurrencyPreference,
  writeDisplayCurrencyPreference,
} from "@/lib/payments/fxDisplay";
import type { DisplayCurrency } from "@/lib/payments/types";

type Props = {
  value?: DisplayCurrency;
  onChange?: (c: DisplayCurrency) => void;
  className?: string;
};

/** Toggle display currency (THB/USD) — labels only; settlement stays THB. */
export default function DisplayCurrencyToggle({ value, onChange, className }: Props) {
  const enabled = isDisplayCurrencyEnabled();
  const [internal, setInternal] = useState<DisplayCurrency>(() =>
    readDisplayCurrencyPreference("THB"),
  );

  useEffect(() => {
    if (value) setInternal(value);
  }, [value]);

  if (!enabled) return null;

  const current = value ?? internal;

  const set = (c: DisplayCurrency) => {
    writeDisplayCurrencyPreference(c);
    setInternal(c);
    onChange?.(c);
  };

  return (
    <div className={className ?? "inline-flex gap-1 rounded-md border border-border p-0.5 text-xs"}>
      {(["THB", "USD"] as const).map((c) => (
        <Button
          key={c}
          type="button"
          size="sm"
          variant={current === c ? "default" : "ghost"}
          className="h-7 px-2"
          onClick={() => set(c)}
        >
          {c}
        </Button>
      ))}
    </div>
  );
}
