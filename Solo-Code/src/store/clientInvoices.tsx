import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";

export type InvoiceStatus = "paid" | "ontime" | "late7" | "late30";

export interface ClientInvoice {
  id: string;
  name: string;
  project?: string;
  amount: number;
  status: InvoiceStatus;
  dueDate?: string; // YYYY-MM-DD
  createdAt: string;
}

export type ClientInvoiceInput = Omit<ClientInvoice, "id" | "createdAt">;

export interface InvoiceStatusHistory {
  id: string;
  invoiceId: string;
  fromStatus: InvoiceStatus | null;
  toStatus: InvoiceStatus;
  note: string | null;
  changedAt: string;
}

interface InvoiceRow {
  id: string;
  user_id: string;
  name: string;
  project: string | null;
  amount: number;
  due_date: string | null;
  status: InvoiceStatus;
  meta: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

function rowToInvoice(r: InvoiceRow): ClientInvoice {
  return {
    id: r.id,
    name: r.name,
    project: r.project ?? undefined,
    amount: Number(r.amount),
    status: r.status,
    dueDate: r.due_date ?? undefined,
    createdAt: r.created_at,
  };
}

export function invoicesKey(userId: string | null) {
  return ["client_invoices", userId] as const;
}
export function invoiceHistoryKey(invoiceId: string) {
  return ["invoice_status_history", invoiceId] as const;
}

export function useClientInvoices() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: invoicesKey(userId),
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return [];
      // Auto-update late statuses on load (RLS-scoped)
      try {
        await supabase.rpc("auto_update_invoice_statuses");
      } catch {
        // non-fatal
      }
      const { data, error } = await supabase
        .from("finance_clients_invoices")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => rowToInvoice(r as unknown as InvoiceRow));
    },
  });

  const addMutation = useMutation({
    mutationFn: async (c: ClientInvoiceInput) => {
      if (!userId) throw new Error("ต้องเข้าสู่ระบบก่อน");
      const { data, error } = await supabase
        .from("finance_clients_invoices")
        .insert({
          user_id: userId,
          name: c.name,
          project: c.project || null,
          amount: c.amount,
          due_date: c.dueDate || null,
          status: c.status,
        })
        .select()
        .single();
      if (error) throw error;
      return rowToInvoice(data as unknown as InvoiceRow);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: invoicesKey(userId) }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<ClientInvoiceInput> }) => {
      const row: {
        name?: string;
        project?: string | null;
        amount?: number;
        due_date?: string | null;
        status?: InvoiceStatus;
      } = {};
      if (patch.name !== undefined) row.name = patch.name;
      if (patch.project !== undefined) row.project = patch.project || null;
      if (patch.amount !== undefined) row.amount = patch.amount;
      if (patch.dueDate !== undefined) row.due_date = patch.dueDate || null;
      if (patch.status !== undefined) row.status = patch.status;
      const { error } = await supabase.from("finance_clients_invoices").update(row).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: invoicesKey(userId) }),
  });

  const setStatusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      note,
    }: {
      id: string;
      status: InvoiceStatus;
      note?: string;
    }) => {
      // Embed note in meta so the trigger can pick it up
      const { data: cur, error: e0 } = await supabase
        .from("finance_clients_invoices")
        .select("meta")
        .eq("id", id)
        .single();
      if (e0) throw e0;
      const meta = {
        ...((cur?.meta as Record<string, unknown>) ?? {}),
        status_change_note: note ?? null,
      };
      const { error } = await supabase
        .from("finance_clients_invoices")
        .update({ status, meta })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: invoicesKey(userId) });
      qc.invalidateQueries({ queryKey: invoiceHistoryKey(vars.id) });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("finance_clients_invoices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: invoicesKey(userId) }),
  });

  return React.useMemo(
    () => ({
      list: query.data ?? [],
      isLoading: query.isLoading,
      isError: query.isError,
      add: (c: ClientInvoiceInput) => addMutation.mutateAsync(c),
      update: (id: string, patch: Partial<ClientInvoiceInput>) =>
        updateMutation.mutateAsync({ id, patch }),
      setStatus: (id: string, status: InvoiceStatus, note?: string) =>
        setStatusMutation.mutateAsync({ id, status, note }),
      remove: (id: string) => removeMutation.mutateAsync(id),
    }),
    [
      query.data,
      query.isLoading,
      query.isError,
      addMutation,
      updateMutation,
      setStatusMutation,
      removeMutation,
    ],
  );
}

export function useInvoiceStatusHistory(invoiceId: string | null) {
  return useQuery({
    queryKey: invoiceHistoryKey(invoiceId ?? ""),
    enabled: !!invoiceId,
    queryFn: async () => {
      if (!invoiceId) return [] as InvoiceStatusHistory[];
      const { data, error } = await supabase
        .from("finance_invoice_status_history")
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("changed_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id as string,
        invoiceId: r.invoice_id as string,
        fromStatus: (r.from_status as InvoiceStatus | null) ?? null,
        toStatus: r.to_status as InvoiceStatus,
        note: (r.note as string | null) ?? null,
        changedAt: r.changed_at as string,
      })) as InvoiceStatusHistory[];
    },
  });
}

export const STATUS_LABEL: Record<InvoiceStatus, string> = {
  paid: "จ่ายแล้ว",
  ontime: "ตรงเวลา",
  late7: "เลท 7 วัน",
  late30: "เลท 1 เดือน",
};
