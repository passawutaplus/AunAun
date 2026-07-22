import { Link } from "react-router-dom";
import { useState } from "react";
import {
  Download,
  Loader2,
  Shield,
  Trash2,
  FileDown,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { LEGAL_DPO_EMAIL } from "@/lib/legalConfig";
import { LEGAL_SOLO_URL } from "@/lib/legalConfig";
import { SoloExternalLink } from "@/components/ecosystem/SoloExternalLink";
import { isSoloEcosystemEnabled } from "@/lib/aplus1Launch";
import { OWN_PROFILE_SELECT } from "@/lib/dbSelects";
import { useEnsureSensitiveAction } from "@/components/legal/SensitiveActionReauthProvider";
import { useMyPrivacyRequests, useSubmitPrivacyRequest } from "@/hooks/useLegalCompliance";

const REQUEST_STATUS: Record<string, string> = {
  new: "รอรับเรื่อง",
  reviewing: "กำลังตรวจ",
  approved: "อนุมัติแล้ว",
  rejected: "ไม่ดำเนินการ",
  completed: "เสร็จแล้ว",
};

export function AccountPrivacySection({ embedded = false }: { embedded?: boolean }) {
  const { user } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteNote, setDeleteNote] = useState("");
  const submitRequest = useSubmitPrivacyRequest();
  const { data: myRequests = [] } = useMyPrivacyRequests();
  const ensureVerified = useEnsureSensitiveAction();

  async function handleQuickExport() {
    if (!user?.id) return;
    try {
      await ensureVerified("ดาวน์โหลดข้อมูลส่วนบุคคลของฉัน");
    } catch {
      return;
    }
    setExporting(true);
    try {
      const [profile, kyc, payout] = await Promise.all([
        supabase.from("profiles").select(OWN_PROFILE_SELECT).eq("user_id", user.id).maybeSingle(),
        supabase.from("kyc_requests").select("*").eq("user_id", user.id),
        supabase.from("payout_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      ]);
      const payload = {
        exported_at: new Date().toISOString(),
        app: "aplus1",
        user_id: user.id,
        email: user.email,
        profile: profile.data,
        kyc_requests: kyc.data ?? [],
        payout_profile: payout.data,
        note: "ไฟล์นี้เป็นข้อมูลพื้นฐาน — เอกสาร KYC ใน Storage ติดต่อ DPO หากต้องการสำเนา",
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `aplus1-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("ดาวน์โหลดไฟล์แล้ว");
      try {
        await submitRequest.mutateAsync({ type: "export", description: "ดาวน์โหลดจากตั้งค่า (self-serve)" });
      } catch {
        /* บันทึกคำขอไม่ได้ถ้า migration ยังไม่รัน */
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ส่งออกไม่สำเร็จ");
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteRequest() {
    try {
      await ensureVerified("ขอลบบัญชีและข้อมูลส่วนบุคคล");
    } catch {
      return;
    }
    try {
      await submitRequest.mutateAsync({
        type: "delete",
        description: deleteNote.trim() || "ขอลบบัญชีจากตั้งค่า",
      });
      setDeleteOpen(false);
      setDeleteNote("");
    } catch {
      /* toast จาก hook */
    }
  }

  const pendingDelete = myRequests.find(
    (r) => r.request_type === "delete" && !["completed", "rejected"].includes(r.status),
  );

  const content = (
    <>
      {embedded ? (
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            ข้อมูลส่วนตัวของคุณ
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            ดาวน์โหลด ขอลบ หรือดูสิทธิตาม PDPA — เราจะตอบทางอีเมลภายใน 7 วันทำการ
          </p>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">ข้อมูลส่วนตัวของคุณ</h2>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              ดาวน์โหลด ขอลบ หรือดูสิทธิตาม PDPA — เราจะตอบทางอีเมลภายใน 7 วันทำการ
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => void handleQuickExport()}
          disabled={exporting}
          className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/60 p-3 text-left hover:border-primary/40 hover:bg-primary/5 transition-colors"
        >
          <Download className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">ดาวน์โหลดข้อมูลของฉัน</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">ได้ไฟล์ JSON ทันที — โปรไฟล์และบันทึกพื้นฐาน</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          disabled={!!pendingDelete}
          className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/60 p-3 text-left hover:border-destructive/40 hover:bg-destructive/5 transition-colors disabled:opacity-60"
        >
          <Trash2 className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">
              {pendingDelete ? "คำขอลบรอดำเนินการ" : "ขอลบบัญชี"}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {pendingDelete
                ? `สถานะ: ${REQUEST_STATUS[pendingDelete.status] ?? pendingDelete.status}`
                : "โปรไฟล์จะถูกซ่อน — ทีมตรวจสอบก่อนลบถาวร"}
            </p>
          </div>
        </button>
      </div>

      {myRequests.length > 0 ? (
        <div className="rounded-xl border border-border/40 bg-muted/20 p-3 space-y-2">
          <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            คำขอล่าสุดของคุณ
          </p>
          <ul className="space-y-1.5">
            {myRequests.slice(0, 3).map((r) => (
              <li key={r.id} className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">
                  {r.request_type === "delete" ? "ลบบัญชี" : r.request_type === "export" ? "ส่งออกข้อมูล" : r.request_type}
                </span>
                <span className="flex items-center gap-1 text-foreground">
                  {r.status === "completed" ? <CheckCircle2 className="w-3 h-3 text-primary" /> : null}
                  {REQUEST_STATUS[r.status] ?? r.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {!embedded && (
        <div className="flex flex-wrap gap-2 pt-1">
          <Button asChild size="sm" variant="ghost" className="text-muted-foreground h-8">
            <Link to="/legal/rights">ดูสิทธิทั้งหมด</Link>
          </Button>
          <Button asChild size="sm" variant="ghost" className="text-muted-foreground h-8">
            <Link to="/legal/privacy">นโยบาย PDPA</Link>
          </Button>
        </div>
      )}

      <p className={`text-[11px] text-muted-foreground leading-relaxed ${embedded ? "pt-1" : "border-t border-border/40 pt-3"}`}>
        บัญชี Aplus1 ใช้ร่วมกับ So1o Freelancer — ลบถาวรอาจทำที่{" "}
        {isSoloEcosystemEnabled() ? (
          <SoloExternalLink
            href={`${LEGAL_SOLO_URL.replace(/\/$/, "")}/settings`}
            className="text-primary underline"
          >
            So1o
          </SoloExternalLink>
        ) : (
          <span className="text-muted-foreground">So1o (เร็ว ๆ นี้)</span>
        )}
        {" "}หรืออีเมล{" "}
        <button
          type="button"
          className="text-primary underline"
          onClick={async () => {
            try {
              await ensureVerified("ติดต่อ DPO เรื่องข้อมูลส่วนบุคคล");
            } catch {
              return;
            }
            window.location.href = `mailto:${LEGAL_DPO_EMAIL}`;
          }}
        >
          {LEGAL_DPO_EMAIL}
        </button>
      </p>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileDown className="w-5 h-5 text-destructive" />
              ขอลบบัญชี
            </DialogTitle>
            <DialogDescription className="text-left">
              เราจะซ่อนโปรไฟล์และผลงานของคุณ แล้วตรวจสอบคำขอภายใน 30 วัน
              ข้อมูลบางส่วนอาจเก็บต่อตามกฎหมาย (เช่น บันทึกความปลอดภัย)
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={deleteNote}
            onChange={(e) => setDeleteNote(e.target.value)}
            placeholder="เหตุผล (ไม่บังคับ) — ช่วยให้ทีมดำเนินการได้เร็วขึ้น"
            rows={3}
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>ยกเลิก</Button>
            <Button
              type="button"
              variant="destructive"
              disabled={submitRequest.isPending}
              onClick={() => void handleDeleteRequest()}
            >
              {submitRequest.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              ส่งคำขอลบบัญชี
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  if (embedded) {
    return <div className="space-y-4">{content}</div>;
  }

  return (
    <section className="rounded-2xl glass-panel p-6 space-y-4">
      {content}
    </section>
  );
}
