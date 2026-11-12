import { useState } from "react";
import ProductCard from "@/components/support/ProductCard";
import { Eyebrow, Lede, SupportShell, Title } from "@/components/support/SupportShell";
import { useT } from "@/lib/i18n";
import { SUPPORT } from "@/lib/i18n/support";
import { SHOP_CATEGORIES, listProducts, sortForShelf, type ProductCategory } from "@/lib/support/catalog";
import { isSupportDemo } from "@/lib/support/flags";
import { cn } from "@/lib/utils";

/** /shop: everything SAMECOR makes itself. */
export default function ShopPage() {
  const t = useT(SUPPORT);
  const [category, setCategory] = useState<ProductCategory | "all">("all");
  const all = sortForShelf(listProducts(isSupportDemo()));
  const categories = SHOP_CATEGORIES.filter((c) => all.some((p) => p.category === c.id));
  const shown = category === "all" ? all : all.filter((p) => p.category === category);

  const chip = (id: ProductCategory | "all", label: string) => (
    <button
      key={id}
      type="button"
      aria-pressed={category === id}
      onClick={() => setCategory(id)}
      className={cn(
        "min-h-10 rounded-full border px-4 text-sm transition-colors",
        category === id
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-transparent text-foreground hover:bg-muted",
      )}
    >
      {label}
    </button>
  );

  return (
    <SupportShell
      title="Shop"
      path="/shop"
      description={t("shopLine")}
      back={{ to: "/support", label: t("backToSupport") }}
      bag
    >
      <header className="max-w-2xl">
        <Eyebrow>Shop</Eyebrow>
        <Title className="mt-3">
          Made by <em>SAMECOR.</em>
        </Title>
        <Lede>{t("shopLine")}</Lede>
      </header>

      {categories.length > 1 ? (
        <div role="group" aria-label="Category" className="mt-8 flex flex-wrap gap-2">
          {chip("all", t("catAll"))}
          {categories.map((c) => chip(c.id, c.label))}
        </div>
      ) : null}

      <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
        {shown.map((p) => (
          <ProductCard key={p.slug} product={p} />
        ))}
      </div>
    </SupportShell>
  );
}
