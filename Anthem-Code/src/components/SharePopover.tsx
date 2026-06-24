import { ReactNode, useState } from "react";
import { Facebook, Link2, MessageCircle, Send, Twitter } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";

type Props = {
  url: string;
  title: string;
  label?: string;
  children: ReactNode;
  align?: "start" | "center" | "end";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

const SharePopover = ({
  url,
  title,
  label = "แชร์",
  children,
  align = "end",
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: Props) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;

  const text = encodeURIComponent(title);
  const u = encodeURIComponent(url);

  const items = [
    { key: "facebook", label: "Facebook", icon: Facebook, color: "text-[#1877F2]", href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { key: "x", label: "X", icon: Twitter, color: "text-foreground", href: `https://twitter.com/intent/tweet?url=${u}&text=${text}` },
    { key: "line", label: "LINE", icon: MessageCircle, color: "text-[#06C755]", href: `https://social-plugins.line.me/lineit/share?url=${u}` },
  ];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("คัดลอกลิงก์แล้ว");
      setOpen(false);
    } catch {
      toast.error("คัดลอกไม่สำเร็จ");
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-56 p-2" align={align}>
        <p className="text-sm font-semibold px-2 py-1.5">{label}</p>
        <div className="space-y-0.5">
          {items.map((it) => (
            <a
              key={it.key}
              href={it.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
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
                  await navigator.share({ title, url });
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
            <span>คัดลอกลิงก์</span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default SharePopover;
