import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  asDownloads,
  CREATOR_OBJECTS_SELECT,
  fromCreatorObjects,
  fromObjectDownloads,
  fromObjectOrders,
  isObjectsTableMissing,
  mapCreatorObject,
  mapObjectOrder,
  OBJECT_ORDERS_SELECT,
} from "@/lib/objects/db";
import type { CreatorObject, ObjectDownload, ObjectOrder, ObjectOrderStatus, ObjectStatus } from "@/lib/objects/taxonomy";

async function attachMakers(rows: CreatorObject[]): Promise<CreatorObject[]> {
  const ids = [...new Set(rows.map((row) => row.owner_id))];
  if (!ids.length) return rows;
  const { data } = await (supabase as unknown as {
    from: (table: string) => {
      select: (query: string) => {
        in: (column: string, values: string[]) => Promise<{ data: { user_id: string; display_name: string | null; username: string | null }[] | null }>;
      };
    };
  })
    .from("profiles_public")
    .select("user_id, display_name, username")
    .in("user_id", ids);
  const names = new Map(
    (data ?? []).map((profile) => [
      profile.user_id,
      {
        name: profile.display_name || profile.username || "ครีเอเตอร์",
        username: profile.username,
      },
    ]),
  );
  return rows.map((row) => {
    const maker = names.get(row.owner_id);
    return {
      ...row,
      maker_name: maker?.name ?? "ครีเอเตอร์",
      maker_username: maker?.username ?? null,
    };
  });
}

export function usePublishedObjects() {
  return useQuery({
    queryKey: ["creator-objects", "published"],
    queryFn: async (): Promise<CreatorObject[]> => {
      const { data, error } = await fromCreatorObjects()
        .select(CREATOR_OBJECTS_SELECT)
        .eq("status", "Published")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (Array.isArray(data) ? data : [])
        .map((row) => mapCreatorObject(row as Record<string, unknown>))
        .filter((row): row is CreatorObject => !!row);
      return attachMakers(rows);
    },
  });
}

export function useCreatorObject(id: string | undefined) {
  return useQuery({
    queryKey: ["creator-object", id],
    enabled: !!id,
    queryFn: async (): Promise<CreatorObject | null> => {
      const { data, error } = await fromCreatorObjects()
        .select(CREATOR_OBJECTS_SELECT)
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const row = mapCreatorObject(data as Record<string, unknown>);
      if (!row) return null;
      const [withMaker] = await attachMakers([row]);
      return withMaker;
    },
  });
}

/** Published objects for a public profile, including editions that are sold out. */
export function useOwnerPublishedObjects(ownerId: string | undefined) {
  return useQuery({
    queryKey: ["creator-objects", "owner", ownerId],
    enabled: !!ownerId,
    queryFn: async (): Promise<CreatorObject[]> => {
      const { data, error } = await fromCreatorObjects()
        .select(CREATOR_OBJECTS_SELECT)
        .eq("owner_id", ownerId!)
        .eq("status", "Published")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (Array.isArray(data) ? data : [])
        .map((row) => mapCreatorObject(row as Record<string, unknown>))
        .filter((row): row is CreatorObject => !!row);
      return attachMakers(rows);
    },
  });
}

export function useMyObjects(ownerId: string | undefined) {
  return useQuery({
    queryKey: ["creator-objects", "mine", ownerId],
    enabled: !!ownerId,
    queryFn: async (): Promise<CreatorObject[]> => {
      const { data, error } = await fromCreatorObjects()
        .select(CREATOR_OBJECTS_SELECT)
        .eq("owner_id", ownerId!)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (Array.isArray(data) ? data : [])
        .map((row) => mapCreatorObject(row as Record<string, unknown>))
        .filter((row): row is CreatorObject => !!row);
    },
  });
}

/**
 * File links of a download product. The database only returns them to the owner, admins and buyers
 * with a paid order (an empty list for everyone else).
 */
export function useObjectDownloads(objectId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["creator-object-downloads", objectId],
    enabled: !!objectId && enabled,
    queryFn: async (): Promise<ObjectDownload[]> => {
      const { data, error } = await fromObjectDownloads().select("files").eq("object_id", objectId!).maybeSingle();
      if (error) {
        if (isObjectsTableMissing(error)) return [];
        throw error;
      }
      return asDownloads((data as { files?: unknown } | null)?.files);
    },
  });
}

export type ObjectWriteInput = Omit<
  CreatorObject,
  "id" | "owner_id" | "created_at" | "updated_at" | "maker_name" | "maker_username" | "sample" | "sold_count"
>;

