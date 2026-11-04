import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { mapWriteFlowError } from "@/lib/writeFlowErrors";
import {
  DEMO_EVENTS,
  EVENT_SELECT,
  isDemoEventId,
  parseEventInsights,
  sortPublicEvents,
  type EventInsights,
  type EventDraft,
  type ExhibitionEvent,
  type TeamEventDraft,
} from "@/lib/exhibitionEvents";

/** Preview data only while developing, and only when the real table has nothing to show. */
const useDevDemo = import.meta.env.DEV;

function withDevDemo(rows: ExhibitionEvent[] | null, failed: boolean): ExhibitionEvent[] {
  if (useDevDemo && (failed || !rows || rows.length === 0)) return DEMO_EVENTS;
  return rows ?? [];
}

const eventsTable = () => supabase.from("events" as never);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = (fn: string, args: Record<string, unknown>) => (supabase.rpc as any)(fn, args);

type ListResult = { data: unknown[] | null; error: { code?: string } | null };
/**
 * Lists show main events only (venues are listed on their event's page). On a database without the venues
 * migration yet, `parent_id` doesn't exist (42703) — there are no venues then, so list everything.
 */
async function topLevelOnly(run: (onlyTop: boolean) => PromiseLike<ListResult>): Promise<ListResult> {
  const first = await run(true);
  return first.error?.code === "42703" ? run(false) : first;
}

export function usePublishedEvents() {
  return useQuery({
    queryKey: ["events", "public"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await topLevelOnly((onlyTop) => {
        const q = eventsTable().select(EVENT_SELECT).eq("status", "published");
        return (onlyTop ? q.is("parent_id", null) : q).order("starts_on", { ascending: true }).limit(120);
      });
      if (error && !useDevDemo) throw error;
      return sortPublicEvents(withDevDemo(data as ExhibitionEvent[] | null, !!error));
    },
  });
}

export function useEvent(id: string | undefined) {
  return useQuery({
    queryKey: ["events", "one", id],
    enabled: !!id,
    queryFn: async () => {
      if (useDevDemo && isDemoEventId(id)) return DEMO_EVENTS.find((e) => e.id === id) ?? null;
      const { data, error } = await eventsTable().select(EVENT_SELECT).eq("id", id!).maybeSingle();
      if (error) throw error;
      return (data as ExhibitionEvent | null) ?? null;
    },
  });
}

export function useMyEvents() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["events", "mine", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await topLevelOnly((onlyTop) => {
        const q = eventsTable().select(EVENT_SELECT).eq("owner_id", user!.id);
        return (onlyTop ? q.is("parent_id", null) : q).order("updated_at", { ascending: false });
      });
      if (error && !useDevDemo) throw error;
      if (useDevDemo && (error || !data?.length)) {
        // Show one of each owner state so the list can be reviewed.
        return DEMO_EVENTS.map((e, i) => ({
          ...e,
          status: (["published", "pending", "needs_revision"] as const)[i],
          review_note: i === 2 ? "ขอรูปปกที่ชัดกว่านี้ และระบุเวลาจัดงานให้ครบ" : null,
        }));
      }
      return (data as ExhibitionEvent[]) ?? [];
    },
  });
}

export function useAdminEvents() {
  return useQuery({
    queryKey: ["admin", "events"],
    queryFn: async () => {
      const { data, error } = await topLevelOnly((onlyTop) => {
        // Creators' private drafts stay hidden; the team's own drafts are listed.
        const q = eventsTable().select(EVENT_SELECT).or("status.neq.draft,origin.neq.community");
        return (onlyTop ? q.is("parent_id", null) : q)
          .order("submitted_at", { ascending: false, nullsFirst: false })
          .limit(200);
      });
      if (error && !useDevDemo) throw error;
      if (useDevDemo && (error || !data?.length)) {
        return DEMO_EVENTS.map((e, i) => ({ ...e, status: i === 0 ? "published" : "pending" }) as ExhibitionEvent);
      }
      return (data as ExhibitionEvent[]) ?? [];
    },
  });
}

