import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from "framer-motion";
import { ArrowUpRight, Bookmark, Eye, Heart, MessageCircle } from "lucide-react";
import SaveToCollectionPopover from "@/components/collections/SaveToCollectionPopover";
import { useSavedProjectIds } from "@/hooks/useCollections";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import ConnectMessageDialog from "@/components/chat/ConnectMessageDialog";
import UserAvatar from "@/components/UserAvatar";
import VerifiedBadge from "@/components/profile/VerifiedBadge";
import type { Project } from "@/data/projectTypes";
import { useAuth } from "@/hooks/useAuth";
import { useProjectLike } from "@/hooks/useProjectInteractions";
import { navigateToAuth } from "@/lib/authRedirect";
import { naturalFeedCoverUrl } from "@/lib/feedProjectCover";
import { smoothEase } from "@/lib/motion";
import { profilePublicPath } from "@/lib/profileRoutes";
import { absoluteUrl } from "@/lib/seo";
import { useQuickView } from "@/stores/quickViewStore";

const compact = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}m` : n >= 1_000 ? `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k` : String(n);

const SWIPE_PX = 70;

const isDb = (id: string) => /^[0-9a-f]{8}-/.test(id);

function QuickViewInfo({
  project,
  onClose,
  onChat,
}: {
  project: Project;
  onClose: () => void;
  onChat: () => void;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { likes } = useProjectLike(isDb(project.id) ? project.id : undefined);
  const { data: savedIds = [] } = useSavedProjectIds(user?.id);
  const isOwn = !!user && user.id === project.ownerId;
  const saved = isDb(project.id) && savedIds.includes(project.id);

  return (
    <div className="space-y-3 px-1 pt-4">
      <div className="min-w-0">
        <DialogTitle className="truncate text-base font-semibold leading-snug text-white">{project.title}</DialogTitle>
        <DialogDescription asChild>
          <button
            type="button"
            className="mt-1.5 flex min-w-0 items-center gap-2 text-left text-sm text-white/75"
            onClick={() => {
              if (!project.ownerId) return;
              onClose();
              navigate(profilePublicPath({ user_id: project.ownerId, username: project.ownerUsername }));
            }}
          >
            <UserAvatar
              src={project.ownerAvatar}
              name={project.owner}
              username={project.ownerUsername}
              className="h-6 w-6"
              fallbackClassName="text-[10px]"
            />
            <span className="truncate text-white">{project.owner}</span>
            <VerifiedBadge verified={project.ownerVerified} size="sm" />
          </button>
        </DialogDescription>
      </div>
      <div className="flex items-center gap-4 text-sm text-white/75 tabular-nums">
        <span className="inline-flex items-center gap-1.5">
          <Heart className="h-4 w-4" aria-hidden /> {compact(isDb(project.id) ? likes : project.likes)}
          <span className="sr-only">ถูกใจ</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Eye className="h-4 w-4" aria-hidden /> {compact(project.views ?? 0)}
          <span className="sr-only">วิว</span>
        </span>
      </div>
      <div className="flex gap-2">
        {!isOwn && project.ownerId ? (
          <button
            type="button"
            onClick={onChat}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-medium text-neutral-900 transition-opacity hover:opacity-90"
          >
            <MessageCircle className="h-4 w-4" aria-hidden />
            ทักแชท
          </button>
        ) : null}
        {isDb(project.id) ? (
          <SaveToCollectionPopover projectId={project.id} align="center" side="top">
            <button
              type="button"
              aria-label={saved ? "เก็บในคอลเลกชันแล้ว" : "เก็บเข้าคอลเลกชัน"}
              aria-pressed={saved}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-full border border-white/25 px-4 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              <Bookmark className={saved ? "h-4 w-4 fill-current" : "h-4 w-4"} aria-hidden />
              เก็บ
            </button>
          </SaveToCollectionPopover>
        ) : null}
        <button
          type="button"
          onClick={() => {
            onClose();
            navigate(`/project/${project.id}`);
          }}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full border border-white/25 px-4 text-sm font-medium text-white transition-colors hover:bg-white/10"
        >
          ดูผลงาน
          <ArrowUpRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

/**
 * Long-press preview on the phone feed (one host on the feed page): big image + creator,
 * title, likes, views, chat, save — swipe left / right for the next / previous card.
 */
export function ProjectQuickViewHost() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const reduced = useReducedMotion();
  const { projects, index, step, close } = useQuickView();
  const project = index != null ? projects[index] : null;
  const [chatFor, setChatFor] = useState<Project | null>(null);
  const [dir, setDir] = useState<1 | -1>(1);
  const dragged = useRef(false);

  const lastStepAt = useRef(0);
  const go = (delta: 1 | -1) => {
    if (index == null) return;
    // One swipe = one card (the card that is leaving can still report the same drag).
    if (Date.now() - lastStepAt.current < 450) return;
    lastStepAt.current = Date.now();
    const next = index + delta;
    if (next < 0 || next >= projects.length) return;
    setDir(delta);
    step(delta);
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x <= -SWIPE_PX || info.velocity.x < -500) go(1);
    else if (info.offset.x >= SWIPE_PX || info.velocity.x > 500) go(-1);
  };

  const openChat = (p: Project) => {
    close();
    if (!user) {
      navigateToAuth(navigate);
      return;
    }
    setChatFor(p);
  };

  return (
    <>
      <Dialog open={!!project} onOpenChange={(open) => !open && close()}>
        <DialogContent
          overlayClassName="bg-black/85 backdrop-blur-sm"
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="w-[calc(100vw-1.5rem)] max-w-md gap-0 border-0 bg-transparent p-0 text-white shadow-none [&>button]:-top-11 [&>button]:right-0 [&>button]:rounded-full [&>button]:bg-white/15 [&>button]:p-2 [&>button]:text-white [&>button]:opacity-100"
        >
          {project ? (
            <AnimatePresence mode="popLayout" initial={false} custom={dir}>
              <motion.div
                key={project.id}
                custom={dir}
                initial={reduced ? false : { opacity: 0, x: dir * 60 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduced ? undefined : { opacity: 0, x: dir * -60 }}
                transition={{ duration: 0.26, ease: smoothEase }}
              >
                <motion.button
                  type="button"
                  drag={projects.length > 1 ? "x" : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.55}
                  onDragStart={() => {
                    dragged.current = true;
                  }}
                  onDragEnd={onDragEnd}
                  className="flex w-full touch-pan-y justify-center rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                  onClick={() => {
                    if (dragged.current) {
                      dragged.current = false;
                      return;
                    }
                    close();
                    navigate(`/project/${project.id}`);
                  }}
                  aria-label={`เปิดผลงาน ${project.title} · ปัดซ้ายขวาเพื่อดูผลงานถัดไป`}
                >
                  <img
                    src={naturalFeedCoverUrl(project.image)}
                    alt={project.title}
                    className="pointer-events-none mx-auto max-h-[64dvh] w-auto max-w-full select-none rounded-2xl object-contain"
                    draggable={false}
                  />
                </motion.button>
                <QuickViewInfo project={project} onClose={close} onChat={() => openChat(project)} />
                {projects.length > 1 ? (
                  <p className="mt-3 text-center text-[11px] tabular-nums text-white/50" aria-live="polite">
                    {(index ?? 0) + 1} / {projects.length} · ปัดซ้าย-ขวาเพื่อดูผลงานถัดไป
                  </p>
                ) : null}
              </motion.div>
            </AnimatePresence>
          ) : null}
        </DialogContent>
      </Dialog>
      {chatFor?.ownerId ? (
        <ConnectMessageDialog
          open={!!chatFor}
          onOpenChange={(open) => !open && setChatFor(null)}
          recipientId={chatFor.ownerId}
          recipientName={chatFor.owner}
          about={{ title: chatFor.title, url: absoluteUrl(`/project/${chatFor.id}`), coverUrl: chatFor.image }}
        />
      ) : null}
    </>
  );
}
