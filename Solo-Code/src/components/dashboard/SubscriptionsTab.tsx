import * as React from "react";
import { PageFooterActions } from "@/components/dashboard/PageFooterActions";
import { Button } from "@/components/ui/button";
import { StatCard } from "./StatCard";
import { AddSubModal } from "./Modals";
import { useFinance } from "@/store/finance";
import { formatTHB, type PaymentMethod } from "@/data/mockData";
import { TrendingUp, Receipt, Plus, CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { CollapsibleSection } from "./subs/shared";
const CategoryDonut = React.lazy(() =>
  import("./subs/CategoryDonut").then((m) => ({ default: m.CategoryDonut })),
);
import { BillingCalendar } from "./subs/BillingCalendar";
import { BillingAlerts } from "./subs/BillingAlerts";
import { SubsList } from "./subs/SubsList";
import { PaymentMethodFormDialog } from "./subs/PaymentMethodFormDialog";
import { PaymentMethodsManager } from "./subs/PaymentMethodsManager";

import { SurvivalMode } from "./subs/SurvivalMode";
import { SubIncomeTrendChart } from "./subs/SubIncomeTrendChart";

export function SubscriptionsTab() {
  const { subs, paymentMethods, setPaymentMethods, isLoading } = useFinance();

  function addMethod(m: PaymentMethod) {
    setPaymentMethods((arr) => [...arr, m]);
    toast.success(`เพิ่ม ${m.label} แล้ว`);
  }

  const activeSubs = subs.filter((s) => (s.status ?? "active") === "active");
  const monthly = activeSubs.reduce((s, x) => s + x.amount, 0);
  const yearly = monthly * 12;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลดข้อมูลของคุณ…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-stretch">
        <div className="sm:col-span-2 xl:col-span-2 min-w-0">
          <StatCard
            accent
            label="ยอดจ่ายรายเดือน"
            value={`฿${formatTHB(monthly)}`}
            sub={`${subs.length} รายการที่ใช้งานอยู่`}
            icon={<Receipt className="h-5 w-5" />}
          />
        </div>
        <div className="min-w-0">
          <StatCard
            label="ประมาณการต่อปี"
            value={<span className="text-lg sm:text-xl">฿{formatTHB(yearly)}</span>}
            sub="สะสม 12 เดือน"
            icon={<TrendingUp className="h-4 w-4" />}
          />
        </div>
        <div className="min-w-0">
          <BillingAlerts subs={activeSubs} paymentMethods={paymentMethods} compact />
        </div>
      </div>

      {paymentMethods.length === 0 && (
        <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 flex items-center gap-3">
          <CreditCard className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1 text-sm">
            <p className="font-semibold">เริ่มต้นด้วยการเพิ่มช่องทางการตัดเงิน</p>
            <p className="text-xs text-muted-foreground">
              เพิ่มบัตร / E-Wallet ก่อน แล้วค่อยผูกกับบริการต่าง ๆ
            </p>
          </div>
          <PaymentMethodFormDialog
            title="เพิ่มช่องทางใหม่"
            trigger={
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" /> เพิ่ม
              </Button>
            }
            onSave={addMethod}
          />
        </div>
      )}

      <CollapsibleSection defaultOpen title="ภาพรวมรายเดือน">
        <div className="grid gap-4 sm:grid-cols-2">
          <React.Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-muted/40" />}>
            <CategoryDonut subs={activeSubs} />
          </React.Suspense>
          <BillingCalendar subs={activeSubs} paymentMethods={paymentMethods} />
        </div>
      </CollapsibleSection>

      <div className="grid gap-4 lg:grid-cols-2 items-stretch">
        <SurvivalMode subs={subs} />
        <SubIncomeTrendChart subs={activeSubs} />
      </div>

      <CollapsibleSection defaultOpen title="รายการบริการ" action={<AddSubModal />}>
        <SubsList />
      </CollapsibleSection>

      <CollapsibleSection
        title="จัดการช่องทางการตัดเงิน"
        action={
          <PaymentMethodFormDialog
            title="เพิ่มช่องทางใหม่"
            trigger={
              <Button size="sm" className="gap-1.5 rounded-xl">
                <Plus className="h-4 w-4" /> เพิ่มช่องทาง
              </Button>
            }
            onSave={addMethod}
          />
        }
      >
        <PaymentMethodsManager />
      </CollapsibleSection>
      <PageFooterActions feature="subscriptions" label="Subscription" />
    </div>
  );
}
