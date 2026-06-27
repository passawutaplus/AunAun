import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { logAdEvent, type AdCampaign } from "@/hooks/useAds";

interface Props {
  ad: AdCampaign;
  placement?: "feed" | "detail";
}

/**
 * Sponsored card — click opens advertiser URL or linked portfolio project.
 */
const AdCard = ({ ad, placement = "feed" }: Props) => {
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const loggedRef = useRef(false);

  useEffect(() => {
    if (!ref.current || loggedRef.current) return;
    const el = ref.current;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !loggedRef.current) {
            loggedRef.current = true;
            logAdEvent(ad.id, "impression", placement);
            obs.disconnect();
            break;
          }
        }
      },
      { threshold: 0.5 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [ad.id, placement]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    logAdEvent(ad.id, "click", placement);
    if (ad.linked_project_id) {
      navigate(`/project/${ad.linked_project_id}?sponsor=${ad.id}`);
      return;
    }
    if (ad.target_url) {
      window.open(ad.target_url, "_blank", "noopener,noreferrer");
      return;
    }
    navigate(`/ads/${ad.id}`);
  };

  const handleDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    navigate(`/ads/${ad.id}`);
  };

  return (
    <div ref={ref} className="group cursor-pointer" onClick={handleClick}>
      <div className="relative w-full aspect-[4/3] overflow-hidden rounded-sm bg-muted">
        <img
          src={ad.image_url}
          alt={ad.title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          loading="lazy"
        />

        {/* Sponsored badge — visible but not loud */}
        <span
          className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-foreground/85 text-background backdrop-blur-md [-webkit-backdrop-filter:blur(8px)] border border-foreground/10 shadow"
          aria-label="โฆษณา"
        >
          Ads
        </span>
        <button
          type="button"
          onClick={handleDetails}
          className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-medium bg-background/80 text-muted-foreground hover:text-foreground"
        >
          รายละเอียด
        </button>

        {/* Glass overlay on hover */}
        <div
          className={[
            "absolute inset-0 pointer-events-none transition-opacity duration-300",
            "bg-gradient-to-t from-black/55 via-black/20 to-transparent",
            "supports-[backdrop-filter]:backdrop-blur-md [-webkit-backdrop-filter:blur(12px)]",
            "[mask-image:linear-gradient(to_top,black_28%,transparent_100%)]",
            "[-webkit-mask-image:linear-gradient(to_top,black_28%,transparent_100%)]",
            "opacity-0 md:group-hover:opacity-100",
          ].join(" ")}
        />

        <div className="absolute bottom-2 left-3 right-12 pointer-events-none opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
          <p className="text-white text-sm font-medium line-clamp-1 thai-leading-tight drop-shadow">
            {ad.title}
          </p>
          {ad.tagline && (
            <p className="text-white/85 text-xs line-clamp-1 thai-leading-tight">{ad.tagline}</p>
          )}
        </div>

        <span className="absolute bottom-2 right-2 p-1.5 rounded-full text-white bg-background/15 border border-white/10 backdrop-blur-md md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          <ExternalLink className="w-4 h-4" />
        </span>
      </div>

      <div className="pt-2 px-0.5 flex items-center justify-between gap-2">
        <p className="text-base text-foreground line-clamp-1 thai-leading-tight">
          {ad.title}
        </p>
        <span className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {ad.cta_label}
        </span>
      </div>
    </div>
  );
};

export default AdCard;
