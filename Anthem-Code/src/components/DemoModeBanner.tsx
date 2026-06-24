import { Info } from "lucide-react";
import { Link } from "react-router-dom";
import { BRAND_NAME } from "@/lib/brandConfig";
import { DEMO_BANNER_SHORT } from "@/lib/copyConstants";
import { isDemoMode } from "@/lib/demoMode";

/** แถบแจ้งโหมดทดสอบ — เปิดด้วย VITE_DEMO_MODE=true */
export default function DemoModeBanner() {
  if (!isDemoMode()) return null;

  return (
    <div
      role="status"
      className="bg-primary/10 border-b border-primary/20 text-foreground text-xs sm:text-sm px-3 py-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center thai-body"
    >
      <Info className="w-3.5 h-3.5 shrink-0 text-primary" aria-hidden />
      <span>
        <strong>{BRAND_NAME}</strong> — {DEMO_BANNER_SHORT} (
        <code className="text-[11px] bg-muted px-1 rounded">*@demo.pixel100.com</code>)
      </span>
      <Link to="/research" className="text-primary font-medium hover:underline whitespace-nowrap">
        คู่มือทดสอบ
      </Link>
      <Link to="/auth" className="text-primary font-medium hover:underline whitespace-nowrap">
        เข้าสู่ระบบ
      </Link>
    </div>
  );
}
