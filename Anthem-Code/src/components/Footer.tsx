import { Link } from "react-router-dom";
import { BRAND_NAME } from "@/lib/brandConfig";

const Footer = () => (
  <footer className="mt-12 border-t border-border/60">
    <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground sm:flex-row">
      <p>
        © {new Date().getFullYear()} {BRAND_NAME} · ทุกสิทธิ์สงวน
      </p>
      <nav className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 sm:gap-x-4">
        <Link to="/help" className="inline-flex min-h-11 items-center py-2 font-medium transition-colors hover:text-foreground">
          Help
        </Link>
        <Link to="/learn" className="inline-flex min-h-11 items-center py-2 transition-colors hover:text-foreground">
          Learn more
        </Link>
        <Link to="/advertise" className="inline-flex min-h-11 items-center py-2 font-medium transition-colors hover:text-foreground">
          ลงโฆษณากับเรา
        </Link>
        <Link to="/legal" className="inline-flex min-h-11 items-center py-2 font-medium transition-colors hover:text-foreground">
          กฎหมายและนโยบาย
        </Link>
        <Link to="/legal/privacy" className="inline-flex min-h-11 items-center py-2 transition-colors hover:text-foreground">
          PDPA
        </Link>
        <Link to="/legal/terms" className="inline-flex min-h-11 items-center py-2 transition-colors hover:text-foreground">
          ข้อกำหนด
        </Link>
        <Link to="/legal/copyright-report" className="inline-flex min-h-11 items-center py-2 transition-colors hover:text-foreground">
          แจ้งละเมิด
        </Link>
      </nav>
    </div>
  </footer>
);

export default Footer;
