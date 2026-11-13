import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";

export interface Supplier {
  id: string;
  name: string;
  type?: "individual" | "company";
  category?: string;
  contactName?: string;
  contactPosition?: string;
  phone?: string;
  email?: string;
  lineId?: string;
  website?: string;
  address?: string;
  mapUrl?: string;
  rateNote?: string;
  rating: number;
  tags: string[];
  notes: string;
  coverImageUrl?: string;
  shareToken?: string;
  isShared: boolean;
  shareHiddenFields: string[];
  createdAt: string;
  updatedAt: string;
}

const SUPPLIERS_KEY = (uid?: string) => ["suppliers", uid ?? "anon"] as const;

interface Row {
  id: string;
  name: string;
  category: string | null;
  type: string | null;
  contact_name: string | null;
  contact_position: string | null;
  phone: string | null;
  email: string | null;
  line_id: string | null;
  website: string | null;
  address: string | null;
  rate_note: string | null;
  rating: number;
  tags: string[];
  notes: string;
  cover_image_url: string | null;
  created_at: string;
  updated_at: string;
  share_token?: string | null;
  is_shared?: boolean | null;
  map_url?: string | null;
  share_hidden_fields?: string[] | null;
}

function rowToSupplier(r: Row): Supplier {
  return {
    id: r.id,
    name: r.name,
    type: (r.type as Supplier["type"]) ?? undefined,
    category: r.category ?? undefined,
    contactName: r.contact_name ?? undefined,
    contactPosition: r.contact_position ?? undefined,
    phone: r.phone ?? undefined,
    email: r.email ?? undefined,
    lineId: r.line_id ?? undefined,
    website: r.website ?? undefined,
    address: r.address ?? undefined,
    mapUrl: r.map_url ?? undefined,
    rateNote: r.rate_note ?? undefined,
    rating: r.rating,
    tags: r.tags ?? [],
    notes: r.notes ?? "",
    coverImageUrl: r.cover_image_url ?? undefined,
    shareToken: r.share_token ?? undefined,
    isShared: Boolean(r.is_shared),
    shareHiddenFields: r.share_hidden_fields ?? [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function useSuppliers() {
  const { user } = useAuth();
  const uid = user?.id;
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: SUPPLIERS_KEY(uid),
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => rowToSupplier(r as unknown as Row));
    },
  });

  const create = useMutation({
    mutationFn: async (init: Partial<Supplier> & { name: string }) => {
      if (!uid) throw new Error("ต้องเข้าสู่ระบบ");
      const { data, error } = await supabase
        .from("suppliers")
        .insert({
          user_id: uid,
          name: init.name,
          type: init.type ?? null,
          category: init.category ?? null,
          contact_name: init.contactName ?? null,
          contact_position: init.contactPosition ?? null,
          phone: init.phone ?? null,
          email: init.email ?? null,
          line_id: init.lineId ?? null,
          website: init.website ?? null,
          address: init.address ?? null,
          rate_note: init.rateNote ?? null,
          map_url: init.mapUrl ?? null,
          rating: init.rating ?? 0,
          tags: init.tags ?? [],
          notes: init.notes ?? "",
          cover_image_url: init.coverImageUrl ?? null,
        } as never)
        .select()
        .single();
      if (error) throw error;
      return rowToSupplier(data as unknown as Row);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: SUPPLIERS_KEY(uid) }),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Supplier> }) => {
      const upd: Record<string, unknown> = {};
      if (patch.name !== undefined) upd.name = patch.name;
      if (patch.type !== undefined) upd.type = patch.type || null;
      if (patch.category !== undefined) upd.category = patch.category || null;
      if (patch.contactName !== undefined) upd.contact_name = patch.contactName || null;
      if (patch.contactPosition !== undefined) upd.contact_position = patch.contactPosition || null;
      if (patch.phone !== undefined) upd.phone = patch.phone || null;
      if (patch.email !== undefined) upd.email = patch.email || null;
      if (patch.lineId !== undefined) upd.line_id = patch.lineId || null;
      if (patch.website !== undefined) upd.website = patch.website || null;
      if (patch.address !== undefined) upd.address = patch.address || null;
      if (patch.mapUrl !== undefined) upd.map_url = patch.mapUrl || null;
      if (patch.rateNote !== undefined) upd.rate_note = patch.rateNote || null;
      if (patch.rating !== undefined) upd.rating = patch.rating;
      if (patch.tags !== undefined) upd.tags = patch.tags;
      if (patch.notes !== undefined) upd.notes = patch.notes;
      if (patch.coverImageUrl !== undefined) upd.cover_image_url = patch.coverImageUrl || null;
      if (patch.shareHiddenFields !== undefined) upd.share_hidden_fields = patch.shareHiddenFields;

      const { error } = await supabase
        .from("suppliers")
        .update(upd as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: SUPPLIERS_KEY(uid) }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("suppliers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SUPPLIERS_KEY(uid) });
    },
  });

  return {
    suppliers: list.data ?? [],
    isLoading: list.isLoading,
    create: create.mutateAsync,
    update: (id: string, patch: Partial<Supplier>) => update.mutateAsync({ id, patch }),
    remove: remove.mutateAsync,
  };
}
