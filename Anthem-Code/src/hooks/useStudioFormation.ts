import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { assertStudioIdentityAvailable } from "@/hooks/useStudioIdentityAvailability";
import { toast } from "sonner";

export interface FormationRequest {
  id: string;
  founder_id: string;
  proposed_name: string;
  proposed_slug: string;
  proposed_tagline: string;
  status: "pending" | "completed" | "cancelled";
  created_at: string;
  completed_at: string | null;
  created_studio_id: string | null;
}

export interface FormationInvite {
  formation_id: string;
  invitee_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  responded_at: string | null;
}

/** Invites that target the current user (pending). */
export const useMyPendingFormationInvites = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["formation-invites-mine", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: invites, error } = await supabase
        .from("studio_formation_invites")
        .select("*")
        .eq("invitee_id", user!.id)
        .eq("status", "pending");
      if (error) throw error;
      const fids = (invites ?? []).map((i: any) => i.formation_id);
      if (fids.length === 0) return [];
      const { data: requests } = await supabase
        .from("studio_formation_requests")
        .select("*")
        .in("id", fids)
        .eq("status", "pending");
      const { data: allInvites } = await supabase
        .from("studio_formation_invites")
        .select("*")
        .in("formation_id", fids);

      const founderIds = Array.from(new Set((requests ?? []).map((r: any) => r.founder_id)));
      const inviteeIds = Array.from(new Set((allInvites ?? []).map((i: any) => i.invitee_id)));
      const allIds = Array.from(new Set([...founderIds, ...inviteeIds]));
      const { data: profiles } = await supabase
        .from("profiles_public")
        .select("id, display_name, avatar_url, username")
        .in("id", allIds);
      const pMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

      return (requests ?? []).map((r: any) => ({
        request: r as FormationRequest,
        founder: pMap.get(r.founder_id),
        invites: ((allInvites ?? []).filter((i: any) => i.formation_id === r.id) as FormationInvite[]).map(
          (i) => ({ ...i, profile: pMap.get(i.invitee_id) })
        ),
      }));
    },
  });
};

export const useMyFoundedFormations = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["formation-mine-founded", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("studio_formation_requests")
        .select("*")
        .eq("founder_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as FormationRequest[];
    },
  });
};

export const useCreateFormation = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      slug: string;
      tagline: string;
      inviteeIds: string[];
      logoUrl?: string;
      coverUrl?: string;
      bio?: string;
      expertise?: string[];
      contactEmail?: string;
      contactPhone?: string;
      socialLinks?: Record<string, string>;
      website?: string;
      availableForWork?: boolean;
    }) => {
      if (!user) throw new Error("not authed");
      await assertStudioIdentityAvailable(input.name, input.slug);
      const adv = {
        proposed_logo_url: input.logoUrl ?? "",
        proposed_cover_url: input.coverUrl ?? "",
        proposed_bio: input.bio ?? "",
        proposed_expertise: input.expertise ?? [],
        proposed_contact_email: input.contactEmail ?? "",
        proposed_contact_phone: input.contactPhone ?? "",
        proposed_social_links: input.socialLinks ?? {},
        proposed_website: input.website ?? "",
        proposed_available_for_work: input.availableForWork ?? true,
      };
      const { data: req, error } = await supabase
        .from("studio_formation_requests")
        .insert({
          founder_id: user.id,
          proposed_name: input.name,
          proposed_slug: input.slug,
          proposed_tagline: input.tagline,
          ...adv,
        })
        .select()
        .single();
      if (error) throw error;
      if (input.inviteeIds.length > 0) {
        const rows = input.inviteeIds.map((id) => ({ formation_id: (req as any).id, invitee_id: id }));
        const { error: e2 } = await supabase.from("studio_formation_invites").insert(rows);
        if (e2) throw e2;
      } else {
        const { data: studio, error: e3 } = await supabase
          .from("studios")
          .insert({
            slug: input.slug,
            name: input.name,
            tagline: input.tagline,
            created_by: user.id,
            avatar_url: input.logoUrl ?? "",
            logo_url: input.logoUrl ?? "",
            cover_url: input.coverUrl ?? "",
            bio: input.bio ?? "",
            website: input.website ?? "",
            expertise: input.expertise ?? [],
            contact_email: input.contactEmail ?? "",
            contact_phone: input.contactPhone ?? "",
            social_links: input.socialLinks ?? {},
            available_for_work: input.availableForWork ?? true,
          })
          .select()
          .single();
        if (e3) throw e3;
        await supabase
          .from("studio_members")
          .insert({ studio_id: (studio as any).id, user_id: user.id, role: "owner" });
        await supabase
          .from("studio_formation_requests")
          .update({ status: "completed", completed_at: new Date().toISOString(), created_studio_id: (studio as any).id })
          .eq("id", (req as any).id);
      }
      return req;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["formation-mine-founded"] });
      qc.invalidateQueries({ queryKey: ["my-studios"] });
      toast.success("ส่งคำเชิญร่วม Studio เรียบร้อย");
    },
    onError: (e: any) => {
      const msg = `${e?.message ?? ""}`;
      if (msg.includes("23505") || /duplicate/i.test(msg)) {
        toast.error(/slug/i.test(msg) ? "Slug นี้ถูกใช้แล้ว — ลอง slug อื่น" : "ชื่อหรือ Slug นี้ถูกใช้แล้ว");
        return;
      }
      toast.error(msg || "สร้าง Studio ไม่สำเร็จ");
    },
  });
};

export const useRespondFormationInvite = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { formationId: string; accept: boolean }) => {
      if (!user) throw new Error("not authed");
      const { error } = await supabase
        .from("studio_formation_invites")
        .update({ status: input.accept ? "accepted" : "declined", responded_at: new Date().toISOString() })
        .eq("formation_id", input.formationId)
        .eq("invitee_id", user.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["formation-invites-mine"] });
      qc.invalidateQueries({ queryKey: ["my-studios"] });
      toast.success(vars.accept ? "ตอบรับคำเชิญแล้ว" : "ปฏิเสธคำเชิญแล้ว");
    },
    onError: (e: any) => toast.error(e.message),
  });
};
