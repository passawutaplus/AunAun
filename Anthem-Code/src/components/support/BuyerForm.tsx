import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { FieldError } from "@/components/ui/FieldError";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/lib/i18n";
import { SUPPORT } from "@/lib/i18n/support";
import { BUYER_LIMITS, buyerFieldId, type BuyerDetails, type BuyerErrors, type BuyerField } from "@/lib/support/orderForm";

type Props = {
  value: BuyerDetails;
  errors: BuyerErrors;
  onChange: (next: BuyerDetails) => void;
};

/** Who the order goes to. Held in memory only: never written to this browser's storage. */
export function BuyerForm({ value, errors, onChange }: Props) {
  const t = useT(SUPPORT);
  const set = <K extends keyof BuyerDetails>(key: K, v: string) => onChange({ ...value, [key]: v });
  const errorText: Record<BuyerField, string> = { name: t("eBName"), phone: t("eBPhone"), address: t("eBAddress") };
  const invalid = (name: BuyerField) =>
    errors[name] ? { "aria-invalid": true as const, "aria-describedby": `${buyerFieldId(name)}-error` } : {};

  const field = (name: keyof BuyerDetails, label: string, required: boolean, control: ReactNode) => (
    <div>
      <label htmlFor={buyerFieldId(name)} className="mb-1.5 block text-sm thai-body">
        {label}
        {required ? <span aria-hidden className="ml-0.5 text-brand">*</span> : null}
      </label>
      {control}
      {name in errors ? (
        <FieldError id={`${buyerFieldId(name)}-error`} message={errorText[name as BuyerField]} className="mt-1.5" />
      ) : null}
    </div>
  );

  return (
    <div className="rounded-3xl bg-card p-6">
      <h2 className="font-display text-xl font-semibold">Shipping</h2>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        {field(
          "name",
          t("bName"),
          true,
          <Input
            id={buyerFieldId("name")}
            className="h-12 bg-background"
            autoComplete="name"
            maxLength={BUYER_LIMITS.name}
            value={value.name}
            onChange={(e) => set("name", e.target.value)}
            {...invalid("name")}
          />,
        )}
        {field(
          "phone",
          t("bPhone"),
          true,
          <Input
            id={buyerFieldId("phone")}
            type="tel"
            inputMode="tel"
            className="h-12 bg-background"
            autoComplete="tel"
            maxLength={BUYER_LIMITS.phone}
            value={value.phone}
            onChange={(e) => set("phone", e.target.value)}
            {...invalid("phone")}
          />,
        )}
        <div className="sm:col-span-2">
          {field(
            "address",
            t("bAddress"),
            true,
            <Textarea
              id={buyerFieldId("address")}
              rows={3}
              className="bg-background"
              autoComplete="street-address"
              maxLength={BUYER_LIMITS.address}
              value={value.address}
              onChange={(e) => set("address", e.target.value)}
              {...invalid("address")}
            />,
          )}
        </div>
        {field(
          "contact",
          t("bContact"),
          false,
          <Input
            id={buyerFieldId("contact")}
            className="h-12 bg-background"
            autoComplete="off"
            maxLength={BUYER_LIMITS.contact}
            value={value.contact}
            onChange={(e) => set("contact", e.target.value)}
          />,
        )}
        {field(
          "note",
          t("bNote"),
          false,
          <Input
            id={buyerFieldId("note")}
            className="h-12 bg-background"
            autoComplete="off"
            maxLength={BUYER_LIMITS.note}
            value={value.note}
            onChange={(e) => set("note", e.target.value)}
          />,
        )}
      </div>
      <p className="mt-4 text-[13px] text-muted-foreground thai-body">
        {t("shipOnly")}
        <span> · </span>
        <Link to="/legal/privacy" className="underline underline-offset-4">
          {t("privacy")}
        </Link>
      </p>
    </div>
  );
}

export default BuyerForm;
