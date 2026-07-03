import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { BackButton } from "@/components/ui/BackButton";
import LegalNav from "@/components/legal/LegalNav";
import { LEGAL_APP_NAME, LEGAL_UPDATED_AT } from "@/lib/legalConfig";

interface LegalLayoutProps {
  title: string;
  updatedAt?: string;
  children: ReactNode;
}

const LegalLayout = ({ title, updatedAt = LEGAL_UPDATED_AT, children }: LegalLayoutProps) => (
  <div className="min-h-screen bg-background font-legal font-normal">
    <header className="border-b border-border/60 backdrop-blur-md bg-background/80 sticky top-0 z-10">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
        <BackButton to="/" label="กลับหน้าหลัก" className="-ml-1" />        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{LEGAL_APP_NAME}</p>
          <h1 className="text-base font-medium truncate">{title}</h1>
        </div>
      </div>
    </header>
    <main className="max-w-3xl mx-auto px-4 py-8">
      <LegalNav />
      {updatedAt && (
        <p className="text-xs text-muted-foreground mb-6">อัปเดตล่าสุด: {updatedAt}</p>
      )}
      <article className="prose dark:prose-invert max-w-none space-y-4 text-base text-foreground leading-[1.75] [&_p]:leading-[1.75] [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:text-foreground [&_h3]:text-base [&_h3]:font-medium [&_h3]:mt-6 [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_a]:text-primary [&_a]:underline-offset-4 [&_a:hover]:underline [&_table]:text-sm [&_strong]:font-semibold">
        {children}
      </article>
      <footer className="mt-12 pt-6 border-t border-border/60 text-xs text-muted-foreground">
        <p>
          มีคำถามด้านข้อมูลส่วนบุคคล? ดู{" "}
          <Link to="/legal/rights" className="text-primary hover:underline">
            สิทธิของเจ้าของข้อมูล
          </Link>
        </p>
      </footer>
    </main>
  </div>
);

export default LegalLayout;
