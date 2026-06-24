import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";
import type { ClientDocCategory } from "@/components/dashboard/clients/shared";

export interface SavedClient {
  id: string;
  name: string;
  phone?: string;
  lineId?: string;
  email?: string;
  social?: string;
  address?: string;
  taxId?: string;
  type?: "individual" | "company";
  industry?: string;
  preferredChannel?: "line" | "phone" | "email" | "social";
  paymentTerms?: string;
  rate?: number;
  notes?: string;
  tags?: string[];
  contactName?: string;
  contactPosition?: string;
  branchCode?: string;
  website?: string;
  createdAt: string;
}

export type SavedClientInput = Omit<SavedClient, "id" | "createdAt">;

export interface ClientFile {
  id: string;
  clientId: string;
  fileName: string;
  storagePath: string;
  mimeType?: string;
  sizeBytes?: number;
  docCategory: ClientDocCategory;
  createdAt: string;
}

interface ClientRow {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  line_id: string | null;
  email: string | null;
  social: string | null;
  address: string | null;
  tax_id: string | null;
  type: string | null;
  industry: string | null;
  preferred_channel: string | null;
  payment_terms: string | null;
  rate: number | null;
  notes: string | null;
  tags: string[];
  contact_name: string | null;
  contact_position: string | null;
  branch_code: string | null;
  website: string | null;
  created_at: string;
}

interface ClientFileRow {
  id: string;
  client_id: string;
  file_name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  doc_category: string;
  created_at: string;
}

function rowToClient(r: ClientRow): SavedClient {
  return {
    id: r.id,
    name: r.name,
    phone: r.phone ?? undefined,
    lineId: r.line_id ?? undefined,
    email: r.email ?? undefined,
    social: r.social ?? undefined,
    address: r.address ?? undefined,
    taxId: r.tax_id ?? undefined,
    type: (r.type as SavedClient["type"]) ?? undefined,
    industry: r.industry ?? undefined,
    preferredChannel: (r.preferred_channel as SavedClient["preferredChannel"]) ?? undefined,
    paymentTerms: r.payment_terms ?? undefined,
    rate: r.rate ?? undefined,
    notes: r.notes ?? undefined,
    tags: r.tags ?? [],
    contactName: r.contact_name ?? undefined,
    contactPosition: r.contact_position ?? undefined,
    branchCode: r.branch_code ?? undefined,
    website: r.website ?? undefined,
    createdAt: r.created_at,
  };
}

function clientToInsert(c: SavedClientInput, userId: string) {
  return {
    user_id: userId,
    name: c.name,
    phone: c.phone || null,
    line_id: c.lineId || null,
    email: c.email || null,
    social: c.social || null,
    address: c.address || null,
    tax_id: c.taxId || null,
    type: c.type || null,
    industry: c.industry || null,
    preferred_channel: c.preferredChannel || null,
    payment_terms: c.paymentTerms || null,
    rate: c.rate ?? null,
    notes: c.notes || null,
    tags: c.tags ?? [],
    contact_name: c.contactName || null,
    contact_position: c.contactPosition || null,
    branch_code: c.branchCode || null,
    website: c.website || null,
  };
}

function clientToUpdate(p: Partial<SavedClient>) {
  const out: Partial<Omit<ClientRow, "id" | "user_id" | "created_at">> = {};
  if (p.name !== undefined) out.name = p.name;
  if (p.phone !== undefined) out.phone = p.phone || null;
  if (p.lineId !== undefined) out.line_id = p.lineId || null;
  if (p.email !== undefined) out.email = p.email || null;
  if (p.social !== undefined) out.social = p.social || null;
  if (p.address !== undefined) out.address = p.address || null;
  if (p.taxId !== undefined) out.tax_id = p.taxId || null;
  if (p.type !== undefined) out.type = p.type || null;
  if (p.industry !== undefined) out.industry = p.industry || null;
  if (p.preferredChannel !== undefined) out.preferred_channel = p.preferredChannel || null;
  if (p.paymentTerms !== undefined) out.payment_terms = p.paymentTerms || null;
  if (p.rate !== undefined) out.rate = p.rate ?? null;
  if (p.notes !== undefined) out.notes = p.notes || null;
  if (p.tags !== undefined) out.tags = p.tags ?? [];
  if (p.contactName !== undefined) out.contact_name = p.contactName || null;
  if (p.contactPosition !== undefined) out.contact_position = p.contactPosition || null;
  if (p.branchCode !== undefined) out.branch_code = p.branchCode || null;
  if (p.website !== undefined) out.website = p.website || null;
  return out;
}

export function clientsKey(userId: string | null) {
  return ["saved_clients", userId] as const;
}

