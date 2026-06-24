import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AVAILABILITY_LABELS,
  LINK_PLATFORM_OPTIONS,
  type PortfolioAbout,
  type PortfolioExperienceItem,
  type PortfolioExternalLink,
  type PortfolioFeaturedItem,
  type PortfolioHero,
  type PortfolioResume,
  type PortfolioSkills,
  type PortfolioVisibility,
} from "@/lib/portfolioSchema";
import { ImageIcon, Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";

export function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {description ? (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export function HeroSectionEditor({
  value,
  visibility,
  onChange,
  onVisibilityChange,
  onUploadAvatar,
  uploading,
}: {
  value: PortfolioHero;
  visibility: PortfolioVisibility;
  onChange: (patch: Partial<PortfolioHero>) => void;
  onVisibilityChange: (patch: Partial<PortfolioVisibility>) => void;
  onUploadAvatar: (file: File) => Promise<void>;
  uploading?: boolean;
}) {
  const fileRef = React.useRef<HTMLInputElement>(null);

  return (
    <SectionCard title="ข้อมูลหลัก" description="ชื่อ รูป และสถานะรับงานที่ลูกค้าเห็น">
      <div className="flex items-start gap-4">
        <div className="shrink-0">
          {value.avatarUrl ? (
            <img
              src={value.avatarUrl}
              alt=""
              className="h-16 w-16 rounded-xl object-cover border"
            />
          ) : (
            <div className="h-16 w-16 rounded-xl bg-muted flex items-center justify-center">
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2 h-7 text-xs w-full"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                await onUploadAvatar(f);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "อัปโหลดไม่สำเร็จ");
              }
              e.target.value = "";
            }}
          />
        </div>
        <div className="flex-1 space-y-3 min-w-0">
          <div className="space-y-1">
            <Label className="text-xs">ชื่อที่แสดง</Label>
            <Input
              value={value.displayName}
              onChange={(e) => onChange({ displayName: e.target.value })}
              placeholder="ชื่อของคุณ"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Headline</Label>
            <Input
              value={value.headline}
              onChange={(e) => onChange({ headline: e.target.value })}
              placeholder="Graphic Designer · Brand Identity"
            />
          </div>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">ที่ตั้ง</Label>
          <Input
            value={value.location}
            onChange={(e) => onChange({ location: e.target.value })}
            placeholder="กรุงเทพฯ / Remote"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">สถานะรับงาน</Label>
          <Select
            value={value.availability}
            onValueChange={(v) =>
              onChange({ availability: v as PortfolioHero["availability"] })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(AVAILABILITY_LABELS) as PortfolioHero["availability"][]).map((k) => (
                <SelectItem key={k} value={k}>
                  {AVAILABILITY_LABELS[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2 pt-1 border-t border-border/40">
        <p className="text-xs font-medium text-muted-foreground">ช่องทางติดต่อ (เลือกโชว์)</p>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Switch
              checked={visibility.show_email}
              onCheckedChange={(c) => onVisibilityChange({ show_email: c })}
            />
            <Input
              value={value.email}
              onChange={(e) => onChange({ email: e.target.value })}
              placeholder="อีเมล"
              className="h-8 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={visibility.show_phone}
              onCheckedChange={(c) => onVisibilityChange({ show_phone: c })}
            />
            <Input
              value={value.phone}
              onChange={(e) => onChange({ phone: e.target.value })}
              placeholder="เบอร์โทร"
              className="h-8 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={visibility.show_line}
              onCheckedChange={(c) => onVisibilityChange({ show_line: c })}
            />
            <Input
              value={value.lineId}
              onChange={(e) => onChange({ lineId: e.target.value })}
              placeholder="LINE ID"
              className="h-8 text-sm"
            />
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

export function AboutSectionEditor({
  value,
  visible,
  onChange,
  onVisibleChange,
}: {
  value: PortfolioAbout;
  visible: boolean;
  onChange: (patch: Partial<PortfolioAbout>) => void;
  onVisibleChange: (v: boolean) => void;
}) {
  return (
    <SectionCard title="เกี่ยวกับฉัน">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">แสดงบนหน้า public</Label>
        <Switch checked={visible} onCheckedChange={onVisibleChange} />
      </div>
      <Textarea
        value={value.bio}
        onChange={(e) => onChange({ bio: e.target.value })}
        placeholder="เล่าเกี่ยวกับตัวคุณ สไตล์งาน ประสบการณ์..."
        rows={5}
      />
    </SectionCard>
  );
}

export function SkillsSectionEditor({
  value,
  visible,
  onChange,
  onVisibleChange,
}: {
  value: PortfolioSkills;
  visible: boolean;
  onChange: (next: PortfolioSkills) => void;
  onVisibleChange: (v: boolean) => void;
}) {
  const [tagInput, setTagInput] = React.useState("");

  const addTag = () => {
    const t = tagInput.trim();
    if (!t || value.tags.includes(t)) return;
    onChange({ ...value, tags: [...value.tags, t] });
    setTagInput("");
  };

  return (
    <SectionCard title="ทักษะ & บริการ">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">แสดงบนหน้า public</Label>
        <Switch checked={visible} onCheckedChange={onVisibleChange} />
      </div>
      <div className="flex gap-2">
        <Input
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          placeholder="เพิ่มทักษะ"
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
        />
        <Button type="button" variant="outline" size="sm" onClick={addTag}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {value.tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1 pr-1">
            {tag}
            <button
              type="button"
              className="rounded-full hover:bg-muted p-0.5"
              onClick={() => onChange({ ...value, tags: value.tags.filter((t) => t !== tag) })}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">บริการ (optional)</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() =>
              onChange({
                ...value,
                services: [
                  ...value.services,
                  { id: crypto.randomUUID(), name: "", priceNote: "" },
                ],
              })
            }
          >
            <Plus className="h-3 w-3 mr-1" /> เพิ่ม
          </Button>
        </div>
        {value.services.map((s, i) => (
          <div key={s.id} className="flex gap-2 items-center">
            <Input
              value={s.name}
              onChange={(e) => {
                const services = [...value.services];
                services[i] = { ...s, name: e.target.value };
                onChange({ ...value, services });
              }}
              placeholder="ชื่อบริการ"
              className="h-8 text-sm"
            />
            <Input
              value={s.priceNote ?? ""}
              onChange={(e) => {
                const services = [...value.services];
                services[i] = { ...s, priceNote: e.target.value };
                onChange({ ...value, services });
              }}
              placeholder="ราคาเริ่มต้น"
              className="h-8 text-sm w-28"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() =>
                onChange({ ...value, services: value.services.filter((x) => x.id !== s.id) })
              }
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

export function ExperienceSectionEditor({
  items,
  visible,
  onChange,
  onVisibleChange,
}: {
  items: PortfolioExperienceItem[];
  visible: boolean;
  onChange: (items: PortfolioExperienceItem[]) => void;
  onVisibleChange: (v: boolean) => void;
}) {
  const add = () =>
    onChange([
      ...items,
      {
        id: crypto.randomUUID(),
        role: "",
        company: "",
        period: "",
        highlights: [],
        sortOrder: items.length,
      },
    ]);

  return (
    <SectionCard title="ประสบการณ์ทำงาน">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">แสดงบนหน้า public</Label>
        <Switch checked={visible} onCheckedChange={onVisibleChange} />
      </div>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={item.id} className="rounded-lg border border-border/50 p-3 space-y-2">
            <div className="flex justify-between gap-2">
              <span className="text-xs text-muted-foreground">#{i + 1}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onChange(items.filter((x) => x.id !== item.id))}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Input
              value={item.role}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...item, role: e.target.value };
                onChange(next);
              }}
              placeholder="ตำแหน่ง"
              className="h-8 text-sm"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                value={item.company}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...item, company: e.target.value };
                  onChange(next);
                }}
                placeholder="บริษัท / ลูกค้า"
                className="h-8 text-sm"
              />
              <Input
                value={item.period}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...item, period: e.target.value };
                  onChange(next);
                }}
                placeholder="2022 – ปัจจุบัน"
                className="h-8 text-sm"
              />
            </div>
            <Textarea
              value={(item.highlights ?? []).join("\n")}
              onChange={(e) => {
                const next = [...items];
                next[i] = {
                  ...item,
                  highlights: e.target.value.split("\n").filter(Boolean),
                };
                onChange(next);
              }}
              placeholder="ไฮไลท์ (บรรทัดละ 1 ข้อ)"
              rows={2}
              className="text-sm"
            />
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={add} className="w-full">
        <Plus className="h-4 w-4 mr-1" /> เพิ่มประสบการณ์
      </Button>
    </SectionCard>
  );
}

export function FeaturedSectionEditor({
  items,
  visible,
  onChange,
  onVisibleChange,
  onUploadCover,
  uploadingId,
}: {
  items: PortfolioFeaturedItem[];
  visible: boolean;
  onChange: (items: PortfolioFeaturedItem[]) => void;
  onVisibleChange: (v: boolean) => void;
  onUploadCover: (id: string, file: File) => Promise<void>;
  uploadingId?: string | null;
}) {
  const add = () =>
    onChange([
      ...items,
      {
        id: crypto.randomUUID(),
        title: "",
        description: "",
        coverUrl: "",
        url: "",
        sortOrder: items.length,
      },
    ]);

  return (
    <SectionCard title="ผลงานเด่น">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">แสดงบนหน้า public</Label>
        <Switch checked={visible} onCheckedChange={onVisibleChange} />
      </div>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={item.id} className="rounded-lg border border-border/50 p-3 space-y-2">
            <div className="flex justify-between items-start gap-2">
              {item.coverUrl ? (
                <img src={item.coverUrl} alt="" className="h-14 w-20 rounded object-cover border" />
              ) : (
                <div className="h-14 w-20 rounded bg-muted flex items-center justify-center">
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex gap-1">
                <label className="cursor-pointer">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    disabled={uploadingId === item.id}
                    asChild
                  >
                    <span>
                      {uploadingId === item.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Upload className="h-3 w-3" />
                      )}
                    </span>
                  </Button>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      try {
                        await onUploadCover(item.id, f);
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "อัปโหลดไม่สำเร็จ");
                      }
                      e.target.value = "";
                    }}
                  />
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onChange(items.filter((x) => x.id !== item.id))}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <Input
              value={item.title}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...item, title: e.target.value };
                onChange(next);
              }}
              placeholder="ชื่องาน"
              className="h-8 text-sm"
            />
            <Textarea
              value={item.description}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...item, description: e.target.value };
                onChange(next);
              }}
              placeholder="คำอธิบายสั้นๆ"
              rows={2}
              className="text-sm"
            />
            <Input
              value={item.url}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...item, url: e.target.value };
                onChange(next);
              }}
              placeholder="ลิงก์ผลงาน (Behance, case study...)"
              className="h-8 text-sm"
            />
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={add} className="w-full">
        <Plus className="h-4 w-4 mr-1" /> เพิ่มผลงาน
      </Button>
    </SectionCard>
  );
}

