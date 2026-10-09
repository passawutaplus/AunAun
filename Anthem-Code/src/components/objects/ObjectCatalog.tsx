import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Box, Heart, SlidersHorizontal } from "lucide-react";
import ObjectCard from "@/components/objects/ObjectCard";
import ObjectFilterFields from "@/components/objects/ObjectFilterFields";
import EmptyState from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import { usePublishedObjects, isObjectsTableMissing } from "@/hooks/useCreatorObjects";
import { useObjectHearts } from "@/hooks/useObjectHearts";
import { SAMPLE_OBJECTS } from "@/lib/objects/samples";
import {
  OBJECT_KINDS,
  OBJECT_SUBTYPES,
  filterObjects,
  isEditionSoldOut,
  sortObjectsByPrice,
  type ObjectFilter,
  type ObjectKind,
} from "@/lib/objects/taxonomy";
import { useObjectCatalogStore } from "@/stores/objectCatalogStore";
import { useFeedHomeNavStore } from "@/stores/feedHomeNavStore";
import { cn } from "@/lib/utils";

type Props = {
  search: string;
  onClearSearch: () => void;
};

export default function ObjectCatalog({ search, onClearSearch }: Props) {
  const reducedMotion = useReducedMotion();
  const query = usePublishedObjects();
  const kind = useObjectCatalogStore((s) => s.kind);
  const subtype = useObjectCatalogStore((s) => s.subtype);
  const fulfillment = useObjectCatalogStore((s) => s.fulfillment);
  const edition = useObjectCatalogStore((s) => s.edition);
  const priceSort = useObjectCatalogStore((s) => s.priceSort);
  const hearted = useObjectCatalogStore((s) => s.hearted);
  const setKind = useObjectCatalogStore((s) => s.setKind);
  const setSubtype = useObjectCatalogStore((s) => s.setSubtype);
  const setHearted = useObjectCatalogStore((s) => s.setHearted);
  const resetCatalog = useObjectCatalogStore((s) => s.reset);
  const hearts = useObjectHearts();
  const homeScrolled = useFeedHomeNavStore((s) => s.scrolled);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => () => resetCatalog(), [resetCatalog]);

  const missingTable = query.isError && isObjectsTableMissing(query.error);
  const catalogKinds = OBJECT_KINDS.filter((group) => group.id === "made" || group.id === "art-toy" || group.id === "prints");
  const source = (query.data?.length ? query.data : SAMPLE_OBJECTS).filter(
    (item) =>
      (item.kind === "made" || item.kind === "art-toy" || item.kind === "prints") &&
      !isEditionSoldOut(item.edition, item.edition_label),
  );

  const filter: ObjectFilter = {
    kind,
    subtype,
    axis: "any",
    fulfillment,
    edition,
    maxPrice: null,
    search,
  };
  const items = useMemo(() => {
    const rows = filterObjects(source, hearted ? { ...filter, kind: "any", subtype: "any" } : filter);
    const visible = hearted ? rows.filter((item) => hearts.has(item.id)) : rows;
    return sortObjectsByPrice(visible, priceSort);
  }, [source, kind, subtype, fulfillment, edition, priceSort, search, hearted, hearts]);
  const subtypes = kind === "any" ? [] : OBJECT_SUBTYPES[kind];
  const extraFilterCount =
    (fulfillment !== "any" ? 1 : 0) + (edition !== "any" ? 1 : 0) + (priceSort !== "default" ? 1 : 0);

  const selectKind = (next: ObjectKind | "any") => {
    setKind(next);
    setSubtype("any");
  };

  return (
    <div className="grid items-start gap-x-8 gap-y-6 grid-cols-[max-content_minmax(0,1fr)] sm:gap-x-16 lg:gap-x-28 xl:gap-x-36">
      <div className="col-start-2 row-start-1 flex flex-wrap items-end justify-end gap-3">
        {subtypes.length > 0 ? (
          <div role="group" aria-label="หมวดย่อย" className="mr-auto flex flex-wrap items-baseline gap-x-5 gap-y-2">
            <CategoryLink inline active={subtype === "any"} onClick={() => setSubtype("any")}>ทั้งหมด</CategoryLink>
            {subtypes.map((item) => (
              <CategoryLink key={item.id} inline active={subtype === item.id} onClick={() => setSubtype(item.id)}>
                {item.label}
              </CategoryLink>
            ))}
          </div>
        ) : null}
        <AnimatePresence initial={false}>
          {filtersOpen ? (
            <motion.div
              key="object-filters"
              initial={reducedMotion ? false : { height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={reducedMotion ? undefined : { height: 0, opacity: 0 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="order-2 w-full min-w-0 overflow-hidden sm:order-1 sm:w-[70%]"
            >
              <ObjectFilterFields />
            </motion.div>
          ) : null}
        </AnimatePresence>
        <button
          type="button"
          aria-label="ตัวกรอง"
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen((open) => !open)}
          className="relative order-1 mb-1 shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:order-2"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {extraFilterCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary" />
          ) : null}
        </button>
      </div>

      <nav
        aria-label="หมวดสินค้า"
        className={cn("sticky z-20 col-start-1 row-start-2 self-start", homeScrolled ? "top-[7.5rem]" : "top-20")}
      >
        <ul className="space-y-5">
          <li>
            <CategoryLink large={kind === "any" && !hearted} active={kind === "any" && !hearted} onClick={() => selectKind("any")}>
              All
            </CategoryLink>
          </li>
          {catalogKinds.map((group) => (
            <li key={group.id}>
              <CategoryLink
                large={kind === group.id}
                active={kind === group.id}
                onClick={() => selectKind(group.id)}
              >
                {group.heading}
              </CategoryLink>
            </li>
          ))}
          <li>
            <CategoryLink large={hearted} active={hearted} onClick={() => setHearted(true)}>
              Saved
            </CategoryLink>
          </li>
        </ul>
      </nav>

      <div className="col-start-2 row-start-2 min-w-0">
      {query.isLoading ? (
        <div className="grid grid-cols-1 gap-x-3 gap-y-6 min-[520px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="aspect-[4/5] animate-pulse bg-[#eceae6]" />
          ))}
        </div>
      ) : query.isError && !missingTable ? (
        <EmptyState
          icon={Box}
          title="โหลด Objects ไม่สำเร็จ"
          description="ลองใหม่อีกครั้ง"
          action={<Button type="button" onClick={() => void query.refetch()}>ลองใหม่</Button>}
        />
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${hearted ? "saved" : kind}:${subtype}`}
            initial={reducedMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: -10 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            {items.length === 0 ? (
              <EmptyState
                icon={hearted && !search.trim() ? Heart : Box}
                title={hearted && !search.trim() ? "ยังไม่มีสินค้าที่ถูกใจ" : "ไม่พบชิ้นงานตามที่เลือก"}
                description={
                  hearted && !search.trim()
                    ? "กดหัวใจบนชิ้นที่ชอบ แล้วกลับมาดูรวมที่นี่"
                    : "ลองเปลี่ยนหมวดหรือคำค้น"
                }
                action={
                  search ? (
                    <Button type="button" variant="outline" onClick={onClearSearch}>ล้างคำค้น</Button>
                  ) : null
                }
              />
            ) : (
              <div data-feed-results="" className="grid grid-cols-1 gap-x-3 gap-y-8 min-[520px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {items.map((item) => (
                  <ObjectCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}
      </div>
    </div>
  );
}

function CategoryLink({
  active,
  large,
  nested,
  inline,
  onClick,
  children,
}: {
  active: boolean;
  large?: boolean;
  nested?: boolean;
  inline?: boolean;
  onClick: () => void;
  children: string;
}) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.button
      type="button"
      layout
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      animate={{ fontSize: large ? 34 : nested ? 13 : 14 }}
      transition={{ duration: reducedMotion ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "whitespace-nowrap text-left focus-visible:outline-none focus-visible:underline",
        inline ? "inline" : "block",
        large ? "font-medium leading-none tracking-tight text-foreground [text-box-trim:trim-start] [text-box-edge:cap_alphabetic]" : "leading-snug",
        nested && !large ? "pl-3" : undefined,
        !large && (active
          ? "font-medium text-foreground underline decoration-foreground/40 underline-offset-4"
          : nested
            ? "text-muted-foreground hover:text-foreground"
            : "text-foreground/80 hover:text-foreground"),
      )}
    >
      {children}
    </motion.button>
  );
}
