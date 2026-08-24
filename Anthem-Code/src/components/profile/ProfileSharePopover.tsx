import { ReactNode, useState } from "react";
import { ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import ShareDialogPanel from "@/components/share/ShareDialogPanel";

type Props = {
  url: string;
  title: string;
  message: string;
  pathLabel: string;
  imageUrl?: string;
  children: ReactNode;
  /** Kept for callers; dialog is centered so alignment is unused. */
  align?: "start" | "center" | "end";
  onShared?: () => void;
};

const ProfileSharePopover = ({
  url,
  title,
  message,
  pathLabel,
  imageUrl,
  children,
  onShared,
}: Props) => {
  const [open, setOpen] = useState(false);
  const displayPath = pathLabel.startsWith("/") ? pathLabel : `/${pathLabel}`;

  const handleOpenPublic = () => {
    window.open(url, "_blank", "noopener,noreferrer");
    onShared?.();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        overlayClassName="bg-black/50"
        className="max-w-[min(28rem,calc(100vw-1.5rem))] gap-0 overflow-hidden rounded-2xl p-0 sm:rounded-2xl"
      >
        <ShareDialogPanel
          title={title}
          url={url}
          label="แชร์พอร์ตโฟล์สาธารณะ"
          imageUrl={imageUrl}
          subtitle={displayPath}
          copyPayload={`${message}\n${url}`}
          copySuccessMessage="คัดลอกลิงก์พอร์ตโฟล์แล้ว"
          onPlatform={() => onShared?.()}
          onDone={() => setOpen(false)}
          extraFooter={
            <Button
              type="button"
              variant="ghost"
              onClick={handleOpenPublic}
              className="mt-3 h-11 w-full justify-center gap-2 rounded-xl text-sm font-medium"
            >
              <ExternalLink className="h-4 w-4" aria-hidden />
              เปิดหน้าที่ลูกค้าเห็น
            </Button>
          }
        />
      </DialogContent>
    </Dialog>
  );
};

export default ProfileSharePopover;
