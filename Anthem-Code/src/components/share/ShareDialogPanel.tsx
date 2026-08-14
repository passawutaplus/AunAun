import { useState } from "react";
import { Link2, Mail, Share2 } from "lucide-react";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BRAND_ICON_SRC } from "@/components/share/brandMarks";
import { BRAND_MARK, BRAND_NAME } from "@/lib/brandConfig";
import {
  SHARE_TARGETS,
  sharePageHost,
  type SharePlatform,
  type ShareTarget,
} from "@/lib/shareTargets";

type Props = {
  title: string;
  url: string;
  label?: string;
  imageUrl?: string;
  subtitle?: string;
  copySuccessMessage?: string;
  onPlatform?: (platform: SharePlatform) => void;
  onDone?: () => void;
};

const ShareDialogPanel = ({
  title,
  url,
  label = "แชร์",
  imageUrl,
  subtitle,
  copySuccessMessage = "คัดลอกลิงก์แล้ว",
  onPlatform,
  onDone,
}: Props) => {
  const [copied, setCopied] = useState(false);
  const canNativeShare = typeof navigator !== "undefined" && "share" in navigator;
  const host = sharePageHost(url);

  const copyLink = async (successMessage = copySuccessMessage) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(successMessage);
      return true;
    } catch {
      toast.error("คัดลอกไม่สำเร็จ");
      return false;
    }
  };

  const handleCopy = async () => {
    const ok = await copyLink();
    if (ok) onPlatform?.("copy");
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({ title, url });
      onPlatform?.("web_share");
      onDone?.();
    } catch {
      /* cancelled */
    }
  };

  const handleTargetClick = (item: ShareTarget) => {
    if (item.copyHint) void copyLink(item.copyHint);
    onPlatform?.(item.key);
    onDone?.();
  };

  return (
    <div className="flex max-h-[min(90vh,40rem)] flex-col overflow-y-auto">
      <div className="px-5 pb-3 pt-5 pr-12">
        <DialogTitle className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          <Share2 className="h-5 w-5 text-primary" aria-hidden />
          {label}
        </DialogTitle>
        <DialogDescription className="sr-only">
          คัดลอกลิงก์หรือแชร์ไปยัง Facebook, Messenger, Instagram, LINE, WhatsApp, WeChat, X และอีเมล
        </DialogDescription>
      </div>

      <div className="px-5 pb-4">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          ตัวอย่างการ์ดที่เพื่อนจะเห็น
        </p>
        <div className="overflow-hidden rounded-xl border border-border/80 bg-background shadow-sm">
          <div className="relative aspect-[1.91/1] bg-neutral-950">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover object-center"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-neutral-400">
                <Link2 className="h-6 w-6" aria-hidden />
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-3 pb-2.5 pt-10">
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gradient-brand text-[9px] font-medium leading-none text-white"
                aria-hidden
              >
                {BRAND_MARK}
              </span>
              <span className="truncate text-xs font-medium text-white">{BRAND_NAME}</span>
            </div>
          </div>
          <div className="space-y-0.5 px-3 py-2.5">
            <p className="truncate text-sm font-semibold leading-snug text-foreground">{title}</p>
            <p className="truncate text-xs text-muted-foreground">{subtitle || host}</p>
          </div>
        </div>
      </div>

      <div className="px-5 pb-4">
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">ลิงก์สำหรับการแชร์</p>
        <div className="flex items-center gap-2">
          <Input
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            aria-label="ลิงก์สำหรับการแชร์"
            className="h-10 min-w-0 flex-1 truncate bg-muted/50 text-xs"
          />
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="shrink-0 rounded-md px-2 py-2 text-sm font-medium text-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {copied ? "คัดลอกแล้ว" : "คัดลอกลิงก์"}
          </button>
        </div>
      </div>

      <div className="border-t border-border/60 bg-muted/50 px-4 py-4">
        <div className="grid grid-cols-4 gap-x-1 gap-y-3">
          {SHARE_TARGETS.map((item) => (
            <a
              key={item.key}
              href={item.href(url, title)}
              target="_blank"
              rel="noopener noreferrer"
              title={item.copyHint ? `คัดลอกลิงก์แล้วเปิด ${item.label}` : `แชร์ไปยัง ${item.label}`}
              onClick={() => handleTargetClick(item)}
              className="flex w-full min-w-0 flex-col items-center gap-1.5 rounded-xl px-1 py-1.5 text-foreground transition-colors hover:bg-background/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span
                className={cn(
                  "flex h-12 w-12 items-center justify-center overflow-hidden rounded-full shadow-sm ring-1 ring-black/10 dark:ring-white/15",
                  item.wellClass,
                )}
              >
                {item.icon === "mail" ? (
                  <Mail className="h-5 w-5" aria-hidden />
                ) : (
                  <img
                    src={BRAND_ICON_SRC[item.icon]}
                    alt=""
                    className={item.imgClass}
                    width={48}
                    height={48}
                  />
                )}
              </span>
              <span className="h-8 w-full text-center text-[11px] font-medium leading-tight">
                {item.label}
              </span>
            </a>
          ))}
        </div>
        {canNativeShare ? (
          <button
            type="button"
            onClick={() => void handleNativeShare()}
            className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border/70 bg-background text-sm font-medium text-foreground transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Share2 className="h-4 w-4" aria-hidden />
            แชร์ด้วยแอปอื่น
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default ShareDialogPanel;
