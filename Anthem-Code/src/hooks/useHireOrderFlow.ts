import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, sharedDb } from "@/integrations/supabase/client";
import { billingToParty, type BillingProfileFields } from "@/lib/billingProfile";
import { encodeHireDeliveryMessage } from "@/lib/hireDeliveryChat";
import { issuePlatformFeeReceiptForOrder, type HireOrderDocContext } from "@/lib/documents/issueHireDocuments";
import {
  canOpenSellerDispute,
  DISPUTE_SILENCE_DAYS,
  disputeEligibleAt,
  nextHireOrderStatus,
} from "@/lib/payments/hireOrder";
import type { HireOrderStatus, HireWhtStatus } from "@/lib/payments/types";
import { getSupabaseErrorMessage, isBenignQueryError, isMissingResourceError } from "@/lib/supabaseErrors";
import { sharedStorage, SHARED_MEDIA_BUCKET } from "@/integrations/supabase/sharedStorageClient";
import { toast } from "sonner";

export type HireOrderRow = {
  id: string;
  hiring_request_id: string | null;
  conversation_id: string | null;
  buyer_id: string;
  seller_id: string;
  status: HireOrderStatus;
  job_price_satang: number;
  buyer_pays_satang: number;
  seller_net_satang: number;
  platform_fee_percent: number;
  platform_fee_satang: number;
  wht_satang?: number;
  wht_status?: HireWhtStatus;
  auto_dispute_at?: string | null;
  work_submitted_at?: string | null;
  approved_at?: string | null;
  quote_id?: string | null;
  payment_method?: string | null;
};

export type HireDeliveryRow = {
  id: string;
  hire_order_id: string;
  links: string[];
  files: { name?: string; url?: string }[];
  note: string | null;
  revision: number;
  submitted_by: string;
  submitted_at: string;
};

export type HireWhtDocRow = {
  id: string;
  hire_order_id: string;
  method: "upload" | "post";
  file_url: string | null;
  uploaded_by: string | null;
  received_confirmed_at: string | null;
  received_confirmed_by: string | null;
  note: string | null;
};

const HIRE_ORDER_SELECT =
  "id,hiring_request_id,conversation_id,buyer_id,seller_id,status,job_price_satang,buyer_pays_satang,seller_net_satang,platform_fee_percent,platform_fee_satang,wht_satang,wht_status,auto_dispute_at,work_submitted_at,approved_at,quote_id,payment_method";

function missingTableMessage(err: unknown): string {
  if (isMissingResourceError(err as { message?: string; code?: string })) {
    return "ระบบชำระเงินยังไม่พร้อม — ติดต่อทีมงานหรือลองใหม่ภายหลัง";
  }
  return getSupabaseErrorMessage(err);
}

async function fetchBillingParty(userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select(
      "billing_type,legal_name,company_name,tax_id,billing_address,branch,contact_person,contact_role,vat_registered,display_name,email,phone",
    )
    .eq("user_id", userId)
    .maybeSingle();
  return billingToParty((data ?? null) as BillingProfileFields | null);
}

async function countDeliveries(orderId: string): Promise<number> {
  const { count, error } = await sharedDb
    .from("hire_deliveries" as never)
    .select("id", { count: "exact", head: true })
    .eq("hire_order_id", orderId);
  if (error && !isBenignQueryError(error)) throw error;
  return count ?? 0;
}

export function labelHireOrderStatus(status: HireOrderStatus): string {
  switch (status) {
    case "awaiting_payment":
      return "รอชำระเงิน";
    case "deposit_paid":
      return "ชำระมัดจำแล้ว";
    case "paid_pending":
      return "ชำระแล้ว — รอส่งงาน";
    case "in_progress":
      return "กำลังทำงาน";
    case "awaiting_approval":
      return "รอยืนยันรับผลงาน";
    case "available":
      return "ปล่อยเงินแล้ว";
    case "disputed":
      return "ข้อพิพาท";
    case "cancelled":
      return "ยกเลิก";
    case "refunded":
      return "คืนเงินแล้ว";
    case "partially_refunded":
      return "คืนเงินบางส่วน";
    case "failed":
      return "ชำระไม่สำเร็จ";
    default:
      return status;
  }
}

export function useHireOrderByRequest(hiringRequestId: string | undefined) {
  return useQuery({
    queryKey: ["hire-order-by-request", hiringRequestId],
    enabled: !!hiringRequestId,
    queryFn: async () => {
      const { data, error } = await sharedDb
        .from("hire_orders" as never)
        .select(HIRE_ORDER_SELECT)
        .eq("hiring_request_id", hiringRequestId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        if (isBenignQueryError(error)) return null;
        throw error;
      }
      return (data as HireOrderRow | null) ?? null;
    },
    refetchInterval: 30_000,
  });
}

