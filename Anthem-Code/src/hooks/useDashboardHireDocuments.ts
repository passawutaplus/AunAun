import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase, sharedDb } from "@/integrations/supabase/client";
import type { BusinessDocument } from "@/lib/documents/documentPayload";
import type { HireDocumentKind, HireWhtStatus } from "@/lib/payments/types";
import { isBenignQueryError } from "@/lib/supabaseErrors";
import type { HireDocumentRow, HireWhtDocRow } from "@/hooks/useHireOrderFlow";

export type DashboardHireDocItem = {
  id: string;
  source: "hire_document" | "wht";
  kind: HireDocumentKind;
  docNumber: string;
  issuedAt: string;
  hireOrderId: string;
  hiringRequestId: string | null;
  projectTitle: string | null;
  fileUrl: string | null;
  snapshot: BusinessDocument | null;
  whtMethod?: "upload" | "post" | null;
  whtStatus?: HireWhtStatus | null;
  whtConfirmed?: boolean;
};

type OrderLite = {
  id: string;
  hiring_request_id: string | null;
  buyer_id: string;
  seller_id: string;
  wht_satang?: number | null;
  wht_status?: HireWhtStatus | null;
};

async function fetchOrdersForUser(userId: string): Promise<OrderLite[]> {
  const { data, error } = await sharedDb
    .from("hire_orders" as never)
    .select("id,hiring_request_id,buyer_id,seller_id,wht_satang,wht_status")
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    if (isBenignQueryError(error)) return [];
    throw error;
  }
  return (data ?? []) as OrderLite[];
}

async function fetchTitles(requestIds: string[]): Promise<Record<string, string>> {
  if (!requestIds.length) return {};
  const { data, error } = await supabase
    .from("hiring_requests")
    .select("id,project_title")
    .in("id", requestIds);
  if (error) return {};
  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    const r = row as { id: string; project_title: string | null };
    if (r.project_title) map[r.id] = r.project_title;
  }
  return map;
}

function mapHireDocs(
  docs: HireDocumentRow[],
  orderById: Map<string, OrderLite>,
  titles: Record<string, string>,
): DashboardHireDocItem[] {
  return docs.map((doc) => {
    const order = orderById.get(doc.hire_order_id);
    const reqId = order?.hiring_request_id ?? null;
    return {
      id: doc.id,
      source: "hire_document" as const,
      kind: doc.kind,
      docNumber: doc.doc_number,
      issuedAt: doc.issued_at,
      hireOrderId: doc.hire_order_id,
      hiringRequestId: reqId,
      projectTitle: reqId ? titles[reqId] ?? null : null,
      fileUrl: doc.file_url,
      snapshot: doc.snapshot ?? null,
    };
  });
}

function mapWhtDocs(
  rows: (HireWhtDocRow & { created_at?: string })[],
  orderById: Map<string, OrderLite>,
  titles: Record<string, string>,
): DashboardHireDocItem[] {
  return rows.map((row) => {
    const order = orderById.get(row.hire_order_id);
    const reqId = order?.hiring_request_id ?? null;
    const year = (row.created_at ? new Date(row.created_at) : new Date()).getFullYear();
    return {
      id: `wht-${row.id}`,
      source: "wht" as const,
      kind: "wht_cert" as const,
      docNumber: `WHT-${year}-${row.id.slice(0, 8).toUpperCase()}`,
      issuedAt: row.created_at ?? new Date().toISOString(),
      hireOrderId: row.hire_order_id,
      hiringRequestId: reqId,
      projectTitle: reqId ? titles[reqId] ?? null : null,
      fileUrl: row.file_url,
      snapshot: null,
      whtMethod: row.method,
      whtStatus: order?.wht_status ?? null,
      whtConfirmed: !!row.received_confirmed_at,
    };
  });
}

