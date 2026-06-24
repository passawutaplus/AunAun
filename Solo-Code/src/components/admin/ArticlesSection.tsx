import * as React from "react";
import {
  adminListArticles,
  adminGetArticle,
  adminUpsertArticle,
  adminDeleteArticle,
} from "@/server/articles.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  Search,
  ExternalLink,
  BookOpen,
  Upload,
  Loader2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  ARTICLE_CATEGORIES,
  CATEGORY_LABEL_TH,
  slugify,
  stripHtml,
  type ArticleCategory,
} from "@/lib/articleHelpers";
import { RichTextEditor } from "@/components/blog/RichTextEditor";

interface ArticleListRow {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  status: string;
  published_at: string | null;
  updated_at: string;
  view_count: number;
  featured_image: string | null;
}

interface ArticleFull extends ArticleListRow {
  content: string;
  featured_image_alt: string | null;
  meta_title: string | null;
  meta_description: string | null;
  related_feature_link: string | null;
}

const FEATURE_LINKS = [
  { label: "Quotation Generator", value: "/dashboard?tab=quotations" },
  { label: "Expense Tracker / ภาษี", value: "/dashboard?tab=tax" },
  { label: "Payment Dashboard", value: "/dashboard?tab=finance" },
  { label: "Project Management", value: "/dashboard?tab=projects" },

  { label: "Client Management (CRM)", value: "/dashboard?tab=clients" },
  { label: "Subscriptions", value: "/dashboard?tab=subscriptions" },
  { label: "Suppliers", value: "/dashboard?tab=suppliers" },
];

