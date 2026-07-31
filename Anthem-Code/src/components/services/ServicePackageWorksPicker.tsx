import { useMemo, useState } from "react";
import { Check, FolderOpen, Search, X } from "lucide-react";
import { CompactLoader } from "@/components/ui/BanterLoader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useMyProjects } from "@/hooks/useProjects";
import {
  CREATOR_SERVICES_REF_PROJECTS_MAX,
} from "@/hooks/useCreatorServices";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";

export type PackageWorkRef = {
  id: string;
  title: string;
  cover_url: string | null;
};

type Props = {
  userId: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  /** Show required marker (publish requires ≥1). */
  required?: boolean;
};

function thumb(p: { cover_url: string | null; gallery_urls?: string[] | null }) {
  return p.cover_url || p.gallery_urls?.[0] || null;
}

/** Curate own published works as package sample references. */
export default function ServicePackageWorksPicker({
  userId,
  selectedIds,
  onChange,
  disabled,
  required,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { data: myProjects = [], isLoading } = useMyProjects(userId);

  const published = useMemo(
    () =>
      myProjects
        .filter((p) => p.status === "Published")
        .map((p) => ({
          id: p.id,
          title: p.title,
          cover_url: thumb(p),
        })),
    [myProjects],
  );

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedWorks = useMemo(() => {
    const byId = new Map(published.map((p) => [p.id, p]));
    return selectedIds.map((id) => byId.get(id)).filter(Boolean) as PackageWorkRef[];
  }, [published, selectedIds]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return published;
    return published.filter((p) => p.title.toLowerCase().includes(q));
  }, [published, query]);

  const toggle = (project: PackageWorkRef) => {
    if (selectedSet.has(project.id)) {
      onChange(selectedIds.filter((id) => id !== project.id));
      return;
    }
    if (selectedIds.length >= CREATOR_SERVICES_REF_PROJECTS_MAX) {
      toast.info(`อ้างอิงผลงานได้สูงสุด ${CREATOR_SERVICES_REF_PROJECTS_MAX} ชิ้น`);
      return;
    }
    onChange([...selectedIds, project.id]);
  };

  return (
    <div className="space-y-2">
      <div className="space-y-0.5">
        <Label className="inline-flex items-center gap-1.5">
          <FolderOpen className="h-3.5 w-3.5 text-primary" />
          ผลงานตัวอย่าง
          {required ? <span className="text-primary">*</span> : null}
        </Label>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          เลือกผลงานที่เผยแพร่แล้วเป็นตัวอย่าง — คนดูเปิดดูงานแล้วกลับมาที่แพ็กเกจได้
        </p>
      </div>

      {selectedWorks.length > 0 ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {selectedWorks.map((p, index) => (
            <div
              key={p.id}
              className="group relative overflow-hidden rounded-xl border border-primary/35 bg-card"
            >
              <div className="aspect-[4/3] bg-muted">
                {p.cover_url ? (
                  <img src={p.cover_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center">
                    <FolderOpen className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
              </div>
              <span className="absolute left-1.5 top-1.5 rounded-full bg-black/65 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-white">
                {index + 1}
              </span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(selectedIds.filter((id) => id !== p.id))}
                className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white opacity-90 hover:bg-destructive"
                aria-label={`ลบ ${p.title}`}
              >
                <X className="h-3 w-3" />
              </button>
              <p className="truncate px-1.5 py-1 text-[10px] font-medium">{p.title}</p>
            </div>
          ))}
        </div>
      ) : null}

      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setQuery("");
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled || selectedIds.length >= CREATOR_SERVICES_REF_PROJECTS_MAX}
            className={cn(
              "flex w-full items-center justify-between gap-2 rounded-xl border border-dashed border-border px-3 py-2.5 text-sm",
              "hover:border-primary/40 hover:bg-muted/30 transition-colors",
              (disabled || selectedIds.length >= CREATOR_SERVICES_REF_PROJECTS_MAX) &&
                "cursor-not-allowed opacity-50",
            )}
          >
            <span className="text-muted-foreground">
              {published.length === 0
                ? "ยังไม่มีผลงานที่เผยแพร่"
                : selectedIds.length > 0
                  ? `เลือกเพิ่ม (${selectedIds.length}/${CREATOR_SERVICES_REF_PROJECTS_MAX})`
                  : "เลือกผลงานที่เกี่ยวข้อง…"}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[min(100vw-2rem,380px)] p-0">
          <div className="border-b border-border/60 p-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหาชื่อผลงาน"
                className="h-9 rounded-lg pl-8"
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {isLoading ? <CompactLoader label="กำลังโหลดผลงาน…" className="py-6" /> : null}
            {!isLoading && published.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                เผยแพร่ผลงานในพอร์ตก่อน แล้วค่อยอ้างอิงในแพ็กเกจ
              </p>
            ) : null}
            {!isLoading && published.length > 0 && filtered.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">ไม่พบผลงานที่ตรงกับคำค้น</p>
            ) : null}
            {filtered.map((p) => {
              const on = selectedSet.has(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggle(p)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors",
                    on ? "bg-primary/10" : "hover:bg-muted/60",
                  )}
                >
                  {p.cover_url ? (
                    <img
                      src={p.cover_url}
                      alt=""
                      className="h-11 w-11 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-muted">
                      <FolderOpen className="h-4 w-4 text-muted-foreground" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.title}</span>
                  {on ? <Check className="h-4 w-4 shrink-0 text-primary" /> : null}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
