import { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Facebook, Twitter, Link2, Send, MessageCircle } from "lucide-react";
import { toast } from "sonner";
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
  const text = encodeURIComponent(title);
  const u = encodeURIComponent(url);

  const trackShare = async (platform: string) => {
    if (!projectId || !imageUrl) return;
    try {
      await logImageShare(projectId, imageUrl, platform, user?.id);
      qc.invalidateQueries({ queryKey: ["image-stats", projectId, imageUrl] });
    } catch {
      /* non-blocking */
    }
  };

  const items = [
    { key: "facebook", label: "Facebook", icon: Facebook, color: "text-[#1877F2]", href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { key: "x", label: "X (Twitter)", icon: Twitter, color: "text-foreground", href: `https://twitter.com/intent/tweet?url=${u}&text=${text}` },
    { key: "line", label: "LINE", icon: MessageCircle, color: "text-[#06C755]", href: `https://social-plugins.line.me/lineit/share?url=${u}` },
    { key: "telegram", label: "Telegram", icon: Send, color: "text-[#0088cc]", href: `https://t.me/share/url?url=${u}&text=${text}` },
  ];

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        await trackShare("web_share");
        onOpenChange(false);
      } catch {}
    } else {
      handleCopy();
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      await trackShare("copy");
      toast.success("คัดลอกลิงก์แล้ว — วางใน Instagram หรือที่อื่นได้เลย");
      onOpenChange(false);
    } catch {
      toast.error("คัดลอกไม่สำเร็จ");
    }
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <p className="text-sm font-semibold px-2 py-1.5">แชร์ผลงาน</p>
        <div className="space-y-0.5">
          {items.map((it) => (
            <a
              key={it.key}
              href={it.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                void trackShare(it.key);
                onOpenChange(false);
              }}
              className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-muted text-sm transition"
            >
              <it.icon className={`w-4 h-4 ${it.color}`} />
              <span>{it.label}</span>
            </a>
          ))}
          {typeof navigator !== "undefined" && "share" in navigator && (
            <button
              onClick={handleNativeShare}
              className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-muted text-sm transition text-left"
            >
              <Send className="w-4 h-4 text-primary" />
              <span>แชร์ผ่านอุปกรณ์</span>
            </button>
          )}
          <button
            onClick={handleCopy}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-muted text-sm transition text-left"
          >
            <Link2 className="w-4 h-4 text-muted-foreground" />
            <span>คัดลอกลิงก์</span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default SharePopover;