export function ArticlesSection() {
  const [rows, setRows] = React.useState<ArticleListRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [editing, setEditing] = React.useState<ArticleFull | null>(null);
  const [creating, setCreating] = React.useState(false);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminListArticles();
      setRows(res.articles as ArticleListRow[]);
    } catch (e: any) {
      toast.error(e?.message || "โหลดบทความไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.title.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const openEdit = async (id: string) => {
    try {
      const res = await adminGetArticle({ data: { id } });
      if (res.article) setEditing(res.article as ArticleFull);
    } catch (e: any) {
      toast.error(e?.message || "เปิดบทความไม่ได้");
    }
  };

  const handleDelete = async (a: ArticleListRow) => {
    if (!confirm(`ลบบทความ "${a.title}"?`)) return;
    try {
      await adminDeleteArticle({ data: { id: a.id } });
      toast.success("ลบบทความแล้ว");
      refresh();
    } catch (e: any) {
      toast.error(e?.message || "ลบไม่สำเร็จ");
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            จัดการบทความ (Content Management)
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            สร้าง/แก้ไขบทความ SEO พร้อมเชื่อมไปยังฟีเจอร์ของแอป
          </p>
        </div>
        <Button onClick={() => setCreating(true)} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          เขียนบทความใหม่
        </Button>
      </header>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อหรือ slug…"
            className="pl-9 h-9"
          />
        </div>
        <Badge variant="secondary">{filtered.length} บทความ</Badge>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-muted/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <div className="col-span-6 sm:col-span-5">ชื่อบทความ</div>
          <div className="hidden sm:block col-span-2">หมวด</div>
          <div className="col-span-3 sm:col-span-2">สถานะ</div>
          <div className="hidden sm:block col-span-1 text-right">เข้าชม</div>
          <div className="col-span-3 sm:col-span-2 text-right">จัดการ</div>
        </div>

        {loading ? (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">กำลังโหลด…</div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">
            ยังไม่มีบทความ — กดปุ่ม "เขียนบทความใหม่" เพื่อเริ่มต้น
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((a) => (
              <li
                key={a.id}
                className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-muted/30 transition-colors"
              >
                <div className="col-span-6 sm:col-span-5 min-w-0">
                  <div className="font-medium text-sm truncate">{a.title}</div>
                  <div className="text-[10px] text-muted-foreground font-mono truncate">
                    /{a.slug}
                  </div>
                </div>
                <div className="hidden sm:block col-span-2">
                  <Badge variant="outline" className="text-[10px]">
                    {CATEGORY_LABEL_TH[a.category as ArticleCategory] || a.category}
                  </Badge>
                </div>
                <div className="col-span-3 sm:col-span-2">
                  {a.status === "published" ? (
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/15 text-[10px]">
                      เผยแพร่
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">
                      draft
                    </Badge>
                  )}
                </div>
                <div className="hidden sm:block col-span-1 text-right text-xs text-muted-foreground">
                  {a.view_count}
                </div>
                <div className="col-span-3 sm:col-span-2 flex items-center justify-end gap-1">
                  {a.status === "published" && (
                    <Button asChild size="icon" variant="ghost" className="h-8 w-8">
                      <a
                        href={`/blog/${a.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="ดูหน้าจริง"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => openEdit(a.id)}
                    title="แก้ไข"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(a)}
                    title="ลบ"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {(creating || editing) && (
        <ArticleEditorDialog
          initial={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

/* ----------------------------- EDITOR DIALOG ----------------------------- */

function ArticleEditorDialog({
  initial,
  onClose,
  onSaved,
}: {
  initial: ArticleFull | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = React.useState(initial?.title ?? "");
  const [slug, setSlug] = React.useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = React.useState(!!initial?.slug);
  const [summary, setSummary] = React.useState(initial?.summary ?? "");
  const [content, setContent] = React.useState(initial?.content ?? "");
  const [category, setCategory] = React.useState<ArticleCategory>(
    (initial?.category as ArticleCategory) ?? "Management",
  );
  const [featuredImage, setFeaturedImage] = React.useState(initial?.featured_image ?? "");
  const [featuredImageAlt, setFeaturedImageAlt] = React.useState(initial?.featured_image_alt ?? "");
  const [metaTitle, setMetaTitle] = React.useState(initial?.meta_title ?? "");
  const [metaDescription, setMetaDescription] = React.useState(initial?.meta_description ?? "");
  const [relatedLink, setRelatedLink] = React.useState(initial?.related_feature_link ?? "");
  const [status, setStatus] = React.useState<"draft" | "published">(
    (initial?.status as "draft" | "published") ?? "draft",
  );
  const [saving, setSaving] = React.useState(false);

  // auto-slug from title until user edits
  React.useEffect(() => {
    if (!slugTouched && title) setSlug(slugify(title));
  }, [title, slugTouched]);

  const effectiveMetaTitle = metaTitle || title;
  const effectiveMetaDesc = metaDescription || summary || stripHtml(content).slice(0, 180);

  const save = async (publish?: boolean) => {
    if (!title.trim()) {
      toast.error("กรุณาใส่ชื่อบทความ");
      return;
    }
    setSaving(true);
    try {
      await adminUpsertArticle({
        data: {
          id: initial?.id,
          title: title.trim(),
          slug: slug || slugify(title),
          summary,
          content,
          category,
          featured_image: featuredImage || null,
          featured_image_alt: featuredImageAlt || null,
          meta_title: metaTitle || null,
          meta_description: metaDescription || null,
          related_feature_link: relatedLink || null,
          status: publish ? "published" : status,
        },
      });
      toast.success(publish ? "เผยแพร่บทความแล้ว" : "บันทึกแล้ว");
      onSaved();
    } catch (e: any) {
      toast.error(e?.message || "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "แก้ไขบทความ" : "เขียนบทความใหม่"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-2">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-4">
            <div>
              <Label>ชื่อบทความ (H1)</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="เช่น วิธีทำใบเสนอราคาให้ได้งาน"
                className="mt-1.5 text-base"
                maxLength={200}
              />
            </div>

            <div>
              <Label>สรุปย่อ (Summary)</Label>
              <Textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="สรุปสั้นๆ 1-2 บรรทัด ใช้แสดงในหน้ารวม + เป็น meta description fallback"
                className="mt-1.5 resize-none"
                rows={2}
                maxLength={400}
              />
              <p className="text-[10px] text-muted-foreground mt-1">{summary.length}/400</p>
            </div>

            <div>
              <Label>เนื้อหา</Label>
              <div className="mt-1.5">
                <RichTextEditor
                  value={content}
                  onChange={setContent}
                  placeholder="เริ่มเขียนเนื้อหาที่นี่…"
                />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-4">
            <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                เผยแพร่
              </h4>
              <div className="space-y-2">
                <Label className="text-xs">สถานะ</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">ฉบับร่าง</SelectItem>
                    <SelectItem value="published">เผยแพร่</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">หมวดหมู่</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as ArticleCategory)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ARTICLE_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {CATEGORY_LABEL_TH[c]} ({c})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                URL & ลิงก์ฟีเจอร์
              </h4>
              <div className="space-y-1.5">
                <Label className="text-xs">Slug (URL)</Label>
                <div className="flex items-center gap-1 rounded-md border border-border bg-background px-2">
                  <span className="text-[10px] text-muted-foreground">/blog/</span>
                  <Input
                    value={slug}
                    onChange={(e) => {
                      setSlug(slugify(e.target.value));
                      setSlugTouched(true);
                    }}
                    className="h-8 border-0 px-1 font-mono text-xs"
                    maxLength={120}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">ลิงก์ฟีเจอร์ที่เกี่ยวข้อง (CTA)</Label>
                <Select
                  value={relatedLink || "none"}
                  onValueChange={(v) => setRelatedLink(v === "none" ? "" : v)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="ไม่มี" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">ไม่มี</SelectItem>
                    {FEATURE_LINKS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                🔍 SEO
              </h4>
              <div className="space-y-1.5">
                <Label className="text-xs">Meta Title</Label>
                <Input
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  placeholder={title || "ใช้ชื่อบทความถ้าเว้นว่าง"}
                  className="h-9"
                  maxLength={70}
                />
                <CharCounter
                  current={effectiveMetaTitle.length}
                  warn={50}
                  max={60}
                  hint="ดีที่สุด 50–60 ตัวอักษร"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Meta Description</Label>
                <Textarea
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  placeholder={summary || "ใช้สรุปย่อถ้าเว้นว่าง"}
                  rows={3}
                  className="resize-none text-xs"
                  maxLength={180}
                />
                <CharCounter
                  current={effectiveMetaDesc.length}
                  warn={140}
                  max={160}
                  hint="ดีที่สุด 140–160 ตัวอักษร"
                />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                🖼️ รูปปก
              </h4>

              <FeaturedImageUploader value={featuredImage} onChange={setFeaturedImage} />

              <div className="space-y-1.5">
                <Label className="text-xs">Featured Image URL</Label>
                <Input
                  value={featuredImage}
                  onChange={(e) => setFeaturedImage(e.target.value)}
                  placeholder="https://… หรืออัปโหลดด้านบน"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Alt Text (สำหรับ SEO)</Label>
                <Input
                  value={featuredImageAlt}
                  onChange={(e) => setFeaturedImageAlt(e.target.value)}
                  placeholder="อธิบายรูปด้วยข้อความ"
                  className="h-9 text-xs"
                  maxLength={200}
                />
              </div>
              {relatedLink && (
                <a
                  href={relatedLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[10px] text-primary hover:underline mt-2"
                >
                  <ExternalLink className="h-3 w-3" />
                  ทดสอบลิงก์ CTA
                </a>
              )}
            </div>
          </aside>
        </div>

        <DialogFooter className="gap-2 mt-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            ยกเลิก
          </Button>
          <Button variant="secondary" onClick={() => save(false)} disabled={saving}>
            บันทึกฉบับร่าง
          </Button>
          <Button onClick={() => save(true)} disabled={saving} className="gap-1.5">
            🚀 เผยแพร่
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CharCounter({
  current,
  warn,
  max,
  hint,
}: {
  current: number;
  warn: number;
  max: number;
  hint: string;
}) {
  const color =
    current === 0
      ? "text-muted-foreground"
      : current > max
        ? "text-destructive"
        : current >= warn
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-amber-600 dark:text-amber-400";
  return (
    <div className="flex items-center justify-between text-[10px]">
      <span className="text-muted-foreground">{hint}</span>
      <span className={color}>
        {current} / {max}
      </span>
    </div>
  );
}

/* --------------------------- IMAGE UPLOADER --------------------------- */

function FeaturedImageUploader({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("กรุณาเลือกไฟล์รูปภาพ");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("ไฟล์ใหญ่เกิน 5MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `covers/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage
        .from("article-images")
        .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("article-images").getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success("อัปโหลดรูปสำเร็จ");
    } catch (e: any) {
      toast.error(e?.message || "อัปโหลดไม่สำเร็จ");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      {value ? (
        <div className="relative group rounded-lg overflow-hidden border border-border bg-background">
          <img src={value} alt="preview" className="w-full aspect-[16/9] object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="gap-1.5"
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              เปลี่ยนรูป
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => onChange("")}
              disabled={uploading}
              className="gap-1.5"
            >
              <X className="h-3.5 w-3.5" />
              ลบ
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          disabled={uploading}
          className="w-full aspect-[16/9] rounded-lg border-2 border-dashed border-border hover:border-primary/60 hover:bg-muted/50 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground"
        >
          {uploading ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-xs">กำลังอัปโหลด…</span>
            </>
          ) : (
            <>
              <Upload className="h-6 w-6" />
              <span className="text-xs font-medium">คลิกหรือลากรูปมาที่นี่</span>
              <span className="text-[10px]">JPG / PNG / WebP · สูงสุด 5MB</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
