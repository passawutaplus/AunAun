import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sharedDb } from "@/integrations/supabase/db";
import { useAuth } from "@/hooks/useAuth";
import { useSendMessage } from "@/hooks/useChat";
import { allocateDocNumber } from "@/lib/documents/numbering";
import {
  offerToInvoiceDocument,
  offerToQuotationDocument,
  offerToReceiptDocument,
} from "@/lib/documents/offerToDocument";
import {
  encodeStudioDocCard,
  paymentMethodLabel,
  summarizeStudioDocs,
  todayBangkok,
  type StudioDocumentRow,
} from "@/lib/documents/studioDocuments";
import {
  offerInstallmentAmounts,
  offerWhtAmount,
  partyDisplayName,
  type ChatOfferPayload,
} from "@/lib/chatOffer";
import { thbToSatang } from "@/lib/payments/fees";

const TABLE = "studio_documents" as never;

export const studioDocKeys = {
  all: ["studio-documents"] as const,
  conversation: (id: string) =>
    ["studio-documents", "conversation", id] as const,
  mine: (uid: string) => ["studio-documents", "mine", uid] as const,
  summary: (uid: string) => ["studio-documents", "summary", uid] as const,
  one: (id: string) => ["studio-documents", "one", id] as const,
};

function clientNameOf(offer: ChatOfferPayload): string | null {
  const c = offer.party?.client;
  const name = c ? partyDisplayName(c) : offer.clientName || "";
  return name?.trim() ? name.trim().slice(0, 200) : null;
}

function offerMoney(offer: ChatOfferPayload) {
  const amount = offer.amount || 0;
  const whtOn = offer.whtApplicable ?? offer.whtEnabled === true;
  const wht = whtOn ? offerWhtAmount(amount, offer.whtRate ?? 3) : 0;
  return {
    amount_satang: thbToSatang(amount),
    wht_satang: thbToSatang(wht),
    net_satang: thbToSatang(Math.max(0, amount - wht)),
  };
}

/** Every document attached to one chat (both sides can read). */
export function useConversationStudioDocs(
  conversationId: string | null | undefined,
) {
  return useQuery({
    queryKey: studioDocKeys.conversation(conversationId || "none"),
    enabled: !!conversationId,
    staleTime: 10_000,
    queryFn: async (): Promise<StudioDocumentRow[]> => {
      const { data, error } = await sharedDb
        .from(TABLE)
        .select("*")
        .eq("conversation_id" as never, conversationId as never)
        .order("created_at" as never, { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as StudioDocumentRow[];
    },
  });
}

/** All documents I issued (My Studio). */
export function useMyStudioDocs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: studioDocKeys.mine(user?.id || "anon"),
    enabled: !!user?.id,
    staleTime: 15_000,
    queryFn: async (): Promise<StudioDocumentRow[]> => {
      const { data, error } = await sharedDb
        .from(TABLE)
        .select("*")
        .eq("owner_id" as never, user!.id as never)
        .order("created_at" as never, { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as unknown as StudioDocumentRow[];
    },
  });
}

/** Columns summarizeStudioDocs reads — badges skip the offer / snapshot JSON. */
const SUMMARY_COLUMNS =
  "id, kind, status, due_date, client_marked_paid_at, net_satang, paid_at, issue_date, invoice_id";

/** Lightweight money summary of my documents (sidebar badge). */
export function useMyStudioDocSummary() {
  const { user } = useAuth();
  return useQuery({
    queryKey: studioDocKeys.summary(user?.id || "anon"),
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await sharedDb
        .from(TABLE)
        .select(SUMMARY_COLUMNS)
        .eq("owner_id" as never, user!.id as never)
        .neq("status" as never, "void" as never)
        .limit(2000);
      if (error) throw error;
      return summarizeStudioDocs((data ?? []) as unknown as StudioDocumentRow[]);
    },
  });
}

function cachedConversationDoc(
  qc: ReturnType<typeof useQueryClient>,
  id: string | null | undefined,
) {
  if (!id) return undefined;
  for (const q of qc
    .getQueryCache()
    .findAll({ queryKey: ["studio-documents", "conversation"] })) {
    const row = (q.state.data as StudioDocumentRow[] | undefined)?.find(
      (d) => d.id === id,
    );
    if (row) return { row, updatedAt: q.state.dataUpdatedAt };
  }
  return undefined;
}