export function useHireOrderById(orderId: string | undefined) {
  return useQuery({
    queryKey: ["hire-order-by-id", orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const { data, error } = await sharedDb
        .from("hire_orders" as never)
        .select(HIRE_ORDER_SELECT)
        .eq("id", orderId!)
        .maybeSingle();
      if (error) {
        if (isBenignQueryError(error)) return null;
        throw error;
      }
      return (data as HireOrderRow | null) ?? null;
    },
  });
}

export function useHireDeliveries(orderId: string | undefined) {
  return useQuery({
    queryKey: ["hire-deliveries", orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const { data, error } = await sharedDb
        .from("hire_deliveries" as never)
        .select("*")
        .eq("hire_order_id", orderId!)
        .order("submitted_at", { ascending: false });
      if (error) {
        if (isBenignQueryError(error)) return [] as HireDeliveryRow[];
        throw error;
      }
      return (data ?? []) as HireDeliveryRow[];
    },
  });
}

export function useHireWhtDoc(orderId: string | undefined) {
  return useQuery({
    queryKey: ["hire-wht-doc", orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const { data, error } = await sharedDb
        .from("hire_wht_docs" as never)
        .select("*")
        .eq("hire_order_id", orderId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        if (isBenignQueryError(error)) return null;
        throw error;
      }
      return (data as HireWhtDocRow | null) ?? null;
    },
  });
}

export function useSubmitHireWork() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      orderId: string;
      conversationId: string;
      links: string[];
      note?: string;
      files?: { name: string; url: string }[];
      userId: string;
    }) => {
      const cleanLinks = input.links.map((l) => l.trim()).filter(Boolean);
      if (!cleanLinks.length) throw new Error("ใส่ลิงก์ผลงานอย่างน้อย 1 รายการ");

      const { data: order, error: orderErr } = await sharedDb
        .from("hire_orders" as never)
        .select(HIRE_ORDER_SELECT)
        .eq("id", input.orderId)
        .maybeSingle();
      if (orderErr) throw new Error(missingTableMessage(orderErr));
      if (!order) throw new Error("ไม่พบออเดอร์งานจ้าง");
      const row = order as HireOrderRow;
      if (row.seller_id !== input.userId) throw new Error("เฉพาะผู้รับงานส่งผลงานได้");
      if (!["paid_pending", "deposit_paid", "in_progress"].includes(row.status)) {
        throw new Error("ยังไม่ถึงขั้นตอนส่งผลงาน");
      }

      const revision = (await countDeliveries(input.orderId)) + 1;
      const now = new Date();
      const autoDisputeAt = disputeEligibleAt(now, DISPUTE_SILENCE_DAYS).toISOString();

      const { data: delivery, error: delErr } = await sharedDb
        .from("hire_deliveries" as never)
        .insert({
          hire_order_id: input.orderId,
          links: cleanLinks,
          files: input.files ?? [],
          note: input.note?.trim() || null,
          revision,
          submitted_by: input.userId,
        } as never)
        .select("*")
        .single();
      if (delErr) throw new Error(missingTableMessage(delErr));

      const nextStatus = nextHireOrderStatus(row.status, { type: "work_submitted" });
      const { error: updErr } = await sharedDb
        .from("hire_orders" as never)
        .update({
          status: nextStatus,
          work_submitted_at: now.toISOString(),
          auto_dispute_at: autoDisputeAt,
          updated_at: now.toISOString(),
        } as never)
        .eq("id", input.orderId);
      if (updErr) throw new Error(missingTableMessage(updErr));

      const del = delivery as HireDeliveryRow;
      try {
        await supabase.from("messages").insert({
          conversation_id: input.conversationId,
          sender_id: input.userId,
          content: encodeHireDeliveryMessage({
            v: 1,
            orderId: input.orderId,
            deliveryId: del.id,
            links: cleanLinks,
            note: del.note,
            revision,
            submittedAt: del.submitted_at,
          }),
          message_type: "text",
        } as never);
      } catch {
        /* chat card optional */
      }

      return del;
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ["hire-order-by-id", vars.orderId] });
      void qc.invalidateQueries({ queryKey: ["hire-deliveries", vars.orderId] });
      void qc.invalidateQueries({ queryKey: ["hire-order-by-request"] });
      toast.success("ส่งผลงานแล้ว — รอผู้จ้างยืนยัน");
    },
    onError: (e) => toast.error(getSupabaseErrorMessage(e)),
  });
}

