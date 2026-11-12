import { Link } from "react-router-dom";
import { isLaunchHiddenPath } from "@/lib/aplus1Launch";
import { isNativeApp } from "@/lib/appShell";
import AppFooterCta from "@/components/AppFooterCta";
import {
  BRAND_NAME,
  BRAND_SUPPORT_EMAIL,
} from "@/lib/brandConfig";
import { cn } from "@/lib/utils";
import { setLang, useLang } from "@/lib/i18n";
import { APP_LOCALE_OPTIONS } from "@/lib/localePrefs";

const EXPLORE_LINKS = [
  { to: "/help", label: "Help Center" },
  { to: "/learn", label: "About" },
  { to: "/advertise", label: "Advertise" },
] as const;

const LEGAL_LINKS = [
  { to: "/legal/terms", label: "Terms" },
  { to: "/legal/privacy", label: "PDPA" },
  { to: "/legal", label: "Legal & Policy" },
  { to: "/legal/copyright-report", label: "Report Infringement" },
] as const;

const linkClass = "text-[15px] text-background transition-opacity hover:opacity-70";

type Props = {
  className?: string;
};

const Footer = ({ className }: Props) => {
  const lang = useLang();
  // The Android app has no website footer: a post-your-work prompt instead; legal links live in Settings.
  if (isNativeApp()) return <AppFooterCta />;
  const year = new Date().getFullYear();
  const exploreLinks = EXPLORE_LINKS.filter((item) => !isLaunchHiddenPath(item.to));

  return (
    <footer className={cn("mt-16 overflow-hidden bg-foreground pt-[7vh] text-background", className)}>
      <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-x-9 gap-y-3 px-[6vw]">
        {LEGAL_LINKS.map((item) => (
          <Link key={item.to} to={item.to} className={linkClass}>
            {item.label}
          </Link>
        ))}
        {exploreLinks.map((item) => (
          <Link key={item.to} to={item.to} className={linkClass}>
            {item.label}
          </Link>
        ))}
        <a href={`mailto:${BRAND_SUPPORT_EMAIL}`} className={linkClass}>
          {BRAND_SUPPORT_EMAIL}
        </a>
      </nav>

      <p className="sr-only">sameCOR</p>
      <p className="mt-4 px-[6vw] text-center text-[13px] text-background/70">
        © {year} {BRAND_NAME} · All rights reserved
      </p>

      {/* The only language switch a signed-out visitor can reach (signed-in users also have Settings). */}
      <div
        role="group"
        aria-label="ภาษา · Language · 语言"
        className="mt-4 flex items-center justify-center gap-1 px-[6vw] text-[13px]"
      >
        {APP_LOCALE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            lang={opt.value === "zh" ? "zh-CN" : opt.value}
            aria-pressed={lang === opt.value}
            onClick={() => setLang(opt.value)}
            className={cn(
              "min-h-9 rounded-full px-3 transition-opacity",
              lang === opt.value ? "bg-background/15 text-background" : "text-background/70 hover:opacity-70",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="mt-10 flex select-none justify-center px-[6vw] pb-[6vh]" aria-hidden>
        {/* Footer is the inverse of the page: white lockup on the dark light-mode footer, black lockup on the light dark-mode footer. */}
        <img
          src="/brand/logo-horizontal-white.svg"
          alt=""
          className="block h-auto w-[clamp(14rem,40vw,38rem)] dark:hidden"
          draggable={false}
        />
        <img
          src="/brand/logo-horizontal-black.svg"
          alt=""
          className="hidden h-auto w-[clamp(14rem,40vw,38rem)] dark:block"
          draggable={false}
        />
      </div>
    </footer>
  );
};

export default Footer;
