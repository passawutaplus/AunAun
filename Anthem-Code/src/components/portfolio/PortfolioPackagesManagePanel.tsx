import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Eye,
  Globe,
  LayoutGrid,
  Mail,
  Plus,
} from "lucide-react";
import PackagesIcon from "@/components/icons/PackagesIcon";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import StatsCard from "@/components/StatsCard";
import SearchBar from "@/components/SearchBar";
import EmptyState from "@/components/ui/EmptyState";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";
import { InlineLoader } from "@/components/ui/BanterLoader";
import PackageOverviewChart from "@/components/portfolio/PackageOverviewChart";
import PackageManageStatsDialog from "@/components/portfolio/PackageManageStatsDialog";
import ProjectManageGridSelect, {
  PROJECT_MANAGE_GRID_CLASS,
  useProjectManageGridMode,
} from "@/components/portfolio/ProjectManageGridSelect";
import ManageServiceCard from "@/components/services/ManageServiceCard";
import PackageManageSortSelect from "@/components/services/PackageManageSortSelect";
import ServiceDetailDialog from "@/components/services/ServiceDetailDialog";
import {
  CREATOR_SERVICES_MAX,
  useCreatorServices,
  useDeleteCreatorService,
  useReorderCreatorServices,
  type CreatorService,
} from "@/hooks/useCreatorServices";
import {
  EMPTY_PACKAGE_STATS,
  usePackageManageStats,
} from "@/hooks/usePackageManageStats";
import { usePackageStatsByService } from "@/hooks/usePackageServiceStats";
import {
  DEFAULT_PACKAGE_MANAGE_SORT,
  sortManagePackages,
  type PackageManageSortMode,
} from "@/lib/packageManageSort";
import { mapWriteFlowError } from "@/lib/writeFlowErrors";
import { smoothEase, staggerReveal } from "@/lib/motion";
import { cn } from "@/lib/utils";

type PackageTab = "ทั้งหมด" | "Published" | "Draft";

type Props = {
  ownerId: string;
};

