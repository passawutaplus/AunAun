import { ReactNode, useState } from "react";
import { ExternalLink, Facebook, Link2, MessageCircle, Send, Twitter } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Props = {
  url: string;
  title: string;
  message: string;
  pathLabel: string;
  children: ReactNode;
  align?: "start" | "center" | "end";
  onShared?: () => void;
};

const ProfileSharePopover = ({
  url,
  title,
  message,
  pathLabel,
  children,
  align = "end",
  onShared,
}: Props) => {
  const [open, setOpen] = useState(false);
  const displayPath = pathLabel;

  const text = encodeURIComponent(title);
  const u = encodeURIComponent(url);

  const items = [
    {
      key: "facebook",
      label: "Facebook",
      icon: Facebook,
      color: "text-[#1877F2]",
      href: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    },
    {
      key: "x",
      label: "X",
      icon: Twitter,
      color: "text-foreground",
      href: `https://twitter.com/intent/tweet?url=${u}&text=${text}`,
    },
    {
      key: "line",
      label: "LINE",
      icon: MessageCircle,
      color: "text-[#06C755]",
      href: `https://social-plugins.line.me/lineit/share?url=${u}`,
    },
  ];

  const notifyShared = () => {
    onShared?.();
  };

  const handleCopy = async () => {
    const payload = `${message}\n${url}`;
    try {
      await navigator.clipboard.writeText(payload);
      toast.success("คัดลอกลิงก์พอร์ตโฟล์แล้ว", {
        description: "วางส่งให้ลูกค้าได้เลย — เปิดแล้วเห็นผลงานและปุ่มติดต่อ",
      });
      notifyShared();
      setOpen(false);
    } catch {
      toast.error("คัดลอกไม่สำเร็จ");
    }
  };

  const handleOpenPublic = () => {
    window.open(url, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-[min(100vw-2rem,20rem)] p-3" align={align}>
        <div className="px-0.5 pb-2">
          <p className="text-sm font-semibold text-foreground">แชร์พอร์ตโฟล์สาธารณะ</p>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            ลิงก์นี้เปิดหน้าพอร์ตจริงให้ลูกค้าและเพื่อน — ดูผลงาน สนใจจ้าง หรือคอลแลปได้ทันที
            ไม่ใช่โหมดพรีวิว
          </p>
          <p className="mt-2 text-[11px] font-mono text-primary/90 truncate rounded-lg bg-primary/5 px-2 py-1.5 border border-primary/15">
            {displayPath.startsWith("/") ? displayPath : `/${displayPath}`}
          </p>
        </div>

        <div className="space-y-0.5">
          {items.map((it) => (
            <a
              key={it.key}
              href={it.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                notifyShared();
                setOpen(false);
              }}
              className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-muted text-sm transition"
            >
              <it.icon className={`w-4 h-4 ${it.color}`} />
              <span>{it.label}</span>
            </a>
          ))}
          {typeof navigator !== "undefined" && "share" in navigator && (
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.share({ title, text: message, url });
                  notifyShared();
                  setOpen(false);
                } catch {
                  /* cancelled */
                }
              }}
              className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-muted text-sm transition text-left"
            >
              <Send className="w-4 h-4 text-primary" />
              <span>แชร์ผ่านอุปกรณ์</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleCopy}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-muted text-sm transition text-left"
          >
            <Link2 className="w-4 h-4 text-muted-foreground" />
            <span>คัดลอกลิงก์ + ข้อความ</span>
          </button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleOpenPublic}
            className="w-full justify-start gap-3 h-9 px-2 text-sm font-normal"
          >
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
            เปิดหน้าที่ลูกค้าเห็น
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ProfileSharePopover;
