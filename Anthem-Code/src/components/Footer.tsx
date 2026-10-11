import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTopProjects, type DBProject } from "@/hooks/useProjects";
import { optimizedFeedImageUrl } from "@/lib/feedProjectCover";
import { isLaunchHiddenPath } from "@/lib/aplus1Launch";
import { BRAND_NAME, BRAND_SUPPORT_EMAIL } from "@/lib/brandConfig";
import { LEGAL_COMPANY_ADDRESS, LEGAL_COMPANY_NAME } from "@/lib/legalConfig";
import { cn } from "@/lib/utils";

const EXPLORE_LINKS = [
  { to: "/help", label: "ศูนย์ช่วยเหลือ" },
  { to: "/learn", label: "About" },
  { to: "/advertise", label: "ลงโฆษณากับเรา" },
] as const;

const LEGAL_LINKS = [
  { to: "/legal/terms", label: "ข้อกำหนด" },
  { to: "/legal/privacy", label: "PDPA" },
  { to: "/legal", label: "กฎหมายและนโยบาย" },
  { to: "/legal/copyright-report", label: "แจ้งละเมิด" },
] as const;

const linkClass = "text-[15px] text-[#f5f5f5] transition-opacity hover:opacity-70";

function coverOf(project: DBProject) {
  return project.cover_url?.trim() || project.gallery_urls?.find((url) => url?.trim()) || "";
}

type Props = {
  className?: string;
};

const Footer = ({ className }: Props) => {
  const year = new Date().getFullYear();
  const { data: top = [] } = useTopProjects();
  const exploreLinks = EXPLORE_LINKS.filter((item) => !isLaunchHiddenPath(item.to));
  const covers = useMemo(
    () =>
      top
        .map(coverOf)
        .filter(Boolean)
        .slice(0, 8)
        .map((url) => optimizedFeedImageUrl(url, { width: 240, quality: 68, natural: false })),
    [top],
  );
  const reel = covers.length >= 4 ? [...covers, ...covers] : [];

  return (
    <footer className={cn("mt-16 overflow-hidden bg-[#2f2e2c] pt-[9vh] text-[#f5f5f5]", className)}>
      <nav aria-label="ท้ายหน้า" className="flex flex-wrap items-center justify-center gap-x-9 gap-y-3 px-[6vw]">
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
      <p className="mt-4 px-[6vw] text-center text-[13px] text-[#bcbab4]">
        © {year} {BRAND_NAME} · สงวนลิขสิทธิ์ · {LEGAL_COMPANY_NAME} · {LEGAL_COMPANY_ADDRESS}
      </p>

      <div
        className="mt-9 flex select-none items-start justify-center overflow-hidden"
        style={{
          height: "0.82em",
          fontSize: "clamp(4.75rem, 11.4vw, 12rem)",
          fontWeight: 500,
          letterSpacing: "-0.06em",
          lineHeight: 0.9,
        }}
        aria-hidden
      >
        <span>same</span>
        {reel.length > 0 ? (
          <div className="mx-[0.045em] mt-[0.02em] h-[0.36em] w-[1.7em] self-center overflow-hidden">
            <div className="aplus-foot-track flex h-full w-max">
              {reel.map((src, index) => (
                <img key={`${src}-${index}`} src={src} alt="" className="mr-2 h-full w-auto object-cover aspect-[3/4]" />
              ))}
            </div>
          </div>
        ) : null}
        <span>COR</span>
      </div>
    </footer>
  );
};

export default Footer;
