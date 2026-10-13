import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/ui/EmptyState";
import { FilterEmptyState } from "@/components/ui/QueryStatusPanel";
import { InlineLoader } from "@/components/ui/BanterLoader";
import ProfileTabHeading from "@/components/profile/ProfileTabHeading";
import DesignerCard from "@/components/feed/DesignerCard";
import HireDialog from "@/components/HireDialog";
import CollabDialog from "@/components/CollabDialog";
import {
  CollectionBrowseToolbar,
  type FollowedDesignersSortMode,
} from "@/components/collections/CollectionBrowseToolbar";
import { useFollowedDesigners, type FollowedDesigner } from "@/hooks/useFollowedDesigners";
import { fuzzyMatchAll } from "@/lib/fuzzyMatch";
import { cn } from "@/lib/utils";

const DESIGNERS_FEED_PATH = "/?mode=designers";

type FollowBackFilter = "all" | "mutual" | "not_back";

const designerUserId = (d: FollowedDesigner) =>
  (d.profile as { user_id?: string }).user_id ?? d.profile.id;

const lastActive = (d: FollowedDesigner) => {
  const t = Date.parse((d.profile as { last_active_at?: string | null }).last_active_at ?? "");
  return Number.isNaN(t) ? 0 : t;
};

function sortDesigners(list: FollowedDesigner[], mode: FollowedDesignersSortMode): FollowedDesigner[] {
  const next = [...list];
  switch (mode) {
    case "oldest":
      return next.sort((a, b) => a.followedAt.localeCompare(b.followedAt));
    case "active":
      return next.sort((a, b) => lastActive(b) - lastActive(a));
    case "projects":
      return next.sort((a, b) => b.projectCount - a.projectCount);
    case "newest":
    default:
      return next.sort((a, b) => b.followedAt.localeCompare(a.followedAt));
  }
}

