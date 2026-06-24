import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import * as React from "react";
import { RouteError } from "@/components/RouteError";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, PenLine, Upload, CheckCircle2, FileText } from "lucide-react";
import { toast } from "sonner";
import { celebrateFromEdges } from "@/lib/celebrate";
import { EsignDisclaimer } from "@/components/legal/EsignDisclaimer";
import { SignaturePadField } from "@/components/sign/SignaturePadField";
import {
  getSignPayloadByToken,
  submitSignByToken,
  type SignPayload,
} from "@/server/sign.functions";
import { ESIGN_CONSENT_VERSION } from "@/lib/copyConstants";

export const Route = createFileRoute("/sign/$token")({
  head: ({ params }) => {
    const title = "ลงนามใบเสนอราคา | So1o Freelancer";
    const description =
      "ลงนามใบเสนอราคาออนไลน์ — วาดลายเซ็นหรืออัปโหลดเอกสารที่เซ็นแล้วผ่าน So1o Freelancer";
    const url = `https://solofreelancer.com/sign/${params.token}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "robots", content: "noindex,nofollow" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:type", content: "website" },
      ],
    };
  },
  errorComponent: ({ error }) => <RouteError error={error} />,
  component: PublicSignPage,
});

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function PublicSignPage() {
  const { token } = Route.useParams();
  const fetchPayload = useServerFn(getSignPayloadByToken);
  const submitSign = useServerFn(submitSignByToken);

  const [payload, setPayload] = React.useState<SignPayload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [name, setName] = React.useState("");
  const [agree, setAgree] = React.useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = React.useState<string | null>(null);
  const [docDataUrl, setDocDataUrl] = React.useState<string | null>(null);
  const [method, setMethod] = React.useState<"draw" | "full_document">("draw");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchPayload({ data: { token } });
      const p = res.payload;
      setPayload(p);
      if (p?.client_name) setName(p.client_name);
    } catch {
      setPayload(null);
      toast.error("ไม่พบเอกสาร หรือลิงก์ไม่ถูกต้อง");
    } finally {
      setLoading(false);
    }
  }, [fetchPayload, token]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function onPickDoc(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const ok =
      f.type.startsWith("image/") || f.type === "application/pdf" || f.name.endsWith(".pdf");
    if (!ok) {
      toast.error("รองรับ PNG, JPG หรือ PDF เท่านั้น");
      return;
    }
    if (f.size > 6 * 1024 * 1024) {
      toast.error("ไฟล์ใหญ่เกิน 6MB");
      return;
    }
    try {
      const url = await readFileAsDataUrl(f);
      setDocDataUrl(url);
      toast.success("เลือกไฟล์แล้ว — กดส่งเพื่อยืนยัน");
    } catch {
      toast.error("อ่านไฟล์ไม่สำเร็จ");
    }
  }

  async function handleSubmit() {
    if (!name.trim()) {
      toast.error("กรุณาใส่ชื่อ");
      return;
    }
    if (!agree) {
      toast.error("กรุณายอมรับข้อความ PDPA");
      return;
    }
    if (method === "draw" && !signatureDataUrl) {
      toast.error("กรุณาวาดลายเซ็น");
      return;
    }
    if (method === "full_document" && !docDataUrl) {
      toast.error("กรุณาอัปโหลดเอกสารที่เซ็นแล้ว");
      return;
    }

    setBusy(true);
    try {
      let signerIp: string | undefined;
      try {
        const ipRes = await fetch("https://api.ipify.org?format=json");
        const ipJson = (await ipRes.json()) as { ip?: string };
        signerIp = ipJson.ip;
      } catch {
        /* best-effort */
      }

      await submitSign({
        data: {
          token,
          name: name.trim(),
          method,
          signatureDataUrl: method === "draw" ? signatureDataUrl ?? undefined : undefined,
          signedDocumentDataUrl: method === "full_document" ? docDataUrl ?? undefined : undefined,
          consentVersion: ESIGN_CONSENT_VERSION,
          signerIp,
          signerUa: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 512) : undefined,
        },
      });
      celebrateFromEdges();
      toast.success("ลงนามเรียบร้อย — ขอบคุณครับ/ค่ะ");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ส่งไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] grid place-items-center text-muted-foreground gap-2">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="text-sm">กำลังโหลดเอกสาร…</p>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center">
        <p className="text-sm text-muted-foreground">ไม่พบเอกสารสำหรับลิงก์นี้</p>
      </div>
    );
  }

  const signed = Boolean(payload.client_signed_at);

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-lg mx-auto space-y-4">
        <div className="text-center space-y-2">
          {payload.logo_url && (
            <img src={payload.logo_url} alt="" className="h-10 mx-auto object-contain" />
          )}
          <h1 className="text-lg font-semibold">ลงนามใบเสนอราคา</h1>
          <p className="text-sm text-muted-foreground">
            {payload.brand_name} · {payload.number}
          </p>
          <p className="text-xs text-muted-foreground">{payload.project_name}</p>
        </div>

        {signed ? (
          <Card>
            <CardContent className="pt-6 text-center space-y-3">
              <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
              <p className="font-medium">ลงนามเรียบร้อยแล้ว</p>
              <p className="text-sm text-muted-foreground">
                โดย {payload.client_signer_name ?? name} ·{" "}
                {payload.client_signed_at
                  ? new Date(payload.client_signed_at).toLocaleString("th-TH")
                  : ""}
              </p>
              {payload.client_signature_url && (
                <img
                  src={payload.client_signature_url}
                  alt="ลายเซ็น"
                  className="h-16 mx-auto object-contain"
                />
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-5 space-y-4">
              <EsignDisclaimer variant="client" />

              <div className="space-y-1.5">
                <Label htmlFor="signer-name">ชื่อผู้ลงนาม</Label>
                <Input
                  id="signer-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={120}
                  placeholder="ชื่อ-นามสกุล"
                />
              </div>

              <Tabs
                value={method}
                onValueChange={(v) => setMethod(v as "draw" | "full_document")}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="draw" className="gap-1 text-xs">
                    <PenLine className="h-3.5 w-3.5" />
                    วาดลายเซ็น
                  </TabsTrigger>
                  <TabsTrigger value="full_document" className="gap-1 text-xs">
                    <Upload className="h-3.5 w-3.5" />
                    อัปโหลดเอกสาร
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="draw" className="pt-3">
                  <SignaturePadField onChange={setSignatureDataUrl} disabled={busy} />
                </TabsContent>
                <TabsContent value="full_document" className="pt-3 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    พิมพ์ใบเสนอราคา เซ็นมือ แล้วถ่ายรูปหรือสแกนเป็น PDF อัปโหลดกลับ
                  </p>
                  <label className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-6 cursor-pointer hover:bg-muted/40">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <span className="text-xs">{docDataUrl ? "เปลี่ยนไฟล์" : "เลือกไฟล์ PNG/JPG/PDF"}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,application/pdf"
                      className="hidden"
                      onChange={onPickDoc}
                    />
                  </label>
                  {docDataUrl && (
                    <Badge variant="secondary" className="text-[10px]">
                      เลือกไฟล์แล้ว — พร้อมส่ง
                    </Badge>
                  )}
                </TabsContent>
              </Tabs>

              <label className="flex items-start gap-2 cursor-pointer">
                <Checkbox
                  checked={agree}
                  onCheckedChange={(v) => setAgree(v === true)}
                  className="mt-0.5"
                />
                <span className="text-xs leading-relaxed text-muted-foreground">
                  ข้าพเจ้ายินยอมให้เก็บชื่อและลายเซ็นเพื่อยืนยันเอกสารนี้ ตามนโยบายความเป็นส่วนตัว
                </span>
              </label>

              <Button
                className="w-full gap-1.5"
                disabled={busy}
                onClick={() => void handleSubmit()}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
                ส่งลายเซ็น
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
