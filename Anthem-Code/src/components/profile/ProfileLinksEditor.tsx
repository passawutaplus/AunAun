import { useEffect, useMemo, useState } from "react";
import { Link2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { safeHttpUrl } from "@/lib/safeUrl";
import type { SocialLinkItem } from "@/lib/validators";
import {
  CONTACT_SOCIAL_PLATFORMS,
  type ContactSocialPlatformId,
  resolveContactSocialPlatform,
} from "@/lib/contactSocialPlatforms";
import { cn } from "@/lib/utils";

const MAX_LINKS = 12;

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `link-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeUrlInput(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  if (t.startsWith("@")) return t;
  if (/^https?:\/\//i.test(t)) return t;
  if (/^[a-z0-9.-]+\.[a-z]{2,}/i.test(t) || t.includes("/")) return `https://${t}`;
  return t;
}

function toStoredUrl(raw: string, platformId?: ContactSocialPlatformId): string | null {
  const t = raw.trim();
  if (!t) return null;

  if (t.startsWith("@")) {
    const handle = t.slice(1).replace(/^@+/, "");
    if (!handle) return null;
    if (platformId === "instagram") return `https://instagram.com/${encodeURIComponent(handle)}`;
    if (platformId === "tiktok") return `https://www.tiktok.com/@${encodeURIComponent(handle)}`;
    if (platformId === "x") return `https://x.com/${encodeURIComponent(handle)}`;
    if (platformId === "lemon8") return `https://www.lemon8-app.com/@${encodeURIComponent(handle)}`;
    if (platformId === "facebook") return `https://facebook.com/${encodeURIComponent(handle)}`;
  }

  return safeHttpUrl(normalizeUrlInput(t));
}

