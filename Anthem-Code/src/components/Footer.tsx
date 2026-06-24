import { Link } from "react-router-dom";
import { BRAND_NAME } from "@/lib/brandConfig";

const Footer = () => (
  <footer className="mt-12 border-t border-border/60">
    <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
      <p>© {new Date().getFullYear()} {BRAND_NAME} · ทุกสิทธิ์สงวน</p>
      <nav className="flex items-center gap-4 flex-wrap justify-center">
        <Link to="/advertise" className="hover:text-foreground transition-colors font-medium">ลงโฆษณากับเรา</Link>
        <Link to="/legal/privacy" className="hover:text-foreground transition-colors">PDPA</Link>
        <Link to="/legal/cookies" className="hover:text-foreground transition-colors">คุกกี้</Link>
        <Link to="/legal/community" className="hover:text-foreground transition-colors">กฎชุมชน</Link>
        <Link to="/legal/terms" className="hover:text-foreground transition-colors">ข้อกำหนด</Link>
        <Link to="/legal/ip" className="hover:text-foreground transition-colors">ลิขสิทธิ์</Link>
        <Link to="/legal/rights" className="hover:text-foreground transition-colors">สิทธิข้อมูล</Link>
      </nav>
    </div>
  </footer>
);

export default Footer;
