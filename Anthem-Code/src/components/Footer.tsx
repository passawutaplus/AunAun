import { Link } from "react-router-dom";
import { isLaunchHiddenPath } from "@/lib/aplus1Launch";
import {
  BRAND_NAME,
  BRAND_SUPPORT_EMAIL,
} from "@/lib/brandConfig";
import { cn } from "@/lib/utils";

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
