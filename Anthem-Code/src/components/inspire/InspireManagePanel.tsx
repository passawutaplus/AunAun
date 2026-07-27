import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { InlineLoader } from "@/components/ui/BanterLoader";
import { FeedModeTransition } from "@/components/feed/FeedModeTransition";
import {
  isDefaultInspireBoard,
  useAddToInspireBoard,
  useEnsureInspireLibrary,
  useInspireBoards,
  useRecentInspireItems,
} from "@/hooks/useInspire";
import InspireBoardFormDialog from "@/components/inspire/InspireBoardFormDialog";
import { InspireLibraryHome } from "@/components/inspire/InspireLibraryHome";
import { InspireWorkspaceDetail } from "@/components/inspire/InspireWorkspaceDetail";

type View = "library" | string;

function parseView(params: URLSearchParams, boardIds: Set<string>): View {
  const b = params.get("b");
  if (b && boardIds.has(b)) return b;
  return "library";
}

type Props = {
  userId: string;
  /** When true (profile tab), keep tab=inspire in the URL when opening boards. */
  embedded?: boolean;
};

/** Full My Inspire workspace (library + board detail). */
export default function InspireManagePanel({ userId, embedded }: Props) {
  const [params, setParams] = useSearchParams();
  useEnsureInspireLibrary(userId);
  const { data: boards = [], isLoading, isError, refetch } = useInspireBoards(userId);
  const { data: recent = [], isLoading: recentLoading } = useRecentInspireItems(userId, 120);
  const addToBoard = useAddToInspireBoard(userId);
  const [formOpen, setFormOpen] = useState(false);
  const [focusItemId, setFocusItemId] = useState<string | null>(null);
  const [slideDir, setSlideDir] = useState(1);

  const customBoards = useMemo(
    () => boards.filter((b) => !isDefaultInspireBoard(b)),
    [boards],
  );
  const boardIds = useMemo(() => new Set(customBoards.map((b) => b.id)), [customBoards]);
  const view = useMemo(() => parseView(params, boardIds), [params, boardIds]);

  useEffect(() => {
    if (isLoading) return;
    const b = params.get("b");
    if (!b) return;
    if (!boardIds.has(b)) {
      const next = new URLSearchParams(params);
      next.delete("b");
      setParams(next, { replace: true });
    }
  }, [isLoading, params, boardIds, setParams]);

  const withEmbedTab = (p: URLSearchParams) => {
    if (embedded) p.set("tab", "inspire");
    return p;
  };

  const openLibrary = () => {
    setSlideDir(-1);
    const p = withEmbedTab(new URLSearchParams(params));
    p.delete("b");
    setParams(p, { replace: true });
    setFocusItemId(null);
  };

  const openBoard = (boardId: string, itemId?: string | null) => {
    if (isDefaultInspireBoard(boards.find((b) => b.id === boardId))) {
      openLibrary();
      return;
    }
    setSlideDir(1);
    const p = withEmbedTab(new URLSearchParams(params));
    p.set("b", boardId);
    setParams(p, { replace: true });
    setFocusItemId(itemId ?? null);
  };

  const handleDropToBoard = async (
    boardId: string,
    payload: { imageUrl: string; projectId: string },
  ) => {
    try {
      const result = await addToBoard.mutateAsync({
        boardId,
        projectId: payload.projectId,
        imageUrl: payload.imageUrl,
      });
      if (result === "duplicate") {
        toast.info("ภาพนี้อยู่ในบอร์ดนี้แล้ว");
        return;
      }
      const name = boards.find((b) => b.id === boardId)?.name ?? "บอร์ด";
      toast.success(`เพิ่มเข้า ${name} แล้ว`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const uniqueImageCount = recent.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary shrink-0" />
            <h2 className="text-lg font-medium text-foreground">Inspiration</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            หน้าแรกคือคลังรวม — กด Inspire แล้วภาพจะเข้าที่นี่อัตโนมัติ แล้วค่อยจัดลงบอร์ดได้
          </p>
          {!isLoading ? (
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-3">
              <span className="rounded-full bg-muted/60 px-3 py-1 tabular-nums">
                {uniqueImageCount} ภาพในคลัง
              </span>
              <span className="rounded-full bg-muted/60 px-3 py-1 tabular-nums">
                {customBoards.length} บอร์ด
              </span>
              <span className="rounded-full bg-muted/60 px-3 py-1">ส่วนตัว</span>
            </div>
          ) : null}
        </div>
        <Button
          size="sm"
          onClick={() => setFormOpen(true)}
          className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
        >
          <Plus className="w-4 h-4 mr-1" /> สร้างบอร์ด
        </Button>
      </div>

      {isLoading ? (
        <InlineLoader />
      ) : isError ? (
        <div className="text-center py-16 glass-panel rounded-2xl space-y-3">
          <p className="text-foreground font-medium">โหลดคลังไม่สำเร็จ</p>
          <Button variant="outline" className="rounded-full" onClick={() => refetch()}>
            ลองใหม่
          </Button>
        </div>
      ) : (
        <FeedModeTransition modeKey={view} direction={slideDir}>
          {view === "library" ? (
            <InspireLibraryHome
              boards={boards}
              items={recent}
              loading={recentLoading}
              onOpenBoard={(boardId) => openBoard(boardId)}
              onDropToBoard={(boardId, payload) => {
                void handleDropToBoard(boardId, payload);
              }}
            />
          ) : (
            <div className="space-y-4">
              <Button size="sm" variant="outline" className="rounded-full" onClick={openLibrary}>
                <ArrowLeft className="w-4 h-4 mr-1" /> กลับคลังรวม
              </Button>
              <InspireWorkspaceDetail
                boardId={view}
                focusItemId={focusItemId}
                onDeleted={openLibrary}
              />
            </div>
          )}
        </FeedModeTransition>
      )}

      <InspireBoardFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onCreated={(id) => openBoard(id)}
      />
    </div>
  );
}
