import { useState } from "react";
import { Check, ExternalLink, ShoppingBag, Truck, Wrench } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import ProductArt, { PRODUCT_TILE } from "@/components/support/ProductArt";
import { DemoBadge } from "@/components/support/ProductCard";
import { SupportShell } from "@/components/support/SupportShell";
import { Button } from "@/components/ui/button";
import { tr, useLang, useT } from "@/lib/i18n";
import { SUPPORT } from "@/lib/i18n/support";
import { findProduct, formatThb, isPurchasable } from "@/lib/support/catalog";
import { isSupportDemo } from "@/lib/support/flags";
import { productStatusText, stockText } from "@/lib/support/productText";
import { useBag } from "@/stores/bagStore";
import { cn } from "@/lib/utils";

/** /shop/:slug: one item. Only items with a real price and stock get an "add to bag" button. */
export default function ShopProductPage() {
  const { slug } = useParams();
  const t = useT(SUPPORT);
  const lang = useLang();
  const product = findProduct(slug, isSupportDemo());
  const add = useBag((s) => s.add);
  const [variantId, setVariantId] = useState<string | null>(product?.variants?.[0]?.id ?? null);
  const [notice, setNotice] = useState<"added" | "limit" | null>(null);
  const back = { to: "/shop", label: t("backToShop") };

  if (!product) {
    return (
      <SupportShell title="Shop" path="/shop" back={back} bag noindex>
        <p className="py-16 text-center text-muted-foreground thai-body">{t("productMissing")}</p>
      </SupportShell>
    );
  }

  const variant = product.variants?.find((v) => v.id === variantId) ?? product.variants?.[0] ?? null;
  const canBuy = isPurchasable(product);

  return (
    <SupportShell title={product.name} path={`/shop/${product.slug}`} description={tr(product.line, undefined, lang)} back={back} bag>
      <div className="grid gap-8 md:grid-cols-2 md:gap-12">
        <figure>
          <div className={cn("aspect-[4/3] overflow-hidden rounded-3xl", PRODUCT_TILE)}>
            <ProductArt art={product.art} color={variant?.swatch} className="p-6" />
          </div>
          <figcaption className="mt-2 text-xs text-muted-foreground thai-body">{t("conceptVisual")}</figcaption>
        </figure>

        <div>
          {product.demo ? <DemoBadge /> : null}
          <h1 className="mt-2 font-display text-4xl font-semibold leading-tight tracking-tight">{product.name}</h1>
          <p className="mt-2 text-[15px] text-muted-foreground thai-body">{tr(product.line, undefined, lang)}</p>

          <p className="mt-5 flex items-center gap-2 text-lg font-medium">
            {product.status === "in_development" ? <Wrench className="h-4 w-4" strokeWidth={1.5} aria-hidden /> : null}
            {canBuy ? formatThb(product.priceThb) : productStatusText(product, lang)}
            {canBuy ? (
              <span className="text-sm font-normal text-muted-foreground thai-body">
                {stockText(product.stock, lang)}
              </span>
            ) : null}
          </p>

          {product.variants?.length ? (
            <fieldset className="mt-6">
              <legend className="text-sm text-muted-foreground">
                {t("colour")}
                {variant ? <span className="ml-2 text-foreground">{tr(variant.label, undefined, lang)}</span> : null}
              </legend>
              <div className="mt-2 flex gap-2">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    aria-label={tr(v.label, undefined, lang)}
                    aria-pressed={variant?.id === v.id}
                    onClick={() => {
                      setVariantId(v.id);
                      setNotice(null);
                    }}
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-full border transition-colors",
                      variant?.id === v.id ? "border-foreground" : "border-transparent hover:border-border",
                    )}
                  >
                    <span className="h-7 w-7 rounded-full border border-foreground/15" style={{ backgroundColor: v.swatch }} />
                  </button>
                ))}
              </div>
            </fieldset>
          ) : null}

          <div className="mt-7 flex flex-wrap items-center gap-3">
            {canBuy ? (
              <Button
                size="lg"
                onClick={() => setNotice(add({ slug: product.slug, variantId: variant?.id ?? null, qty: 1 }) ? "added" : "limit")}
              >
                <ShoppingBag className="mr-2 h-4 w-4" strokeWidth={1.5} aria-hidden />
                {t("addToBag")}
              </Button>
            ) : (
              <Button size="lg" disabled>
                {t("notForSale")}
              </Button>
            )}
            {product.externalUrl ? (
              <Button asChild size="lg" variant="outline">
                <a href={product.externalUrl} target="_blank" rel="noopener noreferrer">
                  {t("tryPickerApp")}
                  <ExternalLink className="ml-2 h-4 w-4" strokeWidth={1.5} aria-hidden />
                </a>
              </Button>
            ) : null}
          </div>

          <p role="status" className="mt-3 min-h-6 text-sm thai-body">
            {notice === "added" ? (
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-4 w-4 text-success" strokeWidth={2} aria-hidden />
                {t("added")}
                <Link to="/shop/bag" className="ml-1 underline underline-offset-4">
                  {t("viewBag")}
                </Link>
              </span>
            ) : null}
            {notice === "limit" ? <span className="text-muted-foreground">{t("bagLimit")}</span> : null}
          </p>

          {canBuy ? (
            <p className="mt-2 flex items-center gap-2 text-[13px] text-muted-foreground thai-body">
              <Truck className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              {t("shippingNote")}
            </p>
          ) : null}

          {product.specs?.length ? (
            <dl className="mt-8 divide-y divide-border border-y border-border text-sm">
              {product.specs.map((s) => (
                <div key={s.label.en} className="flex justify-between gap-4 py-3">
                  <dt className="text-muted-foreground thai-body">{tr(s.label, undefined, lang)}</dt>
                  <dd className="text-right thai-body">{tr(s.value, undefined, lang)}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      </div>
    </SupportShell>
  );
}