export function useApproveHireWork() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      orderId: string;
      hiringRequestId: string;
      userId: string;
      projectTitle?: string;
    }) => {
      const { data: order, error: orderErr } = await sharedDb
        .from("hire_orders" as never)
        .select(HIRE_ORDER_SELECT)
        .eq("id", input.orderId)
        .maybeSingle();
      if (orderErr) throw new Error(missingTableMessage(orderErr));
      if (!order) throw new Error("ไม่พบออเดอร์งานจ้าง");
      const row = order as HireOrderRow;
      if (row.buyer_id !== input.userId) throw new Error("เฉพาะผู้จ้างยืนยันรับผลงานได้");
      if (row.status !== "awaiting_approval" && row.status !== "paid_pending") {
        throw new Error("ยังไม่มีผลงานรอยืนยัน");
      }

      const now = new Date().toISOString();
      const whtStatus: HireWhtStatus =
        (row.wht_satang ?? 0) > 0 ? "awaiting_cert" : row.wht_status ?? "none";

      const { error: updErr } = await sharedDb
        .from("hire_orders" as never)
        .update({
          status: "available",
          approved_at: now,
          available_at: now,
          wht_status: whtStatus,
          updated_at: now,
        } as never)
        .eq("id", input.orderId);
      if (updErr) throw new Error(missingTableMessage(updErr));

      try {
        await supabase
          .from("hiring_requests")
          .update({ status: "ปิดแล้ว" } as never)
          .eq("id", input.hiringRequestId);
      } catch {
        /* best-effort */
      }

      try {
        const buyer = await fetchBillingParty(row.buyer_id);
        const ctx: HireOrderDocContext = {
          id: row.id,
          jobPriceSatang: row.job_price_satang,
          platformFeeSatang: row.platform_fee_satang,
          platformFeePercent: Number(row.platform_fee_percent),
          sellerNetSatang: row.seller_net_satang,
          whtSatang: row.wht_satang,
          quoteId: row.quote_id,
          paymentMethodLabel: row.payment_method ?? null,
        };
        await issuePlatformFeeReceiptForOrder({
          db: sharedDb,
          order: ctx,
          projectTitle: input.projectTitle ?? "งานจ้าง Aplus1",
          buyer,
          createdBy: input.userId,
        });
      } catch {
        /* document optional */
      }

      return row;
    },
    onSuccess: (_row, vars) => {
      void qc.invalidateQueries({ queryKey: ["hire-order-by-id", vars.orderId] });
      void qc.invalidateQueries({ queryKey: ["hire-order-by-request", vars.hiringRequestId] });
      void qc.invalidateQueries({ queryKey: ["hiring_requests"] });
      toast.success("ยืนยันรับผลงานแล้ว — ปล่อยเงินให้ผู้รับงาน");
    },
    onError: (e) => toast.error(getSupabaseErrorMessage(e)),
  });
}

export function useOpenHireDispute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { orderId: string; reason: string; userId: string }) => {
      const reason = input.reason.trim();
      if (!reason) throw new Error("ระบุเหตุผลข้อพิพาท");

      const { data: order, error: orderErr } = await sharedDb
        .from("hire_orders" as never)
        .select(HIRE_ORDER_SELECT)
        .eq("id", input.orderId)
        .maybeSingle();
      if (orderErr) throw new Error(missingTableMessage(orderErr));
      if (!order) throw new Error("ไม่พบออเดอร์งานจ้าง");
      const row = order as HireOrderRow;
      if (row.seller_id !== input.userId) throw new Error("เฉพาะผู้รับงานเปิดข้อพิพาทได้");
      if (
        !canOpenSellerDispute({
          status: row.status,
          autoDisputeAt: row.auto_dispute_at,
        })
      ) {
        throw new Error(`เปิดข้อพิพาทได้หลังผู้จ้างเงียบ ${DISPUTE_SILENCE_DAYS} วัน`);
      }

      const { error: dispErr } = await sharedDb.from("payment_disputes" as never).insert({
        hire_order_id: input.orderId,
        status: "open",
        reason,
      } as never);
      if (dispErr) throw new Error(missingTableMessage(dispErr));

      const { error: updErr } = await sharedDb
        .from("hire_orders" as never)
        .update({ status: "disputed", updated_at: new Date().toISOString() } as never)
        .eq("id", input.orderId);
      if (updErr) throw new Error(missingTableMessage(updErr));
    },
    onSuccess: (_v, vars) => {
      void qc.invalidateQueries({ queryKey: ["hire-order-by-id", vars.orderId] });
      void qc.invalidateQueries({ queryKey: ["hire-order-by-request"] });
      toast.success("เปิดข้อพิพาทแล้ว — ทีมงานจะตรวจสอบ");
    },
    onError: (e) => toast.error(getSupabaseErrorMessage(e)),
  });
}

