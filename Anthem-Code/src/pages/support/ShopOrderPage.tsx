import { CircleCheck } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { SupportShell, Title } from "@/components/support/SupportShell";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { SUPPORT } from "@/lib/i18n/support";
import { findDemoOrder } from "@/lib/support/bag";
import { formatThb } from "@/lib/support/catalog";

/** /shop/order/:ref: the receipt of a test order (kept in this browser tab only). */
export default function ShopOrderPage() {
  const { ref } = useParams();
  const t = useT(SUPPORT);
  const order = findDemoOrder(ref);

  return (
    <SupportShell title="Order" path="/shop" back={{ to: "/shop", label: t("backToShop") }} noindex>
      {!order ? (
        <p className="py-16 text-center text-muted-foreground thai-body">{t("orderMissing")}</p>
      ) : (
        <div className="mx-auto max-w-xl">
          <CircleCheck className="h-8 w-8 text-success" strokeWidth={1.5} aria-hidden />
          <Title className="mt-4">
            Order <em>received.</em>
          </Title>
          <p className="mt-3 text-[15px] text-muted-foreground thai-body">{t("orderLine")}</p>

          <section className="mt-8 rounded-3xl bg-card p-6">
            <p className="flex justify-between gap-4 text-sm">
              <span className="text-muted-foreground thai-body">{t("orderRef")}</span>
              <span className="font-medium tabular-nums">{order.ref}</span>
            </p>
            <ul className="mt-4 divide-y divide-border border-y border-border text-sm">
              {order.rows.map((r, i) => (
                <li key={i} className="flex justify-between gap-4 py-3">
                  <span className="thai-body">
                    {r.name}
                    {r.variant ? <span className="text-muted-foreground"> · {r.variant}</span> : null}
                    <span className="text-muted-foreground"> × {r.qty}</span>
                  </span>
                  <span>{formatThb(r.lineThb)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground thai-body">{t("shipping")}</dt>
                <dd>{formatThb(order.shippingThb)}</dd>
              </div>
              <div className="flex justify-between text-base font-semibold">
                <dt className="thai-body">{t("total")}</dt>
                <dd>{formatThb(order.totalThb)}</dd>
              </div>
            </dl>
            <p className="mt-5 rounded-2xl bg-muted px-4 py-3 text-[13px] text-muted-foreground thai-body">{t("orderDemo")}</p>
          </section>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/shop">{t("backToShop")}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/support">{t("backToSupport")}</Link>
            </Button>
          </div>
        </div>
      )}
    </SupportShell>
  );
}
