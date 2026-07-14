import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Bug, LifeBuoy, Lightbulb, MessageCircleHeart, type LucideIcon } from "lucide-react";
import { ForumPageHeader } from "@/components/forum/ForumLayout";
import { ForumAttachmentComposer } from "@/components/forum/ForumAttachmentComposer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateForumTopic, useForumCategories, useForumSearch } from "@/hooks/useForum";
import {
  FORUM_CATEGORY_META,
  buildWritingPattern,
  forumCategoryTone,
  isForumCategorySlug,
  type ForumCategorySlug,
} from "@/data/forumCategories";
import { FORUM_JOB_WARNING, looksLikeForumJobPost } from "@/lib/forumJobSpam";
import { parseTagsInput } from "@/lib/forum";
import type { ForumAttachment } from "@/lib/forumAttachments";
import { cn } from "@/lib/utils";

const CAT_ICONS: Record<ForumCategorySlug, LucideIcon> = {
  help: LifeBuoy,
  bug: Bug,
  idea: Lightbulb,
  feedback: MessageCircleHeart,
};

const ALL_SLUGS = Object.keys(FORUM_CATEGORY_META) as ForumCategorySlug[];

export default function ForumNewTopicPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const paramCat = params.get("category");
  const { data: categories = [] } = useForumCategories();
  const create = useCreateForumTopic();

  const initialCategory = isForumCategorySlug(paramCat ?? "") ? (paramCat as ForumCategorySlug) : null;
  const [categorySlug, setCategorySlug] = useState<ForumCategorySlug | null>(initialCategory);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState(() =>
    initialCategory ? buildWritingPattern(initialCategory) : "",
  );
  const [tagsRaw, setTagsRaw] = useState("");
  const [attachments, setAttachments] = useState<ForumAttachment[]>([]);
  const [ackJobWarning, setAckJobWarning] = useState(false);
  const patternRef = useRef(body);
  const titleRef = useRef<HTMLInputElement>(null);

  const meta = categorySlug ? FORUM_CATEGORY_META[categorySlug] : null;
  const similar = useForumSearch(title.length >= 4 ? title : "");
  const jobWarning = useMemo(
    () => looksLikeForumJobPost(`${title}\n${body}`),
    [title, body],
  );

  useEffect(() => {
    if (categorySlug) titleRef.current?.focus();
  }, [categorySlug]);

  useEffect(() => {
    if (!jobWarning) setAckJobWarning(false);
  }, [jobWarning]);

  const pickCategory = (slug: ForumCategorySlug) => {
    const nextPattern = buildWritingPattern(slug);
    const prevPattern = patternRef.current;
    setBody((cur) => {
      const trimmed = cur.trim();
      if (!trimmed || trimmed === prevPattern.trim()) return nextPattern;
      return cur;
    });
    patternRef.current = nextPattern;
    setCategorySlug(slug);
    setParams({ category: slug }, { replace: true });
  };

  const canSubmit =
    !!categorySlug &&
    title.trim().length >= 3 &&
    body.trim().length >= 1 &&
    !create.isPending &&
    (!jobWarning || ackJobWarning);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !categorySlug) return;
    const id = await create.mutateAsync({
      categorySlug,
      title: title.trim(),
      body: body.trim(),
      tags: parseTagsInput(tagsRaw),
      attachmentIds: attachments.map((a) => a.id),
    });
    navigate(`/forum/t/${id}`);
  };

  const categoryCards = (
    categories.length
      ? categories.filter((c) => isForumCategorySlug(c.slug))
      : ALL_SLUGS.map((slug) => ({
          slug,
          name_th: FORUM_CATEGORY_META[slug].nameTh,
          description: FORUM_CATEGORY_META[slug].description,
          id: slug,
        }))
  ) as Array<{ slug: string; name_th: string; description: string; id: string }>;

  return (
    <>
      <ForumPageHeader
        title="สร้างกระทู้"
        subtitle={
          categorySlug
            ? "เติมหัวข้อและรายละเอียด — ใช้แพทเทิร์นเป็นแนวทางได้"
            : "เลือกหมวดหมู่ก่อน แล้วค่อยเขียนรายละเอียด"
        }
      />

      <div className="mb-5 max-w-2xl rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground leading-relaxed">
        ฟอรัมนี้มีไว้คุยและช่วยพัฒนาแพลตฟอร์ม —{" "}
        <span className="font-medium text-foreground">ห้ามลงหางานหรือประกาศจ้าง</span>
      </div>

      {!categorySlug ? (
        <div className="max-w-2xl space-y-3">
          <p className="text-sm text-muted-foreground">หมวดหมู่กระทู้</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {categoryCards.map((c) => {
              const slug = c.slug as ForumCategorySlug;
              const Icon = CAT_ICONS[slug] ?? LifeBuoy;
              const tone = forumCategoryTone(slug);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => pickCategory(slug)}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors",
                    tone.soft,
                  )}
                >
                  <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", tone.icon)} />
                  <span>
                    <span className={cn("block text-sm font-semibold", tone.text)}>{c.name_th}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{c.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="pt-2">
            <Button type="button" variant="ghost" asChild>
              <Link to="/forum">ยกเลิก</Link>
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={(e) => void onSubmit(e)} className="space-y-5 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium",
                forumCategoryTone(categorySlug).softActive,
              )}
            >
              <span className={cn("h-2 w-2 rounded-sm", forumCategoryTone(categorySlug).swatch)} />
              {meta?.nameTh}
            </span>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
              onClick={() => {
                setCategorySlug(null);
                setParams({}, { replace: true });
              }}
            >
              เปลี่ยนหมวด
            </button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="forum-title">หัวข้อ</Label>
            <Input
              ref={titleRef}
              id="forum-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="สรุปสั้น ๆ ว่าต้องการอะไร"
              maxLength={200}
              required
            />
          </div>

          {similar.data && similar.data.length > 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 space-y-2">
              <p className="text-xs font-medium text-amber-900">พบกระทู้คล้ายกัน — ลองอ่านก่อนโพสต์ซ้ำ</p>
              <ul className="space-y-1">
                {similar.data.slice(0, 5).map((t) => (
                  <li key={t.id}>
                    <Link to={`/forum/t/${t.id}`} className="text-sm text-primary hover:underline">
                      {t.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {jobWarning ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50/70 dark:bg-rose-950/30 p-3 space-y-3">
              <p className="text-xs text-rose-900 dark:text-rose-200 leading-relaxed">{FORUM_JOB_WARNING}</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" asChild>
                  <Link to="/jobs">ไปลงประกาศโอกาส</Link>
                </Button>
                <label className="inline-flex items-center gap-2 text-xs text-rose-900/90 dark:text-rose-200">
                  <input
                    type="checkbox"
                    checked={ackJobWarning}
                    onChange={(e) => setAckJobWarning(e.target.checked)}
                    className="rounded border-rose-300"
                  />
                  ไม่ใช่ประกาศหางาน — โพสต์ต่อ
                </label>
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="forum-body">รายละเอียด</Label>
            <p className="text-xs text-muted-foreground">
              แพทเทิร์นด้านล่างเป็นแนวทาง — เขียนต่อยาว ๆ ในช่องเดียวได้เลย แก้หรือลบส่วนที่ไม่ใช้ได้
            </p>
            <Textarea
              id="forum-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={14}
              className="resize-y min-h-[220px] font-normal leading-relaxed"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>แนบไฟล์</Label>
            <ForumAttachmentComposer
              value={attachments}
              onChange={setAttachments}
              variant="topic"
              disabled={create.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="forum-tags">แท็ก (คั่นด้วยช่องว่างหรือจุลภาค)</Label>
            <Input
              id="forum-tags"
              value={tagsRaw}
              onChange={(e) => setTagsRaw(e.target.value)}
              placeholder="เช่น portfolio chat mobile"
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="ghost" asChild>
              <Link to="/forum">ยกเลิก</Link>
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {create.isPending ? "กำลังโพสต์…" : "เผยแพร่กระทู้"}
            </Button>
          </div>
        </form>
      )}
    </>
  );
}