/** All hire business docs + WHT certs for the signed-in user (buyer or seller). */
export function useDashboardHireDocuments(userId: string | undefined) {
  return useQuery({
    queryKey: ["dashboard-hire-documents", userId],
    enabled: !!userId,
    queryFn: async (): Promise<DashboardHireDocItem[]> => {
      const orders = await fetchOrdersForUser(userId!);
      if (!orders.length) return [];

      const orderIds = orders.map((o) => o.id);
      const orderById = new Map(orders.map((o) => [o.id, o]));
      const requestIds = [
        ...new Set(orders.map((o) => o.hiring_request_id).filter(Boolean) as string[]),
      ];

      const [docsRes, whtRes, titles] = await Promise.all([
        sharedDb
          .from("hire_documents" as never)
          .select("id,hire_order_id,quote_id,kind,doc_number,snapshot,file_url,issued_at")
          .in("hire_order_id", orderIds)
          .order("issued_at", { ascending: false }),
        sharedDb
          .from("hire_wht_docs" as never)
          .select("id,hire_order_id,method,file_url,uploaded_by,received_confirmed_at,received_confirmed_by,note,created_at")
          .in("hire_order_id", orderIds)
          .order("created_at", { ascending: false }),
        fetchTitles(requestIds),
      ]);

      if (docsRes.error && !isBenignQueryError(docsRes.error)) throw docsRes.error;
      if (whtRes.error && !isBenignQueryError(whtRes.error)) throw whtRes.error;

      const docs = (docsRes.data ?? []) as unknown as HireDocumentRow[];
      const wht = (whtRes.data ?? []) as unknown as (HireWhtDocRow & { created_at?: string })[];

      const items = [
        ...mapHireDocs(docs, orderById, titles),
        ...mapWhtDocs(wht, orderById, titles),
      ];
      items.sort((a, b) => +new Date(b.issuedAt) - +new Date(a.issuedAt));
      return items;
    },
  });
}

/** Docs for a single hiring request (dashboard card strip). */
export function useHireDocumentsByRequest(requestId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["hire-documents-by-request", requestId],
    enabled: !!requestId && enabled,
    queryFn: async (): Promise<DashboardHireDocItem[]> => {
      const { data: orders, error: orderErr } = await sharedDb
        .from("hire_orders" as never)
        .select("id,hiring_request_id,buyer_id,seller_id,wht_satang,wht_status")
        .eq("hiring_request_id", requestId!)
        .limit(20);
      if (orderErr) {
        if (isBenignQueryError(orderErr)) return [];
        throw orderErr;
      }
      const orderList = (orders ?? []) as OrderLite[];
      if (!orderList.length) return [];

      const orderIds = orderList.map((o) => o.id);
      const orderById = new Map(orderList.map((o) => [o.id, o]));
      const titles = await fetchTitles([requestId!]);

      const [docsRes, whtRes] = await Promise.all([
        sharedDb
          .from("hire_documents" as never)
          .select("id,hire_order_id,quote_id,kind,doc_number,snapshot,file_url,issued_at")
          .in("hire_order_id", orderIds)
          .order("issued_at", { ascending: true }),
        sharedDb
          .from("hire_wht_docs" as never)
          .select("id,hire_order_id,method,file_url,uploaded_by,received_confirmed_at,received_confirmed_by,note,created_at")
          .in("hire_order_id", orderIds),
      ]);

      if (docsRes.error && !isBenignQueryError(docsRes.error)) throw docsRes.error;
      if (whtRes.error && !isBenignQueryError(whtRes.error)) throw whtRes.error;

      const docs = (docsRes.data ?? []) as unknown as HireDocumentRow[];
      const wht = (whtRes.data ?? []) as unknown as (HireWhtDocRow & { created_at?: string })[];
      return [
        ...mapHireDocs(docs, orderById, titles),
        ...mapWhtDocs(wht, orderById, titles),
      ];
    },
  });
}

export function useFilteredDashboardHireDocs(
  items: DashboardHireDocItem[] | undefined,
  filters: { year: string; kind: string; q: string },
) {
  return useMemo(() => {
    const list = items ?? [];
    const q = filters.q.trim().toLowerCase();
    return list.filter((item) => {
      if (filters.year !== "all") {
        const y = String(new Date(item.issuedAt).getFullYear());
        if (y !== filters.year) return false;
      }
      if (filters.kind !== "all" && item.kind !== filters.kind) return false;
      if (q) {
        const hay = `${item.docNumber} ${item.projectTitle ?? ""} ${item.kind}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, filters.year, filters.kind, filters.q]);
}
