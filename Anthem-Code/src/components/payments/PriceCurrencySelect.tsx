import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFxRates } from "@/hooks/useFxRates";
import {
  PORTFOLIO_FX_CURRENCIES,
  convertThbToFx,
  currencySymbol,
  formatPortfolioMoney,
  readPortfolioFxCurrency,
  writePortfolioFxCurrency,
  type PortfolioFxCurrency,
} from "@/lib/payments/fxDaily";
import { cn } from "@/lib/utils";

type AmountProps = {
  /** Amount in THB (source of truth). */
  amountThb: number;
  className?: string;
  amountClassName?: string;
  /** Compact trigger next to amount (project side panel). */
  variant?: "inline" | "label";
};

/** Display THB amount with currency dropdown — converts for viewing only. */
export function PriceCurrencyAmount({
  amountThb,
  className,
  amountClassName,
  variant = "inline",
}: AmountProps) {
  const { data: fx } = useFxRates();
  const [currency, setCurrency] = useState<PortfolioFxCurrency>(() =>
    readPortfolioFxCurrency("THB"),
  );

  useEffect(() => {
    setCurrency(readPortfolioFxCurrency("THB"));
  }, []);

  const pick = (c: PortfolioFxCurrency) => {
    writePortfolioFxCurrency(c);
    setCurrency(c);
  };

  const converted = convertThbToFx(amountThb, currency, fx?.rates);
  const label = formatPortfolioMoney(converted, currency);

  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      <span className={cn("tabular-nums font-semibold text-primary", amountClassName)}>
        {label}
      </span>
      <CurrencyMenu value={currency} onChange={pick} variant={variant} asOf={fx?.asOf} />
    </span>
  );
}

type MenuProps = {
  value: PortfolioFxCurrency;
  onChange: (c: PortfolioFxCurrency) => void;
  variant?: "inline" | "label";
  asOf?: string;
  className?: string;
};

export function CurrencyMenu({
  value,
  onChange,
  variant = "inline",
  asOf,
  className,
}: MenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        type="button"
        className={cn(
          "inline-flex items-center gap-0.5 rounded-md text-primary outline-none transition-colors",
          "hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary/40",
          variant === "label"
            ? "px-1.5 py-0.5 text-xs font-semibold"
            : "px-1 py-0.5 text-[11px]",
          className,
        )}
        aria-label="เลือกสกุลเงินแสดงผล"
        title={
          asOf && asOf !== "fallback"
            ? `อัตราอ้างอิง ${asOf} — ชำระจริงเป็นบาท`
            : "แปลงเพื่อดูเท่านั้น — ชำระจริงเป็นบาท"
        }
      >
        <span>{currencySymbol(value)}</span>
        <ChevronDown className="h-3 w-3 opacity-80" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[9rem]">
        {PORTFOLIO_FX_CURRENCIES.map((c) => (
          <DropdownMenuItem
            key={c}
            onClick={() => onChange(c)}
            className={cn(c === value && "bg-accent")}
          >
            <span className="w-6 tabular-nums">{currencySymbol(c)}</span>
            <span>{c}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type EditorHintProps = {
  amountThb: number;
  currency: PortfolioFxCurrency;
};

/** ≈ converted amount under the starting-price input. */
export function PriceFxHint({ amountThb, currency }: EditorHintProps) {
  const { data: fx } = useFxRates();
  if (!Number.isFinite(amountThb) || amountThb <= 0 || currency === "THB") return null;
  const converted = convertThbToFx(amountThb, currency, fx?.rates);
  return (
    <p className="text-[11px] text-muted-foreground tabular-nums">
      ≈ {formatPortfolioMoney(converted, currency)}
      {fx?.asOf && fx.asOf !== "fallback" ? (
        <span className="text-muted-foreground/80"> · อัตรา {fx.asOf}</span>
      ) : null}
      <span className="text-muted-foreground/80"> · บันทึกเป็นบาท</span>
    </p>
  );
}
