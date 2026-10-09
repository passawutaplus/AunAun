import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

const LEGACY_KEY = "aplus1-object-hearts";
const CHANGE = "aplus1-object-hearts-change";

function storageKey(userId: string | null) {
  return userId ? `${LEGACY_KEY}:${userId}` : LEGACY_KEY;
}

function parseIds(raw: string | null): string[] {
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function readObjectHearts(userId: string | null): string[] {
  if (typeof window === "undefined") return [];
  const key = storageKey(userId);
  if (userId && localStorage.getItem(key) == null) {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy != null) localStorage.setItem(key, legacy);
  }
  return parseIds(localStorage.getItem(key));
}

export function writeObjectHeart(userId: string | null, id: string, on: boolean) {
  const ids = new Set(readObjectHearts(userId));
  if (on) ids.add(id);
  else ids.delete(id);
  localStorage.setItem(storageKey(userId), JSON.stringify([...ids]));
  window.dispatchEvent(new Event(CHANGE));
}

/** Hearts belonging to the signed-in user, or this browser when signed out. */
export function useObjectHearts() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [ids, setIds] = useState<string[]>(() => readObjectHearts(userId));

  useEffect(() => {
    const sync = () => setIds(readObjectHearts(userId));
    sync();
    window.addEventListener(CHANGE, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE, sync);
      window.removeEventListener("storage", sync);
    };
  }, [userId]);

  return useMemo(() => new Set(ids), [ids]);
}
