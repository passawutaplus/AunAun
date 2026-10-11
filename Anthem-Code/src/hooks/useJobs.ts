import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { mapWriteFlowError } from "@/lib/writeFlowErrors";
import { toast } from "sonner";
import { notifyAnthem } from "@/lib/notifyAnthem";
import { isOptionalQueryError } from "@/lib/supabaseErrors";
import type { JobRejectReason } from "@/lib/jobApplicationReview";
import type { PosterEntityType } from "@/components/jobs/jobCardUtils";

export type ApplicationStatus =
  | "pending"
  | "shortlisted"
  | "rejected"
  | "accepted"
  | "contacted"
  | "hired";

export interface JobPost {
  id: string;
  studio_id: string | null;
  posted_by: string;
  title: string;
  role_category: string;
  description: string;
  skills: string[];
  budget_min: number | null;
  budget_max: number | null;
  budget_type: "fixed" | "hourly" | "monthly";
  location_type: "remote" | "onsite" | "hybrid";
  location: string;
  deadline: string | null;
  status: "open" | "closed" | "filled";
  applicants_count: number;
  views: number;
  created_at: string;
  updated_at: string;
  post_type: "hiring" | "seeking";
  poster_role: "studio" | "company" | "freelancer";
  poster_entity_type?: PosterEntityType | null;
  posted_as_studio_id?: string | null;
  employment_type: "project" | "fulltime" | "parttime" | "internship" | "freelance";
  attached_cv_url: string | null;
  attached_portfolio_ids: string[];
  cover_image_url: string | null;
  deliverables?: string[];
  reference_urls?: string[];
  headcount?: number | null;
  application_methods?: string[];
  ready_to_start?: string | null;
  show_profile_badge?: boolean;
  hiring_org_id?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  workplace_address?: string | null;
  meeting_location?: string | null;
  social_links?: unknown;
  requirements_must?: string[];
  requirements_nice?: string[];
  perks?: string[];
  exclusions_note?: string | null;
  gallery_urls?: string[];
  is_urgent?: boolean;
  studio?: { name: string; slug: string; avatar_url: string; verified: boolean };
  poster?: { display_name: string; avatar_url: string | null; username: string | null };
  hiring_org?: {
    id: string;
    display_name: string;
    logo_url: string | null;
    status: string;
    province?: string | null;
    category?: string | null;
  };
}

export interface JobApplication {
  id: string;
  job_id: string;
  applicant_id: string;
  cover_letter: string;
  portfolio_project_ids: string[];
  status: ApplicationStatus;
  created_at: string;
  proposed_rate_min?: number | null;
  proposed_rate_max?: number | null;
  ready_date?: string | null;
  viewed_at?: string | null;
  contacted_at?: string | null;
  attached_cv_url?: string | null;
  conversation_id?: string | null;
  reject_reason?: string | null;
  reject_note?: string | null;
  decided_at?: string | null;
  applicant?: { display_name: string; avatar_url: string | null; username: string | null };
  job?: JobPost;
}

export interface OpenForWorkProfile {
  user_id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  role: string | null;
  skills: string[];
  location: string | null;
  open_for_work: boolean;
  open_for_work_badge: string | null;
  availability_status: string | null;
  hourly_rate_min: number | null;
  daily_rate_min: number | null;
  project_rate_note: string | null;
}

const attachStudios = async (jobs: JobPost[]): Promise<JobPost[]> => {
  const ids = Array.from(new Set(jobs.map((j) => j.studio_id).filter(Boolean))) as string[];
  if (ids.length === 0) return jobs;
  const { data } = await supabase
    .from("studios")
    .select("id, name, slug, avatar_url, verified")
    .in("id", ids);
  const map = new Map((data ?? []).map((s: { id: string }) => [s.id, s]));
  return jobs.map((j) => (j.studio_id && map.get(j.studio_id) ? { ...j, studio: map.get(j.studio_id) as JobPost["studio"] } : j));
};

const attachPosters = async (jobs: JobPost[]): Promise<JobPost[]> => {
  const ids = Array.from(new Set(jobs.filter((j) => !j.studio_id).map((j) => j.posted_by)));
  if (ids.length === 0) return jobs;
  const { data } = await supabase
    .from("profiles_public")
    .select("user_id, display_name, avatar_url, username")
    .in("user_id", ids);
  const map = new Map((data ?? []).map((p: { user_id: string }) => [p.user_id, p]));
  return jobs.map((j) => (!j.studio_id && map.get(j.posted_by) ? { ...j, poster: map.get(j.posted_by) as JobPost["poster"] } : j));
};