export type EventProjectCard = { id: string; title: string; cover_url: string | null };

/** The organiser's own published works linked to the event (the server only accepts those). */
export function useEventProjects(ids: string[] | undefined) {
  const key = (ids ?? []).join(",");
  return useQuery({
    queryKey: ["events", "projects", key],
    enabled: !!ids?.length,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects" as never)
        .select("id, title, cover_url")
        .in("id", ids!)
        .eq("status", "Published");
      if (error) throw error;
      const rows = (data as EventProjectCard[]) ?? [];
      return ids!.map((id) => rows.find((r) => r.id === id)).filter(Boolean) as EventProjectCard[];
    },
  });
}

/**
 * "สรุปโดย SAMECOR" for one event. Read on its own so a database without the column yet
 * (migration not applied) just shows nothing instead of breaking the page.
 */
export function useEventInsights(id: string | undefined | null) {
  return useQuery({
    queryKey: ["events", "insights", id],
    enabled: !!id && !isDemoEventId(id),
    retry: false,
    queryFn: async (): Promise<EventInsights | null> => {
      const { data, error } = await eventsTable().select("insights").eq("id", id!).maybeSingle();
      if (error) return null;
      return parseEventInsights((data as { insights?: unknown } | null)?.insights);
    },
  });
}

export function useSetEventInsights() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, insights }: { id: string; insights: EventInsights | null }) => {
      const { data, error } = await rpc("admin_event_set_insights", { _id: id, _insights: insights });
      if (error) throw error;
      return parseEventInsights(data);
    },
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: ["events", "insights", v.id] });
      toast.success("บันทึกสรุปแล้ว");
    },
    onError: () => toast.error("บันทึกสรุปไม่สำเร็จ ลองอีกครั้ง"),
  });
}

/** A few recent published works in the given categories, for the event page's related row. */
export function useRelatedWorks(categories: string[] | undefined, limit = 6) {
  const key = (categories ?? []).join("|");
  return useQuery({
    queryKey: ["events", "related-works", key, limit],
    enabled: !!categories?.length,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects" as never)
        .select("id, title, cover_url, category")
        .eq("status", "Published")
        .in("category", categories!)
        .not("cover_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) return [];
      return (data as (EventProjectCard & { category: string | null })[]) ?? [];
    },
  });
}

/** Published works the owner can attach (newest first). */
export function useMyPublishedProjects() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["events", "my-projects", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects" as never)
        .select("id, title, cover_url")
        .eq("owner_id", user!.id)
        .eq("status", "Published")
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      return (data as EventProjectCard[]) ?? [];
    },
  });
}

export function invalidateEvents(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ["events"] });
  void qc.invalidateQueries({ queryKey: ["admin", "events"] });
}

export function useSaveEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, draft }: { id: string | null; draft: EventDraft }) => {
      const { data, error } = await rpc("event_save", { _id: id, _data: draft });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => invalidateEvents(qc),
    onError: (err: unknown) => toast.error(mapWriteFlowError(err, "บันทึกไม่สำเร็จ")),
  });
}

export function useSubmitEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await rpc("event_submit", { _id: id });
      if (error) throw error;
    },
    onSuccess: () => invalidateEvents(qc),
    onError: (err: unknown) => toast.error(mapWriteFlowError(err, "ส่งตรวจไม่สำเร็จ")),
  });
}

function simpleEventAction(fn: string, success: string, failure: string) {
  return function useAction() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async (id: string) => {
        const { error } = await rpc(fn, { _id: id });
        if (error) throw error;
      },
      onSuccess: () => {
        invalidateEvents(qc);
        toast.success(success);
      },
      onError: (err: unknown) => toast.error(mapWriteFlowError(err, failure)),
    });
  };
}

export const useWithdrawEvent = simpleEventAction("event_withdraw", "ถอนการส่งแล้ว — แก้ไขต่อได้", "ถอนไม่สำเร็จ");
export const useDeleteEvent = simpleEventAction("event_delete", "ลบงานแล้ว", "ลบไม่สำเร็จ");

