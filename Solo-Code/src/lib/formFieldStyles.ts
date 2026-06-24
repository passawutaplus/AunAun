import { cn } from "@/lib/utils";

/** Visual hint when a field already has a value. */
export function filledFieldClass(value: string | number | undefined | null): string {
  const has = value !== undefined && value !== null && String(value).trim() !== "";
  return has ? "border-emerald-500/45 bg-emerald-50/40 dark:bg-emerald-950/25" : "";
}

export function fieldLabelClass(required?: boolean): string {
  return cn(
    "text-xs font-semibold flex items-center gap-1.5",
    required && "after:content-['*'] after:text-destructive after:ml-0.5",
  );
}

export function mergeFieldClass(
  base: string | undefined,
  value: string | number | undefined | null,
): string {
  return cn(base, filledFieldClass(value));
}
