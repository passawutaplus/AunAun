import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, Handshake, Loader2 } from "lucide-react";
import StatsCard from "@/components/StatsCard";
import SeoHead from "@/components/SeoHead";
import { useAuth } from "@/hooks/useAuth";
import { useHiringRequests, type HiringRow } from "@/hooks/useHiringRequests";
import { useReceivedCollabRequests } from "@/hooks/useCollabRequests";
import { ProfileHiringRequestsSection } from "@/components/profile/ProfileHiringRequestsSection";
import LinkWorkDialog, { type LinkWorkKind } from "@/components/dashboard/LinkWorkDialog";
import { DashboardLinkedWorkStrip } from "@/components/dashboard/DashboardRequestStrips";
import StudioLayout from "@/components/dashboard/StudioLayout";
import InboxOverviewChart from "@/components/dashboard/InboxOverviewChart";
import { supabase } from "@/integrations/supabase/client";
import {
  HIRE_TAB_ACCEPTED,
  HIRE_TAB_COMPLETED,
  HIRE_TAB_CONTACTED_NEW,
  isContactedNewStatus,
  isHireCompletedStatus,
} from "@/lib/hiringStatus";
import {
  isCollabAcceptedStatus,
  isCollabCompletedStatus,
  isCollabContactedNewStatus,
} from "@/lib/collabInbox";

const CollabRequestsSection = lazy(() => import("@/components/CollabRequestsSection"));

export type DashboardMode = "hire" | "collab";

type LinkTarget = {
  kind: LinkWorkKind;
  requestId: string;
  linkedProjectId?: string | null;
};

function readLinkedProjectId(row: Record<string, unknown>): string | null {
  const id = row.linked_project_id;
  return typeof id === "string" ? id : null;
}

function resolveModeFromPath(pathname: string): DashboardMode {
  return pathname.startsWith("/dashboard/collab") ? "collab" : "hire";
}

type Props = {
  mode?: DashboardMode;
};