export function useUpsertObject(ownerId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id?: string; patch: ObjectWriteInput }) => {
      if (!ownerId) throw new Error("ต้องเข้าสู่ระบบ");
      const title = args.patch.title.trim();
      if (!title) throw new Error("ใส่ชื่อสินค้า");
      if (args.patch.status === "Published") {
        if (!args.patch.summary.trim()) throw new Error("ใส่คำอธิบายสั้น");
        if (args.patch.price_thb <= 0) throw new Error("ใส่ราคา");
        if (!args.patch.cover_url?.trim()) throw new Error("ใส่รูปปก");
      }
      const payload = {
        owner_id: ownerId,
        title,
        code: args.patch.code.trim(),
        summary: args.patch.summary.trim(),
        story: args.patch.story.trim(),
        kind: args.patch.kind,
        subtype: args.patch.subtype,
        material: args.patch.material,
        fulfillment: args.patch.kind === "files" ? "download" : args.patch.fulfillment,
        edition: args.patch.edition,
        edition_label: args.patch.edition_label.trim(),
        price_thb: Math.round(args.patch.price_thb),
        lead_time: args.patch.lead_time.trim(),
        cover_url: args.patch.cover_url?.trim() || null,
        gallery_urls: args.patch.gallery_urls.map((url) => url.trim()).filter(Boolean),
        finishes: args.patch.finishes,
        specs: args.patch.specs,
        downloads: args.patch.downloads,
        license_note: args.patch.license_note.trim(),
        reference_project_ids: args.patch.reference_project_ids.filter(Boolean).slice(0, 3),
        shipping_thb:
          args.patch.kind === "files" ? 0 : Math.min(5000, Math.max(0, Math.round(args.patch.shipping_thb || 0))),
        status: args.patch.status,
        updated_at: new Date().toISOString(),
      };
      if (args.id) {
        const { data, error } = await fromCreatorObjects()
          .update(payload)
          .eq("id", args.id)
          .eq("owner_id", ownerId)
          .select(CREATOR_OBJECTS_SELECT)
          .single();
        if (error) throw error;
        const row = mapCreatorObject(data as Record<string, unknown>);
        if (!row) throw new Error("บันทึกไม่สำเร็จ");
        return row;
      }
      const { data, error } = await fromCreatorObjects()
        .insert(payload)
        .select(CREATOR_OBJECTS_SELECT)
        .single();
      if (error) throw error;
      const row = mapCreatorObject(data as Record<string, unknown>);
      if (!row) throw new Error("บันทึกไม่สำเร็จ");
      return row;
    },
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: ["creator-objects"] });
      if (vars.id) void qc.invalidateQueries({ queryKey: ["creator-object", vars.id] });
      if (vars.id) void qc.invalidateQueries({ queryKey: ["creator-object-downloads", vars.id] });
    },
  });
}

export function useDeleteObject(ownerId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!ownerId) throw new Error("ต้องเข้าสู่ระบบ");
      const { error } = await fromCreatorObjects().delete().eq("id", id).eq("owner_id", ownerId);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["creator-objects"] });
    },
  });
}

// pg_cron is not installed: opening orders completes the ones shipped 7+ days ago (at most every 10 min per tab).
const FINALIZE_SHIPPED_EVERY_MS = 10 * 60_000;
let lastFinalizeShippedAt = 0;

async function finalizeShippedOrdersQuietly() {
  const now = Date.now();
  if (now - lastFinalizeShippedAt < FINALIZE_SHIPPED_EVERY_MS) return;
  lastFinalizeShippedAt = now;
  try {
    await supabase.rpc("finalize_shipped_object_orders" as never);
  } catch {
    /* best effort */
  }
}

export function useObjectOrders(userId: string | undefined, role: "buyer" | "seller") {
  return useQuery({
    queryKey: ["object-orders", role, userId],
    enabled: !!userId,
    queryFn: async (): Promise<ObjectOrder[]> => {
      await finalizeShippedOrdersQuietly();
      const column = role === "buyer" ? "buyer_id" : "seller_id";
      const { data, error } = await fromObjectOrders()
        .select(OBJECT_ORDERS_SELECT)
        .eq(column, userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (Array.isArray(data) ? data : [])
        .map((row) => mapObjectOrder(row as Record<string, unknown>))
        .filter((row): row is ObjectOrder => !!row);
    },
  });
}

export function useCreateObjectOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      objectId: string;
      objectTitle: string;
      sellerId: string;
      buyerId: string;
      qty: number;
      finish: string;
      note: string;
      shipName?: string;
      shipPhone?: string;
      shipAddress?: string;
    }) => {
      if (input.buyerId === input.sellerId) throw new Error("สั่งชิ้นงานของตัวเองไม่ได้");
      const { data, error } = await fromObjectOrders()
        .insert({
          object_id: input.objectId,
          object_title: input.objectTitle,
          seller_id: input.sellerId,
          buyer_id: input.buyerId,
          qty: input.qty,
          finish: input.finish,
          note: input.note.trim(),
          ship_name: input.shipName?.trim() ?? "",
          ship_phone: input.shipPhone?.trim() ?? "",
          ship_address: input.shipAddress?.trim() ?? "",
          status: "unpaid",
        })
        .select(OBJECT_ORDERS_SELECT)
        .single();
      if (error) throw error;
      const row = mapObjectOrder(data as Record<string, unknown>);
      if (!row) throw new Error("ส่งคำถามไม่สำเร็จ");
      return row;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["object-orders"] });
    },
  });
}

export function useUpdateObjectOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status: ObjectOrderStatus; trackingCode?: string }) => {
      const patch: { status: ObjectOrderStatus; updated_at: string; tracking_code?: string } = {
        status: input.status,
        updated_at: new Date().toISOString(),
      };
      if (input.trackingCode !== undefined) patch.tracking_code = input.trackingCode.trim();
      const { error } = await fromObjectOrders().update(patch).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["object-orders"] });
    },
  });
}

export function useSetObjectStatus(ownerId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status: ObjectStatus }) => {
      if (!ownerId) throw new Error("ต้องเข้าสู่ระบบ");
      const { error } = await fromCreatorObjects()
        .update({ status: input.status, updated_at: new Date().toISOString() })
        .eq("id", input.id)
        .eq("owner_id", ownerId);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["creator-objects"] });
    },
  });
}

export { isObjectsTableMissing };
