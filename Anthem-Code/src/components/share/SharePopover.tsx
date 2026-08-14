import { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import ShareDialogPanel from "@/components/share/ShareDialogPanel";
import { useAuth } from "@/hooks/useAuth";
import { logImageShare } from "@/hooks/useImageStats";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  url: string;
  imageUrl?: string;
  projectId?: string;
  children: ReactNode;
}

const SharePopover = ({ open, onOpenChange, title, url, imageUrl, projectId, children }: Props) => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const trackShare = async (platform: string) => {
    if (!projectId || !imageUrl) return;
    try {
      await logImageShare(projectId, imageUrl, platform, user?.id);
      qc.invalidateQueries({ queryKey: ["image-stats", projectId, imageUrl] });
    } catch {
      /* non-blocking */
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        overlayClassName="bg-black/50"
        className="max-w-[min(28rem,calc(100vw-1.5rem))] gap-0 overflow-hidden rounded-2xl p-0 sm:rounded-2xl"
      >
        <ShareDialogPanel
          title={title}
          url={url}
          label="แชร์ผลงาน"
          imageUrl={imageUrl}
          copySuccessMessage="คัดลอกลิงก์แล้ว — วางใน Instagram หรือที่อื่นได้เลย"
          onPlatform={(platform) => {
            void trackShare(platform);
          }}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
};

export default SharePopover;
