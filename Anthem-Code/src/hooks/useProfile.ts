import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json, TablesUpdate } from "@/integrations/supabase/types";
import type { ExperienceItem, ProfileFaqItem, ProfileInput } from "@/lib/validators";

export const useProfile = (userId: string | undefined) =>
  useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("user_id", userId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const useUpdateProfile = (userId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: Partial<ProfileInput>) => {
      if (!userId) throw new Error("ยังไม่ได้เข้าสู่ระบบ");
      const payload: TablesUpdate<"profiles"> = {
        display_name: p.displayName,
        username: p.username,
        bio: p.bio,
        role: p.role,
        location: p.location,
        email: p.email,
        phone: p.phone,
        website: p.website || null,
        line_id: p.lineId,
        facebook: p.facebook,
        instagram: p.instagram,
        notify_email: p.notifyEmail,
        notify_hire: p.notifyHire,
        notify_job_match: p.notifyJobMatch,
        preferred_categories: p.preferredCategories,
        preferred_employment_types: p.preferredEmploymentTypes,
      } as any;
      if (p.skills !== undefined) payload.skills = p.skills;
      if (p.experience !== undefined) payload.experience = p.experience as unknown as Json;
      if (p.profileFaq !== undefined) payload.profile_faq = p.profileFaq as unknown as Json;
      const { error } = await supabase.from("profiles").update(payload).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile", userId] }),
  });
};

export const useUpdateProfileMedia = (userId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (media: { avatar_url?: string; cover_url?: string }) => {
      if (!userId) throw new Error("ยังไม่ได้เข้าสู่ระบบ");
      const { error } = await supabase.from("profiles").update(media).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile", userId] });
      qc.invalidateQueries({ queryKey: ["onboarding-checklist", userId] });
    },
  });
};
