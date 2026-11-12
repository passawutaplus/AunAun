import { Minus, Plus, ShoppingBag, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import ProductArt, { PRODUCT_TILE } from "@/components/support/ProductArt";
import { cn } from "@/lib/utils";
import { Eyebrow, SupportShell, Title } from "@/components/support/SupportShell";
import { Button } from "@/components/ui/button";
import { tr, useLang, useT } from "@/lib/i18n";
import { SUPPORT } from "@/lib/i18n/support";
import { placeDemoOrder, summariseBag, type BagRow } from "@/lib/support/bag";
import { formatThb } from "@/lib/support/catalog";
import { isSupportDemo } from "@/lib/support/flags";
import { useBag } from "@/stores/bagStore";

/** /shop/bag: review, change amounts, pay. Paying is a test step until real checkout is connected. */
export default function ShopBagPage() {
  const t = useT(SUPPORT);
  const lang = useLang();
  const navigate = useNavigate();
  const demo = isSupportDemo();
  const { lines, setQty, remove, clear } = useBag();
  const bag = summariseBag(lines, demo);

  const variantOf = (row: BagRow) => row.product?.variants?.find((v) => v.id === row.variantId) ?? null;
  const variantLabel = (row: BagRow) => {
    const v = variantOf(row);
    return v ? tr(v.label, undefined, lang) : null;
  };

  const pay = () => {
    const order = placeDemoOrder(bag, variantLabel);
    if (!order) return;
    clear();
    navigate(`/shop/order/${order.ref}`);
  };

  const problemText = (row: BagRow) =>
    row.problem === "gone"
      ? t("problemGone")
      : row.problem === "sold_out"
        ? t("problemSoldOut")
        : row.problem === "not_enough"
          ? t("problemNotEnough", { n: row.product?.stock ?? 0 })
          : null;

  return (
    <SupportShell title="Bag" path="/shop/bag" back={{ to: "/shop", label: t("keepShopping") }} noindex>
      <Eyebrow>Shop</Eyebrow>
      <Title className="mt-3">
        Your <em>bag.</em>
      </Title>

      {bag.rows.length === 0 ? (
        <div className="py-16 text-center">
          <ShoppingBag className="mx-auto h-8 w-8 text-muted-foreground" strokeWidth={1.5} aria-hidden />
          <p className="mt-4 text-muted-foreground thai-body">{t("bagEmpty")}</p>
          <Button asChild className="mt-6">
            <Link to="/shop">{t("goShop")}</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem] lg:items-start">
          <ul className="divide-y divide-border border-y border-border">
            {bag.rows.map((row) => {
              const name = row.product?.name ?? row.slug;
              return (
                <li key={row.key} className="flex gap-4 py-4">
                  <div className={cn("h-20 w-24 shrink-0 overflow-hidden rounded-xl", PRODUCT_TILE)}>
                    {row.product ? <ProductArt art={row.product.art} color={variantOf(row)?.swatch} className="p-1" /> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-display font-semibold leading-tight">
                          {row.product ? <Link to={`/shop/${row.slug}`}>{name}</Link> : name}
                        </p>
                        {variantLabel(row) ? (
                          <p className="mt-0.5 text-[13px] text-muted-foreground thai-body">{variantLabel(row)}</p>
                        ) : null}
                      </div>
                      <p className="shrink-0 text-sm font-medium">{formatThb(row.lineThb)}</p>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div role="group" aria-label={`${t("qty")} ${name}`} className="inline-flex items-center rounded-full border border-border">
                        <button
                          type="button"
                          aria-label={t("decrease")}
                          onClick={() => setQty(row.key, row.qty - 1)}
                          className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted"
                        >
                          <Minus className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                        </button>
                        <span aria-live="polite" className="w-6 text-center text-sm tabular-nums">
                          {row.qty}
                        </span>
                        <button
                          type="button"
                          aria-label={t("increase")}
                          disabled={row.qty >= row.maxQty}
                          onClick={() => setQty(row.key, row.qty + 1)}
                          className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted disabled:opacity-30"
                        >
                          <Plus className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(row.key)}
                        className="inline-flex min-h-10 items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                        {t("remove")}
                      </button>
                    </div>
                    {row.problem ? (
                      <p role="alert" className="mt-2 text-[13px] text-destructive thai-body">
                        {problemText(row)}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>

          <section aria-label="Summary" className="rounded-3xl bg-card p-6">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground thai-body">{t("subtotal")}</dt>
                <dd>{formatThb(bag.subtotalThb)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground thai-body">{t("shipping")}</dt>
                <dd>{formatThb(bag.shippingThb)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-3 text-base font-semibold">
                <dt className="thai-body">{t("total")}</dt>
                <dd>{formatThb(bag.totalThb)}</dd>
              </div>
            </dl>
            {demo ? (
              <Button size="lg" className="mt-6 w-full" disabled={!bag.canCheckout} onClick={pay}>
                {t("payDemo")}
              </Button>
            ) : (
              <Button size="lg" className="mt-6 w-full" disabled>
                {t("payClosed")}
              </Button>
            )}
            {demo ? <p className="mt-3 text-center text-xs text-muted-foreground thai-body">{t("demoNote")}</p> : null}
          </section>
        </div>
      )}
    </SupportShell>
  );
}
