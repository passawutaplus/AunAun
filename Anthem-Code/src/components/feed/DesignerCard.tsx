import BriefcaseIcon from "../icons/BriefcaseIcon";
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Handshake } from "lucide-react";
import { PlusOneControl } from "@/components/brand/PlusOneControl";
import UserAvatar from "@/components/UserAvatar";
import type { DesignerCardData } from "@/hooks/useDesigners";
import FollowButton from "@/components/FollowButton";
import { useFollowState } from "@/hooks/useFollow";
import { useProjectLike } from "@/hooks/useProjectInteractions";
import { highlight } from "@/lib/highlight";
import { imageCrossfadeVariants, imageRevealTransition } from "@/lib/motion";

interface Props {
  data: DesignerCardData;
  onHire: (recipientId: string, recipientName: string) => void;
  onCollab: (recipientId: string, recipientName: string) => void;
  search?: string;
}

const DesignerCard = ({ data, onHire, onCollab, search = "" }: Props) => {
  const navigate = useNavigate();
  const { profile, projects } = data;
  const profileUserId =
    (profile as { user_id?: string; id?: string }).user_id ?? profile.id;
  const visible = projects.slice(0, 3);
  const extras = projects.slice(3, 6);
  const featured = projects[0];
  const like = useProjectLike(featured?.id);
  const { followers } = useFollowState(profileUserId);

  const totalLikes = useMemo(
    () => projects.reduce((sum, p) => sum + (p.likes ?? 0), 0),
    [projects],
  );

  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!extras.length) return;
    const t = setInterval(() => setTick((v) => v + 1), 3500);
    return () => clearInterval(t);
  }, [extras.length]);

  const name = profile.display_name || profile.username || "ฟรีแลนซ์";
  const goto = (id: string) => navigate(`/project/${id}`);
  const gotoProfile = () => {
    const qs = search ? `?q=${encodeURIComponent(search)}` : "";
    navigate(`/u/${profileUserId}${qs}`);
  };

  return (
    <article className="relative rounded-2xl glass-panel p-4 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <button onClick={gotoProfile} className="shrink-0">
          <UserAvatar
            src={profile.avatar_url}
            name={name}
            className="w-11 h-11"
          />
        </button>
        <div className="flex-1 min-w-0">
          <button onClick={gotoProfile} className="block text-left text-sm font-semibold text-foreground truncate hover:underline">
            {highlight(name, search)}
          </button>
          <p className="text-xs text-muted-foreground truncate">
            {highlight(profile.role || profile.bio || "Designer", search)}
          </p>
          <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
            <span>{followers.toLocaleString("th-TH")} ผู้ติดตาม</span>
            <span aria-hidden>·</span>
            <PlusOneControl
              active={false}
              count={totalLikes}
              showCount
              className="text-[11px]"
              ariaLabel="+1 รวม"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {visible.map((proj, i) => {
          const extra = extras[i];
          const showExtra = extra && tick % 2 === 1;
          const shown = showExtra ? extra : proj;
          const src = shown.cover_url || shown.gallery_urls?.[0] || "";
          return (
            <button
              key={i}
              onClick={() => goto(shown.id)}
              className="relative aspect-[4/3] rounded-xl overflow-hidden bg-muted group"
              title={shown.title}
            >
              <AnimatePresence mode="wait">
                {src && (
                  <motion.img
                    key={shown.id}
                    src={src}
                    alt={shown.title}
                    variants={imageCrossfadeVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={imageRevealTransition}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => onHire(profileUserId, name)}
          className="flex items-center justify-center gap-1 rounded-full bg-gradient-brand text-white text-xs font-medium py-2 px-1.5 hover:opacity-90 transition min-w-0"
        >
          <BriefcaseIcon className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">สนใจจ้างงาน</span>
        </button>
        <button
          type="button"
          onClick={() => onCollab(profileUserId, name)}
          className="flex items-center justify-center gap-1 rounded-full glass-panel border border-border/60 text-foreground text-xs font-medium py-2 px-1.5 hover:bg-accent/40 transition min-w-0"
        >
          <Handshake className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">สนใจคอลแลป</span>
        </button>
        <div className="flex items-center justify-center gap-1.5 min-w-0">
          <FollowButton freelancerId={profileUserId} iconOnly tone="muted" />
          <motion.div whileTap={{ scale: 0.92 }}>
            <PlusOneControl
              active={like.isLiked}
              showCount={false}
              ariaLabel={like.isLiked ? "เลิกถูกใจ" : "ถูกใจ"}
              onClick={() => featured && like.toggle()}
              className="w-9 h-9 flex items-center justify-center rounded-full glass-panel hover:bg-accent/40 transition"
            />
          </motion.div>
        </div>
      </div>
    </article>
  );
};

export default DesignerCard;
