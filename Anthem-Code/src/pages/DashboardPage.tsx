import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, Handshake, Loader2, Settings } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/button";
import StatsCard from "@/components/StatsCard";
import SeoHead from "@/components/SeoHead";
import { useAuth } from "@/hooks/useAuth";
import { useHiringRequests, type HiringRow } from "@/hooks/useHiringRequests";
import { useReceivedCollabRequests } from "@/hooks/useCollabRequests";
import { ProfileHiringRequestsSection } from "@/components/profile/ProfileHiringRequestsSection";
import CollabRequestsSection from "@/components/CollabRequestsSection";
import LinkWorkDialog, { type LinkWorkKind } from "@/components/dashboard/LinkWorkDialog";
import {
  DashboardDocumentStrip,
  DashboardLinkedWorkStrip,
} from "@/components/dashboard/DashboardRequestStrips";
import ManageModeNav from "@/components/dashboard/ManageModeNav";
import DashboardHireDocumentsPanel from "@/components/dashboard/DashboardHireDocumentsPanel";
import EarningsBalanceCards from "@/components/payments/EarningsBalanceCards";
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
import { MOBILE_PAGE_BOTTOM_CLASS } from "@/lib/mobileLayout";

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
    const hash = location.hash.replace(/^#/, "");
    if (legacy === "collab" || hash === "collab") {
      navigate("/dashboard/collab", { replace: true });
      return;
    }
    if (legacy === "wallet" || hash === "wallet" || hash === "earnings") {
      navigate("/earnings", { replace: true });
      return;
    }
    if (legacy === "reviews" || hash === "reviews") {
      navigate("/dashboard/reviews", { replace: true });
      return;
    }
    if (legacy === "hire" || hash === "hiring" || hash === "hire") {
      navigate("/dashboard", { replace: true });
    }
  }, [searchParams, location.hash, navigate]);

  const { data: hireRequests = [], isLoading: hireLoading } = useHiringRequests(
    mode === "hire" ? user?.id : undefined,
  );
  const { data: collabRequests = [], isLoading: collabLoading } = useReceivedCollabRequests();

  const linkedProjectIds = useMemo(() => {
    const ids = new Set<string>();
    const rows = mode === "hire" ? hireRequests : collabRequests;
    for (const r of rows) {
      const id = readLinkedProjectId(r as Record<string, unknown>);
      if (id) ids.add(id);
    }
    return [...ids];
  }, [mode, hireRequests, collabRequests]);

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
      return (
        <>
          <DashboardLinkedWorkStrip
            kind="hire"
            requestId={req.id}
            linkedProjectId={linkedId}
            linkedProjectTitle={linkedId ? linkedProjectTitles[linkedId] : null}
            onLinkClick={() => openLinkDialog("hire", req.id, linkedId)}
          />
          <DashboardDocumentStrip requestId={req.id} kind="hire" />
        </>
      );
    },
    [linkedProjectTitles, openLinkDialog],
  );

  const renderCollabExtras = useCallback(
    (req: { id: string; linked_project_id?: string | null }) => {
      const linkedId = readLinkedProjectId(req as Record<string, unknown>);
      return (
        <>
          <DashboardLinkedWorkStrip
            kind="collab"
            requestId={req.id}
            linkedProjectId={linkedId}
            linkedProjectTitle={linkedId ? linkedProjectTitles[linkedId] : null}
            onLinkClick={() => openLinkDialog("collab", req.id, linkedId)}
          />
          <DashboardDocumentStrip requestId={req.id} kind="collab" />
        </>
      );
    },
    [linkedProjectTitles, openLinkDialog],
  );

  const listLoading = mode === "hire" ? hireLoading : collabLoading;
  const stats = mode === "hire" ? hireStats : collabStats;
  const pageTitle = mode === "hire" ? "จ้างงาน" : "คอลแลป";
  const pagePath = mode === "hire" ? "/dashboard" : "/dashboard/collab";
  const pageHint =
    mode === "hire"
      ? "ดูคำขอจ้างงาน ลิงก์ผลงาน และเอกสาร"
      : "ดูคำขอคอลแลป ตอบรับ/ปฏิเสธ และลิงก์ผลงานร่วม";

  return (
    <div className={`min-h-screen bg-app-ambient ${MOBILE_PAGE_BOTTOM_CLASS}`}>
      <SeoHead title={`แดชบอร์ด & จัดการ — ${pageTitle}`} path={pagePath} noindex />

      <div className="bg-gradient-to-b from-primary/10 to-background">
        <div className="mx-auto max-w-5xl px-4 pb-4 pt-6 lg:pt-8">
          <BackButton
            fallbackTo="/portfolio"
            label="กลับโปรไฟล์"
            className="mb-4"
          />
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {mode === "hire" ? (
                <Briefcase className="h-6 w-6 text-primary" />
              ) : (
                <Handshake className="h-6 w-6 text-primary" />
              )}
              <div>
                <h1 className="text-2xl font-medium text-foreground">{pageTitle}</h1>
                <p className="mt-0.5 text-sm text-muted-foreground">{pageHint}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/settings")}
              className="rounded-full"
            >
              <Settings className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">ตั้งค่า</span>
            </Button>
          </div>
          <ManageModeNav className="mt-4" />
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 pb-10">
        {authLoading || !user ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            กำลังโหลด…
          </div>
        ) : (
          <>
            {mode === "hire" ? (
              <>
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
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
                  <div className="space-y-2 rounded-2xl border border-border/70 bg-card/50 p-4">
                    <h2 className="text-sm font-semibold">รายได้จ้างงาน (THB)</h2>
                    <EarningsBalanceCards
                      pendingSatang={0}
                      availableSatang={0}
                      payoutReservedSatang={0}
                      paidOutSatang={0}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      ยอดจ้างงานผ่าน Omise จะแสดงที่นี่หลังเปิดรับชำระ
                    </p>
                  </div>
                </div>
                <DashboardHireDocumentsPanel userId={user.id} />
              </>
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

            {listLoading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                กำลังโหลดรายการ…
              </div>
            ) : mode === "hire" ? (
              <ProfileHiringRequestsSection embed renderCardExtras={renderHireExtras} />
            ) : (
              <CollabRequestsSection embed renderCardExtras={renderCollabExtras} />
            )}
          </>
        )}
      </div>

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
    </div>
  );
}
