import { create } from "zustand";
import { addToBag, removeLine, setLineQty, type BagLine } from "@/lib/support/bag";

const KEY = "samecor-shop-bag-v1";

function load(): BagLine[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (l): l is BagLine =>
        !!l &&
        typeof (l as BagLine).slug === "string" &&
        Number.isInteger((l as BagLine).qty) &&
        (l as BagLine).qty > 0 &&
        ((l as BagLine).variantId === null || typeof (l as BagLine).variantId === "string"),
    );
  } catch {
    return [];
  }
}

function save(lines: BagLine[]): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {
    /* private mode: the bag then lasts for this visit only */
  }
}

type BagState = {
  lines: BagLine[];
  /** Returns false when nothing could be added (not for sale, or the limit is reached). */
  add: (line: BagLine) => boolean;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};

/** The shopper's bag. Kept in this browser; prices are always read from the catalogue, never from here. */
export const useBag = create<BagState>((set, get) => {
  const commit = (lines: BagLine[]) => {
    save(lines);
    set({ lines });
  };
  return {
    lines: typeof window === "undefined" ? [] : load(),
    add: (line) => {
      const before = get().lines;
      const after = addToBag(before, line);
      if (after === before) return false;
      commit(after);
      return true;
    },
    setQty: (key, qty) => commit(setLineQty(get().lines, key, qty)),
    remove: (key) => commit(removeLine(get().lines, key)),
    clear: () => commit([]),
  };
});

export const selectBagCount = (s: BagState): number => s.lines.reduce((n, l) => n + l.qty, 0);
