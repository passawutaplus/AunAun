import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { enqueueTemplateEmail } from "@/server/portalEmail.server";
import { notifyFreelancer, getFreelancerDisplayName } from "@/server/emailNotify.server";
import { enqueueLineNotificationForUser } from "@/server/lineNotify.server";
import { canonicalUrl } from "@/lib/siteUrl";
import { throwClientError } from "@/lib/security";
import { ESIGN_CONSENT_VERSION } from "@/lib/copyConstants";

const TokenSchema = z.object({ token: z.string().uuid() });

export type SignPayload = {
  quotation_id: string;
  number: string;
  project_name: string;
  client_name: string;
  status: string;
  signature_mode: string;
  include_freelancer_signature: boolean;
  client_signed_at: string | null;
  client_signer_name: string | null;
  client_signature_url: string | null;
  signed_document_url: string | null;
  client_sign_method: string | null;
  brand_name: string;
  logo_url: string | null;
  freelancer_signature_url: string | null;
};

function parsePayload(raw: unknown): SignPayload | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as SignPayload;
}

export const getSignPayloadByToken = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => TokenSchema.parse(data))
  .handler(async ({ data: input }) => {
    const token = TokenSchema.parse(input).token;
    const { data: raw, error } = await supabaseAdmin.rpc("get_quotation_sign_payload_by_token", {
      _token: token,
    });
    if (error) throwClientError("sign.getPayload", error, "ไม่พบเอกสารสำหรับลิงก์นี้");
    const payload = parsePayload(raw);
    if (!payload) return { payload: null as SignPayload | null };
    return { payload };
  });

const SignShareTokenSchema = z.object({ signShareToken: z.string().uuid() });

export const sendSignLinkToClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => SignShareTokenSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { data: q, error: qErr } = await supabaseAdmin
      .from("quotations")
      .select("id, number, project_name, client_name, client_email, signature_mode, user_id")
      .eq("sign_share_token", data.signShareToken)
      .eq("user_id", userId)
      .maybeSingle();

    if (qErr) throwClientError("sign.sendLink.lookup", qErr, "ไม่พบใบเสนอราคา");
    if (!q) throw new Error("ไม่พบใบเสนอราคา");

    if (!["online", "wet"].includes(q.signature_mode ?? "")) {
      throw new Error("ใบเสนอราคานี้ไม่ได้เปิดโหมดเซ็นออนไลน์");
    }

    const clientEmail = q.client_email?.trim();
    if (!clientEmail) {
      throw new Error("ยังไม่มีอีเมลลูกค้า — ใส่ในใบเสนอราคาก่อน");
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("brand_name, display_name")
      .eq("user_id", userId)
      .maybeSingle();

    const signUrl = canonicalUrl(`/sign/${data.signShareToken}`);
    const freelancerName = profile?.brand_name || profile?.display_name || "ฟรีแลนซ์";

    const result = await enqueueTemplateEmail({
      templateName: "quotation-portal",
      recipientEmail: clientEmail,
      templateData: {
        clientName: q.client_name ?? "ลูกค้า",
        freelancerName,
        projectName: q.project_name ?? "โปรเจกต์",
        portalUrl: signUrl,
        message: `กรุณาเปิดลิงก์เพื่อลงนามใบเสนอราคา ${q.number} — วาดลายเซ็นหรืออัปโหลดเอกสารที่เซ็นแล้ว`,
      },
      idempotencyKey: `sign-link-${q.id}-${Date.now().toString(36)}`,
    });

    if (!result.ok) {
      if (result.reason === "suppressed") throw new Error("อีเมลนี้ยกเลิกรับข่าวแล้ว");
      throw new Error("ส่งอีเมลไม่สำเร็จ — ลองใหม่อีกครั้ง");
    }

    return { ok: true as const, sentTo: clientEmail };
  });

const SubmitSignSchema = z.object({
  token: z.string().uuid(),
  name: z.string().min(1).max(120),
  method: z.enum(["draw", "full_document"]),
  signatureDataUrl: z.string().max(2_000_000).optional(),
  signedDocumentDataUrl: z.string().max(8_000_000).optional(),
  consentVersion: z.string().max(32).optional(),
  signerIp: z.string().max(64).optional(),
  signerUa: z.string().max(512).optional(),
});

function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; contentType: string; ext: string } {
  const [meta, base64 = ""] = dataUrl.split(",");
  const contentType = meta.match(/^data:([^;]+);base64$/)?.[1] ?? "application/octet-stream";
  const ext =
    contentType === "image/png"
      ? "png"
      : contentType === "image/jpeg"
        ? "jpg"
        : contentType === "application/pdf"
          ? "pdf"
          : "bin";
  return { buffer: Buffer.from(base64, "base64"), contentType, ext };
}