export function LinksSectionEditor({
  items,
  visible,
  onChange,
  onVisibleChange,
}: {
  items: PortfolioExternalLink[];
  visible: boolean;
  onChange: (items: PortfolioExternalLink[]) => void;
  onVisibleChange: (v: boolean) => void;
}) {
  const add = () =>
    onChange([
      ...items,
      { id: crypto.randomUUID(), platform: "website", label: "", url: "" },
    ]);

  return (
    <SectionCard title="ลิงก์ภายนอก">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">แสดงบนหน้า public</Label>
        <Switch checked={visible} onCheckedChange={onVisibleChange} />
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={item.id} className="flex flex-wrap gap-2 items-center">
            <Select
              value={item.platform}
              onValueChange={(v) => {
                const next = [...items];
                next[i] = { ...item, platform: v };
                onChange(next);
              }}
            >
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LINK_PLATFORM_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={item.label}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...item, label: e.target.value };
                onChange(next);
              }}
              placeholder="ป้ายชื่อ"
              className="h-8 text-sm flex-1 min-w-[100px]"
            />
            <Input
              value={item.url}
              onChange={(e) => {
                const next = [...items];
                next[i] = { ...item, url: e.target.value };
                onChange(next);
              }}
              placeholder="https://"
              className="h-8 text-sm flex-[2] min-w-[140px]"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onChange(items.filter((x) => x.id !== item.id))}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={add} className="w-full">
        <Plus className="h-4 w-4 mr-1" /> เพิ่มลิงก์
      </Button>
    </SectionCard>
  );
}

