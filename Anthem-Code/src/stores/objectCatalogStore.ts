import { create } from "zustand";
import type { ObjectEdition, ObjectFulfillment, ObjectKind, ObjectPriceSort } from "@/lib/objects/taxonomy";

type ObjectCatalogState = {
  kind: ObjectKind | "any";
  subtype: string;
  fulfillment: ObjectFulfillment | "any";
  edition: ObjectEdition | "any";
  priceSort: ObjectPriceSort;
  hearted: boolean;
  setKind: (kind: ObjectKind | "any") => void;
  setSubtype: (subtype: string) => void;
  setFulfillment: (fulfillment: ObjectFulfillment | "any") => void;
  setEdition: (edition: ObjectEdition | "any") => void;
  setPriceSort: (priceSort: ObjectPriceSort) => void;
  setHearted: (hearted: boolean) => void;
  reset: () => void;
};

const initial = {
  kind: "any" as const,
  subtype: "any",
  fulfillment: "any" as const,
  edition: "any" as const,
  priceSort: "default" as const,
  hearted: false,
};

export const useObjectCatalogStore = create<ObjectCatalogState>((set) => ({
  ...initial,
  setKind: (kind) => set({ kind, subtype: "any", hearted: false }),
  setSubtype: (subtype) => set({ subtype }),
  setFulfillment: (fulfillment) => set({ fulfillment }),
  setEdition: (edition) => set({ edition }),
  setPriceSort: (priceSort) => set({ priceSort }),
  setHearted: (hearted) =>
    set(hearted ? { hearted: true, kind: "any", subtype: "any" } : { hearted: false }),
  reset: () => set(initial),
}));
