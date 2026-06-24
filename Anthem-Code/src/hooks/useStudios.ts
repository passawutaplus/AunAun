import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface Studio {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  bio: string;
  avatar_url: string;
  cover_url: string;
  location: string;
  website: string;
  verified: boolean;
  created_by: string;
  member_count: number;
  created_at: string;
}

export interface StudioMember {
  studio_id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  credit_title: string;
  joined_at: string;
  profile?: { display_name: string; avatar_url: string | null; username: string | null };
}

/** Studios the current user is a member of. */
export const useMyStudios = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-studios", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Studio[]> => {
      const { data: memberships, error } = await supabase
        .from("studio_members")
        .select("studio_id, role")
        .eq("user_id", user!.id);
      if (error) throw error;
      const ids = (memberships ?? []).map((m: any) => m.studio_id);
      if (ids.length === 0) return [];
      const { data: studios, error: e2 } = await supabase
        .from("studios")
        .select("*")
        .in("id", ids)
        .order("created_at", { ascending: false });
      if (e2) throw e2;
      return (studios ?? []) as Studio[];
    },
  });
};

export const useStudioBySlug = (slug?: string) =>
  useQuery({
    queryKey: ["studio", slug],
    enabled: !!slug,
    queryFn: async (): Promise<Studio | null> => {
      const { data, error } = await supabase.from("studios").select("*").eq("slug", slug!).maybeSingle();
      if (error) throw error;
      return (data ?? null) as Studio | null;
    },
  });

export const useStudioById = (id?: string) =>
  useQuery({
    queryKey: ["studio-id", id],
    enabled: !!id,
    queryFn: async (): Promise<Studio | null> => {
      const { data, error } = await supabase.from("studios").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return (data ?? null) as Studio | null;
    },
  });

export const useStudioMembers = (studioId?: string) =>
  useQuery({
    queryKey: ["studio-members", studioId],
    enabled: !!studioId,
    queryFn: async (): Promise<StudioMember[]> => {
      const { data, error } = await supabase
        .from("studio_members")
        .select("*")
        .eq("studio_id", studioId!);
      if (error) throw error;
      const ids = (data ?? []).map((m: any) => m.user_id);
      if (ids.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, username")
        .in("user_id", ids);
      const map = new Map((profiles ?? []).map((p: { user_id: string }) => [p.user_id, p]));
      return (data ?? []).map((m: any) => ({ ...m, profile: map.get(m.user_id) })) as StudioMember[];
    },
  });

export const useSetActiveStudio = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (studioId: string | null) => {
      if (!user) throw new Error("not authed");
      const { error } = await supabase
        .from("profiles")
        .update({ active_studio_id: studioId })
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["active-studio"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
};

/** Transfer studio ownership to another member. Current owner becomes admin. */
export const useTransferStudioOwnership = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { studioId: string; newOwnerId: string }) => {
      if (!user) throw new Error("not authed");
      if (input.newOwnerId === user.id) throw new Error("คุณเป็นเจ้าของอยู่แล้ว");
      const { error: e1 } = await supabase
        .from("studio_members")
        .update({ role: "admin" })
        .eq("studio_id", input.studioId)
        .eq("user_id", user.id);
      if (e1) throw e1;
      const { error: e2 } = await supabase
        .from("studio_members")
        .update({ role: "owner" })
        .eq("studio_id", input.studioId)
        .eq("user_id", input.newOwnerId);
      if (e2) throw e2;
      const { error: e3 } = await supabase
        .from("studios")
        .update({ created_by: input.newOwnerId })
        .eq("id", input.studioId);
      if (e3) throw e3;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["studio-members"] });
      qc.invalidateQueries({ queryKey: ["my-studios"] });
      qc.invalidateQueries({ queryKey: ["studio"] });
      qc.invalidateQueries({ queryKey: ["studio-id"] });
      toast.success("โอนสิทธิ์ผู้ก่อตั้งเรียบร้อย");
    },
    onError: (e: any) => toast.error(e.message ?? "โอนสิทธิ์ไม่สำเร็จ"),
  });
};

export const useActiveStudio = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["active-studio", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Studio | null> => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("active_studio_id")
        .eq("user_id", user!.id)
        .maybeSingle();
      const sid = (profile as any)?.active_studio_id;
      if (!sid) return null;
      const { data } = await supabase.from("studios").select("*").eq("id", sid).maybeSingle();
      return (data ?? null) as Studio | null;
    },
  });
};

/** Resolve studio context for a studio team chat conversation. */
export const useStudioForConversation = (
  conversationId?: string,
  conversationTitle?: string | null,
) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["studio-for-conversation", conversationId, user?.id],
    enabled: !!conversationId && !!user,
    queryFn: async (): Promise<Studio | null> => {
      const { data: conv, error: convError } = await supabase
        .from("conversations")
        .select("studio_id, title, project_title, kind")
        .eq("id", conversationId!)
        .maybeSingle();
      if (convError) throw convError;

      const studioId = (conv as { studio_id?: string | null } | null)?.studio_id;
      if (studioId) {
        const { data: studio } = await supabase.from("studios").select("*").eq("id", studioId).maybeSingle();
        if (studio) return studio as Studio;
      }

      const { data: memberships } = await supabase
        .from("studio_members")
        .select("studio_id")
        .eq("user_id", user!.id);
      const studioIds = (memberships ?? []).map((m: { studio_id: string }) => m.studio_id);
      if (studioIds.length === 0) return null;

      const { data: studios } = await supabase.from("studios").select("*").in("id", studioIds);
      const list = (studios ?? []) as Studio[];
      if (list.length === 0) return null;

      const title = conv?.title || conv?.project_title || conversationTitle || "";
      const byTitle = title ? list.find((s) => s.name === title) : undefined;
      if (byTitle) return byTitle;

      const { data: profile } = await supabase
        .from("profiles")
        .select("active_studio_id")
        .eq("user_id", user!.id)
        .maybeSingle();
      const activeId = (profile as { active_studio_id?: string | null } | null)?.active_studio_id;
      if (activeId) {
        const active = list.find((s) => s.id === activeId);
        if (active) return active;
      }

      return list[0] ?? null;
    },
  });
};

