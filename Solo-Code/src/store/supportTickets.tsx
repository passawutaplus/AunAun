import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";
import type {
  CreateTicketInput,
  TicketCategory,
  TicketPriority,
  TicketSource,
  TicketStatus,
} from "@/lib/ticketSchema";
import { appendMemberCodeToDescription } from "@/lib/userDisplayId";
import { compressImageFile, dataUrlToBlob } from "@/lib/imageCompress";
import { throwIfSupabaseError } from "@/lib/supabaseError";

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  userId: string;
  title: string;
  description: string | null;
  category: TicketCategory;
  source: TicketSource;
  sourceFeature: string | null;
  priority: TicketPriority;
  status: TicketStatus;
  adminNote: string | null;
  resolutionNote: string | null;
  rating: number | null;
  betaFeedbackId: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

export interface TicketAttachment {
  id: string;
  ticketId: string;
  userId: string;
  storagePath: string;
  fileName: string;
  mimeType: string | null;
  createdAt: string;
}

export interface TicketEvent {
  id: string;
  ticketId: string;
  actorId: string | null;
  eventType: string;
  oldValue: string | null;
  newValue: string | null;
  body: string | null;
  createdAt: string;
}

interface TicketRow {
  id: string;
  ticket_number: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string;
  source: string;
  source_feature: string | null;
  priority: string;
  status: string;
  admin_note: string | null;
  resolution_note: string | null;
  rating: number | null;
  beta_feedback_id: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

interface AttachmentRow {
  id: string;
  ticket_id: string;
  user_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  created_at: string;
}

interface EventRow {
  id: string;
  ticket_id: string;
  actor_id: string | null;
  event_type: string;
  old_value: string | null;
  new_value: string | null;
  body: string | null;
  created_at: string;
}

const KEY_MINE = (uid?: string) => ["support_tickets_mine", uid ?? "anon"] as const;
const KEY_ALL = ["support_tickets_all"] as const;
const KEY_EVENTS = (id: string) => ["ticket_events", id] as const;
const KEY_ATTACHMENTS = (id: string) => ["ticket_attachments", id] as const;

const BUCKET = "ticket-attachments";
const MAX_FILES = 3;
const MAX_BYTES = 5 * 1024 * 1024;

function rowToTicket(r: TicketRow): SupportTicket {
  return {
    id: r.id,
    ticketNumber: r.ticket_number,
    userId: r.user_id,
    title: r.title,
    description: r.description,
    category: r.category as SupportTicket["category"],
    source: r.source as SupportTicket["source"],
    sourceFeature: r.source_feature,
    priority: r.priority as SupportTicket["priority"],
    status: r.status as SupportTicket["status"],
    adminNote: r.admin_note,
    resolutionNote: r.resolution_note,
    rating: r.rating ?? null,
    betaFeedbackId: r.beta_feedback_id ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    closedAt: r.closed_at,
  };
}

function rowToAttachment(r: AttachmentRow): TicketAttachment {
  return {
    id: r.id,
    ticketId: r.ticket_id,
    userId: r.user_id,
    storagePath: r.storage_path,
    fileName: r.file_name,
    mimeType: r.mime_type,
    createdAt: r.created_at,
  };
}

function rowToEvent(r: EventRow): TicketEvent {
  return {
    id: r.id,
    ticketId: r.ticket_id,
    actorId: r.actor_id,
    eventType: r.event_type,
    oldValue: r.old_value,
    newValue: r.new_value,
    body: r.body,
    createdAt: r.created_at,
  };
}

async function uploadTicketFile(userId: string, ticketId: string, file: File) {
  if (file.size > MAX_BYTES) throw new Error("ไฟล์ใหญ่เกิน 5MB");

  let blob: Blob;
  let ext = "jpg";
  let contentType = "image/jpeg";

  if (
    file.type.startsWith("image/") &&
    file.type !== "image/svg+xml" &&
    file.type !== "image/gif"
  ) {
    const dataUrl = await compressImageFile(file);
    blob = dataUrlToBlob(dataUrl);
    if (blob.size > MAX_BYTES) throw new Error("ไม่สามารถบีบไฟล์ให้เล็กพอได้");
  } else if (file.type.startsWith("image/")) {
    blob = file;
    ext = file.name.split(".").pop() ?? "png";
    contentType = file.type;
  } else {
    throw new Error("รองรับเฉพาะไฟล์รูปภาพ");
  }

  const path = `${userId}/${ticketId}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType });
  if (upErr) throw new Error(upErr.message);

  return { path, fileName: file.name, mimeType: contentType };
}

export function useMyTickets() {
  const { user } = useAuth();
  const uid = user?.id;
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: KEY_MINE(uid),
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("support_tickets")
        .select("*")
        .eq("user_id", uid!)
        .order("updated_at", { ascending: false });
      throwIfSupabaseError(error);
      return (data as TicketRow[]).map(rowToTicket);
    },
  });

  const openCount = (list.data ?? []).filter(
    (t) => !["closed", "wont_fix"].includes(t.status),
  ).length;

  const create = useMutation({
    mutationFn: async (input: CreateTicketInput & { files?: File[] }) => {
      if (!uid) throw new Error("ต้องเข้าสู่ระบบ");

      const description = appendMemberCodeToDescription(input.description, uid);

      const { data: ticket, error } = await (supabase as any)
        .from("support_tickets")
        .insert({
          user_id: uid,
          title: input.title,
          description: description || null,
          category: input.category,
          source: input.source ?? "support_hub",
          source_feature: input.sourceFeature ?? null,
          rating: input.rating ?? null,
          beta_feedback_id: input.betaFeedbackId ?? null,
          priority: input.rating !== undefined && input.rating <= 2 ? "high" : "medium",
        })
        .select("*")
        .single();
      throwIfSupabaseError(error);

      const files = (input.files ?? []).slice(0, MAX_FILES);
      for (const file of files) {
        const uploaded = await uploadTicketFile(uid, ticket.id, file);
        const { error: attErr } = await (supabase as any).from("ticket_attachments").insert({
          ticket_id: ticket.id,
          user_id: uid,
          storage_path: uploaded.path,
          file_name: uploaded.fileName,
          mime_type: uploaded.mimeType,
        });
        throwIfSupabaseError(attErr);
      }

      return rowToTicket(ticket as TicketRow);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY_MINE(uid) });
      qc.invalidateQueries({ queryKey: KEY_ALL });
    },
  });

  const addComment = useMutation({
    mutationFn: async ({ ticketId, body }: { ticketId: string; body: string }) => {
      if (!uid) throw new Error("ต้องเข้าสู่ระบบ");
      const { error } = await (supabase as any).from("ticket_events").insert({
        ticket_id: ticketId,
        actor_id: uid,
        event_type: "comment",
        body: body.trim(),
      });
      throwIfSupabaseError(error);
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: KEY_EVENTS(vars.ticketId) });
    },
  });

  const linkBetaFeedback = useMutation({
    mutationFn: async ({
      ticketId,
      betaFeedbackId,
    }: {
      ticketId: string;
      betaFeedbackId: string;
    }) => {
      const { error } = await (supabase as any)
        .from("support_tickets")
        .update({ beta_feedback_id: betaFeedbackId })
        .eq("id", ticketId);
      throwIfSupabaseError(error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY_MINE(uid) }),
  });

  return {
    tickets: list.data ?? [],
    openCount,
    isLoading: list.isLoading,
    create: create.mutateAsync,
    linkBetaFeedback: linkBetaFeedback.mutateAsync,
    addComment: addComment.mutateAsync,
    refetch: list.refetch,
  };
}

export function useAllTickets() {
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: KEY_ALL,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("support_tickets")
        .select("*")
        .order("updated_at", { ascending: false });
      throwIfSupabaseError(error);
      return (data as TicketRow[]).map(rowToTicket);
    },
  });

  const update = useMutation({
    mutationFn: async (input: {
      id: string;
      status?: TicketStatus;
      priority?: TicketPriority;
      adminNote?: string | null;
      resolutionNote?: string | null;
    }) => {
      const patch: Record<string, unknown> = {};
      if (input.status !== undefined) patch.status = input.status;
      if (input.priority !== undefined) patch.priority = input.priority;
      if (input.adminNote !== undefined) patch.admin_note = input.adminNote;
      if (input.resolutionNote !== undefined) patch.resolution_note = input.resolutionNote;

      const { data, error } = await (supabase as any)
        .from("support_tickets")
        .update(patch)
        .eq("id", input.id)
        .select("*")
        .single();
      throwIfSupabaseError(error);
      return rowToTicket(data as TicketRow);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY_ALL });
      qc.invalidateQueries({ queryKey: ["support_tickets_mine"] });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("support_tickets").delete().eq("id", id);
      throwIfSupabaseError(error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY_ALL }),
  });

  const newCount = (list.data ?? []).filter((t) => t.status === "new").length;
  const criticalCount = (list.data ?? []).filter(
    (t) => t.priority === "critical" && !["closed", "wont_fix"].includes(t.status),
  ).length;

  return {
    tickets: list.data ?? [],
    isLoading: list.isLoading,
    newCount,
    criticalCount,
    update: update.mutateAsync,
    remove: remove.mutateAsync,
    refetch: list.refetch,
  };
}

export function useTicketEvents(ticketId: string | null) {
  return useQuery({
    queryKey: KEY_EVENTS(ticketId ?? "none"),
    enabled: !!ticketId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ticket_events")
        .select("*")
        .eq("ticket_id", ticketId!)
        .order("created_at", { ascending: true });
      throwIfSupabaseError(error);
      return (data as EventRow[]).map(rowToEvent);
    },
  });
}

export function useTicketAttachments(ticketId: string | null) {
  return useQuery({
    queryKey: KEY_ATTACHMENTS(ticketId ?? "none"),
    enabled: !!ticketId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ticket_attachments")
        .select("*")
        .eq("ticket_id", ticketId!)
        .order("created_at", { ascending: true });
      throwIfSupabaseError(error);
      return (data as AttachmentRow[]).map(rowToAttachment);
    },
  });
}

export async function getTicketAttachmentUrl(storagePath: string) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 3600);
  throwIfSupabaseError(error);
  return data.signedUrl;
}
