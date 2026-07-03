import { useState } from "react";
import { ExternalLink, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type ProjectExternalLink,
  PROJECT_EXTERNAL_LINKS_MAX,
  createProjectExternalLink,
} from "@/lib/projectExternalLinks";
import { toast } from "sonner";

type Props = {
  links: ProjectExternalLink[];
  onChange: (links: ProjectExternalLink[]) => void;
};

const ProjectExternalLinksEditor = ({ links, onChange }: Props) => {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");

  const addLink = () => {
    const trimmedUrl = url.trim();
    const trimmedLabel = label.trim();
    if (!trimmedUrl) {
      toast.error("กรุณาใส่ URL");
      return;
    }
    try {
      const parsed = new URL(trimmedUrl.startsWith("http") ? trimmedUrl : `https://${trimmedUrl}`);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        toast.error("รองรับเฉพาะลิงก์ http/https");
        return;
      }
      if (links.length >= PROJECT_EXTERNAL_LINKS_MAX) {
        toast.error(`เพิ่มได้ไม่เกิน ${PROJECT_EXTERNAL_LINKS_MAX} ลิงก์`);
        return;
      }
      const next = [
        ...links,
        createProjectExternalLink(trimmedLabel || parsed.hostname, parsed.toString()),
      ];
      onChange(next);
      setLabel("");
      setUrl("");
    } catch {
      toast.error("URL ไม่ถูกต้อง");
    }
  };

  const removeLink = (id: string) => {
    onChange(links.filter((l) => l.id !== id));
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div>
        <Label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
          <ExternalLink className="w-3.5 h-3.5" />
          ลิงก์ภายนอก
        </Label>
        <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
          Prototype, ร้านค้า, Figma, Behance หรือลิงก์อื่น ๆ
        </p>
      </div>

      {links.length > 0 && (
        <ul className="space-y-2">
          {links.map((link) => (
            <li
              key={link.id}
              className="flex items-start gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-2"
            >
              <ExternalLink className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" aria-hidden />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{link.label}</p>
                <p className="text-[10px] text-muted-foreground truncate">{link.url}</p>
              </div>
              <button
                type="button"
                onClick={() => removeLink(link.id)}
                className="shrink-0 text-muted-foreground hover:text-destructive"
                aria-label={`ลบลิงก์ ${link.label}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2">
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="ชื่อลิงก์ เช่น Prototype, ร้านค้า"
          disabled={links.length >= PROJECT_EXTERNAL_LINKS_MAX}
          maxLength={80}
        />
        <div className="flex gap-2">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addLink();
              }
            }}
            placeholder="https://..."
            disabled={links.length >= PROJECT_EXTERNAL_LINKS_MAX}
            className="min-w-0"
          />
          <Button
            type="button"
            size="icon"
            variant="outline"
            disabled={!url.trim() || links.length >= PROJECT_EXTERNAL_LINKS_MAX}
            onClick={addLink}
            aria-label="เพิ่มลิงก์"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground">
        {links.length}/{PROJECT_EXTERNAL_LINKS_MAX} ลิงก์ — กด + หรือ Enter เพื่อเพิ่ม
      </p>
    </div>
  );
};

export default ProjectExternalLinksEditor;