const attachHiringOrgs = async (jobs: JobPost[]): Promise<JobPost[]> => {
  const ids = Array.from(new Set(jobs.map((j) => j.hiring_org_id).filter(Boolean))) as string[];
  if (ids.length === 0) return jobs;
  const { data } = await supabase
    .from("hiring_organizations")
    .select("id, display_name, logo_url, status, province, category")
    .in("id", ids);
  const map = new Map((data ?? []).map((o: { id: string }) => [o.id, o]));
  return jobs.map((j) =>
    j.hiring_org_id && map.get(j.hiring_org_id)
      ? { ...j, hiring_org: map.get(j.hiring_org_id) as JobPost["hiring_org"] }
      : j,
  );
};

const hydrateJobs = async (jobs: JobPost[]): Promise<JobPost[]> =>
  attachHiringOrgs(await attachPosters(await attachStudios(jobs)));

export const useOpenJobs = (opts?: { limit?: number; postType?: "hiring" | "seeking"; offset?: number }) =>
  useQuery({
    queryKey: ["jobs-open", opts?.limit ?? "all", opts?.postType ?? "any", opts?.offset ?? 0],
    queryFn: async (): Promise<JobPost[]> => {
      let q = supabase.from("job_posts").select("*").eq("status", "open").order("created_at", { ascending: false });
      if (opts?.postType) q = q.eq("post_type", opts.postType);
      if (opts?.postType === "hiring") q = q.not("hiring_org_id", "is", null);
      if (opts?.offset) q = q.range(opts.offset, opts.offset + (opts.limit ?? 50) - 1);
      else if (opts?.limit) q = q.limit(opts.limit);
      const { data, error } = await q;
      if (error) throw error;
      const real = (data ?? []) as JobPost[];
      const hydrated = await hydrateJobs(real);
      if (opts?.postType === "hiring") {
        return hydrated.filter((job) => job.hiring_org?.status === "approved");
      }
      return hydrated;
    },
  });

export const useMyJobPosts = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-job-posts", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<JobPost[]> => {
      const { data: memberships } = await supabase
        .from("hiring_org_members")
        .select("org_id")
        .eq("user_id", user!.id);
      const orgIds = Array.from(new Set((memberships ?? []).map((row: { org_id: string }) => row.org_id)));
      let q = supabase.from("job_posts").select("*").order("created_at", { ascending: false });
      q = orgIds.length > 0
        ? q.or(`posted_by.eq.${user!.id},hiring_org_id.in.(${orgIds.join(",")})`)
        : q.eq("posted_by", user!.id);
      const { data, error } = await q;
      if (error) throw error;
      return hydrateJobs((data ?? []) as JobPost[]);
    },
  });
};

export const useOpenForWorkCreators = (opts?: { limit?: number }) =>
  useQuery({
    queryKey: ["open-for-work-creators", opts?.limit ?? 60],
    queryFn: async (): Promise<OpenForWorkProfile[]> => {
      const { data, error } = await supabase
        .from("profiles_public")
        .select(
          "user_id, display_name, username, avatar_url, role, skills, location, open_for_work, open_for_work_badge, availability_status, hourly_rate_min, daily_rate_min, project_rate_note",
        )
        .eq("open_for_work", true)
        .order("updated_at", { ascending: false })
        .limit(opts?.limit ?? 60);
      if (error) throw error;
      return (data ?? []) as OpenForWorkProfile[];
    },
  });

export const useStudioJobs = (studioId?: string) =>
  useQuery({
    queryKey: ["jobs-studio", studioId],
    enabled: !!studioId,
    queryFn: async (): Promise<JobPost[]> => {
      const { data, error } = await supabase
        .from("job_posts")
        .select("*")
        .eq("studio_id", studioId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return hydrateJobs((data ?? []) as JobPost[]);
    },
  });

export const useJobById = (id?: string) =>
  useQuery({
    queryKey: ["job", id],
    enabled: !!id,
    queryFn: async (): Promise<JobPost | null> => {
      const { data, error } = await supabase.from("job_posts").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const [out] = await hydrateJobs([data as JobPost]);
      return out;
    },
  });

export const useCreateJob = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<JobPost> & { title: string }) => {
      if (!user) throw new Error("not authed");
      const { data, error } = await supabase
        .from("job_posts")
        .insert({ ...input, posted_by: user.id } as never)
        .select()
        .single();
      if (error) throw error;
      return data as JobPost;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs-open"] });
      qc.invalidateQueries({ queryKey: ["jobs-studio"] });
      qc.invalidateQueries({ queryKey: ["my-job-posts"] });
      toast.success("ลงประกาศเรียบร้อย");
    },
    onError: (e: Error) => toast.error(mapWriteFlowError(e, "ลงประกาศไม่สำเร็จ")),
  });
};

