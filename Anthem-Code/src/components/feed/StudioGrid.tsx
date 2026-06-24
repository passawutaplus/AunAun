import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/ui/EmptyState";
import { usePublicStudios } from "@/hooks/usePublicStudios";
import { useFollowedStudioIds } from "@/hooks/useStudioFollow";
import { useAuth } from "@/hooks/useAuth";
import { useAuthDialog } from "@/stores/authDialogStore";
import type { StudioFeedSource } from "@/components/studio/StudioFilterPanel";
import StudioCard from "./StudioCard";

interface Props {
  search?: string;
  feedSource?: StudioFeedSource;
}

const StudioGrid = ({ search = "", feedSource = "all" }: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data = [], isLoading } = usePublicStudios();
  const { data: followedIds, isLoading: followingLoading } = useFollowedStudioIds(
    feedSource === "following" ? user?.id : undefined,
  );

  const filtered = useMemo(() => {
    let rows = data;
    if (feedSource === "following") {
      if (!user) return [];
      rows = rows.filter((d) => followedIds?.has(d.studio.id));
    }
    const q = search.trim().toLowerCase();
    if (q) rows = rows.filter((d) => d.searchHaystack.includes(q));
    return rows;
  }, [data, search, feedSource, user, followedIds]);

  const handleCreate = () => {
    if (user) navigate("/studio/new");
    else useAuthDialog.getState().openSignup();
  };

  const loading = isLoading || (feedSource === "following" && !!user && followingLoading);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-64 rounded-2xl glass-panel animate-pulse" />
        ))}
      </div>
    );
  }

  const emptyDescription =
    feedSource === "following" && !user
      ? "เข้าสู่ระบบเพื่อดูสตูดิโอที่คุณติดตาม"
      : feedSource === "following"
        ? "ติดตามสตูดิโอเพื่อดูอัปเดตจากทีมที่คุณสนใจ"
        : search.trim()
          ? `ไม่พบสตูดิโอสำหรับ "${search.trim()}"`
          : "ยังไม่มีสตูดิโอในระบบ";

  return (
    <div className="space-y-4">
      <div className="glass-panel rounded-2xl p-4 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium thai-display">รวมตัวกันตั้ง Studio</p>
          <p className="text-xs text-muted-foreground thai-body">
            ชวนเพื่อน designer ก่อตั้ง studio รับงานใหญ่ในนามทีม
          </p>
        </div>
        <Button onClick={handleCreate} className="rounded-full bg-gradient-brand text-white border-0">
          <Plus className="w-4 h-4 mr-1" /> สร้าง Studio
        </Button>
      </div>

      {!filtered.length ? (
        <EmptyState
          title={
            feedSource === "following" && !user
              ? "เข้าสู่ระบบก่อน"
              : search.trim()
                ? "ไม่พบสตูดิโอ"
                : feedSource === "following"
                  ? "ยังไม่ได้ติดตามสตูดิโอ"
                  : "ยังไม่มีสตูดิโอ"
          }
          description={emptyDescription}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {filtered.map((d) => <StudioCard key={d.studio.id} data={d} />)}
        </div>
      )}
    </div>
  );
};

export default StudioGrid;
