import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { BackButton } from "@/components/ui/BackButton";
import LegalNav, { LegalSiblingNav } from "@/components/legal/LegalNav";
import { findLegalCategory } from "@/lib/legalCatalog";
import {
  LEGAL_APP_NAME,
  LEGAL_COMPANY_ADDRESS,
  LEGAL_COMPANY_NAME,
  LEGAL_COMPANY_TAX_ID,
  LEGAL_UPDATED_AT,
} from "@/lib/legalConfig";

interface LegalLayoutProps {
  title: string;
  updatedAt?: string;
  children: ReactNode;
}

const LegalLayout = ({ title, updatedAt = LEGAL_UPDATED_AT, children }: LegalLayoutProps) => {
  const { pathname } = useLocation();
  const category = findLegalCategory(pathname);

  return (
    <div className="min-h-screen bg-background font-legal font-normal">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <BackButton to="/legal" label="กลับดัชนีกฎหมาย" className="-ml-1" />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {LEGAL_APP_NAME}
              {category ? ` · ${category.title}` : ""}
            </p>
            <h1 className="truncate text-base font-medium">{title}</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
          <aside className="order-2 border-t border-border/50 pt-8 lg:order-1 lg:border-t-0 lg:pt-0">
            <LegalNav />
          </aside>

          <div className="order-1 min-w-0 lg:order-2">
            <LegalSiblingNav />
            {updatedAt && (
              <p className="mb-5 text-xs text-muted-foreground">อัปเดตล่าสุด: {updatedAt}</p>
            )}
            <article className="prose dark:prose-invert max-w-none space-y-4 text-base leading-[1.75] text-foreground [&_a]:text-primary [&_a]:underline-offset-4 [&_a:hover]:underline [&_h2]:mb-2 [&_h2]:mt-9 [&_h2]:scroll-mt-20 [&_h2]:border-b [&_h2]:border-border/50 [&_h2]:pb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:scroll-mt-20 [&_h3]:text-base [&_h3]:font-medium [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5 [&_p]:leading-[1.75] [&_strong]:font-semibold [&_table]:text-sm [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
              {children}
            </article>

            <footer className="mt-12 space-y-2 border-t border-border/60 pt-6 text-xs text-muted-foreground">
              {(LEGAL_COMPANY_ADDRESS || LEGAL_COMPANY_TAX_ID) && (
                <p>
                  {LEGAL_COMPANY_NAME}
                  {LEGAL_COMPANY_TAX_ID ? <> · เลขประจำตัวผู้เสียภาษี {LEGAL_COMPANY_TAX_ID}</> : null}
                  {LEGAL_COMPANY_ADDRESS ? (
                    <>
                      <br />
                      {LEGAL_COMPANY_ADDRESS}
                    </>
                  ) : null}
                </p>
              )}
              <p>
                ดูเอกสารทั้งหมดที่{" "}
                <Link to="/legal" className="text-primary hover:underline">
                  ดัชนีกฎหมาย
                </Link>
                {" · "}
                มีคำถามด้านข้อมูลส่วนบุคคล?{" "}
                <Link to="/legal/rights" className="text-primary hover:underline">
                  สิทธิของเจ้าของข้อมูล
                </Link>
              </p>
            </footer>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LegalLayout;
