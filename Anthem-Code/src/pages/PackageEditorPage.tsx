import { useEffect } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import PageLoader from "@/components/ui/PageLoader";
import ServiceEditorDialog from "@/components/services/ServiceEditorDialog";
import { useAuth } from "@/hooks/useAuth";
import {
  useCreatorService,
  useDeleteCreatorService,
  useUpsertCreatorService,
  type CreatorServiceInput,
} from "@/hooks/useCreatorServices";
import { mapWriteFlowError } from "@/lib/writeFlowErrors";

/**
 * Full-page create / edit for creator packages.
 * Routes: /portfolio/packages/new | /portfolio/packages/:id/edit
 */
export default function PackageEditorPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const redirectAuth = `/auth?redirect=${encodeURIComponent(
    isEdit ? `/portfolio/packages/${id}/edit` : "/portfolio/packages/new",
  )}`;

  const { data: service, isLoading: serviceLoading, isError } = useCreatorService(
    isEdit ? id : undefined,
  );
  const upsert = useUpsertCreatorService(user?.id);
  const remove = useDeleteCreatorService(user?.id);

  useEffect(() => {
    if (!authLoading && !user) navigate(redirectAuth);
  }, [authLoading, user, navigate, redirectAuth]);

  if (authLoading || (isEdit && serviceLoading)) return <PageLoader />;
  if (!user) return <Navigate to={redirectAuth} replace />;

  if (isEdit) {
    if (isError || !service) {
      return <Navigate to="/portfolio?tab=services" replace />;
    }
    if (service.owner_id !== user.id) {
      return <Navigate to={`/service/${service.id}`} replace />;
    }
  }

  const goHub = () => navigate("/portfolio?tab=services");

  const leaveEditor = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx;
    if ((typeof idx === "number" && idx > 0) || window.history.length > 1) {
      navigate(-1);
      return;
    }
    goHub();
  };

  const handleSubmit = async (patch: CreatorServiceInput, serviceId?: string) => {
    try {
      await upsert.mutateAsync({ id: serviceId, patch });
      toast.success(patch.status === "Published" ? "เผยแพร่แพ็กเกจแล้ว" : "บันทึกร่างแล้ว");
      goHub();
    } catch (e) {
      toast.error(mapWriteFlowError(e, "บันทึกไม่สำเร็จ"));
      throw e;
    }
  };

  const handleDelete = async (serviceId: string) => {
    try {
      await remove.mutateAsync(serviceId);
      toast.success("ลบแพ็กเกจแล้ว");
      goHub();
    } catch (e) {
      toast.error(mapWriteFlowError(e, "ลบไม่สำเร็จ"));
      throw e;
    }
  };

  return (
    <ServiceEditorDialog
      layout="page"
      open
      onOpenChange={(next) => {
        if (!next) leaveEditor();
      }}
      initial={isEdit ? service : null}
      busy={upsert.isPending}
      deleteBusy={remove.isPending}
      onSubmit={handleSubmit}
      onDelete={isEdit ? handleDelete : undefined}
    />
  );
}