export function useSetEventSwitches() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: string; registrationOpen?: boolean; openForSponsors?: boolean }) => {
      const { error } = await rpc("event_set_switches", {
        _id: v.id,
        _registration_open: v.registrationOpen ?? null,
        _open_for_sponsors: v.openForSponsors ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => invalidateEvents(qc),
    onError: (err: unknown) => toast.error(mapWriteFlowError(err, "อัปเดตไม่สำเร็จ")),
  });
}

export function useReviewEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: string; decision: "approve" | "revise" | "reject"; note?: string }) => {
      const { error } = await rpc("admin_review_event", { _id: v.id, _decision: v.decision, _note: v.note ?? null });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      invalidateEvents(qc);
      toast.success(v.decision === "approve" ? "เผยแพร่แล้ว" : v.decision === "revise" ? "ส่งกลับให้แก้ไขแล้ว" : "ปฏิเสธแล้ว");
    },
    onError: (err: unknown) => toast.error(mapWriteFlowError(err, "บันทึกผลตรวจไม่สำเร็จ")),
  });
}

export function useSaveTeamEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: string | null; draft: TeamEventDraft; publish: boolean }) => {
      const { data, error } = await rpc("admin_event_save", { _id: v.id, _data: v.draft, _publish: v.publish });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (_d, v) => {
      invalidateEvents(qc);
      toast.success(v.publish ? "เผยแพร่แล้ว" : "บันทึกฉบับร่างแล้ว");
    },
    onError: (err: unknown) => toast.error(mapWriteFlowError(err, "บันทึกไม่สำเร็จ")),
  });
}

export type ExtractedEvent = {
  draft: Partial<TeamEventDraft> & { source_name: string; source_url: string };
  confidence: number;
  notes: string[];
  structured: boolean;
};

/** Admin only: the event-extract function reads one public page and returns a draft to check. */
export function useExtractEvent() {
  return useMutation({
    mutationFn: async (url: string) => {
      const { data, error } = await supabase.functions.invoke("event-extract", { body: { url } });
      if (error) {
        // Non-2xx: the function's own message (Thai) is in the response body.
        const body = await (error as { context?: Response }).context?.json?.().catch(() => null);
        throw new Error(body?.error ?? "อ่านหน้านี้ไม่สำเร็จ");
      }
      return data as ExtractedEvent;
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "อ่านหน้านี้ไม่สำเร็จ"),
  });
}

export type SimilarEvent = Pick<ExhibitionEvent, "id" | "title" | "starts_on" | "ends_on" | "status" | "origin"> & {
  score: number;
};

/** Admin only: events that look like the one being added (same source link, or a close title near the same dates). */
export function useSimilarEvents(title: string, startsOn: string | null, sourceUrl: string | null, excludeId: string | null) {
  const t = title.trim();
  return useQuery({
    queryKey: ["admin", "events", "similar", t, startsOn, sourceUrl],
    enabled: t.length >= 4 || !!sourceUrl,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await rpc("admin_event_similar", {
        _title: t,
        _starts_on: startsOn,
        _source_url: sourceUrl,
      });
      if (error) throw error;
      return ((data ?? []) as SimilarEvent[]).filter((e) => e.id !== excludeId);
    },
  });
}

export function useSetEventPick() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: string; pick: boolean }) => {
      const { error } = await rpc("admin_set_event_pick", { _id: v.id, _pick: v.pick });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      invalidateEvents(qc);
      toast.success(v.pick ? "ติด SameCor Pick แล้ว" : "เอา SameCor Pick ออกแล้ว");
    },
    onError: (err: unknown) => toast.error(mapWriteFlowError(err, "อัปเดตไม่สำเร็จ")),
  });
}

export type EventStats = { view_count: number; like_count: number; interest_count: number };

/**
 * View/like totals, fetched apart from EVENT_SELECT so lists still load if the counters
 * migration hasn't reached this database yet (the counts then just don't show).
 */
