import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { LEGAL_APP_NAME, LEGAL_COMPANY_NAME, LEGAL_UPDATED_AT } from "@/lib/legalConfig";
import { LEGAL_CATEGORIES } from "@/lib/legalCatalog";

/** หน้าดัชนีเอกสารกฎหมาย — แยกหมวดชัด อ่านง่าย */
const LegalIndexPage = () => (
  <div className="min-h-screen bg-background font-legal font-normal">
    <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
        <BackButton to="/" label="กลับหน้าหลัก" className="-ml-1" />
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{LEGAL_APP_NAME}</p>
          <h1 className="truncate text-base font-medium">เอกสารกฎหมายและนโยบาย</h1>
        </div>
      </div>
    </header>

    <main className="mx-auto max-w-3xl px-4 py-8">
      <p className="text-base leading-relaxed text-foreground/90">
        รวมเอกสารของ {LEGAL_COMPANY_NAME} ({LEGAL_APP_NAME}) จัดตามหมวดเพื่อให้อ่านและหาได้ง่าย
      </p>
      <p className="mt-2 text-sm text-muted-foreground">อัปเดตล่าสุดโดยรวม: {LEGAL_UPDATED_AT}</p>

      <div className="mt-8 space-y-10">
        {LEGAL_CATEGORIES.map((category, index) => (
          <section key={category.id} aria-labelledby={`legal-cat-${category.id}`}>
            <div className="mb-3 border-b border-border/60 pb-2">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                หมวด {index + 1}
              </p>
              <h2 id={`legal-cat-${category.id}`} className="mt-0.5 text-lg font-semibold text-foreground">
                {category.title}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{category.summary}</p>
            </div>

            <ul className="divide-y divide-border/50">
              {category.docs.map((doc) => (
                <li key={doc.to}>
                  <Link
                    to={doc.to}
                    className="group flex items-start gap-3 py-3.5 transition-colors hover:bg-muted/40 -mx-2 px-2 rounded-md"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-medium text-foreground group-hover:text-primary">
                        {doc.label}
                      </p>
                      <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{doc.summary}</p>
                    </div>
                    <ChevronRight
                      className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/70 group-hover:text-primary"
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="mt-12 border-t border-border/60 pt-6 text-sm text-muted-foreground">
        ถ้าไม่แน่ใจว่าเอกสารไหนเกี่ยวข้อง — เริ่มที่{" "}
        <Link to="/legal/terms" className="text-primary hover:underline underline-offset-2">
          ข้อกำหนดการใช้งาน
        </Link>{" "}
        หรือ{" "}
        <Link to="/legal/privacy" className="text-primary hover:underline underline-offset-2">
          นโยบายความเป็นส่วนตัว
        </Link>
      </p>
    </main>
  </div>
);

export default LegalIndexPage;
