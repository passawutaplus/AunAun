import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/button";
import { InlineLoader } from "@/components/ui/BanterLoader";
import { FeedModeTransition } from "@/components/feed/FeedModeTransition";
import { useAuth } from "@/hooks/useAuth";
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

const InspireBoardsPage = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { user, loading } = useAuth();
  useEnsureInspireLibrary(user?.id);
  const { data: boards = [], isLoading, isError, refetch } = useInspireBoards(user?.id);
  const { data: recent = [], isLoading: recentLoading } = useRecentInspireItems(user?.id, 120);
  const addToBoard = useAddToInspireBoard(user?.id);
  const [formOpen, setFormOpen] = useState(false);
  const [focusItemId, setFocusItemId] = useState<string | null>(null);
  /** +1 open board / -1 back to library */
  const [slideDir, setSlideDir] = useState(1);

  const customBoards = useMemo(
    () => boards.filter((b) => !isDefaultInspireBoard(b)),
    [boards],
  );
  const boardIds = useMemo(() => new Set(customBoards.map((b) => b.id)), [customBoards]);
  const view = useMemo(() => parseView(params, boardIds), [params, boardIds]);

  useEffect(() => {
    if (!loading && !user) navigate("/auth?redirect=/inspire");
  }, [loading, user, navigate]);

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

  const openLibrary = () => {
    setSlideDir(-1);
    const p = new URLSearchParams(params);
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
    const p = new URLSearchParams(params);
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
    <div className="min-h-screen bg-app-ambient pb-24 lg:pb-8">
      <div className="bg-gradient-to-b from-primary/10 to-background">
        <div className="max-w-6xl mx-auto px-4 pt-6 pb-4">
          <div className="flex items-center justify-between gap-2 mb-4">
            <BackButton to="/portfolio" label="กลับโปรไฟล์" />
            <Button
              size="sm"
              onClick={() => setFormOpen(true)}
              className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-1" /> สร้างบอร์ด
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-primary shrink-0" />
            <h1 className="text-2xl font-medium text-foreground">My Inspire</h1>
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
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-2">
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
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={openLibrary}
                >
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
      </div>

      <InspireBoardFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onCreated={(id) => openBoard(id)}
      />
    </div>
  );
};

export default InspireBoardsPage;