export function useStudioDoc(id: string | null | undefined) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: studioDocKeys.one(id || "none"),
    enabled: !!id,
    staleTime: 10_000,
    // Chat cards reuse the row the conversation list already loaded (no request per card).
    initialData: () => cachedConversationDoc(qc, id)?.row,
    initialDataUpdatedAt: () => cachedConversationDoc(qc, id)?.updatedAt,
    queryFn: async (): Promise<StudioDocumentRow | null> => {
      const { data, error } = await sharedDb
        .from(TABLE)
        .select("*")
        .eq("id" as never, id as never)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as StudioDocumentRow | null;
    },
  });
}

function useInvalidateDocs() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: studioDocKeys.all });
}

async function insertDoc(
  row: Record<string, unknown>,
): Promise<StudioDocumentRow> {
  const { data, error } = await sharedDb
    .from(TABLE)
    .insert(row as never)
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as StudioDocumentRow;
}

async function updateDoc(
  id: string,
  patch: Record<string, unknown>,
): Promise<StudioDocumentRow> {
  const { data, error } = await sharedDb
    .from(TABLE)
    .update(patch as never)
    .eq("id" as never, id as never)
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as StudioDocumentRow;
}

/**
 * Record a sent quotation (called right before the offer message goes out).
 * Also used to start tracking an older in-chat offer that has no row yet.
 */
export function useIssueQuotation() {
  const invalidate = useInvalidateDocs();
  return useMutation({
    mutationFn: async (args: {
      offer: ChatOfferPayload;
      conversationId: string | null;
      status?: "sent" | "accepted";
    }): Promise<StudioDocumentRow> => {
      const { offer, conversationId } = args;
      const number = offer.number || (await allocateDocNumber("quotation"));
      // Re-tracking an offer that already has a row → return it.
      const { data: existing } = await sharedDb
        .from(TABLE)
        .select("*")
        .eq("doc_number" as never, number as never)
        .maybeSingle();
      if (existing) return existing as unknown as StudioDocumentRow;
      const stored: ChatOfferPayload = {
        ...offer,
        number,
        internalNotes: offer.internalNotes,
      };
      return insertDoc({
        conversation_id: conversationId,
        kind: "quotation",
        doc_number: number,
        status: args.status ?? "sent",
        title: offer.title.slice(0, 200),
        client_name: clientNameOf(offer),
        ...offerMoney(offer),
        due_date: offer.validUntil || null,
        offer: stored,
        snapshot: offerToQuotationDocument(stored),
      });
    },
    onSuccess: () => void invalidate(),
  });
}

/** Freelancer: send the invoice for installment N of a quotation (posts a card in chat). */
export function useIssueInvoice() {
  const invalidate = useInvalidateDocs();
  const send = useSendMessage();
  return useMutation({
    mutationFn: async (args: {
      quote: StudioDocumentRow;
      installmentNo: number;
      dueDate: string | null;
      notes?: string | null;
      paidNos?: number[];
      promptPayId?: string | null;
    }): Promise<StudioDocumentRow> => {
      const { quote, installmentNo } = args;
      if (!quote.offer) throw new Error("ใบเสนอราคานี้ไม่มีข้อมูลรายการ");
      const rows = offerInstallmentAmounts(quote.offer);
      const row = rows[installmentNo - 1];
      if (!row) throw new Error("ไม่พบงวดนี้");
      const number = await allocateDocNumber("invoice");
      const snapshot = offerToInvoiceDocument(quote.offer, installmentNo, {
        docNumber: number,
        dueDate: args.dueDate,
        paidNos: args.paidNos,
        notes: args.notes ?? null,
        promptPayId: args.promptPayId ?? null,
      });
      const doc = await insertDoc({
        conversation_id: quote.conversation_id,
        client_user_id: quote.client_user_id,
        kind: "invoice",
        doc_number: number,
        status: "sent",
        quote_id: quote.id,
        installment_no: installmentNo,
        installment_total: rows.length,
        title: quote.title,
        client_name: quote.client_name,
        amount_satang: thbToSatang(row.gross),
        wht_satang: thbToSatang(row.wht),
        net_satang: thbToSatang(row.net),
        due_date: args.dueDate,
        offer: quote.offer,
        snapshot,
      });
      if (quote.conversation_id) {
        await send.mutateAsync({
          conversationId: quote.conversation_id,
          content: encodeStudioDocCard({
            id: doc.id,
            kind: "invoice",
            number,
            title: quote.title,
            net: row.net,
            installmentNo,
            installmentTotal: rows.length,
            installmentLabel: row.installment.label,
            dueDate: args.dueDate,
          }),
          messageType: "text",
        });
      }
      return doc;
    },
    onSuccess: () => void invalidate(),
  });
}

/**
 * Freelancer: record that installment N was paid → issues the receipt (and closes the invoice).
 * Works with or without an invoice for that installment.
 */
