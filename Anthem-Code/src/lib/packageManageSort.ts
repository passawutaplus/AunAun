export type PackageManageSortMode =
  | "newest"
  | "oldest"
  | "price_high"
  | "price_low"
  | "title";

export const PACKAGE_MANAGE_SORT_OPTIONS: {
  value: PackageManageSortMode;
  label: string;
}[] = [
  { value: "newest", label: "ใหม่สุด" },
  { value: "oldest", label: "เก่าสุด" },
  { value: "price_high", label: "ราคาสูง → ต่ำ" },
  { value: "price_low", label: "ราคาต่ำ → สูง" },
  { value: "title", label: "ชื่อ A–Z" },
];

export const DEFAULT_PACKAGE_MANAGE_SORT: PackageManageSortMode = "newest";

export function packageManageSortLabel(mode: PackageManageSortMode): string {
  return PACKAGE_MANAGE_SORT_OPTIONS.find((o) => o.value === mode)?.label ?? "เรียง";
}

type SortablePackage = {
  title: string;
  price_thb: number;
  price_min_thb: number;
  sort_order: number;
  updated_at: string;
  created_at: string;
};

function ts(iso: string): number {
  const n = Date.parse(iso);
  return Number.isNaN(n) ? 0 : n;
}

export function sortManagePackages<T extends SortablePackage>(
  list: T[],
  mode: PackageManageSortMode,
): T[] {
  const next = [...list];
  switch (mode) {
    case "oldest":
      return next.sort(
        (a, b) =>
          ts(a.created_at) - ts(b.created_at) || a.sort_order - b.sort_order,
      );
    case "price_high":
      return next.sort(
        (a, b) => b.price_thb - a.price_thb || a.title.localeCompare(b.title, "th"),
      );
    case "price_low":
      return next.sort(
        (a, b) =>
          (a.price_min_thb || a.price_thb) - (b.price_min_thb || b.price_thb) ||
          a.title.localeCompare(b.title, "th"),
      );
    case "title":
      return next.sort((a, b) => a.title.localeCompare(b.title, "th"));
    case "newest":
    default:
      return next.sort(
        (a, b) =>
          a.sort_order - b.sort_order ||
          ts(b.updated_at) - ts(a.updated_at) ||
          ts(b.created_at) - ts(a.created_at),
      );
  }
}
