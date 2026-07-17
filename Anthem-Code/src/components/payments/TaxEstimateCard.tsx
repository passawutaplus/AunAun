import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calculator, FileText } from "lucide-react";
import { estimatePersonalIncomeTax, sumWhtWithheld } from "@/lib/payments/taxEstimate";
import { satangToThb } from "@/lib/payments/fees";
import { formatMoneyLabel } from "@/lib/payments/fxDisplay";
import { sharedDb } from "@/integrations/supabase/client";

type Props = {
  userId: string | undefined;
  className?: string;
};

/** Freelancer tax estimate + WHT withheld this calendar year (Bangkok). */
export default function TaxEstimateCard({ userId, className }: Props) {
  const year = new Date().getFullYear();

  const { data } = useQuery({
    queryKey: ["hire-tax-year", userId, year],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return { grossSatang: 0, whtSatang: 0, feeDocs: 0, whtDocs: 0 };
      const start = `${year}-01-01T00:00:00+07:00`;
      const end = `${year + 1}-01-01T00:00:00+07:00`;
      let grossSatang = 0;
      let whtSatang = 0;
      try {
        const { data: orders } = await sharedDb
          .from("hire_orders")
          .select("job_price_satang, wht_satang, status, available_at, approved_at")
          .eq("seller_id", userId)
          .in("status", ["available", "awaiting_approval", "paid_pending"]);
        for (const o of orders ?? []) {
          const at = (o as { available_at?: string; approved_at?: string }).available_at
            || (o as { approved_at?: string }).approved_at;
          if (at && (at < start || at >= end)) continue;
          grossSatang += Number((o as { job_price_satang?: number }).job_price_satang || 0);
          whtSatang += Number((o as { wht_satang?: number }).wht_satang || 0);
        }
      } catch {
        /* table may not exist yet */
      }
      let feeDocs = 0;
      let whtDocs = 0;
      try {
        const { count: fc } = await sharedDb
          .from("hire_documents")
          .select("id", { count: "exact", head: true })
          .eq("kind", "platform_fee_receipt");
        feeDocs = fc ?? 0;
      } catch {
        /* ignore */
      }
      try {
        const { count: wc } = await sharedDb
          .from("hire_wht_docs")
          .select("id", { count: "exact", head: true });
        whtDocs = wc ?? 0;
      } catch {
        /* ignore */
      }
      return { grossSatang, whtSatang, feeDocs, whtDocs };
    },
  });

  const estimate = useMemo(() => {
    const gross = satangToThb(data?.grossSatang ?? 0);
    const wht = satangToThb(data?.whtSatang ?? 0);
    return estimatePersonalIncomeTax({
      grossIncomeThb: gross,
      whtWithheldThb: sumWhtWithheld([{ whtThb: wht }]),
    });
  }, [data]);

  return (
    <div className={className ?? "rounded-2xl border border-border p-4 space-y-3"}>
      <div className="flex items-center gap-2">
        <Calculator className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">ประมาณการภาษีจากการจ้างงาน {year}</h3>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg bg-muted/40 p-2.5">
          <p className="text-[10px] text-muted-foreground">รายได้จ้างงาน (ประมาณ)</p>
          <p className="font-semibold tabular-nums">
            {formatMoneyLabel(estimate.grossIncomeThb, "THB")}
          </p>
        </div>
        <div className="rounded-lg bg-muted/40 p-2.5">
          <p className="text-[10px] text-muted-foreground">WHT ที่ถูกหัก</p>
          <p className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
            {formatMoneyLabel(estimate.whtWithheldThb, "THB")}
          </p>
        </div>
        <div className="rounded-lg bg-muted/40 p-2.5">
          <p className="text-[10px] text-muted-foreground">ภาษีประมาณการ</p>
          <p className="font-semibold tabular-nums">
            {formatMoneyLabel(estimate.estimatedTaxThb, "THB")}
          </p>
        </div>
        <div className="rounded-lg bg-muted/40 p-2.5">
          <p className="text-[10px] text-muted-foreground">คงเหลือต้องชำระ/เครดิต</p>
          <p className="font-semibold tabular-nums">
            {formatMoneyLabel(estimate.netTaxDueThb, "THB")}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <FileText className="w-3.5 h-3.5 shrink-0" />
        <span>
          ใบเสร็จค่าธรรมเนียมในระบบ ~{data?.feeDocs ?? 0} · เอกสาร 50 ทวิ ~{data?.whtDocs ?? 0}{" "}
          (ดูในแดชบอร์ดรายการงาน)
        </span>
      </div>
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        ตัวเลขโดยประมาณจากบันทึกบนแพลตฟอร์ม ไม่ใช่คำแนะนำทางภาษี — ควรตรวจสอบกับนักบัญชีก่อนยื่น
      </p>
    </div>
  );
}