export function useRecordPayment() {
  const invalidate = useInvalidateDocs();
  const send = useSendMessage();
  return useMutation({
    mutationFn: async (args: {
      quote: StudioDocumentRow;
      installmentNo: number;
      invoice: StudioDocumentRow | null;
      paidDate: string;
      method: string;
      paidNos?: number[];
    }): Promise<StudioDocumentRow> => {
      const { quote, installmentNo, invoice } = args;
      if (!quote.offer) throw new Error("ใบเสนอราคานี้ไม่มีข้อมูลรายการ");
      const rows = offerInstallmentAmounts(quote.offer);
      const row = rows[installmentNo - 1];
      if (!row) throw new Error("ไม่พบงวดนี้");
      const paidAt = new Date(`${args.paidDate}T12:00:00+07:00`).toISOString();
      const number = await allocateDocNumber("receipt");
      const paidNos = Array.from(
        new Set([...(args.paidNos ?? []), installmentNo]),
      );
      const snapshot = offerToReceiptDocument(quote.offer, installmentNo, {
        docNumber: number,
        invoiceNumber: invoice?.doc_number,
        paidAt,
        paymentMethodLabel: paymentMethodLabel(args.method),
        paidNos,
      });
      const receipt = await insertDoc({
        conversation_id: quote.conversation_id,
        client_user_id: quote.client_user_id,
        kind: "receipt",
        doc_number: number,
        status: "paid",
        quote_id: quote.id,
        invoice_id: invoice?.id ?? null,
        installment_no: installmentNo,
        installment_total: rows.length,
        title: quote.title,
        client_name: quote.client_name,
        amount_satang: thbToSatang(row.gross),
        wht_satang: thbToSatang(row.wht),
        net_satang: thbToSatang(row.net),
        issue_date: args.paidDate,
        paid_at: paidAt,
        payment_method: args.method,
        offer: quote.offer,
        snapshot,
      });
      if (invoice) {
        await updateDoc(invoice.id, {
          status: "paid",
          paid_at: paidAt,
          payment_method: args.method,
        });
      }
      if (quote.status === "sent") {
        // Paying means the deal is on, even if nobody pressed "accept".
        await updateDoc(quote.id, { status: "accepted" }).catch(
          () => undefined,
        );
      }
      if (quote.conversation_id) {
        await send.mutateAsync({
          conversationId: quote.conversation_id,
          content: encodeStudioDocCard({
            id: receipt.id,
            kind: "receipt",
            number,
            title: quote.title,
            net: row.net,
            installmentNo,
            installmentTotal: rows.length,
            installmentLabel: row.installment.label,
          }),
          messageType: "text",
        });
      }
      return receipt;
    },
    onSuccess: () => void invalidate(),
  });
}

/** Freelancer: cancel a document (kept for the record, shown as ยกเลิกแล้ว). */
export function useVoidStudioDoc() {
  const invalidate = useInvalidateDocs();
  return useMutation({
    mutationFn: async (doc: StudioDocumentRow) => {
      const patch: Record<string, unknown> = { status: "void" };
      const updated = await updateDoc(doc.id, patch);
      // Voiding a receipt re-opens its invoice.
      if (doc.kind === "receipt" && doc.invoice_id) {
        await updateDoc(doc.invoice_id, {
          status: "sent",
          paid_at: null,
        }).catch(() => undefined);
      }
      return updated;
    },
    onSuccess: () => void invalidate(),
  });
}

/** Freelancer: mark a quotation accepted manually (client agreed outside the button). */
export function useSetQuotationStatus() {
  const invalidate = useInvalidateDocs();
  return useMutation({
    mutationFn: async (args: {
      doc: StudioDocumentRow;
      status: "accepted" | "declined" | "sent";
    }) =>
      updateDoc(args.doc.id, {
        status: args.status,
        responded_at: new Date().toISOString(),
      }),
    onSuccess: () => void invalidate(),
  });
}

/** Client: accept / decline a quotation, or report "โอนแล้ว" on an invoice. */
export function useClientRespondDoc() {
  const invalidate = useInvalidateDocs();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (args: {
      docId: string;
      action: "accept" | "decline" | "mark_paid";
      note?: string;
    }) => {
      if (!user?.id) throw new Error("กรุณาเข้าสู่ระบบ");
      const { data, error } = await sharedDb.rpc(
        "studio_doc_client_respond" as never,
        {
          p_doc_id: args.docId,
          p_action: args.action,
          p_note: args.note ?? null,
        } as never,
      );
      if (error) throw error;
      return data as unknown as StudioDocumentRow;
    },
    onSuccess: () => void invalidate(),
  });
}

export { todayBangkok };