function displayUrlValue(url: string): string {
  return url.replace(/^https?:\/\//i, "");
}

type Props = {
  value: SocialLinkItem[];
  onChange: (next: SocialLinkItem[]) => void;
};

function splitLinks(value: SocialLinkItem[]) {
  const byPlatform = new Map<ContactSocialPlatformId, SocialLinkItem>();
  const rest: SocialLinkItem[] = [];
  for (const link of value) {
    const byId = CONTACT_SOCIAL_PLATFORMS.find((p) => p.id === link.id);
    const byTitle = resolveContactSocialPlatform(link.title);
    const platform = byId ?? byTitle;
    if (platform && !byPlatform.has(platform.id)) {
      byPlatform.set(platform.id, { ...link, id: platform.id, title: platform.label });
    } else {
      rest.push(link);
    }
  }
  return { presets: byPlatform, customs: rest };
}

/** Contact social rows (FB / IG / X / TikTok / Lemon8) + custom “อื่นๆ”. */
export default function ProfileLinksEditor({ value, onChange }: Props) {
  const { presets, customs } = useMemo(() => splitLinks(value), [value]);

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [otherTitle, setOtherTitle] = useState("");
  const [otherUrl, setOtherUrl] = useState("");

  // Sync input drafts when saved links change (load / blur commit). Mid-edit is local until blur.
  const presetKey = CONTACT_SOCIAL_PLATFORMS.map((p) => {
    const existing = presets.get(p.id);
    return `${p.id}:${existing?.url ?? ""}`;
  }).join("|");

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const platform of CONTACT_SOCIAL_PLATFORMS) {
      const existing = presets.get(platform.id);
      next[platform.id] = existing ? displayUrlValue(existing.url) : "";
    }
    setDrafts(next);
    // presets is derived from value; presetKey is the stable sync signal
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: sync on committed URLs only
  }, [presetKey]);

  const commitPreset = (platformId: ContactSocialPlatformId, raw: string) => {
    const platform = CONTACT_SOCIAL_PLATFORMS.find((p) => p.id === platformId)!;
    const without = value.filter((l) => {
      if (l.id === platformId) return false;
      const match = resolveContactSocialPlatform(l.title);
      return !(match?.id === platformId);
    });
    const trimmed = raw.trim();
    if (!trimmed) {
      onChange(without);
      return;
    }
    const href = toStoredUrl(trimmed, platformId);
    if (!href) {
      toast.error("ใส่ลิงก์ให้ถูกต้อง หรือใช้ @username");
      return;
    }
    onChange([...without, { id: platformId, title: platform.label, url: href.slice(0, 255) }]);
  };

  const addOther = () => {
    const t = otherTitle.trim();
    const href = toStoredUrl(otherUrl);
    if (!t) {
      toast.error("กรอกชื่อช่องทางก่อน");
      return;
    }
    if (!href) {
      toast.error("ใส่ลิงก์ http:// หรือ https:// หรือ @username");
      return;
    }
    if (resolveContactSocialPlatform(t)) {
      toast.error("ช่องทางนี้มีแถวด้านบนแล้ว — กรอกในแถวนั้นได้เลย");
      return;
    }
    if (value.length >= MAX_LINKS) {
      toast.error(`เพิ่มได้สูงสุด ${MAX_LINKS} ลิงก์`);
      return;
    }
    onChange([...value, { id: newId(), title: t.slice(0, 60), url: href }]);
    setOtherTitle("");
    setOtherUrl("");
  };

  const removeCustom = (id: string) => onChange(value.filter((l) => l.id !== id));

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        ช่องทางติดต่อโซเชียล — กรอกลิงก์หรือ @username ได้เลย
      </p>

      <div className="rounded-xl border border-border bg-background/50 divide-y divide-border/60">
        {CONTACT_SOCIAL_PLATFORMS.map((platform) => {
          const Icon = platform.Icon;
          const draft = drafts[platform.id] ?? "";
          return (
            <div key={platform.id} className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground",
                )}
                aria-hidden
              >
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <label
                  htmlFor={`social-${platform.id}`}
                  className="text-xs font-medium text-foreground"
                >
                  {platform.label}
                </label>
                <input
                  id={`social-${platform.id}`}
                  type="text"
                  value={draft}
                  onChange={(e) =>
                    setDrafts((d) => ({ ...d, [platform.id]: e.target.value }))
                  }
                  onBlur={() => commitPreset(platform.id, draft)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  placeholder={platform.placeholder}
                  maxLength={255}
                  className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">อื่นๆ</p>
        <div className="rounded-xl border border-border bg-background/50 p-3 sm:p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)_auto] sm:items-end">
            <div>
              <label htmlFor="profile-link-other-title" className="text-xs font-medium text-muted-foreground">
                ชื่อช่องทาง
              </label>
              <input
                id="profile-link-other-title"
                type="text"
                value={otherTitle}
                onChange={(e) => setOtherTitle(e.target.value)}
                maxLength={60}
                placeholder="เช่น LINE OA, Threads"
                className="mt-1 w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addOther();
                  }
                }}
              />
            </div>
            <div>
              <label htmlFor="profile-link-other-url" className="text-xs font-medium text-muted-foreground">
                ลิงก์
              </label>
              <input
                id="profile-link-other-url"
                type="text"
                value={otherUrl}
                onChange={(e) => setOtherUrl(e.target.value)}
                maxLength={255}
                placeholder="https://… หรือ @username"
                className="mt-1 w-full rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addOther();
                  }
                }}
              />
            </div>
            <Button
              type="button"
              onClick={addOther}
              className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 sm:mb-0.5"
            >
              <Plus className="w-4 h-4 mr-1" /> เพิ่ม
            </Button>
          </div>
        </div>

        {customs.length > 0 ? (
          <ul className="space-y-2">
            {customs.map((link) => (
              <li
                key={link.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-background/60 px-3 py-2.5"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground shrink-0">
                  <Link2 className="w-3.5 h-3.5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{link.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {displayUrlValue(link.url)}
                  </p>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="shrink-0 rounded-full text-muted-foreground hover:text-destructive"
                  onClick={() => removeCustom(link.id)}
                  aria-label={`ลบลิงก์ ${link.title}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
