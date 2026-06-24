import { createFileRoute, redirect } from "@tanstack/react-router";
import { StripeClientPaymentsSection } from "@/components/dashboard/settings/StripeClientPaymentsSection";

export const Route = createFileRoute("/dev/stripe-connect-ui")({
  beforeLoad: () => {
    if (!import.meta.env.DEV) {
      throw redirect({ to: "/" });
    }
  },
  component: StripeConnectUiPreviewPage,
});

const STATES = [
  { key: "disconnected" as const, label: "ยังไม่เชื่อม" },
  { key: "pending" as const, label: "รอ Stripe ตรวจสอบ" },
  { key: "ready" as const, label: "พร้อมรับชำระ" },
];

function StripeConnectUiPreviewPage() {
  return (
    <div className="min-h-screen bg-background p-4 sm:p-8 space-y-6 max-w-lg mx-auto">
      <header className="space-y-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Dev preview</p>
        <h1 className="text-lg font-bold">Stripe Connect — Settings UI</h1>
        <p className="text-xs text-muted-foreground">
          หน้าจริง:{" "}
          <a href="/dashboard?tab=settings#stripe-connect" className="text-primary hover:underline">
            /dashboard?tab=settings#stripe-connect
          </a>
        </p>
      </header>
      {STATES.map(({ key, label }) => (
        <div key={key} className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <StripeClientPaymentsSection preview={key} />
        </div>
      ))}
    </div>
  );
}
