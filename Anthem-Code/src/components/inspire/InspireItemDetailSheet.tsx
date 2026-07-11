import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Copy, ExternalLink, Pin, X } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useImagePalette } from "@/hooks/useImagePalette";
import {
  cmykText,
  pantoneApprox,
  rgbText,
  toHexColor,
} from "@/lib/imagePalette";
import { analyzeInspirePalette } from "@/lib/inspireImageAnalysis";
import {
  resolveInspireKeywords,
  writeInspireKeywords,
} from "@/lib/inspireItemKeywords";
import { readInspireNote, writeInspireNote } from "@/lib/inspireItemNotes";
import { isInspireItemPinned, type InspireRecentItem } from "@/hooks/useInspire";
import { cn } from "@/lib/utils";

type Props = {
  item: InspireRecentItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTogglePin?: () => void;
};

function formatSavedAt(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

async function copyValue(label: string, value: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`คัดลอก ${label}`);
  } catch {
    toast.error("คัดลอกไม่สำเร็จ");
  }
}

export function InspireItemDetailSheet({ item, open, onOpenChange, onTogglePin }: Props) {
  const paletteCss = useImagePalette(item?.image_url, 6);
  const hexes = useMemo(() => paletteCss.map(toHexColor), [paletteCss]);
  const analysis = useMemo(() => analyzeInspirePalette(hexes), [hexes]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState("");
  const [codesOpen, setCodesOpen] = useState(true);
  const pinned = isInspireItemPinned(item);

  useEffect(() => {
    if (!item) return;
    setDraft("");
    setNote(readInspireNote(item.id));
    setCodesOpen(true);
  }, [item?.id]);

  useEffect(() => {
    if (!item || !hexes.length) return;
    const resolved = resolveInspireKeywords(item.id, hexes);
    setKeywords(resolved.keywords);
    if (!resolved.userEdited) {
      writeInspireKeywords(item.id, resolved.keywords, { userEdited: false });
    }
  }, [item?.id, hexes]);

  const addKeyword = () => {
    if (!item) return;
    const tag = draft.trim().replace(/\s+/g, " ").slice(0, 40);
    if (!tag) return;
    if (keywords.some((k) => k.toLowerCase() === tag.toLowerCase())) {
      toast.message("มี keyword นี้อยู่แล้ว");
      return;
    }
    const next = [...keywords, tag].slice(0, 16);
    setKeywords(next);
    writeInspireKeywords(item.id, next, { userEdited: true });
    setDraft("");
  };

  const removeKeyword = (tag: string) => {
    if (!item) return;
    const next = keywords.filter((k) => k !== tag);
    setKeywords(next);
    writeInspireKeywords(item.id, next, { userEdited: true });
  };

  const saveNote = (value: string) => {
    if (!item) return;
    setNote(value);
    writeInspireNote(item.id, value);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col gap-0 border-border/60 bg-card"
      >
        {item ? (
          <>
            <div className="relative aspect-[16/11] shrink-0 overflow-hidden bg-muted border-b border-border/50">
              <img
                src={item.image_url}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-20"
                style={{
                  background: `linear-gradient(to top, ${hexes[0] ?? "#000"}cc, transparent)`,
                }}
              />
              {onTogglePin ? (
                <button
                  type="button"
                  title={pinned ? "เลิกปักหมุด" : "ปักหมุดไว้บนสุด"}
                  aria-label={pinned ? "เลิกปักหมุด" : "ปักหมุดไว้บนสุด"}
                  aria-pressed={pinned}
                  onClick={onTogglePin}
                  className={cn(
                    "absolute right-3 top-3 z-10 rounded-full p-2 shadow-sm transition",
                    pinned
                      ? "bg-primary text-primary-foreground"
                      : "bg-background/90 text-foreground hover:bg-background",
                  )}
                >
                  <Pin className={cn("h-4 w-4", pinned && "fill-current")} />
                </button>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 space-y-5">
              <SheetHeader className="space-y-1 text-left p-0">
                <div className="flex items-start justify-between gap-3">
                  <SheetTitle className="text-xl font-semibold tracking-tight min-w-0">
                    This OBJECT
                  </SheetTitle>
                  {item.project_id ? (
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="shrink-0 h-8 rounded-full px-3 text-xs text-primary border-primary/50 hover:bg-primary/10 hover:text-primary"
                    >
                      <Link
                        to={`/project/${item.project_id}`}
                        onClick={() => onOpenChange(false)}
                      >
                        <ExternalLink className="w-3.5 h-3.5 mr-1" />
                        ไปหน้าผลงาน
                      </Link>
                    </Button>
                  ) : null}
                </div>
                <SheetDescription className="text-xs text-muted-foreground">
                  Saved via Inspire · {formatSavedAt(item.added_at)}
                  {item.board_name ? ` · ${item.board_name}` : ""}
                </SheetDescription>
              </SheetHeader>

              <section className="space-y-2 border-t border-border/50 pt-4">
                <p className="text-xs text-muted-foreground">Summary</p>
                <p className="text-sm text-foreground/90 leading-relaxed">
                  {analysis.summary}
                </p>
              </section>

              <section className="space-y-2 border-t border-border/50 pt-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">Notes</p>
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {note.length}/2000
                  </span>
                </div>
                <Textarea
                  value={note}
                  onChange={(e) => saveNote(e.target.value)}
                  placeholder="จดเหตุผลที่เก็บภาพนี้ หรือทิศทางที่จะใช้…"
                  maxLength={2000}
                  rows={4}
                  className="min-h-[96px] resize-y rounded-xl text-sm"
                />
              </section>

              <section className="space-y-3 border-t border-border/50 pt-4">
                <p className="text-xs text-muted-foreground">Keyword</p>
                <div className="flex flex-wrap gap-1.5">
                  {keywords.length === 0 ? (
                    <span className="text-xs text-muted-foreground">No keywords yet</span>
                  ) : (
                    keywords.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-md bg-muted/80 px-2 py-1 text-xs text-foreground"
                      >
                        {tag}
                        <button
                          type="button"
                          aria-label={`ลบ ${tag}`}
                          onClick={() => removeKeyword(tag)}
                          className="rounded-sm opacity-60 hover:opacity-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    addKeyword();
                  }}
                >
                  <Input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Add keyword"
                    maxLength={40}
                    className="h-9 rounded-lg text-sm"
                  />
                  <Button type="submit" size="sm" variant="outline" className="shrink-0 rounded-lg">
                    + Add
                  </Button>
                </form>
              </section>

              <section className="space-y-3 border-t border-border/50 pt-4">
                <p className="text-xs text-muted-foreground">Colors</p>
                <div className="flex gap-1.5">
                  {hexes.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      title={hex}
                      onClick={() => void copyValue("HEX", hex)}
                      className="h-9 w-9 rounded-lg ring-1 ring-white/10 shadow-sm transition hover:scale-105"
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              </section>

              <section className="space-y-3 border-t border-border/50 pt-4 pb-2">
                <button
                  type="button"
                  onClick={() => setCodesOpen((v) => !v)}
                  className="flex w-full items-center justify-between text-xs text-muted-foreground hover:text-foreground"
                >
                  Color codes
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", codesOpen && "rotate-180")} />
                </button>
                {codesOpen ? (
                  <div className="space-y-4">
                    {hexes.map((hex) => (
                      <div key={`code-${hex}`} className="flex gap-3">
                        <div
                          className="h-16 w-16 shrink-0 rounded-xl ring-1 ring-white/10"
                          style={{ backgroundColor: hex }}
                        />
                        <div className="min-w-0 flex-1 space-y-1.5">
                          {(
                            [
                              ["HEX", hex],
                              ["RGB", rgbText(hex)],
                              ["CMYK", cmykText(hex)],
                              ["PANTONE APPROX.", pantoneApprox(hex)],
                            ] as const
                          ).map(([label, value]) => (
                            <button
                              key={label}
                              type="button"
                              onClick={() => void copyValue(label, value)}
                              className="flex w-full items-center justify-between gap-2 rounded-md px-1.5 py-1 text-left hover:bg-muted/50"
                            >
                              <span className="min-w-0">
                                <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
                                  {label}
                                </span>
                                <span className="block truncate text-xs font-medium text-foreground">
                                  {value}
                                </span>
                              </span>
                              <Copy className="h-3 w-3 shrink-0 text-muted-foreground" />
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </section>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
