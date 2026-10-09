import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { logAdEvent, type AdCampaign } from "@/hooks/useAds";
import { openSafeExternalUrl } from "@/lib/externalUrl";

interface Props {
  ad: AdCampaign;
  placement?: "feed" | "detail";
}

/**
 * Sponsored card — click image or title opens advertiser URL or linked project.
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
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [ad.id, placement]);

  const openAd = () => {
    logAdEvent(ad.id, "click", placement);
    if (ad.linked_project_id) {
      navigate(`/project/${ad.linked_project_id}?sponsor=${ad.id}`);
      return;
    }
    if (ad.target_url) {
      openSafeExternalUrl(ad.target_url);
      return;
    }
    navigate(`/ads/${ad.id}`);
  };

  return (
    <div ref={ref} className="group">
      <button
        type="button"
        onClick={openAd}
        className="relative block w-full aspect-[4/3] overflow-hidden rounded-sm bg-muted text-left"
      >
        <img
          src={ad.image_url}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          loading="lazy"
        />
      </button>
      <div className="mt-2 flex items-center gap-2 px-0.5">
        <button
          type="button"
          onClick={openAd}
          className="min-w-0 flex-1 truncate text-left text-base text-foreground thai-leading-tight hover:underline"
        >
          {ad.title}
        </button>
        <span
          className="shrink-0 rounded-full border border-foreground/15 bg-muted px-2 py-0.5 text-[10px] font-semibold tracking-wider text-muted-foreground"
          aria-label="Sponsored"
        >
          Sponsored
        </span>
      </div>
    </div>
  );
};

export default AdCard;
