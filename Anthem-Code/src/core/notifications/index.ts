/**
 * Cross-app notification feed (Aplus1 + So1o).
 * Backed by shared.notifications, exposed via public.notifications view.
 */
import { useEffect, useState, useCallback } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { isOptionalQueryError } from "@/lib/supabaseErrors";
import { supabase } from "@/integrations/supabase/client";

export type AppKey = "anthem" | "so1o" | "shared";

type NotificationRow = {
  id: string | null;
  user_id: string | null;
  app: string | null;
  kind: string | null;
  title: string | null;
  body: string | null;
  link: string | null;
  metadata: unknown;
  is_read: boolean | null;
  is_dismissed: boolean | null;
  created_at: string | null;
};

export interface Notification {
  id: string;
  user_id: string;
  app: AppKey;
  kind: string;
  title: string;
  body: string;
  link: string;
  metadata: Record<string, unknown>;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
}

function toNotification(row: NotificationRow): Notification | null {
  if (!row.id || !row.user_id) return null;
  return {
    id: row.id,
    user_id: row.user_id,
    app: (row.app ?? "anthem") as AppKey,
    kind: row.kind ?? "",
    title: row.title ?? "",
    body: row.body ?? "",
    link: row.link ?? "",
    metadata: (row.metadata && typeof row.metadata === "object" ? row.metadata : {}) as Record<string, unknown>,
    is_read: !!row.is_read,
    is_dismissed: !!row.is_dismissed,
    created_at: row.created_at ?? new Date().toISOString(),
  };
}

type NotificationStore = {
  items: Notification[];
  loading: boolean;
  listeners: Set<() => void>;
  refCount: number;
  channel: RealtimeChannel | null;
};

const stores = new Map<string, NotificationStore>();

function emit(store: NotificationStore) {
  store.listeners.forEach((listener) => listener());
}

async function fetchStoreItems(userId: string, store: NotificationStore) {
  store.loading = true;
  emit(store);
  const { data, error } = await supabase
    .from("ecosystem_notifications")
    .select("*")
    .eq("user_id", userId)
    .eq("is_dismissed", false)
    .order("created_at", { ascending: false })
    .limit(80);
  if (!error && data) {
    store.items = (data as NotificationRow[])
      .map(toNotification)
      .filter((n): n is Notification => n !== null);
  } else if (!error || !isOptionalQueryError(error)) {
    // Fallback to shared notifications view when ecosystem table is not deployed.
    const fallback = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .eq("is_dismissed", false)
      .order("created_at", { ascending: false })
      .limit(80);
    if (!fallback.error && fallback.data) {
      store.items = (fallback.data as NotificationRow[])
        .map(toNotification)
        .filter((n): n is Notification => n !== null);
    }
  }
  store.loading = false;
  emit(store);
}

function ensureStore(userId: string): NotificationStore {
  let store = stores.get(userId);
  if (!store) {
    store = { items: [], loading: false, listeners: new Set(), refCount: 0, channel: null };
    stores.set(userId, store);
  }
  return store;
}

function subscribeStore(userId: string, store: NotificationStore) {
  if (store.channel) return;
  void fetchStoreItems(userId, store);
  store.channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "shared", table: "notifications", filter: `user_id=eq.${userId}` },
      () => fetchStoreItems(userId, store),
    )
    .subscribe();
}

function releaseStore(userId: string) {
  const store = stores.get(userId);
  if (!store || store.refCount > 0) return;
  if (store.channel) {
    supabase.removeChannel(store.channel);
    store.channel = null;
  }
  stores.delete(userId);
}

export function useNotifications(userId: string | null | undefined) {
  const [, tick] = useState(0);
  const rerender = useCallback(() => tick((n) => n + 1), []);

  useEffect(() => {
    if (!userId) return;
    const store = ensureStore(userId);
    store.listeners.add(rerender);
    store.refCount += 1;
    subscribeStore(userId, store);

    return () => {
      store.listeners.delete(rerender);
      store.refCount -= 1;
      releaseStore(userId);
    };
  }, [userId, rerender]);

  const store = userId ? stores.get(userId) : undefined;
  const items = store?.items ?? [];
  const loading = store?.loading ?? false;

  const markRead = useCallback(
    async (id: string) => {
      if (!userId) return;
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id)
        .eq("user_id", userId);
      if (error) throw error;
      const active = stores.get(userId);
      if (active) {
        active.items = active.items.map((n) => (n.id === id ? { ...n, is_read: true } : n));
        emit(active);
      }
    },
    [userId],
  );

  const dismiss = useCallback(
    async (id: string) => {
      if (!userId) return;
      const { error } = await supabase
        .from("notifications")
        .update({ is_dismissed: true })
        .eq("id", id)
        .eq("user_id", userId);
      if (error) throw error;
      const active = stores.get(userId);
      if (active) {
        active.items = active.items.filter((n) => n.id !== id);
        emit(active);
      }
    },
    [userId],
  );

  const refetch = useCallback(async () => {
    if (!userId) return;
    const active = stores.get(userId);
    if (active) await fetchStoreItems(userId, active);
  }, [userId]);

  const unreadCount = items.filter((n) => !n.is_read).length;

  return { items, loading, unreadCount, refetch, markRead, dismiss };
}
