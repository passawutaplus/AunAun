import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { notifyAnthem } from "@/lib/notifyAnthem";

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
  employment_type: "project" | "fulltime" | "parttime" | "internship";
  attached_cv_url: string | null;
  attached_portfolio_ids: string[];
  cover_image_url: string | null;
  studio?: { name: string; slug: string; avatar_url: string; verified: boolean };
  poster?: { display_name: string; avatar_url: string | null; username: string | null };
}

export interface JobApplication {
  id: string;
  job_id: string;
  applicant_id: string;
  cover_letter: string;
  portfolio_project_ids: string[];
  status: "pending" | "shortlisted" | "rejected" | "accepted";
  created_at: string;
  applicant?: { display_name: string; avatar_url: string | null; username: string | null };
}

const attachStudios = async (jobs: JobPost[]): Promise<JobPost[]> => {
  const ids = Array.from(new Set(jobs.map((j) => j.studio_id)));
  if (ids.length === 0) return jobs;
  const { data } = await supabase
    .from("studios")
    .select("id, name, slug, avatar_url, verified")
    .in("id", ids);
  const map = new Map((data ?? []).map((s: any) => [s.id, s]));
  return jobs.map((j) => ({ ...j, studio: map.get(j.studio_id) }));
};

const attachPosters = async (jobs: JobPost[]): Promise<JobPost[]> => {
  const ids = Array.from(new Set(jobs.filter((j) => !j.studio_id).map((j) => j.posted_by)));
  if (ids.length === 0) return jobs;
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, username")
    .in("id", ids);
  const map = new Map((data ?? []).map((p: any) => [p.id, p]));
  return jobs.map((j) => (!j.studio_id && map.get(j.posted_by) ? { ...j, poster: map.get(j.posted_by) } : j));
};

export const useOpenJobs = (opts?: { limit?: number; postType?: "hiring" | "seeking" }) =>
  useQuery({
    queryKey: ["jobs-open", opts?.limit ?? "all", opts?.postType ?? "any"],
    queryFn: async (): Promise<JobPost[]> => {
      let q = supabase.from("job_posts").select("*").eq("status", "open").order("created_at", { ascending: false });
      if (opts?.postType) q = q.eq("post_type", opts.postType);
      if (opts?.limit) q = q.limit(opts.limit);
      const { data, error } = await q;
      if (error) throw error;
      const real = (data ?? []) as JobPost[];
      return attachPosters(await attachStudios(real));
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
    mutationFn: async (input: Partial<JobPost> & { studio_id: string; title: string }) => {
      if (!user) throw new Error("not authed");
      const { data, error } = await supabase
        .from("job_posts")
        .insert({ ...input, posted_by: user.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data as JobPost;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs-open"] });
      qc.invalidateQueries({ queryKey: ["jobs-studio"] });
      toast.success("ลงประกาศงานเรียบร้อย");
    },
    onError: (e: any) => toast.error(e.message),
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
    },
  });
};

export const useApplyToJob = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { job_id: string; cover_letter: string; portfolio_project_ids: string[] }) => {
      if (!user) throw new Error("not authed");
      const { data, error } = await supabase.from("job_applications").insert({
        job_id: input.job_id,
        applicant_id: user.id,
        cover_letter: input.cover_letter,
        portfolio_project_ids: input.portfolio_project_ids,
      }).select("id").single();
      if (error) throw error;
      return data as { id: string };
    },
    onSuccess: (data) => {
      notifyAnthem({ event: "job_application", application_id: data.id });
      qc.invalidateQueries({ queryKey: ["my-applications"] });
      qc.invalidateQueries({ queryKey: ["job-applications"] });
      toast.success("ส่งใบสมัครเรียบร้อย");
    },
    onError: (e: any) => {
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
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_applications")
        .select("*")
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
        .from("profiles")
        .select("id, display_name, avatar_url, username")
        .in("id", ids);
      const map = new Map((profiles ?? []).map((p: any) => [p.id, p]));
      return rows.map((r) => ({ ...r, applicant: map.get(r.applicant_id) }));
    },
  });