async function uploadWhtFile(file: File, userId: string): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
  const path = `hire-wht/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await sharedStorage.storage.from(SHARED_MEDIA_BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  const { data } = sharedStorage.storage.from(SHARED_MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export function useUploadHireWhtCert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      orderId: string;
      userId: string;
      method: "upload" | "post";
      file?: File | null;
      note?: string;
    }) => {
      const { data: order, error: orderErr } = await sharedDb
        .from("hire_orders" as never)
        .select("id,buyer_id,wht_satang,wht_status")
        .eq("id", input.orderId)
        .maybeSingle();
      if (orderErr) throw new Error(missingTableMessage(orderErr));
      if (!order) throw new Error("ไม่พบออเดอร์งานจ้าง");
      const row = order as { id: string; buyer_id: string; wht_satang?: number };
      if (row.buyer_id !== input.userId) throw new Error("เฉพาะผู้จ้างอัปโหลด 50 ทวิ ได้");
      if ((row.wht_satang ?? 0) <= 0) throw new Error("ออเดอร์นี้ไม่มีหัก ณ ที่จ่าย");

      let fileUrl: string | null = null;
      if (input.method === "upload") {
        if (!input.file) throw new Error("เลือกไฟล์หนังสือรับรอง 50 ทวิ");
        fileUrl = await uploadWhtFile(input.file, input.userId);
      }

      const { error: whtErr } = await sharedDb.from("hire_wht_docs" as never).insert({
        hire_order_id: input.orderId,
        method: input.method,
        file_url: fileUrl,
        uploaded_by: input.userId,
        note: input.note?.trim() || null,
      } as never);
      if (whtErr) throw new Error(missingTableMessage(whtErr));

      const { error: updErr } = await sharedDb
        .from("hire_orders" as never)
        .update({
          wht_status: input.method === "post" ? "awaiting_cert" : "awaiting_cert",
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", input.orderId);
      if (updErr) throw new Error(missingTableMessage(updErr));
    },
    onSuccess: (_v, vars) => {
      void qc.invalidateQueries({ queryKey: ["hire-wht-doc", vars.orderId] });
      void qc.invalidateQueries({ queryKey: ["hire-order-by-id", vars.orderId] });
      toast.success(
        vars.method === "post"
          ? "บันทึกแล้ว — จะส่ง 50 ทวิ ทางไปรษณีย์"
          : "อัปโหลด 50 ทวิ แล้ว — รอผู้รับงานยืนยัน",
      );
    },
    onError: (e) => toast.error(getSupabaseErrorMessage(e)),
  });
}

export function useConfirmHireWhtReceived() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { orderId: string; whtDocId: string; userId: string }) => {
      const { data: order, error: orderErr } = await sharedDb
        .from("hire_orders" as never)
        .select("id,seller_id")
        .eq("id", input.orderId)
        .maybeSingle();
      if (orderErr) throw new Error(missingTableMessage(orderErr));
      if (!order) throw new Error("ไม่พบออเดอร์งานจ้าง");
      const row = order as { id: string; seller_id: string };
      if (row.seller_id !== input.userId) throw new Error("เฉพาะผู้รับงานยืนยันรับ 50 ทวิ ได้");

      const now = new Date().toISOString();
      const { error: whtErr } = await sharedDb
        .from("hire_wht_docs" as never)
        .update({
          received_confirmed_at: now,
          received_confirmed_by: input.userId,
          updated_at: now,
        } as never)
        .eq("id", input.whtDocId);
      if (whtErr) throw new Error(missingTableMessage(whtErr));

      const { error: updErr } = await sharedDb
        .from("hire_orders" as never)
        .update({ wht_status: "complete", updated_at: now } as never)
        .eq("id", input.orderId);
      if (updErr) throw new Error(missingTableMessage(updErr));
    },
    onSuccess: (_v, vars) => {
      void qc.invalidateQueries({ queryKey: ["hire-wht-doc", vars.orderId] });
      void qc.invalidateQueries({ queryKey: ["hire-order-by-id", vars.orderId] });
      toast.success("ยืนยันรับหนังสือรับรอง 50 ทวิ แล้ว");
    },
    onError: (e) => toast.error(getSupabaseErrorMessage(e)),
  });
}

export { canOpenSellerDispute, DISPUTE_SILENCE_DAYS };
