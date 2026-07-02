import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, CheckCircle2, MapPin, Users } from "lucide-react";
import { PlusOneMark } from "@/components/brand/PlusOneMark";
import StudioFollowButton from "@/components/StudioFollowButton";
import { useStudioFollowState } from "@/hooks/useStudioFollow";
import { useProjectLike } from "@/hooks/useProjectInteractions";
import type { StudioCardData } from "@/hooks/usePublicStudios";

interface Props {
  data: StudioCardData;
}

const StudioCard = ({ data }: Props) => {
  const navigate = useNavigate();
  const { studio, memberAvatars, projectCovers } = data;
  const { followers } = useStudioFollowState(studio.id);
  const featuredProjectId = projectCovers[0]?.id?.startsWith("_") ? undefined : projectCovers[0]?.id;
  const like = useProjectLike(featuredProjectId);
  const tiles = [...projectCovers];
  while (tiles.length < 3) tiles.push({ id: `_${tiles.length}`, title: "", cover: "" });

  return (
    <article className="rounded-2xl glass-panel p-4 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(`/s/${studio.slug}`)}
          className="shrink-0 w-12 h-12 rounded-2xl bg-gradient-brand text-white grid place-items-center overflow-hidden"
          aria-label={studio.name}
        >
          {studio.avatar_url ? (
            <img src={studio.avatar_url} alt={studio.name} className="w-full h-full object-cover" />
          ) : (
            <Building2 className="w-5 h-5" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <button
            onClick={() => navigate(`/s/${studio.slug}`)}
            className="block text-left text-sm font-semibold text-foreground truncate hover:underline"
          >
            <span className="inline-flex items-center gap-1">
              {studio.name}
              {studio.verified && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
            </span>
          </button>
          <p className="text-xs text-muted-foreground truncate">
            {studio.tagline || "Design studio"}
          </p>
          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-0.5"><Users className="w-3 h-3" />{studio.member_count}</span>
            <span className="inline-flex items-center gap-0.5">{followers} ติดตาม</span>
            {studio.location && (
              <span className="inline-flex items-center gap-0.5 truncate"><MapPin className="w-3 h-3" />{studio.location}</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {tiles.map((t, i) => (
          <button
            key={t.id + i}
            onClick={() => t.cover && navigate(`/project/${t.id}`)}
            disabled={!t.cover}
            className="relative aspect-[4/3] rounded-xl overflow-hidden bg-muted group"
          >
            {t.cover ? (
              <img
                src={t.cover}
                alt={t.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center text-[11px] text-muted-foreground">
                ยังไม่มีผลงาน
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 min-w-0">
          {memberAvatars.length > 0 && (
            <>
              <div className="flex -space-x-2 shrink-0">
                {memberAvatars.map((m) => (
                  <div
                    key={m.id}
                    className="w-7 h-7 rounded-full ring-2 ring-background overflow-hidden bg-muted"
                    title={m.display_name}
                  >
                    {m.avatar_url ? (
                      <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-brand" />
                    )}
                  </div>
                ))}
              </div>
              <span className="text-xs text-muted-foreground truncate">
                {studio.member_count} สมาชิก · {projectCovers.length} ผลงาน
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <StudioFollowButton studioId={studio.id} iconOnly tone="muted" />
          <button
            type="button"
            onClick={() => navigate(`/s/${studio.slug}`)}
            className="h-9 px-3 rounded-full glass-panel text-foreground text-xs font-medium hover:bg-accent/40 transition shrink-0"
          >
            ดู Studio
          </button>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => featuredProjectId && like.toggle()}
            disabled={!featuredProjectId}
            aria-label="ให้ +1 ผลงานเด่น"
            className="w-9 h-9 flex items-center justify-center rounded-full glass-panel hover:bg-accent/40 transition disabled:opacity-40"
          >
            <PlusOneMark className={like.isLiked ? "text-primary" : "text-muted-foreground"} />
          </motion.button>
        </div>
      </div>
    </article>
  );
};

export default StudioCard;