export const useUpdateJobStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status: JobPost["status"] }) => {
      const { error } = await supabase.from("job_posts").update({ status: input.status }).eq("id", input.id);
      if (error) throw error;
      if (input.status === "closed" || input.status === "filled") {
        const { error: rejectErr } = await supabase.rpc("reject_pending_job_applications_for_job", {
          p_job_id: input.id,
          p_reason: input.status === "filled" ? "filled" : "cancelled",
        });
        if (rejectErr && !isOptionalQueryError(rejectErr)) throw rejectErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs-open"] });
      qc.invalidateQueries({ queryKey: ["jobs-studio"] });
      qc.invalidateQueries({ queryKey: ["job"] });
      qc.invalidateQueries({ queryKey: ["my-job-posts"] });
      qc.invalidateQueries({ queryKey: ["job-applications"] });
      qc.invalidateQueries({ queryKey: ["my-applications"] });
    },
  });
};

export interface ApplyInput {
  job_id: string;
  cover_letter: string;
  portfolio_project_ids: string[];
  proposed_rate_min?: number | null;
  proposed_rate_max?: number | null;
  ready_date?: string | null;
  attached_cv_url?: string | null;
}

export const useApplyToJob = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ApplyInput) => {
      if (!user) throw new Error("not authed");
      const { data, error } = await supabase.from("job_applications").insert({
        job_id: input.job_id,
        applicant_id: user.id,
        cover_letter: input.cover_letter,
        portfolio_project_ids: input.portfolio_project_ids,
        proposed_rate_min: input.proposed_rate_min ?? null,
        proposed_rate_max: input.proposed_rate_max ?? null,
        ready_date: input.ready_date ?? null,
        attached_cv_url: input.attached_cv_url ?? null,
      } as never).select("id").single();
      if (error) throw error;
      return { id: (data as { id: string }).id };
    },
    onSuccess: (data) => {
      notifyAnthem({ event: "job_application", application_id: data.id });
      qc.invalidateQueries({ queryKey: ["my-applications"] });
      qc.invalidateQueries({ queryKey: ["my-application-for-job"] });
      qc.invalidateQueries({ queryKey: ["job-applications"] });
      qc.invalidateQueries({ queryKey: ["job"] });
      toast.success("ส่งโปรไฟล์ให้บริษัทแล้ว");
    },
    onError: (e: Error) => {
      if (e.message?.includes("duplicate")) toast.error("คุณสมัครงานนี้ไปแล้ว");
      else toast.error(e.message ?? "ส่งใบสมัครไม่สำเร็จ");
    },
  });
};

// Global FOR UPDATE scan server-side; pg_cron is not installed in prod, so clients trigger it — at most every 10 min per tab.
const EXPIRE_APPLICATIONS_EVERY_MS = 10 * 60_000;
let lastExpireApplicationsAt = 0;

async function expirePendingJobApplicationsQuietly() {
  const now = Date.now();
  if (now - lastExpireApplicationsAt < EXPIRE_APPLICATIONS_EVERY_MS) return;
  lastExpireApplicationsAt = now;
  const { error } = await supabase.rpc("expire_pending_job_applications");
  if (error && !isOptionalQueryError(error)) {
    console.warn("expire_pending_job_applications", error.message);
  }
}

export const useMyApplicationForJob = (jobId?: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-application-for-job", user?.id, jobId],
    enabled: !!user && !!jobId,
    queryFn: async (): Promise<JobApplication | null> => {
      await expirePendingJobApplicationsQuietly();
      const { data, error } = await supabase
        .from("job_applications")
        .select("*")
        .eq("job_id", jobId!)
        .eq("applicant_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as JobApplication | null) ?? null;
    },
  });
};

