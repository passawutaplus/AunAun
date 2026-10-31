import SeoHead from "@/components/SeoHead";
import { DocumentPaper } from "@/components/documents/DocumentPaper";
import { JobPanelView } from "@/components/chat/ChatJobPanel";
import { BRAND_NAME } from "@/lib/brandConfig";
import { BillingDashboard } from "@/components/dashboard/BillingDashboard";
import {
  DEV_OWNER_ID,
  devDocs,
  devStudioDocs,
} from "@/pages/dev/billingFixtures";

/** Temporary UI preview — chat side panel "งานนี้" with sample documents (no login needed). */
export default function BillingPreviewPage() {
  return (
    <main className="min-h-screen bg-app-ambient px-4 py-8">
      <SeoHead
        path="/dev/billing"
        title={`พรีวิวแผงงานนี้ · ${BRAND_NAME}`}
        description="ดูแผงติดตามงวดและเอกสารในแชท ด้วยข้อมูลตัวอย่าง"
      />
      <div className="mx-auto mb-10 max-w-5xl">
        <h1 className="mb-4 text-xl font-semibold">
          My Studio · เอกสารและรายรับ
        </h1>
        <BillingDashboard docs={devStudioDocs()} viewerId={DEV_OWNER_ID} />
      </div>
      <div className="mx-auto flex max-w-3xl flex-wrap justify-center gap-6">
        <section className="w-[320px] overflow-hidden rounded-2xl border border-border bg-background">
          <p className="border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">
            มุมผู้รับงาน
          </p>
          <JobPanelView docs={devDocs} viewerId={DEV_OWNER_ID} />
        </section>
        <section className="w-[320px] overflow-hidden rounded-2xl border border-border bg-background">
          <p className="border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">
            มุมลูกค้า
          </p>
          <JobPanelView docs={devDocs} viewerId="client" />
        </section>
      </div>
      <div className="mx-auto mt-10 max-w-2xl" id="dev-invoice">
        {devDocs[3].snapshot ? <DocumentPaper doc={devDocs[3].snapshot} /> : null}
      </div>
    </main>
  );
}
