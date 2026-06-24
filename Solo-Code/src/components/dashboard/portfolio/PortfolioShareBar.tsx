import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, ExternalLink, Share2 } from "lucide-react";
import { toast } from "sonner";
import { portfolioPublicUrl, validateSlug } from "@/lib/portfolioSchema";

export function PortfolioShareBar({
  slug,
  status,
  completeness,
  onSlugChange,
  onPublishChange,
  publishing,
  checkingSlug,
}: {
  slug: string;
  status: "draft" | "published";
  completeness: number;
  onSlugChange: (slug: string) => void;
  onPublishChange: (published: boolean) => void;
  publishing?: boolean;
  checkingSlug?: boolean;
}) {
  const [slugDraft, setSlugDraft] = React.useState(slug);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => setSlugDraft(slug), [slug]);

  const url = portfolioPublicUrl(slug);
  const isPublished = status === "published";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("คัดลอกลิงก์แล้ว");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("คัดลอกไม่สำเร็จ");
    }
  };

  const commitSlug = () => {
    const v = validateSlug(slugDraft);
    if (!v.ok) {
      toast.error(v.reason);
      setSlugDraft(slug);
      return;
    }
    if (v.slug !== slug) onSlugChange(v.slug);
  };

  return (
    <div className="sticky top-0 z-10 -mx-1 px-1 py-3 bg-background/95 backdrop-blur border-b border-border/50 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Share2 className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-semibold truncate">Portfolio</span>
          <Badge variant="secondary" className="text-[10px]">
            {completeness}% พร้อมแชร์
          </Badge>
          <Badge
            variant={isPublished ? "default" : "outline"}
            className="text-[10px]"
          >
            {isPublished ? "เผยแพร่แล้ว" : "แบบร่าง"}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="portfolio-publish" className="text-xs text-muted-foreground">
              เผยแพร่
            </Label>
            <Switch
              id="portfolio-publish"
              checked={isPublished}
              disabled={publishing}
              onCheckedChange={onPublishChange}
            />
          </div>
          <Button type="button" variant="outline" size="sm" className="h-8" onClick={copy}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            <span className="ml-1.5 hidden sm:inline">Copy link</span>
          </Button>
          {isPublished ? (
            <Button type="button" variant="outline" size="sm" className="h-8" asChild>
              <a href={url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="ml-1.5 hidden sm:inline">Preview</span>
              </a>
            </Button>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-1 text-xs">
        <span className="text-muted-foreground shrink-0">solofreelancer.com/p/</span>
        <Input
          value={slugDraft}
          onChange={(e) => setSlugDraft(e.target.value)}
          onBlur={commitSlug}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), commitSlug())}
          className="h-8 text-sm font-mono"
          disabled={checkingSlug}
        />
      </div>
      <p className="text-[11px] text-muted-foreground">
        ข้อมูลนี้แสดงให้ลูกค้าเห็น — ไม่ใช่ตั้งค่าเอกสารหรือรหัสผ่านใน Assets
      </p>
    </div>
  );
}
