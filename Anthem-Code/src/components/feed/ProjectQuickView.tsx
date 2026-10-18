import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
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
import { navigateToAuth } from "@/lib/authRedirect";
import { naturalFeedCoverUrl } from "@/lib/feedProjectCover";
import { smoothEase } from "@/lib/motion";
import { profilePublicPath } from "@/lib/profileRoutes";
import { absoluteUrl } from "@/lib/seo";

const compact = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}m` : n >= 1_000 ? `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k` : String(n);

/** Long-press preview on the phone feed: big image + creator, title, likes, views, chat — no page load. */
export function ProjectQuickView({
  project,
  likes,
  open,
  onOpenChange,
}: {
  project: Project;
  likes: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const reduced = useReducedMotion();
  const [chatOpen, setChatOpen] = useState(false);
  const isOwn = !!user && user.id === project.ownerId;
  const isDbProject = /^[0-9a-f]{8}-/.test(project.id);
  const { data: savedIds = [] } = useSavedProjectIds(user?.id);
  const saved = isDbProject && savedIds.includes(project.id);

  const openChat = () => {
    if (!user) {
      onOpenChange(false);
      navigateToAuth(navigate);
      return;
    }
    onOpenChange(false);
    setChatOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          overlayClassName="bg-black/85 backdrop-blur-sm"
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="w-[calc(100vw-1.5rem)] max-w-md gap-0 border-0 bg-transparent p-0 text-white shadow-none [&>button]:-top-11 [&>button]:right-0 [&>button]:rounded-full [&>button]:bg-white/15 [&>button]:p-2 [&>button]:text-white [&>button]:opacity-100"
        >
          <motion.div
            initial={reduced ? false : { opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.28, ease: smoothEase }}
          >
            <button
              type="button"
              className="flex w-full justify-center rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              onClick={() => {
                onOpenChange(false);
                navigate(`/project/${project.id}`);
              }}
              aria-label={`เปิดผลงาน ${project.title}`}
            >
              <img
                src={naturalFeedCoverUrl(project.image)}
                alt={project.title}
                className="mx-auto max-h-[64dvh] w-auto max-w-full rounded-2xl object-contain"
                draggable={false}
              />
            </button>
            <div className="space-y-3 px-1 pt-4">
              <div className="min-w-0">
                <DialogTitle className="truncate text-base font-semibold leading-snug text-white">
                  {project.title}
                </DialogTitle>
                <DialogDescription asChild>
                  <button
                    type="button"
                    className="mt-1.5 flex min-w-0 items-center gap-2 text-left text-sm text-white/75"
                    onClick={() => {
                      if (!project.ownerId) return;
                      onOpenChange(false);
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
                  <Heart className="h-4 w-4" aria-hidden /> {compact(likes)}
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
                    onClick={openChat}
                    className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-medium text-neutral-900 transition-opacity hover:opacity-90"
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden />
                    ทักแชท
                  </button>
                ) : null}
                {isDbProject ? (
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
                    onOpenChange(false);
                    navigate(`/project/${project.id}`);
                  }}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full border border-white/25 px-4 text-sm font-medium text-white transition-colors hover:bg-white/10"
                >
                  ดูผลงาน
                  <ArrowUpRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>
      {project.ownerId && !isOwn ? (
        <ConnectMessageDialog
          open={chatOpen}
          onOpenChange={setChatOpen}
          recipientId={project.ownerId}
          recipientName={project.owner}
          about={{ title: project.title, url: absoluteUrl(`/project/${project.id}`), coverUrl: project.image }}
        />
      ) : null}
    </>
  );
}