/** Portfolio → Designers: the designers you follow, with who follows you back. */
export default function PortfolioFollowedDesignersPanel() {
  const { data: designers = [], isLoading, isError, refetch } = useFollowedDesigners();
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<FollowedDesignersSortMode>("newest");
  const [followBack, setFollowBack] = useState<FollowBackFilter>("all");
  const [hire, setHire] = useState<{ id: string; name: string } | null>(null);
  const [collab, setCollab] = useState<{ id: string; name: string } | null>(null);

  const mutualCount = useMemo(() => designers.filter((d) => d.followsYou).length, [designers]);

  const filtered = useMemo(() => {
    const q = query.trim();
    let rows = q ? designers.filter((d) => fuzzyMatchAll(q, d.searchHaystack)) : designers;
    if (followBack === "mutual") rows = rows.filter((d) => d.followsYou);
    if (followBack === "not_back") rows = rows.filter((d) => !d.followsYou);
    return sortDesigners(rows, sortMode);
  }, [designers, query, sortMode, followBack]);

  const followBackChips: { value: FollowBackFilter; label: string; count: number; hint: string }[] = [
    { value: "all", label: "ทั้งหมด", count: designers.length, hint: "ทุกคนที่คุณติดตาม" },
    {
      value: "mutual",
      label: "ติดตามกันแล้ว",
      count: mutualCount,
      hint: "ติดตามกันทั้งคู่ — แท็กเป็นผู้ร่วมงานในผลงานได้",
    },
    {
      value: "not_back",
      label: "ยังไม่ติดตามกลับ",
      count: designers.length - mutualCount,
      hint: "คุณติดตามเขา แต่เขายังไม่ติดตามคุณ",
    },
  ];

  const findMore = (
    <Button asChild size="sm" variant="outline" className="rounded-full shrink-0">
      <Link to={DESIGNERS_FEED_PATH}>
        หาดีไซเนอร์เพิ่ม <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
      </Link>
    </Button>
  );

  if (isLoading) return <InlineLoader />;

  if (isError) {
    return (
      <div className="text-center py-16 glass-panel rounded-2xl space-y-3">
        <p className="text-foreground font-medium">โหลดดีไซเนอร์ที่ติดตามไม่สำเร็จ</p>
        <p className="text-sm text-muted-foreground">ลองใหม่อีกครั้ง หรือตรวจการเชื่อมต่อ</p>
        <Button variant="outline" className="rounded-full" onClick={() => void refetch()}>
          ลองใหม่
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ProfileTabHeading
        title="Designers"
        count={designers.length}
        description="ดีไซเนอร์ที่คุณติดตาม — คนที่ติดตามกันทั้งคู่แท็กเป็นผู้ร่วมงานในผลงานได้"
        actions={designers.length > 0 ? findMore : undefined}
      />

      {designers.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title="ยังไม่ได้ติดตามดีไซเนอร์"
          description="กดติดตามบนการ์ดดีไซเนอร์ในหน้า Designers แล้วคนนั้นจะมาอยู่ที่นี่ กลับมาจ้างงานหรือชวนคอลแลปได้ทุกเมื่อ"
          action={
            <Button asChild variant="gradient" className="rounded-full">
              <Link to={DESIGNERS_FEED_PATH}>
                ไปหน้า Designers <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <CollectionBrowseToolbar
            mode="designers"
            searchPlaceholder="ค้นหาชื่อ ตำแหน่ง ทักษะ หรือเครื่องมือ..."
            query={query}
            onQueryChange={setQuery}
            sortMode={sortMode}
            onSortModeChange={setSortMode}
            resultCount={filtered.length}
          />
          <div role="group" aria-label="กรองตามการติดตามกลับ" className="flex flex-wrap gap-2">
            {followBackChips.map((chip) => {
              const on = followBack === chip.value;
              return (
                <button
                  key={chip.value}
                  type="button"
                  aria-pressed={on}
                  title={chip.hint}
                  onClick={() => setFollowBack(chip.value)}
                  className={cn(
                    "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-xs font-medium transition-colors",
                    on
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background text-foreground hover:bg-accent/40",
                  )}
                >
                  {chip.label}
                  <span className={cn("tabular-nums", on ? "opacity-80" : "text-muted-foreground")}>{chip.count}</span>
                </button>
              );
            })}
          </div>
          {filtered.length === 0 ? (
            <FilterEmptyState
              title={query.trim() ? "ไม่พบดีไซเนอร์ที่ตรงกับคำค้น" : "ไม่มีดีไซเนอร์ในกลุ่มนี้"}
              description={
                query.trim()
                  ? `ไม่มีผลลัพธ์สำหรับ "${query}" ในดีไซเนอร์ที่คุณติดตาม`
                  : followBack === "mutual"
                    ? "ยังไม่มีใครติดตามคุณกลับ เมื่อติดตามกันทั้งคู่ จะแท็กกันในผลงานได้"
                    : "ทุกคนที่คุณติดตามติดตามคุณกลับแล้ว"
              }
              onClear={() => {
                setQuery("");
                setFollowBack("all");
              }}
              clearLabel="ล้างตัวกรอง"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-3 md:gap-x-4 gap-y-[22px] md:gap-y-[26px]">
              {filtered.map((d) => (
                <DesignerCard
                  key={designerUserId(d)}
                  data={d}
                  search={query}
                  onHire={(id, name) => setHire({ id, name })}
                  onCollab={(id, name) => setCollab({ id, name })}
                />
              ))}
            </div>
          )}
        </>
      )}

      <HireDialog
        open={!!hire}
        onOpenChange={(open) => !open && setHire(null)}
        projectTitle={hire?.name ?? ""}
        freelancerId={hire?.id}
      />
      <CollabDialog
        open={!!collab}
        onOpenChange={(open) => !open && setCollab(null)}
        recipientId={collab?.id}
        recipientName={collab?.name ?? ""}
      />
    </div>
  );
}
