import { Link } from "react-router-dom";
import { BRAND_NAME } from "@/lib/brandConfig";

const Footer = () => (
  <footer className="mt-12 border-t border-border/60">
    <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
      <p>© {new Date().getFullYear()} {BRAND_NAME} · ทุกสิทธิ์สงวน</p>
      <nav className="flex items-center gap-3 sm:gap-4 flex-wrap justify-center">
        <Link to="/advertise" className="inline-flex items-center min-h-11 py-2 hover:text-foreground transition-colors font-medium">ลงโฆษณากับเรา</Link>
        <Link to="/legal/privacy" className="inline-flex items-center min-h-11 py-2 hover:text-foreground transition-colors">PDPA</Link>
        <Link to="/legal/cookies" className="inline-flex items-center min-h-11 py-2 hover:text-foreground transition-colors">คุกกี้</Link>
        <Link to="/legal/community" className="inline-flex items-center min-h-11 py-2 hover:text-foreground transition-colors">กฎชุมชน</Link>
        <Link to="/legal/terms" className="inline-flex items-center min-h-11 py-2 hover:text-foreground transition-colors">ข้อกำหนด</Link>
        <Link to="/legal/ip" className="inline-flex items-center min-h-11 py-2 hover:text-foreground transition-colors">ลิขสิทธิ์</Link>
        <Link to="/legal/copyright-report" className="inline-flex items-center min-h-11 py-2 hover:text-foreground transition-colors">แจ้งละเมิด</Link>
        <Link to="/legal/rights" className="inline-flex items-center min-h-11 py-2 hover:text-foreground transition-colors">สิทธิข้อมูล</Link>
      </nav>
    </div>
  </footer>
);

export default Footer;