async function uploadClientSignFile(
  quotationId: string,
  dataUrl: string,
  prefix: string,
): Promise<string> {
  const { buffer, contentType, ext } = dataUrlToBuffer(dataUrl);
  if (buffer.length > 6 * 1024 * 1024) {
    throw new Error("ไฟล์ใหญ่เกินไป (สูงสุด 6MB)");
  }
  const path = `${quotationId}/${prefix}-${Date.now()}.${ext}`;
  const { error } = await supabaseAdmin.storage
    .from("brand-logos")
    .upload(path, buffer, { upsert: true, contentType });
  if (error) throw new Error("อัปโหลดไฟล์ไม่สำเร็จ");
  const { data } = supabaseAdmin.storage.from("brand-logos").getPublicUrl(path);
  return data.publicUrl;
}

export const submitSignByToken = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => SubmitSignSchema.parse(data))
  .handler(async ({ data }) => {
    const { data: qid, error: resolveErr } = await supabaseAdmin.rpc(
      "resolve_quotation_id_by_sign_token",
      { _token: data.token },
    );
    if (resolveErr) throwClientError("sign.submit.resolve", resolveErr, "ลิงก์ไม่ถูกต้อง");
    if (!qid) throw new Error("ลิงก์ไม่ถูกต้อง");

    const { data: qRow, error: qErr } = await supabaseAdmin
      .from("quotations")
      .select("id, user_id, number, project_name, client_name, client_signed_at")
      .eq("id", qid)
      .maybeSingle();
    if (qErr || !qRow) throw new Error("ไม่พบเอกสาร");

    if (qRow.client_signed_at) {
      throw new Error("เอกสารนี้ถูกเซ็นแล้ว — ไม่สามารถเซ็นซ้ำได้");
    }

    let signatureUrl: string | null = null;
    let signedDocumentUrl: string | null = null;

    if (data.method === "draw") {
      if (!data.signatureDataUrl) throw new Error("กรุณาวาดลายเซ็น");
      signatureUrl = await uploadClientSignFile(qRow.id, data.signatureDataUrl, "client-sign");
    } else {
      if (!data.signedDocumentDataUrl) throw new Error("กรุณาอัปโหลดเอกสารที่เซ็นแล้ว");
      signedDocumentUrl = await uploadClientSignFile(
        qRow.id,
        data.signedDocumentDataUrl,
        "client-signed-doc",
      );
    }

    const { data: ok, error: signErr } = await supabaseAdmin.rpc("sign_quotation_by_token", {
      _token: data.token,
      _name: data.name.trim(),
      _method: data.method,
      _signature_url: signatureUrl ?? undefined,
      _signed_document_url: signedDocumentUrl ?? undefined,
      _consent_version: data.consentVersion ?? ESIGN_CONSENT_VERSION,
      _signer_ip: data.signerIp,
      _signer_ua: data.signerUa,
    });

    if (signErr) throwClientError("sign.submit.rpc", signErr, "บันทึกลายเซ็นไม่สำเร็จ");
    if (!ok) throw new Error("บันทึกลายเซ็นไม่สำเร็จ — เอกสารอาจถูกเซ็นแล้ว");

    const clientLabel = data.name.trim() || qRow.client_name || "ลูกค้า";
    await supabaseAdmin.from("notifications").insert({
      user_id: qRow.user_id,
      type: "hire",
      message: `${clientLabel} ลงนามใบเสนอราคา ${qRow.number} แล้ว`,
      url: "/dashboard?tab=finance&sub=quotations",
      read: false,
      actor_name: clientLabel,
      actor_avatar: null,
    });

    const recipientName = await getFreelancerDisplayName(qRow.user_id);
    const signKey = `client-signed-${qRow.id}`;
    void notifyFreelancer({
      userId: qRow.user_id,
      templateName: "quotation-accepted",
      templateData: {
        recipientName,
        clientName: clientLabel,
        projectName: qRow.project_name ?? "โปรเจกต์",
        quotationNumber: qRow.number,
        actionUrl: canonicalUrl("/dashboard?tab=finance&sub=quotations"),
      },
      idempotencyKey: signKey,
    });

    void enqueueLineNotificationForUser({
      userId: qRow.user_id,
      kind: "portal_slip",
      body: `${clientLabel} ลงนามใบเสนอราคา ${qRow.number} แล้ว`,
      idempotencyKey: `line-${signKey}`,
      link: canonicalUrl("/dashboard?tab=finance&sub=quotations"),
    });

    return { ok: true as const };
  });