export const useRelatedHiringJobs = (job?: JobPost | null) =>
  useQuery({
    queryKey: ["related-hiring-jobs", job?.id, job?.hiring_org_id, job?.posted_by],
    enabled: !!job?.id,
    queryFn: async (): Promise<JobPost[]> => {
      let q = supabase
        .from("job_posts")
        .select("*")
        .eq("status", "open")
        .eq("post_type", "hiring")
        .neq("id", job!.id)
        .order("created_at", { ascending: false })
        .limit(6);
      if (job?.hiring_org_id) q = q.eq("hiring_org_id", job.hiring_org_id);
      else q = q.eq("posted_by", job!.posted_by);
      const { data, error } = await q;
      if (error) throw error;
      return hydrateJobs((data ?? []) as JobPost[]);
    },
  });

export const useMyApplications = (options?: { enabled?: boolean }) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-applications", user?.id],
    enabled: !!user && options?.enabled !== false,
    queryFn: async (): Promise<JobApplication[]> => {
      await expirePendingJobApplicationsQuietly();
      const { data, error } = await supabase
        .from("job_applications")
        .select("*, job:job_posts(*)")
        .eq("applicant_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as JobApplication[];
      const jobs = rows.map((r) => r.job).filter((j): j is JobPost => !!j);
      const hydrated = await hydrateJobs(jobs);
      const byId = new Map(hydrated.map((j) => [j.id, j]));
      return rows.map((r) => (r.job ? { ...r, job: byId.get(r.job.id) ?? r.job } : r));
    },
  });
};

export const useJobApplications = (jobId?: string) =>
  useQuery({
    queryKey: ["job-applications", jobId],
    enabled: !!jobId,
    queryFn: async (): Promise<JobApplication[]> => {
      await expirePendingJobApplicationsQuietly();
      const { data, error } = await supabase
        .from("job_applications")
        .select("*")
        .eq("job_id", jobId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as JobApplication[];
      const ids = Array.from(new Set(rows.map((r) => r.applicant_id)));
      if (ids.length === 0) return rows;
      const { data: profiles } = await supabase
        .from("profiles_public")
        .select("user_id, display_name, avatar_url, username")
        .in("user_id", ids);
      const map = new Map((profiles ?? []).map((p: { user_id: string }) => [p.user_id, p]));
      return rows.map((r) => ({ ...r, applicant: map.get(r.applicant_id) as JobApplication["applicant"] }));
    },
  });

export const useUpdateApplicationStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status: ApplicationStatus; markContacted?: boolean }) => {
      const patch: Record<string, unknown> = { status: input.status };
      if (input.markContacted) patch.contacted_at = new Date().toISOString();
      const { error } = await supabase.from("job_applications").update(patch as never).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job-applications"] });
      qc.invalidateQueries({ queryKey: ["my-applications"] });
      toast.success("อัปเดตสถานะแล้ว");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useMyPostedApplications = (jobIds: string[]) =>
  useQuery({
    queryKey: ["job-applications-posted", [...jobIds].sort().join(",")],
    enabled: jobIds.length > 0,
    queryFn: async (): Promise<JobApplication[]> => {
      await expirePendingJobApplicationsQuietly();
      const { data, error } = await supabase
        .from("job_applications")
        .select("*")
        .in("job_id", jobIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as JobApplication[];
      const ids = Array.from(new Set(rows.map((r) => r.applicant_id)));
      if (ids.length === 0) return rows;
      const { data: profiles } = await supabase
        .from("profiles_public")
        .select("user_id, display_name, avatar_url, username")
        .in("user_id", ids);
      const map = new Map((profiles ?? []).map((p: { user_id: string }) => [p.user_id, p]));
      return rows.map((r) => ({ ...r, applicant: map.get(r.applicant_id) as JobApplication["applicant"] }));
    },
  });

export const useToggleApplicationInterest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; interested: boolean }) => {
      const { error } = await supabase
        .from("job_applications")
        .update({ status: input.interested ? "shortlisted" : "pending" } as never)
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({ queryKey: ["job-applications"] });
      qc.invalidateQueries({ queryKey: ["job-applications-posted"] });
      qc.invalidateQueries({ queryKey: ["my-applications"] });
      toast.success(input.interested ? "ปักหมุดสนใจแล้ว" : "เอาหมุดออกแล้ว");
    },
    onError: (e: Error) => toast.error(e.message || "ปักหมุดไม่สำเร็จ"),
  });
};

