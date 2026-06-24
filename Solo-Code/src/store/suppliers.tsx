import * as React from "react";
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

export interface SupplierFile {
  id: string;
  supplierId: string;
  fileName: string;
  storagePath: string;
  mimeType?: string;
  sizeBytes?: number;
  createdAt: string;
}

export interface SupplierLink {
  id: string;
  supplierId: string;
  label: string;
  url: string;
  createdAt: string;
}

const SUPPLIERS_KEY = (uid?: string) => ["suppliers", uid ?? "anon"] as const;
const FILES_KEY = (uid?: string) => ["supplier_files", uid ?? "anon"] as const;
const LINKS_KEY = (uid?: string) => ["supplier_links", uid ?? "anon"] as const;

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

  const files = useQuery({
    queryKey: FILES_KEY(uid),
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_files")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(
        (f) =>
          ({
            id: f.id,
            supplierId: f.supplier_id,
            fileName: f.file_name,
            storagePath: f.storage_path,
            mimeType: f.mime_type ?? undefined,
            sizeBytes: f.size_bytes ?? undefined,
            createdAt: f.created_at,
          }) as SupplierFile,
      );
    },
  });

  const links = useQuery({
    queryKey: LINKS_KEY(uid),
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_links")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(
        (l) =>
          ({
            id: l.id,
            supplierId: l.supplier_id,
            label: l.label,
            url: l.url,
            createdAt: l.created_at,
          }) as SupplierLink,
      );
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
      qc.invalidateQueries({ queryKey: FILES_KEY(uid) });
      qc.invalidateQueries({ queryKey: LINKS_KEY(uid) });
    },
  });

  const uploadFile = useMutation({
    mutationFn: async ({ supplierId, file }: { supplierId: string; file: File }) => {
      if (!uid) throw new Error("ต้องเข้าสู่ระบบ");
      if (file.size > 5 * 1024 * 1024) throw new Error("ไฟล์ใหญ่เกิน 5MB");
      const allowed = /\.(pdf|png|jpe?g|webp|svg|doc|docx|xls|xlsx|csv|txt)$/i;
      if (!allowed.test(file.name))
        throw new Error("รองรับเฉพาะ PDF / รูป / DOC / XLS / CSV / TXT");
      const ext = file.name.split(".").pop() || "bin";
      const path = `${uid}/${supplierId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const up = await supabase.storage
        .from("supplier-files")
        .upload(path, file, { contentType: file.type });
      if (up.error) throw up.error;
      const { error } = await supabase.from("supplier_files").insert({
        supplier_id: supplierId,
        user_id: uid,
        file_name: file.name,
        storage_path: path,
        mime_type: file.type,
        size_bytes: file.size,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: FILES_KEY(uid) }),
  });

  const deleteFile = useMutation({
    mutationFn: async (file: SupplierFile) => {
      await supabase.storage.from("supplier-files").remove([file.storagePath]);
      const { error } = await supabase.from("supplier_files").delete().eq("id", file.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: FILES_KEY(uid) }),
  });

  const addLink = useMutation({
    mutationFn: async ({
      supplierId,
      label,
      url,
    }: {
      supplierId: string;
      label: string;
      url: string;
    }) => {
      if (!uid) throw new Error("ต้องเข้าสู่ระบบ");
      const { error } = await supabase.from("supplier_links").insert({
        supplier_id: supplierId,
        user_id: uid,
        label,
        url,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: LINKS_KEY(uid) }),
  });

  const removeLink = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("supplier_links").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: LINKS_KEY(uid) }),
  });

  const getSignedUrl = React.useCallback(async (path: string) => {
    const { data, error } = await supabase.storage
      .from("supplier-files")
      .createSignedUrl(path, 60 * 10);
    if (error) throw error;
    return data.signedUrl;
  }, []);

  const enableShare = useMutation({
    mutationFn: async (id: string) => {
      // Use crypto.randomUUID for token
      const token = crypto.randomUUID();
      const { data, error } = await supabase
        .from("suppliers")
        .update({ share_token: token, is_shared: true } as never)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return rowToSupplier(data as unknown as Row);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: SUPPLIERS_KEY(uid) }),
  });

  const disableShare = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("suppliers")
        .update({ is_shared: false, share_token: null } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: SUPPLIERS_KEY(uid) }),
  });

  return {
    suppliers: list.data ?? [],
    files: files.data ?? [],
    links: links.data ?? [],
    isLoading: list.isLoading,
    create: create.mutateAsync,
    update: (id: string, patch: Partial<Supplier>) => update.mutateAsync({ id, patch }),
    remove: remove.mutateAsync,
    uploadFile: (supplierId: string, file: File) => uploadFile.mutateAsync({ supplierId, file }),
    deleteFile: deleteFile.mutateAsync,
    addLink: (supplierId: string, label: string, url: string) =>
      addLink.mutateAsync({ supplierId, label, url }),
    removeLink: removeLink.mutateAsync,
    getSignedUrl,
    enableShare: enableShare.mutateAsync,
    disableShare: disableShare.mutateAsync,
  };
}
