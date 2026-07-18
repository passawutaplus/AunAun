import { useEffect, useRef, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { CurrencyMenu } from "@/components/payments/PriceCurrencySelect";
import {
  convertFxToThb,
  convertThbToFx,
  readPortfolioFxCurrency,
  writePortfolioFxCurrency,
  type PortfolioFxCurrency,
} from "@/lib/payments/fxDaily";
import { useFxRates } from "@/hooks/useFxRates";

type Props = {
  showPrice: boolean;
  onShowPriceChange: (v: boolean) => void;
  /** THB string stored in editor state. */
  price: string;
  onPriceChange: (v: string) => void;
};

/** Digits only, optional single decimal (for USD/EUR etc.). */
function sanitizeAmountInput(raw: string, allowDecimal: boolean): string {
  let s = raw.replace(/[^\d.]/g, "");
  if (!allowDecimal) return s.replace(/\./g, "");
  const dot = s.indexOf(".");
  if (dot === -1) return s;
  return s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, "").slice(0, 2);
}

function thbToDisplayString(
  thbRaw: string,
  currency: PortfolioFxCurrency,
  rates: Parameters<typeof convertThbToFx>[2],
): string {
  if (!thbRaw.trim()) return "";
  const thb = Number(thbRaw);
  if (!Number.isFinite(thb)) return "";
  if (currency === "THB") return String(Math.round(thb));
  const converted = convertThbToFx(thb, currency, rates);
  if (currency === "JPY") return String(Math.round(converted));
  return String(Math.round(converted * 100) / 100);
}

function displayToThbString(
  displayRaw: string,
  currency: PortfolioFxCurrency,
  rates: Parameters<typeof convertFxToThb>[2],
): string {
  const trimmed = displayRaw.trim();
  if (!trimmed || trimmed === ".") return "";
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return "";
  return String(Math.max(0, Math.round(convertFxToThb(n, currency, rates))));
}

/**
 * Starting price — persist THB only.
 * Local typing is never rewritten mid-keystroke; convert on blur / currency change.
 */
export default function StartingPriceField({
  showPrice,
  onShowPriceChange,
  price,
  onPriceChange,
}: Props) {
  const { data: fx } = useFxRates();
  const [currency, setCurrency] = useState<PortfolioFxCurrency>(() =>
    readPortfolioFxCurrency("THB"),
  );
  const [displayInput, setDisplayInput] = useState("");
  const focusedRef = useRef(false);
  const ratesRef = useRef(fx?.rates);
  ratesRef.current = fx?.rates;

  // Hydrate / resync from parent when not focused.
  useEffect(() => {
    if (focusedRef.current) return;
    setDisplayInput(thbToDisplayString(price, currency, ratesRef.current));
  }, [price, currency, fx?.asOf]);

  const pickCurrency = (next: PortfolioFxCurrency) => {
    const thbStr = displayToThbString(displayInput, currency, fx?.rates);
    onPriceChange(thbStr);
    writePortfolioFxCurrency(next);
    setCurrency(next);
    setDisplayInput(thbToDisplayString(thbStr, next, fx?.rates));
  };

  const onDisplayChange = (raw: string) => {
    const next = sanitizeAmountInput(raw, currency !== "THB" && currency !== "JPY");
    setDisplayInput(next);
  };

  const onBlur = () => {
    focusedRef.current = false;
    const thbStr = displayToThbString(displayInput, currency, fx?.rates);
    onPriceChange(thbStr);
    setDisplayInput(thbToDisplayString(thbStr, currency, fx?.rates));
  };

  // Live preview of THB from what the user is typing (not stale parent).
  const previewThb = displayToThbString(displayInput, currency, fx?.rates);
  const previewThbNum = Number(previewThb);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor="show-price"
          className="text-xs font-semibold text-muted-foreground uppercase cursor-pointer inline-flex items-center gap-1"
        >
          ราคาเริ่มต้นงานนี้
          <CurrencyMenu
            value={currency}
            onChange={pickCurrency}
            variant="label"
            asOf={fx?.asOf}
            className="normal-case"
          />
        </label>
        <Switch
          id="show-price"
          checked={showPrice}
          onCheckedChange={onShowPriceChange}
          className="shrink-0"
        />
      </div>
      {showPrice ? (
        <div className="space-y-1.5">
          <Input
            id="project-starting-price"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={displayInput}
            onChange={(e) => onDisplayChange(e.target.value)}
            onFocus={() => {
              focusedRef.current = true;
            }}
            onBlur={onBlur}
            placeholder={currency === "THB" ? "เช่น 3500" : "เช่น 100"}
          />
          {currency !== "THB" ? (
            <p className="text-[11px] text-muted-foreground tabular-nums">
              {Number.isFinite(previewThbNum) && previewThbNum > 0
                ? `บันทึกเป็น ฿${previewThbNum.toLocaleString("th-TH")}`
                : "พิมพ์จำนวนในสกุลที่เลือก — จะแปลงเป็นบาทเมื่อออกจากช่อง"}
              {fx?.asOf && fx.asOf !== "fallback" ? ` · อัตรา ${fx.asOf}` : ""}
              {" · ชำระจริงเป็นบาท"}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
