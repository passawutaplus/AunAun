import { Plus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { FEED_PAGE_GUTTER_X } from "@/components/feed/FeedHero";
import { useAuth } from "@/hooks/useAuth";
import { isLaunchHiddenPath } from "@/lib/aplus1Launch";
import {
  BRAND_NAME,
  BRAND_SUPPORT_EMAIL,
} from "@/lib/brandConfig";
import {
  LEGAL_COMPANY_ADDRESS,
  LEGAL_COMPANY_NAME,
} from "@/lib/legalConfig";
import { useAuthDialog } from "@/stores/authDialogStore";
import { cn } from "@/lib/utils";

const SHELL = cn("mx-auto max-w-[1920px]", FEED_PAGE_GUTTER_X);

const legalLinkClass =
  "inline-flex min-h-11 items-center py-1 transition-colors hover:text-foreground";

const colLinkClass =
  "inline-flex min-h-11 items-center py-1 text-sm text-muted-foreground transition-colors hover:text-foreground";

const EXPLORE_LINKS = [
  { to: "/help", label: "ศูนย์ช่วยเหลือ" },
  { to: "/learn", label: "เรียนรู้เพิ่ม" },
  { to: "/advertise", label: "ลงโฆษณากับเรา" },
] as const;

const Footer = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const openSignup = useAuthDialog((s) => s.openSignup);
  const year = new Date().getFullYear();
  const exploreLinks = EXPLORE_LINKS.filter((l) => !isLaunchHiddenPath(l.to));

  const goPostProject = () => {
    if (!user) {
      openSignup("/portfolio/new");
      return;
    }
    navigate("/portfolio/new");
  };

  return (
    <footer className="mt-16">
      <div className="footer-cta-wave text-primary-foreground">
        <div className="footer-cta-wave-mesh footer-cta-wave-mesh-a" aria-hidden="true" />
        <div className="footer-cta-wave-mesh footer-cta-wave-mesh-b" aria-hidden="true" />
        <div className="footer-cta-wave-noise" aria-hidden="true" />
        <div
          className={cn(
            SHELL,
            "relative z-10 flex flex-col gap-6 py-10 sm:py-12 md:flex-row md:items-center md:justify-between md:gap-10 md:py-14",
          )}
        >
          <h2 className="thai-display text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            ผลงานจริง <span className="font-bold">สู่โอกาส</span>
          </h2>
          <button
            type="button"
            onClick={goPostProject}
            className="inline-flex h-12 shrink-0 items-center gap-2.5 rounded-full bg-white py-0 pl-1.5 pr-5 text-base font-medium text-neutral-900 shadow-[0_10px_32px_hsl(14_100%_28%/0.4)] transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/90"
          >
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-white">
              <Plus className="h-4 w-4" strokeWidth={2.5} />
            </span>
            แชร์ผลงาน
          </button>
        </div>
      </div>

      <div className="bg-background">
        <div
          className={cn(
            SHELL,
            "flex flex-col gap-10 pt-10 sm:pt-12 md:flex-row md:items-start md:justify-between md:gap-16",
          )}
        >
          <div className="text-xs text-muted-foreground">
            <p className="thai-body">
              © {year} {BRAND_NAME} · สงวนลิขสิทธิ์
            </p>
            <nav
              aria-label="กฎหมาย"
              className="mt-2 flex flex-wrap items-center gap-x-5"
            >
              <Link to="/legal/terms" className={legalLinkClass}>
                ข้อกำหนด
              </Link>
              <Link to="/legal/privacy" className={legalLinkClass}>
                PDPA
              </Link>
              <Link to="/legal" className={legalLinkClass}>
                กฎหมายและนโยบาย
              </Link>
              <Link to="/legal/copyright-report" className={legalLinkClass}>
                แจ้งละเมิด
              </Link>
            </nav>
          </div>

          <div className="flex flex-wrap gap-x-16 gap-y-8 md:justify-end">
            {exploreLinks.length > 0 && (
              <nav aria-label="สำรวจ" className="min-w-[9rem]">
                <p className="thai-display text-sm font-semibold text-foreground">สำรวจ</p>
                <ul className="mt-2">
                  {exploreLinks.map((l) => (
                    <li key={l.to}>
                      <Link to={l.to} className={colLinkClass}>
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            )}
            <div className="min-w-[9rem]">
              <p className="thai-display text-sm font-semibold text-foreground">กรุงเทพฯ</p>
              <p className="mt-2 text-sm text-muted-foreground thai-body">{LEGAL_COMPANY_NAME}</p>
              <p className="text-sm text-muted-foreground thai-body">{LEGAL_COMPANY_ADDRESS}</p>
              <a
                href={`mailto:${BRAND_SUPPORT_EMAIL}`}
                className={cn(colLinkClass, "underline-offset-2 hover:underline")}
              >
                {BRAND_SUPPORT_EMAIL}
              </a>
            </div>
          </div>
        </div>

        <div className={cn(SHELL, "overflow-hidden")} aria-hidden="true">
          <p className="-mb-[0.28em] mt-8 select-none whitespace-nowrap text-[clamp(4.25rem,22vw,16rem)] font-bold leading-none tracking-tighter text-foreground">
            aplus1
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
