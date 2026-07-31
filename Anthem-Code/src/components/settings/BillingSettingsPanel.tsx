import { Link } from "react-router-dom";
import {
  CheckCircle2,
  ChevronRight,
  Circle,
  FileText,
  Landmark,
  Loader2,
  Receipt,
  Wallet,
} from "lucide-react";
import { BillingProfileSection } from "@/components/settings/BillingProfileSection";
import { useHireSellerReadiness } from "@/hooks/useHireSellerReadiness";
import { usePayoutProfile } from "@/hooks/useKyc";
import { maskBankAccount } from "@/lib/kycPdpa";
import { cn } from "@/lib/utils";

type Props = {
  userId: string;
  profile: Record<string, unknown> | null | undefined;
  onSaved?: () => void;
};

/** Settings hub: hire billing docs + tax + payout readiness. */
export default function BillingSettingsPanel({ userId, profile, onSaved }: Props) {
  const readiness = useHireSellerReadiness(userId);
  const { data: payout, isLoading: payoutLoading } = usePayoutProfile();

  const email = String(profile?.email ?? "").trim();
  const phone = String(profile?.phone ?? "").trim();

  const bankName = String(payout?.bank_name || profile?.bank_name || "").trim();
  const accountNumber = String(
    payout?.account_number || profile?.bank_account_number || "",
  ).replace(/\D/g, "");
  const accountName = String(
    payout?.account_name || profile?.bank_account_name || "",
  ).trim();
  const hasBank = bankName.length >= 2 && accountNumber.length >= 10;

  return (
    <div id="billing" className="space-y-6 scroll-mt-24">
      <section className="rounded-2xl glass-panel p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">เอกสาร & Billing</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          ข้อมูลชุดนี้ใช้กับงานจ้างบน Aplus1 — ใบเสนอราคา · ใบแจ้งหนี้ · ใบเสร็จ / ใบกำกับภาษี
          และการรับเงินค่าจ้าง (บัญชีธนาคารจาก KYC)
        </p>
        <div className="grid sm:grid-cols-2 gap-2">
          <Link
            to="/earnings"
            className="flex items-center justify-between gap-2 rounded-xl bg-secondary hover:bg-accent px-4 py-2.5 text-sm font-medium text-foreground transition-colors"
          >
            <span className="inline-flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" />
              กระเป๋า & รายได้
            </span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Link>
          <Link
            to="/verify"
            className="flex items-center justify-between gap-2 rounded-xl bg-secondary hover:bg-accent px-4 py-2.5 text-sm font-medium text-foreground transition-colors"
          >
            <span className="inline-flex items-center gap-2">
              <Landmark className="w-4 h-4 text-primary" />
              KYC & บัญชีรับเงิน
            </span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Link>
        </div>
      </section>

      <section className="rounded-2xl glass-panel p-6 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">ความพร้อมรับงานจ้าง</h3>
        <p className="text-xs text-muted-foreground">
          ครบทุกข้อถึงจะเปิดรับคำขอจ้างและออกเอกสารการเงินได้สมบูรณ์
        </p>
        {readiness.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> กำลังตรวจสถานะ…
          </div>
        ) : (
          <ul className="space-y-2">
            {readiness.items.map((item) => {
              const href = item.href.startsWith("/settings")
                ? item.href
                : item.href;
              const isHashOnly =
                item.id === "billing" || href.includes("#billing");
              return (
                <li key={item.id}>
                  <Link
                    to={isHashOnly ? "/settings#billing" : href}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors",
                      item.done
                        ? "border-emerald-500/25 bg-emerald-500/5"
                        : "border-border/60 bg-background/50 hover:border-primary/30",
                    )}
                  >
                    {item.done ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <Circle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {item.hint}
                      </p>
                    </div>
                    {!item.done ? (
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        {!readiness.isLoading && readiness.ready ? (
          <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
            พร้อมรับงานจ้างและออกเอกสาร billing แล้ว
          </p>
        ) : null}
      </section>

      <section className="rounded-2xl glass-panel p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Landmark className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            บัญชีธนาคารรับเงิน (Billing payout)
          </h3>
        </div>
        <p className="text-xs text-muted-foreground">
          ใช้โอนค่าจ้างและ payout — แก้ผ่านหน้ายืนยันตัวตน (KYC) เพื่อความปลอดภัย
        </p>
        {payoutLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> กำลังโหลดบัญชี…
          </div>
        ) : hasBank ? (
          <div className="rounded-xl border border-border/60 bg-secondary/40 px-4 py-3 space-y-1 text-sm">
            <p className="font-medium text-foreground">{bankName}</p>
            <p className="text-muted-foreground">{maskBankAccount(accountNumber)}</p>
            {accountName ? (
              <p className="text-xs text-muted-foreground">ชื่อบัญชี: {accountName}</p>
            ) : null}
            <Link
              to="/verify"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline pt-1"
            >
              ดู / อัปเดตที่ KYC
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        ) : (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 space-y-2">
            <p className="text-sm text-foreground">ยังไม่มีบัญชีรับเงิน</p>
            <Link
              to="/verify"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              ไปยืนยันตัวตนและเพิ่มบัญชี
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </section>

      <section className="rounded-2xl glass-panel p-6 space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">ช่องทางติดต่อบนเอกสาร</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          อีเมลและเบอร์บนใบเสนอราคา / ใบแจ้งหนี้ ดึงจากโปรไฟล์ติดต่อ
        </p>
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-secondary/50 px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">อีเมล</p>
            <p className="font-medium text-foreground truncate">{email || "— ยังไม่ระบุ"}</p>
          </div>
          <div className="rounded-xl bg-secondary/50 px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">เบอร์มือถือ</p>
            <p className="font-medium text-foreground">{phone || "— ยังไม่ระบุ"}</p>
          </div>
        </div>
        <Link
          to="/settings#profile"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          แก้ไขในข้อมูลติดต่อ (โปรไฟล์)
          <ChevronRight className="w-3 h-3" />
        </Link>
      </section>

      <BillingProfileSection userId={userId} profile={profile} onSaved={onSaved} />
    </div>
  );
}