export function ResumeSectionEditor({
  value,
  visible,
  onChange,
  onVisibleChange,
  onUpload,
  uploading,
}: {
  value: PortfolioResume;
  visible: boolean;
  onChange: (patch: Partial<PortfolioResume>) => void;
  onVisibleChange: (v: boolean) => void;
  onUpload: (file: File) => Promise<void>;
  uploading?: boolean;
}) {
  const fileRef = React.useRef<HTMLInputElement>(null);

  return (
    <SectionCard title="Resume / CV">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">แสดงบนหน้า public</Label>
        <Switch checked={visible} onCheckedChange={onVisibleChange} />
      </div>
      {value.fileUrl ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
          <span className="truncate">{value.fileName || "resume.pdf"}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs shrink-0"
            onClick={() => onChange({ fileUrl: "", fileName: "" })}
          >
            ลบ
          </Button>
        </div>
      ) : null}
      <div className="space-y-2">
        <Input
          value={value.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="ข้อความปุ่มดาวน์โหลด"
          className="h-8 text-sm"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <Upload className="h-4 w-4 mr-1" />
          )}
          อัปโหลด PDF
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try {
              await onUpload(f);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "อัปโหลดไม่สำเร็จ");
            }
            e.target.value = "";
          }}
        />
      </div>
    </SectionCard>
  );
}
