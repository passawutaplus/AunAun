import { useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/ui/EmptyState";
import ServiceEditorDialog from "@/components/services/ServiceEditorDialog";
import ServiceDetailDialog from "@/components/services/ServiceDetailDialog";
import {
  CREATOR_SERVICES_MAX,
  formatServiceDurationDays,
  formatServicePriceRange,
  useCreatorServices,
  useDeleteCreatorService,
  useUpsertCreatorService,
  type CreatorService,
  type CreatorServiceInput,
} from "@/hooks/useCreatorServices";
import { mapWriteFlowError } from "@/lib/writeFlowErrors";
import { useProfile } from "@/hooks/useProfile";
import { cn } from "@/lib/utils";

type Props = {
  ownerId: string;
  isSelf: boolean;
  visitorPreview?: boolean;
  /** Called after visitor confirms Request from the detail popup. */
  onRequestService?: (service: CreatorService) => void;
};

export default function ProfileServicesSection({
  ownerId,
  isSelf,
  visitorPreview,
  onRequestService,
}: Props) {
  const canManage = isSelf && !visitorPreview;
  const { data: ownerProfile } = useProfile(ownerId);
  const { data: services = [], isLoading } = useCreatorServices(ownerId, {
    includeDrafts: canManage,
  });
  const upsert = useUpsertCreatorService(ownerId);
  const remove = useDeleteCreatorService(ownerId);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<CreatorService | null>(null);
  const [detailService, setDetailService] = useState<CreatorService | null>(null);

  const published = services.filter((s) => s.status === "Published");
  const visible = canManage ? services : published;
  const atLimit = services.length >= CREATOR_SERVICES_MAX;

  const openCreate = () => {
    if (atLimit) {
      toast.message(`ลงได้สูงสุด ${CREATOR_SERVICES_MAX} แพ็กเกจ — แก้ไขหรือลบอันเดิมก่อน`);
      return;
    }
    setEditing(null);
    setEditorOpen(true);
  };

  const handleSubmit = async (patch: CreatorServiceInput, id?: string) => {
    try {
      await upsert.mutateAsync({ id, patch });
      toast.success(patch.status === "Published" ? "เผยแพร่แพ็กเกจแล้ว" : "บันทึกร่างแล้ว");
      setEditorOpen(false);
      setEditing(null);
    } catch (e) {
      toast.error(mapWriteFlowError(e, "บันทึกไม่สำเร็จ"));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        กำลังโหลดแพ็กเกจ...
      </div>
    );
  }

  if (visible.length === 0) {
    return (
      <>
        <EmptyState
          icon={Briefcase}
          title={canManage ? "ยังไม่มีแพ็กเกจ" : "ยังไม่มีแพ็กเกจที่เผยแพร่"}
          description={
            canManage
              ? `สร้างได้สูงสุด ${CREATOR_SERVICES_MAX} แพ็กเกจ — ลูกค้าขอใช้บริการจากแท็บ Packages`
              : "ครีเอเตอร์คนนี้ยังไม่ได้เผยแพร่แพ็กเกจ"
          }
          action={
            canManage ? (
              <Button className="rounded-full" onClick={openCreate}>
                <Plus className="w-4 h-4 mr-1" />
                Add Package
              </Button>
            ) : undefined
          }
        />
        <ServiceEditorDialog
          open={editorOpen}
          onOpenChange={setEditorOpen}
          initial={editing}
          busy={upsert.isPending}
          onSubmit={handleSubmit}
        />
      </>
    );
  }

  return (
    <div className="space-y-4">
      {canManage ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {services.length}/{CREATOR_SERVICES_MAX} แพ็กเกจ
          </p>
          <Button
            size="sm"
            className="rounded-full"
            disabled={atLimit}
            onClick={openCreate}
            title={atLimit ? `สูงสุด ${CREATOR_SERVICES_MAX}` : "Add Package"}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Package
          </Button>
        </div>
      ) : null}

      <div className="space-y-3">
        {visible.map((svc) => {
          const cover = svc.cover_url?.trim() || svc.gallery_urls[0] || "";
          const duration = formatServiceDurationDays(svc.duration_label);
          return (
            <article
              key={svc.id}
              className={cn(
                "rounded-2xl border border-border/70 bg-card/60 overflow-hidden",
                svc.status === "Draft" && "opacity-80 border-dashed",
              )}
            >
              <div className="flex flex-col sm:flex-row sm:items-stretch gap-0">
                <div className="relative w-full sm:w-[42%] sm:max-w-[16rem] aspect-[4/3] sm:aspect-auto sm:min-h-[8.5rem] bg-muted shrink-0">
                  {cover ? (
                    <img
                      src={cover}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                      <Briefcase className="h-8 w-8 opacity-40" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1 flex flex-col gap-2 p-3 sm:p-4 sm:border-l border-border/50">
                  <div className="min-w-0 space-y-1">
                    {canManage && svc.status === "Draft" ? (
                      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        แบบร่าง
                      </p>
                    ) : null}
                    <h3 className="text-sm sm:text-base font-semibold text-foreground leading-snug line-clamp-2">
                      {svc.title}
                    </h3>
                    <p className="text-sm font-semibold text-primary tabular-nums">
                      {formatServicePriceRange(svc.price_min_thb, svc.price_thb)}
                    </p>
                    {svc.summary?.trim() ? (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {svc.summary}
                      </p>
                    ) : null}
                    {duration ? (
                      <p className="text-[11px] text-muted-foreground">ระยะเวลา {duration}</p>
                    ) : null}
                  </div>

                  {!canManage ? (
                    <div className="mt-auto flex justify-end pt-1">
                      <Button size="sm" className="rounded-full h-10 min-h-10 px-4 text-xs touch-manipulation" asChild>
                        <Link to={`/service/${svc.id}`}>ดูรายละเอียด</Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-auto flex flex-wrap items-center justify-end gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full h-8"
                        onClick={() => {
                          setEditing(svc);
                          setEditorOpen(true);
                        }}
                      >
                        <Pencil className="w-3.5 h-3.5 mr-1" />
                        แก้ไข
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-full h-8 text-destructive hover:text-destructive"
                        disabled={remove.isPending}
                        onClick={() => {
                          if (!window.confirm(`ลบแพ็กเกจ "${svc.title}"?`)) return;
                          remove.mutate(svc.id, {
                            onSuccess: () => toast.success("ลบแพ็กเกจแล้ว"),
                            onError: (e) => toast.error(mapWriteFlowError(e, "ลบไม่สำเร็จ")),
                          });
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        ลบ
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <ServiceEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        initial={editing}
        busy={upsert.isPending}
        onSubmit={handleSubmit}
      />

      <ServiceDetailDialog
        open={!!detailService}
        onOpenChange={(next) => {
          if (!next) setDetailService(null);
        }}
        service={detailService}
        creatorName={
          ownerProfile?.display_name?.trim() ||
          ownerProfile?.username?.trim() ||
          null
        }
        creatorUsername={ownerProfile?.username}
        creatorAvatarUrl={ownerProfile?.avatar_url}
        creatorRole={ownerProfile?.role}
        onRequest={(svc) => {
          setDetailService(null);
          onRequestService?.(svc);
        }}
      />
    </div>
  );
}
