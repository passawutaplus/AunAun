import { useMemo } from "react";
import { LogIn, SearchX, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDesigners, type DesignerCardData } from "@/hooks/useDesigners";
import { useAuth } from "@/hooks/useAuth";
import { useFollowedUserIds } from "@/hooks/useFollow";
import { useFeedInterestSurvey } from "@/hooks/useFeedInterests";
import { useAuthDialog } from "@/stores/authDialogStore";
import DesignerCard from "./DesignerCard";
import { StaggerGrid } from "@/components/motion/StaggerGrid";
import { fuzzyMatchAll } from "@/lib/fuzzyMatch";
import {
  rankDesignersForYou,
  rankDesignersNewest,
} from "@/lib/designerFeedRank";
import type { DesignerSort } from "./DesignerToolbar";
import type { DesignerFeedSource } from "./DesignerFeedDropdown";
import EmptyState from "@/components/ui/EmptyState";
import QueryStatusPanel from "@/components/ui/QueryStatusPanel";
import { useSlowLoadFallback } from "@/hooks/useSlowLoadFallback";
import type { OpportunityFilter } from "@/components/feed/OpportunityFilterChips";
import { projectMatchesOpportunityFilter } from "@/lib/viewAffinity";

interface Props {
  onHire: (recipientId: string, recipientName: string) => void;
  onCollab: (recipientId: string, recipientName: string) => void;
  search?: string;
  sort?: DesignerSort;
  feedSource?: DesignerFeedSource;
  categories?: string[];
  tools?: string[];
  opportunityFilter?: OpportunityFilter;
}

const scoreSort = (d: DesignerCardData, sort: DesignerSort): number => {
  switch (sort) {
    case "projects":
      return d.projects.length;
    case "views":
      return d.projects.reduce((s, p) => s + (p.views ?? 0), 0);
    case "newest":
    default: {
      const t = d.projects[0]?.created_at ?? (d.profile as { updated_at?: string }).updated_at ?? "";
      return t ? new Date(t).getTime() : 0;
    }
  }
};

const designerUserId = (d: DesignerCardData) =>
  (d.profile as { user_id?: string }).user_id ?? d.profile.id;

const DesignerGrid = ({
  onHire,
  onCollab,
  search = "",
  sort = "newest",
  feedSource = "all",
  categories = [],
  tools = [],
  opportunityFilter = "All",
}: Props) => {
  const { user } = useAuth();
  const { data = [], isLoading, isError, refetch } = useDesigners();
  const { interests } = useFeedInterestSurvey(feedSource === "all" ? user?.id : undefined);
  const { data: followedIds, isLoading: followingLoading } = useFollowedUserIds(
    feedSource === "following" ? user?.id : undefined,
  );

  const filtered = useMemo(() => {
    let rows = data;

    if (feedSource === "following") {
      if (!user) return [];
      rows = rows.filter((d) => followedIds?.has(designerUserId(d)));
    }

    if (search.trim()) {
      rows = rows.filter((d) => fuzzyMatchAll(search, d.searchHaystack));
    }
    if (categories.length > 0) {
      const set = new Set(categories.map((c) => c.toLowerCase()));
      rows = rows.filter((d) =>
        d.projects.some((p) => p.category && set.has(p.category.toLowerCase())),
      );
    }
    if (tools.length > 0) {
      const set = new Set(tools.map((t) => t.toLowerCase()));
      rows = rows.filter((d) =>
        d.projects.some((p) => (p.tools ?? []).some((t) => set.has(t.toLowerCase()))),
      );
    }
    if (opportunityFilter !== "All") {
      rows = rows.filter((d) => {
        const ownerTypes = (d.profile as { opportunity_types?: string[] | null }).opportunity_types;
        const projectHit = d.projects.some((p) =>
          projectMatchesOpportunityFilter(
            opportunityFilter,
            (p as { opportunity_types?: string[] | null }).opportunity_types,
            ownerTypes,
          ),
        );
        return projectHit || projectMatchesOpportunityFilter(opportunityFilter, null, ownerTypes);
      });
    }

    if (feedSource === "all") {
      return rankDesignersForYou(rows, interests);
    }
    if (feedSource === "newest") {
      return rankDesignersNewest(rows);
    }
    return [...rows].sort((a, b) => scoreSort(b, sort) - scoreSort(a, sort));
  }, [data, search, categories, tools, sort, feedSource, user, followedIds, interests, opportunityFilter]);

  const loading = isLoading || (feedSource === "following" && !!user && followingLoading);
  const slow = useSlowLoadFallback(loading);

  if (isError || (loading && slow)) {
    return (
      <QueryStatusPanel
        isLoading={loading}
        isError={isError}
        isSlow={slow}
        onRetry={() => void refetch()}
        loadingLabel="กำลังโหลดดีไซเนอร์..."
        errorTitle="โหลดดีไซเนอร์ไม่สำเร็จ"
        errorDescription="กดลองใหม่ หรือเปลี่ยนตัวกรอง"
      />
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 md:gap-x-4 gap-y-[22px] md:gap-y-[26px]">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-64 rounded-2xl glass-panel animate-pulse" />
        ))}
      </div>
    );
  }

  if (feedSource === "following" && !user) {
    return (
      <div className="text-center py-16 glass-panel rounded-2xl">
        <p className="text-foreground font-medium mb-2 thai-display">เข้าสู่ระบบเพื่อดูคนที่ติดตาม</p>
        <p className="text-sm text-muted-foreground mb-4 thai-body">
          ระบบจะแสดงเฉพาะดีไซเนอร์ที่คุณกดติดตามไว้
        </p>
        <Button
          onClick={() => useAuthDialog.getState().openSignup()}
          className="rounded-full bg-gradient-brand text-white hover:opacity-90"
        >
          <LogIn className="w-4 h-4 mr-1.5" /> เข้าสู่ระบบ
        </Button>
      </div>
    );
  }

  if (!filtered.length) {
    const followingEmpty = feedSource === "following";
    return (
      <EmptyState
        icon={followingEmpty ? UserPlus : SearchX}
        title={
          search
            ? "ไม่พบดีไซเนอร์"
            : followingEmpty
              ? "ยังไม่ได้ติดตามใคร"
              : "ยังไม่มีดีไซเนอร์ในฟีด"
        }
        description={
          search
            ? `ลองคำอื่น เช่น logo, ux, branding — ไม่มีผลลัพธ์สำหรับ "${search}"`
            : followingEmpty
              ? "กดติดตามครีเอเตอร์ที่ชอบ แล้วกลับมาดูที่นี่"
              : "เมื่อมีครีเอเตอร์เผยแพร่ผลงาน รายชื่อจะปรากฏที่นี่"
        }
      />
    );
  }

  return (
    <StaggerGrid className="grid grid-cols-1 md:grid-cols-2 gap-x-3 md:gap-x-4 gap-y-[22px] md:gap-y-[26px]">
      {filtered.map((d) => (
        <DesignerCard
          key={designerUserId(d)}
          data={d}
          onHire={onHire}
          onCollab={onCollab}
          search={search}
        />
      ))}
    </StaggerGrid>
  );
};

export default DesignerGrid;