export function useEventStats(ids: string[]) {
  const realIds = ids.filter((id) => !isDemoEventId(id));
  return useQuery({
    queryKey: ["events", "stats", [...realIds].sort().join(",")],
    enabled: realIds.length > 0,
    staleTime: 30_000,
    retry: false,
    queryFn: async () => {
      const { data, error } = await eventsTable().select("id, view_count, like_count, interest_count").in("id", realIds);
      if (error) return {} as Record<string, EventStats>;
      const rows = (data ?? []) as Array<Partial<EventStats> & { id: string }>;
      return Object.fromEntries(
        rows.map((r) => [
          r.id,
          { view_count: r.view_count ?? 0, like_count: r.like_count ?? 0, interest_count: r.interest_count ?? 0 },
        ]),
      );
    },
  });
}

/** Which of these events the signed-in user marked "สนใจ" (interested). */
export function useMyEventInterests(ids: string[]) {
  const { user } = useAuth();
  const realIds = ids.filter((id) => !isDemoEventId(id));
  return useQuery({
    queryKey: ["events", "my-interests", user?.id, [...realIds].sort().join(",")],
    enabled: !!user && realIds.length > 0,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_interests" as never)
        .select("event_id")
        .eq("user_id", user!.id)
        .in("event_id", realIds);
      if (error) return new Set<string>();
      return new Set(((data ?? []) as Array<{ event_id: string }>).map((r) => r.event_id));
    },
  });
}

/** "สนใจ": like-style toggle that also opts the user in to reminders before the event starts. */
export function useToggleEventInterest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await rpc("toggle_event_interest", { _event_id: id });
      if (error) throw error;
      const row = (Array.isArray(data) ? data[0] : data) as { interested: boolean; interest_count: number } | null;
      return row ?? { interested: false, interest_count: 0 };
    },
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: ["events", "stats"] });
      void qc.invalidateQueries({ queryKey: ["events", "my-interests"] });
      void qc.invalidateQueries({ queryKey: ["events", "my-list"] });
      if (row.interested) toast.success("บันทึกแล้ว — จะเตือนก่อนงานเริ่ม 3 วันและ 1 วัน");
    },
    onError: () => toast.error("บันทึกไม่สำเร็จ ลองอีกครั้ง"),
  });
}

/** Count one view per event per browser session. */
export function useRecordEventView(id: string | undefined, published: boolean) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!id || !published || isDemoEventId(id)) return;
    const key = `event-viewed:${id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* storage blocked: still count */
    }
    void rpc("increment_event_view", { _event_id: id }).then(() =>
      qc.invalidateQueries({ queryKey: ["events", "stats"] }),
    );
  }, [id, published, qc]);
}

/** Remember that the signed-in user pressed an event's register button (Portfolio → Exhibition). */
export function recordEventRegistration(id: string) {
  if (isDemoEventId(id)) return;
  void rpc("record_event_registration", { _event_id: id });
}

/**
 * Events the user marked สนใจ or registered for, newest action first. Empty (not an error) when the
 * counters migration is not on this database yet.
 */
export function useMyEventList(kind: "registered" | "interested") {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["events", "my-list", kind, user?.id],
    enabled: !!user,
    retry: false,
    queryFn: async (): Promise<ExhibitionEvent[]> => {
      const { data: links, error } = await supabase
        .from((kind === "interested" ? "event_interests" : "event_registrations") as never)
        .select("event_id, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(60);
      if (error || !links?.length) return [];
      const ids = (links as Array<{ event_id: string }>).map((l) => l.event_id);
      const { data: rows, error: eventsError } = await eventsTable().select(EVENT_SELECT).in("id", ids);
      if (eventsError || !rows) return [];
      const byId = new Map((rows as ExhibitionEvent[]).map((e) => [e.id, e]));
      return ids.map((id) => byId.get(id)).filter((e): e is ExhibitionEvent => !!e);
    },
  });
}