export const useMarkJobApplicationsViewed = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase
        .from("job_applications")
        .update({ viewed_at: new Date().toISOString() } as never)
        .eq("job_id", jobId)
        .is("viewed_at", null);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job-applications"] });
      qc.invalidateQueries({ queryKey: ["job-applications-posted"] });
    },
  });
};

export const useDecideJobApplication = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      decision: "accept" | "reject";
      reason?: Exclude<JobRejectReason, "expired">;
      note?: string;
    }) => {
      const { data, error } = await supabase.rpc("decide_job_application", {
        p_application_id: input.id,
        p_decision: input.decision,
        p_reason: input.reason ?? null,
        p_note: input.note ?? null,
      });
      if (error) throw error;
      return (data as string | null) ?? null;
    },
    onSuccess: (_convId, input) => {
      qc.invalidateQueries({ queryKey: ["job-applications"] });
      qc.invalidateQueries({ queryKey: ["job-applications-posted"] });
      qc.invalidateQueries({ queryKey: ["my-applications"] });
      qc.invalidateQueries({ queryKey: ["my-application-for-job"] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
      toast.success(input.decision === "accept" ? "ตอบรับแล้ว — ทักแชทไปหาผู้สมัครได้" : "ส่งการปฏิเสธแล้ว");
    },
    onError: (e: Error) => toast.error(e.message || "อัปเดตใบสมัครไม่สำเร็จ"),
  });
};

export const useMarkApplicationViewed = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (applicationId: string) => {
      const { error } = await supabase
        .from("job_applications")
        .update({ viewed_at: new Date().toISOString() } as never)
        .eq("id", applicationId)
        .is("viewed_at", null);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["job-applications"] }),
  });
};

export const useSavedJobIds = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["saved-jobs", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await supabase.from("job_saved").select("job_id").eq("user_id", user!.id);
      if (error) throw error;
      return new Set((data ?? []).map((r: { job_id: string }) => r.job_id));
    },
  });
};

export const useToggleSaveJob = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ jobId, saved }: { jobId: string; saved: boolean }) => {
      if (!user) throw new Error("not authed");
      if (saved) {
        const { error } = await supabase.from("job_saved").delete().eq("user_id", user.id).eq("job_id", jobId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("job_saved").insert({ user_id: user.id, job_id: jobId } as never);
        if (error) throw error;
      }
    },
    onSuccess: (_, { saved }) => {
      qc.invalidateQueries({ queryKey: ["saved-jobs"] });
      qc.invalidateQueries({ queryKey: ["my-saved-jobs"] });
      toast.success(saved ? "ลบออกจากที่บันทึกแล้ว" : "บันทึกประกาศแล้ว");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useMySavedJobs = (options?: { enabled?: boolean }) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-saved-jobs", user?.id],
    enabled: !!user && options?.enabled !== false,
    queryFn: async (): Promise<JobPost[]> => {
      const { data: saved, error } = await supabase
        .from("job_saved")
        .select("job_id")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const ids = (saved ?? []).map((r: { job_id: string }) => r.job_id);
      if (ids.length === 0) return [];
      const { data: jobs, error: jErr } = await supabase.from("job_posts").select("*").in("id", ids);
      if (jErr) throw jErr;
      return hydrateJobs((jobs ?? []) as JobPost[]);
    },
  });
};

export const useMyOpenJobPosts = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-open-job-posts", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<JobPost[]> => {
      const { data, error } = await supabase
        .from("job_posts")
        .select("*")
        .eq("posted_by", user!.id)
        .eq("status", "open")
        .eq("post_type", "hiring")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return hydrateJobs((data ?? []) as JobPost[]);
    },
  });
};

export const useUpdateOpenForWork = (userId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<OpenForWorkProfile>) => {
      if (!userId) throw new Error("not authed");
      const { error } = await supabase.from("profiles").update(patch as never).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile", userId] });
      qc.invalidateQueries({ queryKey: ["open-for-work-creators"] });
      toast.success("บันทึกการตั้งค่ารับงานแล้ว");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const canManageJob = (
  job: JobPost | undefined,
  userId: string | undefined,
  studioRoles: Map<string, string>,
  hiringOrgIds?: Set<string>,
) => {
  if (!job || !userId) return false;
  if (job.posted_by === userId) return true;
  if (job.hiring_org_id && hiringOrgIds?.has(job.hiring_org_id)) return true;
  if (job.studio_id) {
    const role = studioRoles.get(job.studio_id);
    return role === "owner" || role === "admin" || role === "hiring_manager";
  }
  return false;
};
