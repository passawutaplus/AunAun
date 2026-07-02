import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json, TablesUpdate } from "@/integrations/supabase/types";
import type { ProfileInput } from "@/lib/validators";

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
      const payload: TablesUpdate<"profiles"> = {};
      if (p.displayName !== undefined) payload.display_name = p.displayName;
      if (p.username !== undefined) payload.username = p.username;
      if (p.bio !== undefined) payload.bio = p.bio;
      if (p.role !== undefined) payload.role = p.role;
      if (p.location !== undefined) payload.location = p.location;
      if (p.email !== undefined) payload.email = p.email;
      if (p.phone !== undefined) payload.phone = p.phone;
      if (p.website !== undefined) payload.website = p.website || null;
      if (p.lineId !== undefined) payload.line_id = p.lineId;
      if (p.facebook !== undefined) payload.facebook = p.facebook;
      if (p.instagram !== undefined) payload.instagram = p.instagram;
      if (p.notifyEmail !== undefined) payload.notify_email = p.notifyEmail;
      if (p.notifyHire !== undefined) payload.notify_hire = p.notifyHire;
      if (p.notifyJobMatch !== undefined) payload.notify_job_match = p.notifyJobMatch;
      if (p.preferredCategories !== undefined) payload.preferred_categories = p.preferredCategories;
      if (p.preferredEmploymentTypes !== undefined) {
        payload.preferred_employment_types = p.preferredEmploymentTypes;
      }
      if (p.skills !== undefined) payload.skills = p.skills;
      if (p.experience !== undefined) payload.experience = p.experience as unknown as Json;
      if (Object.keys(payload).length === 0) return;
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
