import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { KycDocType } from "@/lib/kycUpload";

export interface KycRequest {
  id: string;
  user_id: string;
  status: "pending" | "approved" | "rejected";
  contact_note: string;
  admin_note: string;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  legal_name?: string | null;
  id_type?: string | null;
  bank_name?: string | null;
  account_number?: string | null;
  account_name?: string | null;
  ai_risk_score?: number | null;
  ai_summary?: string | null;
  ai_recommendation?: string | null;
  ai_reviewed_at?: string | null;
  national_id_number?: string | null;
  phone?: string | null;
  contact_email?: string | null;
  address_json?: Record<string, string> | null;
  reject_reason_code?: string | null;
  reject_reason_label?: string | null;
}

export type KycAddressInput = {
  line1: string;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
};

export type KycSubmissionInput = {
  legalName: string;
  idType: "national_id" | "passport";
  nationalIdNumber: string;
  phone: string;
  contactEmail: string;
  address: KycAddressInput;
  bankName: string;
  accountNumber: string;
  accountName: string;
  contactNote?: string;
  documents: { doc_type: KycDocType; storage_path: string }[];
};

export const useMyKycRequests = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["kyc-mine", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kyc_requests")
        .select("*")
        .eq("user_id", user!.id)
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as KycRequest[];
    },
  });
};

export const useSubmitKycVerification = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: KycSubmissionInput) => {
      const { data, error } = await supabase.rpc("submit_kyc_verification", {
        _legal_name: input.legalName,
        _id_type: input.idType,
        _bank_name: input.bankName,
        _account_number: input.accountNumber,
        _account_name: input.accountName,
        _documents: input.documents,
        _contact_note: input.contactNote ?? "",
        _national_id_number: input.nationalIdNumber,
        _phone: input.phone,
        _contact_email: input.contactEmail,
        _address_json: {
          line1: input.address.line1,
          subdistrict: input.address.subdistrict,
          district: input.address.district,
          province: input.address.province,
          postal_code: input.address.postalCode,
        },
      });
      if (error) throw error;
      return data as KycRequest;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kyc-mine", user?.id] });
      qc.invalidateQueries({ queryKey: ["creator-eligibility", user?.id] });
    },
  });
};

/** @deprecated Use useSubmitKycVerification */
export const useSubmitKyc = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (contact_note: string) => {
      const { data, error } = await supabase.rpc("submit_kyc_request", { _contact_note: contact_note });
      if (error) throw error;
      return data as KycRequest;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kyc-mine", user?.id] });
    },
  });
};

export const usePayoutProfile = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["payout-profile", user?.id],
    enabled: !!user?.id,
    // Missing row / RLS miss should not crash hire-readiness or settings.
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payout_profiles")
        .select("bank_name, account_number, account_name, verified_at")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) {
        console.warn("[payout_profiles]", error.message);
        return null;
      }
      return data;
    },
  });
};

/** Admin */
export const useAdminKycList = (status: "pending" | "approved" | "rejected" | "all" = "pending") =>
  useQuery({
    queryKey: ["admin-kyc", status],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kyc_requests")
        .select("*")
        .order("submitted_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      let rows = (data ?? []) as KycRequest[];
      if (status !== "all") rows = rows.filter((r) => r.status === status);
      const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
      if (userIds.length === 0) return rows.map((r) => ({ ...r, profile: null as any }));
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url, email")
        .in("user_id", userIds);
      const byId = new Map((profs ?? []).map((p: { user_id: string }) => [p.user_id, p]));
      return rows.map((r) => ({ ...r, profile: byId.get(r.user_id) ?? null }));
    },
  });

export const useAdminKycDocuments = (requestId: string | undefined) =>
  useQuery({
    queryKey: ["admin-kyc-docs", requestId],
    enabled: !!requestId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_kyc_documents", {
        _request_id: requestId!,
      });
      if (error) throw error;
      return (data ?? []) as { doc_type: string; storage_path: string }[];
    },
  });

export const useAdminApproveKyc = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) => {
      const { data, error } = await supabase.rpc("admin_approve_kyc", { _request_id: id, _note: note ?? "" });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-kyc"] });
    },
  });
};

export const useAdminRejectKyc = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      note,
      reasonCode,
      reasonLabel,
    }: {
      id: string;
      note?: string;
      reasonCode: string;
      reasonLabel: string;
    }) => {
      const { data, error } = await supabase.rpc("admin_reject_kyc", {
        _request_id: id,
        _note: note ?? "",
        _reason_code: reasonCode,
        _reason_label: reasonLabel,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-kyc"] }),
  });
};
