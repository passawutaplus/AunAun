import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, Handshake, Loader2 } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
import { cn } from "@/lib/utils";
import { MOBILE_PAGE_BOTTOM_CLASS } from "@/lib/mobileLayout";

type DashboardMode = "hire" | "collab";

type LinkTarget = {
  kind: LinkWorkKind;
  requestId: string;
  linkedProjectId?: string | null;
};

function resolveMode(raw: string | null): DashboardMode {
  return raw === "collab" ? "collab" : "hire";
}

function readLinkedProjectId(row: Record<string, unknown>): string | null {
  const id = row.linked_project_id;
  return typeof id === "string" ? id : null;
}

export default function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const mode = resolveMode(searchParams.get("mode"));
  const [linkTarget, setLinkTarget] = useState<LinkTarget | null>(null);

  const { data: hireRequests = [], isLoading: hireLoading } = useHiringRequests(user?.id);
  const { data: collabRequests = [], isLoading: collabLoading } = useReceivedCollabRequests();

  const linkedProjectIds = useMemo(() => {
    const ids = new Set<string>();
    for (const r of hireRequests) {
      const id = readLinkedProjectId(r as Record<string, unknown>);
      if (id) ids.add(id);
    }
    for (const r of collabRequests) {
      const id = readLinkedProjectId(r as Record<string, unknown>);
      if (id) ids.add(id);
    }
    return [...ids];
  }, [hireRequests, collabRequests]);

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

  const setMode = (next: DashboardMode) => {
    const params = new URLSearchParams(searchParams);
    if (next === "hire") params.delete("mode");
    else params.set("mode", next);
    setSearchParams(params, { replace: true });
  };

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

  return (
    <div className={`min-h-screen bg-app-ambient ${MOBILE_PAGE_BOTTOM_CLASS}`}>
      <SeoHead title="แดชบอร์ด & จัดการ" path="/dashboard" noindex />

      <div className="sticky top-0 z-20 glass-panel border-x-0 border-t-0 rounded-none">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <BackButton to="/portfolio" label="กลับโปรไฟล์" />
          <h1 className="text-sm font-semibold truncate">แดชบอร์ด &amp; จัดการ</h1>
          <div className="w-12 shrink-0" />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-5">
        <ToggleGroup
          type="single"
          value={mode}
          onValueChange={(v) => {
            if (v === "hire" || v === "collab") setMode(v);
          }}
          className="inline-flex w-full rounded-full border border-border bg-background p-1"
        >
          <ToggleGroupItem
            value="hire"
            className={cn(
              "rounded-full flex-1 py-2.5 text-sm gap-2 data-[state=on]:bg-[hsl(var(--chat-hire))] data-[state=on]:text-white",
            )}
          >
            <Briefcase className="w-4 h-4 shrink-0" />
            จ้างงาน
          </ToggleGroupItem>
          <ToggleGroupItem
            value="collab"
            className={cn(
              "rounded-full flex-1 py-2.5 text-sm gap-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground",
            )}
          >
            <Handshake className="w-4 h-4 shrink-0" />
            ร่วมงาน
          </ToggleGroupItem>
        </ToggleGroup>

        {authLoading || !user ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            กำลังโหลด…
          </div>
        ) : (
          <>
            {mode === "hire" ? (
              <>
                <div className="grid grid-cols-2 gap-3">
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

                <div className="space-y-2">
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
              </>
            ) : (
              <div className="grid grid-cols-2 gap-3">
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
              <div className="flex items-center justify-center py-12 text-muted-foreground gap-2 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
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
