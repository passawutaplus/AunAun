import { ReactNode, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import ShareDialogPanel from "@/components/share/ShareDialogPanel";

type Props = {
  url: string;
  title: string;
  label?: string;
  imageUrl?: string;
  subtitle?: string;
  children: ReactNode;
  /** Kept for callers; dialog is centered so alignment is unused. */
  align?: "start" | "center" | "end";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

const SharePopover = ({
  url,
  title,
  label = "แชร์",
  imageUrl,
  subtitle,
  children,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: Props) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        // Above the image lightbox (z-100), which also opens this dialog.
        overlayClassName="z-[130] bg-black/50"
        className="z-[130] max-w-[min(28rem,calc(100vw-1.5rem))] gap-0 overflow-hidden rounded-2xl p-0 sm:rounded-2xl"
      >
        <ShareDialogPanel
          title={title}
          url={url}
          label={label}
          imageUrl={imageUrl}
          subtitle={subtitle}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
};

export default SharePopover;
