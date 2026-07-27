import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  averageCategoryScores,
  type CategoryScores,
  type WorkReview,
  type WorkReviewKind,
  type WorkReviewWithAuthor,
} from "@/lib/workReviews";

type SubmitInput = {
  kind: WorkReviewKind;
  subjectUserId: string;
  hireRequestId?: string | null;
  collabRequestId?: string | null;
  /** Overall average — computed from categories if omitted. */
  rating?: number;
  categories: CategoryScores;
  tags: string[];
  body?: string | null;
  projectId?: string | null;
};

async function fetchAuthorMap(ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return new Map<string, WorkReviewWithAuthor["author"]>();
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, display_name, username, avatar_url")
    .in("user_id", unique);
  if (error) throw error;
  const map = new Map<string, WorkReviewWithAuthor["author"]>();
  for (const row of data ?? []) {
    const r = row as {
      user_id: string;
      display_name: string | null;
      username: string | null;
      avatar_url: string | null;
    };
    map.set(r.user_id, {
      display_name: r.display_name,
      username: r.username,
      avatar_url: r.avatar_url,
    });
  }
  return map;
}

export function useSubjectWorkReviews(subjectUserId: string | undefined, kind?: WorkReviewKind) {
  return useQuery({
    queryKey: ["work_reviews", "subject", subjectUserId, kind ?? "all"],
    enabled: !!subjectUserId,
    queryFn: async () => {
      let q = supabase
        .from("work_reviews" as never)
        .select("*")
        .eq("subject_user_id", subjectUserId!)
        .eq("visibility", "public")
        .order("created_at", { ascending: false });
      if (kind) q = q.eq("kind", kind);
      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? []) as unknown as WorkReview[];
      const authors = await fetchAuthorMap(rows.map((r) => r.author_user_id));
      return rows.map((r) => ({
        ...r,
        author: authors.get(r.author_user_id) ?? null,
      })) as WorkReviewWithAuthor[];
    },
  });
}

/** Whether current user already reviewed this job. */
export function useMyWorkReviewForJob(input: {
  authorId: string | undefined;
  kind: WorkReviewKind;
  hireRequestId?: string | null;
  collabRequestId?: string | null;
}) {
  const { authorId, kind, hireRequestId, collabRequestId } = input;
  const jobId = kind === "hire" ? hireRequestId : collabRequestId;
  return useQuery({
    queryKey: ["work_reviews", "mine", kind, jobId, authorId],
    enabled: !!authorId && !!jobId,
    queryFn: async () => {
      let q = supabase
        .from("work_reviews" as never)
        .select("id")
        .eq("author_user_id", authorId!)
        .eq("kind", kind)
        .limit(1);
      if (kind === "hire") q = q.eq("hire_request_id", hireRequestId!);
      else q = q.eq("collab_request_id", collabRequestId!);
      const { data, error } = await q;
      if (error) throw error;
      return ((data ?? []) as { id: string }[])[0] ?? null;
    },
  });
}

export function useSubmitWorkReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SubmitInput) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("ต้องเข้าสู่ระบบก่อน");
      const overall = input.rating ?? averageCategoryScores(input.categories);
      if (overall == null || overall < 1 || overall > 5) {
        throw new Error("ให้คะแนนครบทั้ง 5 ด้าน (1–5 ดาว)");
      }
      const { punctuality, quality, coop, brief, value } = input.categories;
      for (const v of [punctuality, quality, coop, brief, value]) {
        if (v < 1 || v > 5) throw new Error("ให้คะแนนครบทั้ง 5 ด้าน (1–5 ดาว)");
      }
      if (input.kind === "hire" && !input.hireRequestId) throw new Error("ไม่พบงานจ้าง");
      if (input.kind === "collab" && !input.collabRequestId) throw new Error("ไม่พบคอลแลป");

      const payload = {
        kind: input.kind,
        subject_user_id: input.subjectUserId,
        author_user_id: user.id,
        hire_request_id: input.kind === "hire" ? input.hireRequestId : null,
        collab_request_id: input.kind === "collab" ? input.collabRequestId : null,
        rating: overall,
        rating_punctuality: punctuality,
        rating_quality: quality,
        rating_coop: coop,
        rating_brief: brief,
        rating_value: value,
        tags: input.tags.slice(0, 6),
        body: input.body?.trim() || null,
        project_id: input.projectId ?? null,
        visibility: "public",
      };

      const { data, error } = await supabase
        .from("work_reviews" as never)
        .insert(payload as never)
        .select("*")
        .single();
      if (error) throw error;
      return data as unknown as WorkReview;
    },
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: ["work_reviews"] });
      void qc.invalidateQueries({ queryKey: ["work_reviews", "subject", row.subject_user_id] });
    },
  });
}

/** Subject replies to a review about them (public). */
export function useReplyWorkReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { reviewId: string; replyBody: string | null }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("ต้องเข้าสู่ระบบก่อน");
      const trimmed = input.replyBody?.trim() || null;
      if (trimmed && (trimmed.length < 1 || trimmed.length > 500)) {
        throw new Error("คำตอบกลับยาวได้ไม่เกิน 500 ตัวอักษร");
      }
      const { data, error } = await supabase
        .from("work_reviews" as never)
        .update({ reply_body: trimmed } as never)
        .eq("id", input.reviewId)
        .eq("subject_user_id", user.id)
        .select("*")
        .single();
      if (error) throw error;
      return data as unknown as WorkReview;
    },
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: ["work_reviews"] });
      void qc.invalidateQueries({ queryKey: ["work_reviews", "subject", row.subject_user_id] });
    },
  });
}
