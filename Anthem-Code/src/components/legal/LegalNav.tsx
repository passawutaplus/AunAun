import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const LINKS = [
  { to: "/legal/privacy", label: "ความเป็นส่วนตัว (PDPA)" },
  { to: "/legal/cookies", label: "คุกกี้" },
  { to: "/legal/terms", label: "ข้อกำหนด" },
  { to: "/legal/payment-refund", label: "ชำระเงิน/คืนเงิน" },
  { to: "/legal/service-agreement", label: "ข้อตกลงจ้างงาน" },
  { to: "/legal/ip", label: "ลิขสิทธิ์" },
  { to: "/legal/community", label: "กฎชุมชน" },
  { to: "/legal/copyright-report", label: "แจ้งลิขสิทธิ์" },
  { to: "/legal/rights", label: "สิทธิเจ้าของข้อมูล" },
] as const;

const LegalNav = () => {
  const { pathname } = useLocation();

  return (
    <nav className="flex flex-wrap gap-2 mb-8" aria-label="เอกสารกฎหมาย">
      {LINKS.map(({ to, label }) => (
        <Link
          key={to}
          to={to}
          className={cn(
            "text-xs px-3 py-1.5 rounded-full border transition-colors",
            pathname === to
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border/60 text-muted-foreground hover:text-foreground hover:border-border",
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
};

export default LegalNav;