export default function DashboardPage({ mode: modeProp }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const mode = modeProp ?? resolveModeFromPath(location.pathname);
  const [linkTarget, setLinkTarget] = useState<LinkTarget | null>(null);

  // Legacy ?mode= / hash → dedicated paths
  useEffect(() => {
    const legacy = searchParams.get("mode");
    const focus = searchParams.get("focus");
    const hash = location.hash.replace(/^#/, "");
    if (legacy === "collab" || hash === "collab" || focus === "collab") {
      navigate("/dashboard/collab", { replace: true });
      return;
    }
    if (legacy === "wallet" || hash === "wallet" || hash === "earnings" || focus === "wallet" || focus === "earnings") {
      navigate("/earnings", { replace: true });
      return;
    }
    if (legacy === "reviews" || hash === "reviews" || focus === "reviews") {
      navigate("/dashboard/reviews", { replace: true });
      return;
    }
    if (legacy === "hire" || hash === "hiring" || hash === "hire" || focus === "hiring" || focus === "hire") {
      navigate("/dashboard/hire", { replace: true });
    }
  }, [searchParams, location.hash, navigate]);

  const { data: hireRequests = [], isLoading: hireLoading } = useHiringRequests(
    mode === "hire" ? user?.id : undefined,
  );
  const { data: collabRequests = [], isLoading: collabLoading } = useReceivedCollabRequests();

  const linkedProjectIds = useMemo(() => {
    if (mode !== "hire") return [] as string[];
    const ids = new Set<string>();
    for (const r of hireRequests) {
      const id = readLinkedProjectId(r as Record<string, unknown>);
      if (id) ids.add(id);
    }
    return [...ids];
  }, [mode, hireRequests]);

  const { data: linkedProjectTitles = {} } = useQuery({
    queryKey: ["dashboard-linked-projects", linkedProjectIds.join(",")],
    enabled: linkedProjectIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, title")
        .in("id", linkedProjectIds);
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const row of data ?? []) {
        map[row.id as string] = (row.title as string) || "ผลงาน";
      }
      return map;
    },
  });

  const hireStats = useMemo(() => {
    let contactedNew = 0;
    let accepted = 0;
    let completed = 0;
    for (const r of hireRequests) {
      if (isContactedNewStatus(r.status)) contactedNew += 1;
      else if (r.status === HIRE_TAB_ACCEPTED) accepted += 1;
      else if (isHireCompletedStatus(r.status)) completed += 1;
    }
    return {
      contactedNew,
      accepted,
      completed,
      total: hireRequests.length,
    };
  }, [hireRequests]);

  const collabStats = useMemo(() => {
    let contactedNew = 0;
    let accepted = 0;
    let completed = 0;
    for (const r of collabRequests) {
      if (isCollabContactedNewStatus(r.status)) contactedNew += 1;
      else if (isCollabAcceptedStatus(r.status)) accepted += 1;
      else if (isCollabCompletedStatus(r.status)) completed += 1;
    }
    return { contactedNew, accepted, completed, total: collabRequests.length };
  }, [collabRequests]);

  const openLinkDialog = useCallback((kind: LinkWorkKind, requestId: string, linkedProjectId?: string | null) => {
    setLinkTarget({ kind, requestId, linkedProjectId });
  }, []);

  const renderHireExtras = useCallback(
    (req: HiringRow) => {
      const linkedId = readLinkedProjectId(req as Record<string, unknown>);
      const hasIncomingRef = !!(
        req.project_id ||
        (typeof (req as { service_id?: string | null }).service_id === "string" &&
          (req as { service_id?: string | null }).service_id) ||
        req.project_title?.trim()
      );
      return (
        <>
          {hasIncomingRef ? null : (
            <DashboardLinkedWorkStrip
              kind="hire"
              requestId={req.id}
              linkedProjectId={linkedId}
              linkedProjectTitle={linkedId ? linkedProjectTitles[linkedId] : null}
              onLinkClick={() => openLinkDialog("hire", req.id, linkedId)}
            />
          )}
        </>
      );
    },
    [linkedProjectTitles, openLinkDialog],
  );

  const listLoading = mode === "hire" ? hireLoading : collabLoading;
  const stats = mode === "hire" ? hireStats : collabStats;
  const pageTitle = mode === "hire" ? "จ้างงาน" : "คอลแลป";
  const pagePath = mode === "hire" ? "/dashboard/hire" : "/dashboard/collab";

  return (
    <StudioLayout>
      <SeoHead title={`My Studio — ${pageTitle}`} path={pagePath} noindex />

      {authLoading || !user ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          กำลังโหลด…
        </div>
      ) : (
        <>
          {mode === "hire" ? (
            <InboxOverviewChart variant="hire" rows={hireRequests} loading={hireLoading} />
          ) : (
            <InboxOverviewChart variant="collab" rows={collabRequests} loading={collabLoading} />
          )}

          {mode === "hire" ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatsCard
                label={HIRE_TAB_CONTACTED_NEW}
                value={stats.contactedNew}
                icon={Briefcase}
                accent={stats.contactedNew > 0}
              />
              <StatsCard label={HIRE_TAB_ACCEPTED} value={stats.accepted} icon={Briefcase} />
              <StatsCard label={HIRE_TAB_COMPLETED} value={stats.completed} icon={Briefcase} />
              <StatsCard label="ทั้งหมด" value={stats.total} icon={Briefcase} />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatsCard
                label="ติดต่อใหม่"
                value={stats.contactedNew}
                icon={Handshake}
                accent={stats.contactedNew > 0}
              />
              <StatsCard label="ตอบรับ" value={stats.accepted} icon={Handshake} />
              <StatsCard label="จบงาน" value={stats.completed} icon={Handshake} />
              <StatsCard label="ทั้งหมด" value={stats.total} icon={Handshake} />
            </div>
          )}

          {mode === "hire" ? (
            <p className="text-xs text-muted-foreground">
              เอกสารใบเสร็จ 50 ทวิ และประมาณการภาษีอยู่ที่{" "}
              <Link to="/dashboard/documents" className="font-medium text-primary hover:underline">
                เอกสาร / ภาษี
              </Link>
              {" · "}
              ยอดเงินอยู่ที่{" "}
              <Link to="/earnings" className="font-medium text-primary hover:underline">
                ธุรกรรม
              </Link>
            </p>
          ) : null}

          {listLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              กำลังโหลดรายการ…
            </div>
          ) : mode === "hire" ? (
            <ProfileHiringRequestsSection embed renderCardExtras={renderHireExtras} />
          ) : (
            <Suspense
              fallback={
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  กำลังโหลดรายการ…
                </div>
              }
            >
              <CollabRequestsSection embed />
            </Suspense>
          )}
        </>
      )}

      {linkTarget ? (
        <LinkWorkDialog
          open={!!linkTarget}
          onOpenChange={(open) => {
            if (!open) setLinkTarget(null);
          }}
          kind={linkTarget.kind}
          requestId={linkTarget.requestId}
          currentProjectId={linkTarget.linkedProjectId}
          onLinked={() => setLinkTarget(null)}
        />
      ) : null}
    </StudioLayout>
  );
}
