import { OBJECT_EDITIONS, SHOP_SALE_OPTIONS, type ObjectEdition, type ObjectFulfillment, type ObjectPriceSort } from "@/lib/objects/taxonomy";
import { useObjectCatalogStore } from "@/stores/objectCatalogStore";
import { cn } from "@/lib/utils";

const selectClass =
  "h-8 rounded-md border bg-card px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const SALE_PILLS: { id: ObjectFulfillment | "any"; label: string }[] = [
  { id: "any", label: "ทั้งหมด" },
  ...SHOP_SALE_OPTIONS,
];

const PRICE_SORTS: { id: ObjectPriceSort; label: string }[] = [
  { id: "default", label: "จัดลำดับตาม" },
  { id: "low", label: "ราคาต่ำสุด" },
  { id: "high", label: "ราคาสูงสุด" },
];

function SalePills({
  value,
  onChange,
}: {
  value: ObjectFulfillment | "any";
  onChange: (value: ObjectFulfillment | "any") => void;
}) {
  return (
    <div
      role="group"
      aria-label="ได้ของเมื่อไร"
      className="inline-flex w-max max-w-full items-center rounded-full border border-border bg-card p-0.5"
    >
      {SALE_PILLS.map((item) => {
        const active = value === item.id;
        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(item.id)}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active ? "bg-foreground text-background" : "text-foreground/75 hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

/** Shared object filters — full panel in the catalog, one line in the scrolled bar. */
export default function ObjectFilterFields({ compact = false }: { compact?: boolean }) {
  const fulfillment = useObjectCatalogStore((s) => s.fulfillment);
  const edition = useObjectCatalogStore((s) => s.edition);
  const priceSort = useObjectCatalogStore((s) => s.priceSort);
  const setFulfillment = useObjectCatalogStore((s) => s.setFulfillment);
  const setEdition = useObjectCatalogStore((s) => s.setEdition);
  const setPriceSort = useObjectCatalogStore((s) => s.setPriceSort);

  const salePills = <SalePills value={fulfillment} onChange={setFulfillment} />;

  const editionSelect = (
    <select
      aria-label="Editions"
      className={selectClass}
      value={edition}
      onChange={(event) => setEdition(event.target.value as ObjectEdition | "any")}
    >
      <option value="any">ทั้งหมด</option>
      {OBJECT_EDITIONS.map((item) => (
        <option key={item.id} value={item.id}>{item.label}</option>
      ))}
    </select>
  );

  const sortSelect = (
    <select
      aria-label="จัดลำดับ"
      className={selectClass}
      value={priceSort}
      onChange={(event) => setPriceSort(event.target.value as ObjectPriceSort)}
    >
      {PRICE_SORTS.map((item) => (
        <option key={item.id} value={item.id}>{item.label}</option>
      ))}
    </select>
  );

  if (compact) {
    return (
      <div className="flex w-full flex-wrap items-center justify-center gap-x-5 gap-y-2">
        {salePills}
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Editions
          {editionSelect}
        </label>
        {sortSelect}
      </div>
    );
  }

  return (
    <div className="grid w-full gap-3 pb-1 sm:grid-cols-3">
      <div className="grid gap-1">
        <p className="text-xs text-muted-foreground">ได้ของเมื่อไร</p>
        {salePills}
      </div>
      <label className="grid gap-1 text-xs text-muted-foreground">
        Editions
        {editionSelect}
      </label>
      <label className="grid gap-1 text-xs text-muted-foreground">
        จัดลำดับ
        {sortSelect}
      </label>
    </div>
  );
}
