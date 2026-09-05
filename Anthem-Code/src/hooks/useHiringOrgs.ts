import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { mapWriteFlowError } from "@/lib/writeFlowErrors";
import { toast } from "sonner";
import type {
  HiringOrgStatus,
  HiringOrgType,
  JobSocialLink,
} from "@/lib/hiringOrg";
export { postingGate } from "@/lib/hiringOrg";

export type HiringOrganization = {
  id: string;
  created_by: string;
  legal_name: string;
  display_name: string;
  org_type: HiringOrgType;
  tax_id: string;
  province: string;
  district: string;
  address: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  website: string | null;
  social_links: JobSocialLink[];
  logo_url: string | null;
  description: string | null;
  category: string | null;
  document_url: string | null;
  status: HiringOrgStatus;
  review_note: string | null;
  created_at: string;
};

export type CreateHiringOrgInput = {
  legal_name: string;
  display_name: string;
  org_type: HiringOrgType;
  tax_id: string;
  province: string;
  district: string;
  address: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  website?: string | null;
  social_links: JobSocialLink[];
  logo_url?: string | null;
  description?: string | null;
  category?: string | null;
  document_url?: string | null;
};

const PUBLIC_ORG_SELECT =
  "id, created_by, legal_name, display_name, org_type, tax_id, province, district, address, contact_name, contact_email, contact_phone, website, social_links, logo_url, description, category, document_url, status, review_note, created_at";

function mapOrg(row: Record<string, unknown>): HiringOrganization {
  return {
    id: String(row.id),
    created_by: String(row.created_by),
    legal_name: String(row.legal_name ?? ""),
    display_name: String(row.display_name ?? ""),
    org_type: (row.org_type as HiringOrgType) ?? "company",
    tax_id: String(row.tax_id ?? ""),
    province: String(row.province ?? ""),
    district: String(row.district ?? ""),
    address: String(row.address ?? ""),
    contact_name: String(row.contact_name ?? ""),
    contact_email: String(row.contact_email ?? ""),
    contact_phone: String(row.contact_phone ?? ""),
    website: (row.website as string | null) ?? null,
    social_links: Array.isArray(row.social_links) ? (row.social_links as JobSocialLink[]) : [],
    logo_url: (row.logo_url as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    category: (row.category as string | null) ?? null,
    document_url: (row.document_url as string | null) ?? null,
    status: (row.status as HiringOrgStatus) ?? "pending",
    review_note: (row.review_note as string | null) ?? null,
    created_at: String(row.created_at ?? ""),
  };
}

export const useMyHiringOrgs = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["hiring-orgs-mine", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<HiringOrganization[]> => {
      const { data: memberships, error: memberErr } = await supabase
        .from("hiring_org_members")
        .select("org_id")
        .eq("user_id", user!.id);
      if (memberErr) throw memberErr;
      const ids = Array.from(new Set((memberships ?? []).map((row: { org_id: string }) => row.org_id)));
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from("hiring_organizations")
        .select(PUBLIC_ORG_SELECT)
        .in("id", ids)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => mapOrg(row as Record<string, unknown>));
    },
  });
};

export const useCreateHiringOrg = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateHiringOrgInput) => {
      if (!user) throw new Error("not authed");
      const { data, error } = await supabase
        .from("hiring_organizations")
        .insert({
          created_by: user.id,
          legal_name: input.legal_name,
          display_name: input.display_name,
          org_type: input.org_type,
          tax_id: input.tax_id,
          province: input.province,
          district: input.district,
          address: input.address,
          contact_name: input.contact_name,
          contact_email: input.contact_email,
          contact_phone: input.contact_phone,
          website: input.website ?? null,
          social_links: input.social_links,
          logo_url: input.logo_url ?? null,
          description: input.description ?? null,
          category: input.category ?? null,
          document_url: input.document_url ?? null,
          status: "pending",
        } as never)
        .select("id")
        .single();
      if (error) throw error;
      return data as { id: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hiring-orgs-mine"] });
      toast.success("ส่งข้อมูลองค์กรแล้ว รอทีมตรวจ");
    },
    onError: (e: Error) => toast.error(mapWriteFlowError(e, "ส่งข้อมูลองค์กรไม่สำเร็จ")),
  });
};

export const useAdminHiringOrgs = (status?: HiringOrgStatus | "all") => {
  return useQuery({
    queryKey: ["admin-hiring-orgs", status ?? "all"],
    queryFn: async (): Promise<HiringOrganization[]> => {
      let q = supabase.from("hiring_organizations").select(PUBLIC_ORG_SELECT).order("created_at", { ascending: false }).limit(200);
      if (status && status !== "all") q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((row) => mapOrg(row as Record<string, unknown>));
    },
  });
};

export const useAdminSetHiringOrgStatus = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { id: string; status: HiringOrgStatus; review_note?: string }) => {
      const { error } = await supabase
        .from("hiring_organizations")
        .update({
          status: input.status,
          review_note: input.review_note ?? null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id ?? null,
        } as never)
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-hiring-orgs"] });
      qc.invalidateQueries({ queryKey: ["hiring-orgs-mine"] });
      toast.success("อัปเดตสถานะองค์กรแล้ว");
    },
    onError: (e: Error) => toast.error(mapWriteFlowError(e, "อัปเดตไม่สำเร็จ")),
  });
};

