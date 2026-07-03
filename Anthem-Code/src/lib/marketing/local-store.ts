import type { PostgrestError } from "@supabase/supabase-js";

const STORAGE_KEY = "marketing-local-v1";

export type LocalKuyStore = {
  businesses: Record<string, unknown>[];
  leads: Record<string, unknown>[];
  competitors: Record<string, unknown>[];
  content: Record<string, unknown>[];
  insights: Record<string, unknown>[];
  settings: Record<string, unknown>[];
};

function emptyStore(): LocalKuyStore {
  return { businesses: [], leads: [], competitors: [], content: [], insights: [], settings: [] };
}

export function isMarketingTableMissing(error: PostgrestError | null | undefined): boolean {
  if (!error) return false;
  const msg = `${error.code ?? ""} ${error.message ?? ""}`.toLowerCase();
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    msg.includes("does not exist") ||
    msg.includes("could not find the table")
  );
}

export function readLocalMarketingStore(): LocalKuyStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();
    return { ...emptyStore(), ...JSON.parse(raw) };
  } catch {
    return emptyStore();
  }
}

export function writeLocalMarketingStore(store: LocalKuyStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function newLocalId(): string {
  return crypto.randomUUID();
}