const FILES_KEY = (uid?: string) => ["client_files", uid ?? "anon"] as const;

const CLIENT_FILES_BUCKET = "client-files";

/** Until generated types include client_files */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function clientFilesDb(): any {
  return (supabase as any).from("client_files");
}

export function useClients() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: clientsKey(userId),
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("saved_clients")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => rowToClient(r as unknown as ClientRow));
    },
  });

  const filesQuery = useQuery({
    queryKey: FILES_KEY(userId ?? undefined),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await clientFilesDb()
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((f: ClientFileRow) => {
        return {
          id: f.id,
          clientId: f.client_id,
          fileName: f.file_name,
          storagePath: f.storage_path,
          mimeType: f.mime_type ?? undefined,
          sizeBytes: f.size_bytes ?? undefined,
          docCategory: (f.doc_category as ClientDocCategory) || "other",
          createdAt: f.created_at,
        } as ClientFile;
      });
    },
  });

  const addMutation = useMutation({
    mutationFn: async (c: SavedClientInput) => {
      if (!userId) throw new Error("ต้องเข้าสู่ระบบก่อน");
      const { data, error } = await supabase
        .from("saved_clients")
        .insert(clientToInsert(c, userId) as never)
        .select()
        .single();
      if (error) throw error;
      return rowToClient(data as unknown as ClientRow);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: clientsKey(userId) }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<SavedClient> }) => {
      const { error } = await supabase
        .from("saved_clients")
        .update(clientToUpdate(patch) as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: clientsKey(userId) }),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: clientFiles } = await clientFilesDb()
        .select("storage_path")
        .eq("client_id", id);
      if (clientFiles && clientFiles.length > 0) {
        await supabase.storage
          .from(CLIENT_FILES_BUCKET)
          .remove(clientFiles.map((f: { storage_path: string }) => f.storage_path));
      }
      const { error } = await supabase.from("saved_clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clientsKey(userId) });
      qc.invalidateQueries({ queryKey: FILES_KEY(userId ?? undefined) });
    },
  });

  const uploadFile = useMutation({
    mutationFn: async ({
      clientId,
      file,
      docCategory,
    }: {
      clientId: string;
      file: File;
      docCategory: ClientDocCategory;
    }) => {
      if (!userId) throw new Error("ต้องเข้าสู่ระบบ");
      if (file.size > 5 * 1024 * 1024) throw new Error("ไฟล์ใหญ่เกิน 5MB");
      const allowed = /\.(pdf|png|jpe?g|webp)$/i;
      if (!allowed.test(file.name)) throw new Error("รองรับเฉพาะ PDF / รูป (JPG, PNG, WEBP)");
      const ext = file.name.split(".").pop() || "bin";
      const path = `${userId}/${clientId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const up = await supabase.storage
        .from(CLIENT_FILES_BUCKET)
        .upload(path, file, { contentType: file.type });
      if (up.error) throw up.error;
      const { error } = await clientFilesDb().insert({
        client_id: clientId,
        user_id: userId,
        file_name: file.name,
        storage_path: path,
        mime_type: file.type,
        size_bytes: file.size,
        doc_category: docCategory,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: FILES_KEY(userId ?? undefined) }),
  });

  const deleteFile = useMutation({
    mutationFn: async (file: ClientFile) => {
      await supabase.storage.from(CLIENT_FILES_BUCKET).remove([file.storagePath]);
      const { error } = await clientFilesDb().delete().eq("id", file.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: FILES_KEY(userId ?? undefined) }),
  });

  const getSignedUrl = React.useCallback(async (path: string) => {
    const { data, error } = await supabase.storage
      .from(CLIENT_FILES_BUCKET)
      .createSignedUrl(path, 60 * 10);
    if (error) throw error;
    return data.signedUrl;
  }, []);

  return React.useMemo(
    () => ({
      list: query.data ?? [],
      files: filesQuery.data ?? [],
      isLoading: query.isLoading,
      isError: query.isError,
      add: (c: SavedClientInput) => addMutation.mutateAsync(c),
      update: (id: string, patch: Partial<SavedClient>) =>
        updateMutation.mutateAsync({ id, patch }),
      remove: (id: string) => removeMutation.mutateAsync(id),
      uploadFile: (clientId: string, file: File, docCategory: ClientDocCategory) =>
        uploadFile.mutateAsync({ clientId, file, docCategory }),
      deleteFile: deleteFile.mutateAsync,
      getSignedUrl,
    }),
    [
      query.data,
      filesQuery.data,
      query.isLoading,
      query.isError,
      addMutation,
      updateMutation,
      removeMutation,
      uploadFile,
      deleteFile,
      getSignedUrl,
    ],
  );
}

export function ClientsProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
