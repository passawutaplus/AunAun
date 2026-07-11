import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { mapWriteFlowError } from "@/lib/writeFlowErrors";
import { toast } from "sonner";
import { notifyAnthem } from "@/lib/notifyAnthem";
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
  studio?: { name: string; slug: string; avatar_url: string; verified: boolean };
  poster?: { display_name: string; avatar_url: string | null; username: string | null };
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

export const useOpenJobs = (opts?: { limit?: number; postType?: "hiring" | "seeking"; offset?: number }) =>
  useQuery({
    queryKey: ["jobs-open", opts?.limit ?? "all", opts?.postType ?? "any", opts?.offset ?? 0],
    queryFn: async (): Promise<JobPost[]> => {
      let q = supabase.from("job_posts").select("*").eq("status", "open").order("created_at", { ascending: false });
      if (opts?.postType) q = q.eq("post_type", opts.postType);
      if (opts?.offset) q = q.range(opts.offset, opts.offset + (opts.limit ?? 50) - 1);
      else if (opts?.limit) q = q.limit(opts.limit);
      const { data, error } = await q;
      if (error) throw error;
      const real = (data ?? []) as JobPost[];
      return attachPosters(await attachStudios(real));
    },
  });

export const useMyJobPosts = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-job-posts", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<JobPost[]> => {
      const { data, error } = await supabase
        .from("job_posts")
        .select("*")
        .eq("posted_by", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return attachPosters(await attachStudios((data ?? []) as JobPost[]));
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
      return attachStudios((data ?? []) as JobPost[]);
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
      const [withStudio] = await attachStudios([data as JobPost]);
      const [out] = await attachPosters([withStudio]);
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
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs-open"] });
      qc.invalidateQueries({ queryKey: ["jobs-studio"] });
      qc.invalidateQueries({ queryKey: ["job"] });
      qc.invalidateQueries({ queryKey: ["my-job-posts"] });
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
      return data as { id: string };
    },
    onSuccess: (data) => {
      notifyAnthem({ event: "job_application", application_id: data.id });
      qc.invalidateQueries({ queryKey: ["my-applications"] });
      qc.invalidateQueries({ queryKey: ["job-applications"] });
      qc.invalidateQueries({ queryKey: ["job"] });
      toast.success("ส่งใบสมัครเรียบร้อย");
    },
    onError: (e: Error) => {
      if (e.message?.includes("duplicate")) toast.error("คุณสมัครงานนี้ไปแล้ว");
      else toast.error(e.message ?? "ส่งใบสมัครไม่สำเร็จ");
    },
  });
};

export const useMyApplications = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-applications", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<JobApplication[]> => {
      const { data, error } = await supabase
        .from("job_applications")
        .select("*, job:job_posts(*)")
        .eq("applicant_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as JobApplication[];
    },
  });
};

export const useJobApplications = (jobId?: string) =>
  useQuery({
    queryKey: ["job-applications", jobId],
    enabled: !!jobId,
    queryFn: async (): Promise<JobApplication[]> => {
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
      toast.success(saved ? "ลบออกจากที่บันทึกแล้ว" : "บันทึกประกาศแล้ว");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useMySavedJobs = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-saved-jobs", user?.id],
    enabled: !!user,
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
      return attachPosters(await attachStudios((jobs ?? []) as JobPost[]));
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
      return attachPosters(await attachStudios((data ?? []) as JobPost[]));
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
) => {
  if (!job || !userId) return false;
  if (job.posted_by === userId) return true;
  if (job.studio_id) {
    const role = studioRoles.get(job.studio_id);
    return role === "owner" || role === "admin" || role === "hiring_manager";
  }
  return false;
};