/** Packages manage UI: stats, filters, editable package grid — mirrors Works dashboard. */
export default function PortfolioPackagesManagePanel({ ownerId }: Props) {
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const { data: services = [], isLoading, isError, refetch } = useCreatorServices(ownerId, {
    includeDrafts: true,
  });
  const remove = useDeleteCreatorService(ownerId);
  const reorder = useReorderCreatorServices(ownerId);

  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<PackageTab>("ทั้งหมด");
  const [sortMode, setSortMode] = useState<PackageManageSortMode>(DEFAULT_PACKAGE_MANAGE_SORT);
  const [grid, setGrid] = useProjectManageGridMode();
  const [previewService, setPreviewService] = useState<CreatorService | null>(null);
  const [statsService, setStatsService] = useState<CreatorService | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const publishedCount = services.filter((s) => s.status === "Published").length;
  const slotsLeft = Math.max(0, CREATOR_SERVICES_MAX - services.length);
  const atLimit = slotsLeft <= 0;
  const serviceIds = useMemo(() => services.map((s) => s.id), [services]);
  const { data: packageStats = EMPTY_PACKAGE_STATS } = usePackageManageStats(ownerId, serviceIds);
  const { data: statsByService = {} } = usePackageStatsByService(ownerId, serviceIds);

  const ordered = useMemo(
    () => [...services].sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at)),
    [services],
  );

  const filtered = useMemo(() => {
    const list = services.filter((s) => {
      const matchTab = tab === "ทั้งหมด" || s.status === tab;
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        s.title.toLowerCase().includes(q) ||
        s.summary.toLowerCase().includes(q);
      return matchTab && matchSearch;
    });
    return sortManagePackages(list, sortMode);
  }, [services, tab, search, sortMode]);

  const pendingTitle =
    pendingDeleteId ? services.find((s) => s.id === pendingDeleteId)?.title ?? "แพ็กเกจนี้" : "";

  const openCreate = () => {
    if (atLimit) {
      toast.message(`ลงได้สูงสุด ${CREATOR_SERVICES_MAX} แพ็กเกจ — แก้ไขหรือลบอันเดิมก่อน`);
      return;
    }
    navigate("/portfolio/packages/new");
  };

  const openEdit = (svc: CreatorService) => {
    navigate(`/portfolio/packages/${svc.id}/edit`);
  };

  const moveService = (id: string, direction: -1 | 1) => {
    const ids = ordered.map((s) => s.id);
    const idx = ids.indexOf(id);
    const swap = idx + direction;
    if (idx < 0 || swap < 0 || swap >= ids.length) return;
    [ids[idx], ids[swap]] = [ids[swap], ids[idx]];
    reorder.mutate(ids, {
      onSuccess: () => toast.success("จัดลำดับแพ็กเกจแล้ว"),
      onError: (e) => toast.error(e instanceof Error ? e.message : "จัดลำดับไม่สำเร็จ"),
    });
  };

  const tabs: PackageTab[] = ["ทั้งหมด", "Published", "Draft"];

  if (isLoading) return <InlineLoader />;

  if (isError) {
    return (
      <div className="text-center py-16 glass-panel rounded-2xl space-y-3">
        <p className="text-foreground font-medium">โหลดแพ็กเกจไม่สำเร็จ</p>
        <p className="text-sm text-muted-foreground">ลองใหม่อีกครั้ง หรือตรวจการเชื่อมต่อ</p>
        <Button variant="outline" className="rounded-full" onClick={() => refetch()}>
          ลองใหม่
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!atLimit ? (
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl h-11 px-6"
            onClick={openCreate}
          >
            <Plus className="w-4 h-4 mr-2" /> Add Package
          </Button>
        </div>
      ) : null}

      <PackageOverviewChart ownerId={ownerId} serviceIds={serviceIds} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatsCard label="ทั้งหมด" value={services.length} icon={LayoutGrid} />
        <StatsCard label="เผยแพร่" value={publishedCount} icon={Globe} accent />
        <StatsCard label="คนดูแพ็กเกจ" value={packageStats.viewCount} icon={Eye} />
        <StatsCard label="กดจ้าง" value={packageStats.hireCount} icon={Mail} accent />
      </div>

      {services.length === 0 ? (
        <EmptyState
          icon={PackagesIcon}
          title="ยังไม่มีแพ็กเกจ"
          description={`สร้างได้สูงสุด ${CREATOR_SERVICES_MAX} แพ็กเกจ — ลูกค้าขอใช้บริการจากแท็บ Packages บนโปรไฟล์สาธารณะ`}
          action={
            !atLimit ? (
              <Button className="rounded-full" onClick={openCreate}>
                <Plus className="w-4 h-4 mr-1" />
                Add Package
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <PackagesIcon className="w-4 h-4 text-primary shrink-0" />
              แพ็กเกจทั้งหมด
            </h2>
            <p className="text-xs text-muted-foreground tabular-nums">
              {services.length}/{CREATOR_SERVICES_MAX} แพ็กเกจ
            </p>
          </div>
          <SearchBar placeholder="ค้นหาแพ็กเกจ..." value={search} onChange={setSearch} />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide min-w-0 flex-1">
              {tabs.map((t) => {
                const label =
                  t === "ทั้งหมด" ? "ทั้งหมด" : t === "Published" ? "เผยแพร่" : "แบบร่าง";
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={cn(
                      "px-4 py-2.5 min-h-10 rounded-full text-sm font-medium whitespace-nowrap transition-colors touch-manipulation",
                      tab === t
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-secondary-foreground border border-border hover:bg-secondary",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <PackageManageSortSelect value={sortMode} onChange={setSortMode} />
              <ProjectManageGridSelect value={grid} onChange={setGrid} />
            </div>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={grid}
              className={cn(PROJECT_MANAGE_GRID_CLASS[grid])}
              initial={reducedMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: smoothEase }}
            >
              {filtered.map((svc, index) => {
                const listIdx = ordered.findIndex((s) => s.id === svc.id);
                return (
                  <motion.div
                    key={svc.id}
                    layout={!reducedMotion}
                    initial={reducedMotion ? false : { opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={
                      reducedMotion
                        ? { duration: 0 }
                        : staggerReveal(index, {
                            dense: grid === "cols2" || grid === "cols5" || grid === "list",
                          })
                    }
                  >
                    <ManageServiceCard
                      service={svc}
                      stats={statsByService[svc.id] ?? EMPTY_PACKAGE_STATS}
                      onStats={() => setStatsService(svc)}
                      compact={grid === "cols2" || grid === "cols5"}
                      layout={grid === "list" ? "list" : "card"}
                      canMoveUp={listIdx > 0}
                      canMoveDown={listIdx >= 0 && listIdx < ordered.length - 1}
                      orderBusy={reorder.isPending}
                      onMoveUp={() => moveService(svc.id, -1)}
                      onMoveDown={() => moveService(svc.id, 1)}
                      onPreview={() => setPreviewService(svc)}
                      onEdit={() => openEdit(svc)}
                      onDelete={() => setPendingDeleteId(svc.id)}
                    />
                  </motion.div>
                );
              })}
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6 col-span-full">
                  ไม่พบแพ็กเกจ
                </p>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      <ServiceDetailDialog
        open={!!previewService}
        onOpenChange={(next) => {
          if (!next) setPreviewService(null);
        }}
        service={previewService}
        previewOnly
        onRequest={() => setPreviewService(null)}
      />

      <PackageManageStatsDialog
        open={!!statsService}
        onOpenChange={(next) => {
          if (!next) setStatsService(null);
        }}
        service={statsService}
        ownerId={ownerId}
        onPreview={() => {
          if (!statsService) return;
          setPreviewService(statsService);
          setStatsService(null);
        }}
        onEdit={() => {
          if (!statsService) return;
          openEdit(statsService);
          setStatsService(null);
        }}
      />

      <DeleteConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null);
        }}
        title="ลบแพ็กเกจนี้?"
        description={
          pendingDeleteId ? (
            <>「{pendingTitle}」จะถูกลบถาวรและไม่สามารถกู้คืนได้ ต้องการลบจริงหรือไม่?</>
          ) : (
            ""
          )
        }
        onConfirm={() => {
          if (!pendingDeleteId) return;
          remove.mutate(pendingDeleteId, {
            onSuccess: () => {
              toast.success("ลบแพ็กเกจแล้ว");
              setPendingDeleteId(null);
            },
            onError: (e) => toast.error(mapWriteFlowError(e, "ลบไม่สำเร็จ")),
          });
        }}
        loading={remove.isPending}
      />
    </div>
  );
}
