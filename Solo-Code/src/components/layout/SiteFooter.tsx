import { Link } from "@tanstack/react-router";
import { Mail } from "lucide-react";
import { LineContactChip } from "@/components/LineContactButton";
import { CookiePreferencesLink } from "@/components/CookiePreferencesLink";
import logoUrl from "@/assets/solo-freelancer-logo.webp";
import { ANTHEM_SHOWCASE_URL } from "@/lib/productLinks";

type Variant = "full" | "minimal";

export function SiteFooter({
  variant = "minimal",
  className = "",
}: {
  variant?: Variant;
  className?: string;
}) {
  if (variant === "full") return <FullFooter className={className} />;
  return <MinimalFooter className={className} />;
}

function MinimalFooter({ className }: { className?: string }) {
  return (
    <footer className={`border-t border-border/60 bg-card/30 backdrop-blur mt-8 ${className}`}>
      <div className="mx-auto max-w-6xl px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-muted-foreground">
        <span>© {new Date().getFullYear()} So1o Freelancer</span>
        <nav className="flex items-center gap-3 flex-wrap justify-center">
          <Link to="/privacy" className="hover:text-primary transition-colors">
            นโยบายความเป็นส่วนตัว
          </Link>
          <span className="opacity-40">·</span>
          <Link to="/terms" className="hover:text-primary transition-colors">
            ข้อกำหนดการใช้งาน
          </Link>
          <span className="opacity-40">·</span>
          <Link to="/cookies" className="hover:text-primary transition-colors">
            คุกกี้
          </Link>
          <span className="opacity-40">·</span>
          <Link to="/refund" className="hover:text-primary transition-colors">
            คืนเงิน
          </Link>
          <span className="opacity-40">·</span>
          <CookiePreferencesLink className="hover:text-primary transition-colors" />
          <span className="opacity-40">·</span>
          <a
            href="mailto:hello@solofreelancer.com"
            className="hover:text-primary transition-colors"
          >
            ติดต่อ
          </a>
        </nav>
      </div>
    </footer>
  );
}

function FullFooter({ className }: { className?: string }) {
  return (
    <footer className={`border-t border-border mt-12 bg-card/30 backdrop-blur ${className}`}>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <img
                src={logoUrl}
                alt="So1o Freelancer"
                width={32}
                height={32}
                loading="lazy"
                decoding="async"
                className="h-8 w-8 rounded-lg object-cover ring-1 ring-border"
              />
              <span className="font-semibold text-sm">
                So<span className="text-primary">1</span>o Freelancer
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              หลังบ้านครบวงจรสำหรับฟรีแลนซ์ไทย ช่วยให้ทำงานน้อยลง แต่ได้เงินมากขึ้น
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider">ผลิตภัณฑ์</h3>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <a href="/#calculator" className="hover:text-primary transition-colors">
                  คำนวณราคา
                </a>
              </li>
              <li>
                <a href="/#features" className="hover:text-primary transition-colors">
                  ฟีเจอร์ทั้งหมด
                </a>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-primary transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link to="/labs" className="hover:text-primary transition-colors">
                  Creative Labs
                </Link>
              </li>
              <li>
                <a
                  href={ANTHEM_SHOWCASE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  Pixel100 Showcase
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider">แหล่งความรู้</h3>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <Link to="/help" className="hover:text-primary transition-colors">
                  ศูนย์ช่วยเหลือ
                </Link>
              </li>
              <li>
                <Link to="/help/getting-started" className="hover:text-primary transition-colors">
                  เริ่มต้นใช้งาน
                </Link>
              </li>
              <li>
                <Link to="/help/payments" className="hover:text-primary transition-colors">
                  รับชำระเงิน
                </Link>
              </li>
              <li>
                <Link to="/help/quotations" className="hover:text-primary transition-colors">
                  ใบเสนอราคา
                </Link>
              </li>
              <li>
                <Link to="/help/tax" className="hover:text-primary transition-colors">
                  คู่มือภาษี
                </Link>
              </li>
              <li>
                <Link to="/blog" className="hover:text-primary transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link to="/creative-partner" className="hover:text-primary transition-colors">
                  Creative Partner
                </Link>
              </li>
              <li>
                <Link to="/apply" className="hover:text-primary transition-colors">
                  สมัครเข้าใช้
                </Link>
              </li>
              <li>
                <Link
                  to="/auth"
                  search={{ redirect: undefined }}
                  className="hover:text-primary transition-colors"
                >
                  เข้าสู่ระบบ
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider">ติดต่อ</h3>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <LineContactChip />
              </li>
              <li>
                <a
                  href="mailto:hello@solofreelancer.com"
                  className="hover:text-primary transition-colors inline-flex items-center gap-1.5"
                >
                  <Mail className="h-3 w-3" /> hello@solofreelancer.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-muted-foreground">
          <span>© {new Date().getFullYear()} So1o Freelancer. All rights reserved.</span>
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <Link to="/privacy" className="hover:text-primary transition-colors">
              นโยบายความเป็นส่วนตัว
            </Link>
            <span className="opacity-40">·</span>
            <Link to="/terms" className="hover:text-primary transition-colors">
              ข้อกำหนดการใช้งาน
            </Link>
            <span className="opacity-40">·</span>
            <Link to="/cookies" className="hover:text-primary transition-colors">
              นโยบายคุกกี้
            </Link>
            <span className="opacity-40">·</span>
            <Link to="/refund" className="hover:text-primary transition-colors">
              นโยบายคืนเงิน
            </Link>
            <span className="opacity-40">·</span>
            <CookiePreferencesLink className="hover:text-primary transition-colors" />
          </div>
          <span>
            Made with <span className="text-primary">♥</span> for Thai freelancers
          </span>
        </div>
      </div>
    </footer>
  );
}
