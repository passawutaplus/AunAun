import { Wrench } from "lucide-react";
import { Link } from "react-router-dom";
import ProductArt, { PRODUCT_TILE } from "@/components/support/ProductArt";
import { cn } from "@/lib/utils";
import { useLang, useT } from "@/lib/i18n";
import { SUPPORT } from "@/lib/i18n/support";
import type { ShopProduct } from "@/lib/support/catalog";
import { productStatusText } from "@/lib/support/productText";

export function DemoBadge() {
  const t = useT(SUPPORT);
  return (
    <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
      {t("demoBadge")}
    </span>
  );
}

export function ProductCard({ product }: { product: ShopProduct }) {
  const lang = useLang();
  const colour = product.variants?.[0]?.swatch;
  return (
    <Link
      to={`/shop/${product.slug}`}
      className="group flex flex-col rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div
        className={cn(
          "relative aspect-[4/3] overflow-hidden rounded-2xl transition-transform duration-300 group-hover:-translate-y-0.5 motion-reduce:transition-none",
          PRODUCT_TILE,
        )}
      >
        <ProductArt art={product.art} color={colour} className="p-3" />
        {product.demo ? (
          <span className="absolute left-2.5 top-2.5">
            <DemoBadge />
          </span>
        ) : null}
      </div>
      <h3 className="mt-3 font-display text-base font-semibold leading-tight">{product.name}</h3>
      <p className="mt-1 flex items-center gap-1.5 text-[13px] text-muted-foreground thai-body">
        {product.status === "in_development" ? <Wrench className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} aria-hidden /> : null}
        {productStatusText(product, lang)}
      </p>
    </Link>
  );
}

export default ProductCard;
