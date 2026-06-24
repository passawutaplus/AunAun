import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type AdApplicationStatus =
  | "pending"
  | "pending_payment"
  | "paid"
  | "approved"
  | "rejected";

export type AdEventType = "impression" | "click" | "interest";

export interface AdCampaign {
  id: string;
  advertiser_user_id: string;
  title: string;
  tagline: string;
  image_url: string;
  target_url: string;
  cta_label: string;
  package: "basic" | "standard" | "premium";
  price_px: number;
  status: "draft" | "pending" | "approved" | "active" | "paused" | "rejected" | "expired";
  start_at: string;
  end_at: string | null;
  impressions: number;
  clicks: number;
  rejection_reason: string;
  application_id: string | null;
  promotion_text: string;
  linked_project_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdApplication {
  id: string;
  user_id: string;
  contact_name: string;
  email: string;
  phone: string;
  company: string;
  website: string;
  ad_title: string;
  ad_tagline: string;
  ad_description: string;
  image_url: string;
  target_url: string;
  cta_label: string;
  package: "basic" | "standard" | "premium";
  duration_days: number;
  budget_px: number;
  amount_thb: number;
  paid_at: string | null;
  notes: string;
  linked_project_id: string | null;
  status: AdApplicationStatus;
  admin_note: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

/* ------------------- session id for analytics ------------------- */
const SESSION_KEY = "so1o_ad_sid";
const getSessionId = () => {
  if (typeof window === "undefined") return "";
  let sid = sessionStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
};

/* ------------------- public queries ------------------- */
export const useActiveAds = (limit = 12) =>
  useQuery({
    queryKey: ["active-ads", limit],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_active_ads", { _limit: limit });
      if (error) throw error;
      return (data ?? []) as unknown as AdCampaign[];
    },
  });

export const useAdCampaign = (id: string | undefined) =>
  useQuery({
    queryKey: ["ad-campaign", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_ad_campaign", { _id: id! });
      if (error) throw error;
      return (data ?? null) as AdCampaign | null;
    },
  });

export const logAdEvent = async (
  adId: string,
  eventType: AdEventType,
  placement: "feed" | "detail" = "feed"
) => {
  try {
    await supabase.rpc("log_ad_event_v2", {
      _ad_id: adId,
      _event_type: eventType,
      _placement: placement,
      _session_id: getSessionId(),
    });
  } catch (e) {
    console.warn("logAdEvent failed", e);
  }
};

/* ------------------- per-campaign daily stats ------------------- */
export interface AdDailyStat {
  day: string;
  impressions: number;
  clicks: number;
  interests: number;
}

export const useAdDailyStats = (adId: string | undefined, days = 14) =>
  useQuery({
    queryKey: ["ad-daily-stats", adId, days],
    enabled: !!adId,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("ad_events_daily", {
        _ad_id: adId!,
        _days: days,
      });
      if (error) throw error;
      return ((data ?? []) as Array<{ day: string; impressions: number; clicks: number; interests: number }>).map(
        (r) => ({
          day: r.day,
          impressions: Number(r.impressions),
          clicks: Number(r.clicks),
          interests: Number(r.interests),
        })
      );
    },
  });

/* ------------------- admin queries ------------------- */
export const useAllAdCampaigns = () =>
  useQuery({
    queryKey: ["admin-ad-campaigns"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ad_campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AdCampaign[];
    },
  });

export const useAllAdApplications = () =>
  useQuery({
    queryKey: ["admin-ad-applications"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ad_applications")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AdApplication[];
    },
  });

export interface AdOverview {
  campaigns_total: number;
  campaigns_active: number;
  impressions_total: number;
  clicks_total: number;
  impressions_7d: number;
  clicks_7d: number;
  unique_viewers_7d: number;
  applications_pending: number;
  applications_pending_payment: number;
  applications_paid: number;
  revenue_thb: number;
}

export const useAdminAdOverview = () =>
  useQuery({
    queryKey: ["admin-ad-overview"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_ad_overview");
      if (error) throw error;
      return data as unknown as AdOverview;
    },
  });

/* ------------------- user applications ------------------- */
export const useMyAdApplications = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-ad-applications", user?.id],
    enabled: !!user?.id,
    refetchInterval: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ad_applications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AdApplication[];
    },
  });
};

export const useSubmitAdApplication = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      vars: Omit<
        AdApplication,
        | "id"
        | "user_id"
        | "status"
        | "admin_note"
        | "reviewed_at"
        | "reviewed_by"
        | "created_at"
        | "updated_at"
        | "paid_at"
      >
    ) => {
      if (!user?.id) throw new Error("ต้องเข้าสู่ระบบก่อน");
      const { data, error } = await supabase
        .from("ad_applications")
        .insert({ ...vars, user_id: user.id, status: "pending_payment" as AdApplicationStatus })
        .select()
        .single();
      if (error) throw error;
      return data as AdApplication;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-ad-applications"] });
      qc.invalidateQueries({ queryKey: ["admin-ad-applications"] });
    },
  });
};

/** Prototype mock-payment — sets application to status=paid */
export const useMockPayAdApplication = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc("mock_pay_ad_application", { _id: id });
      if (error) throw error;
      return data as AdApplication;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-ad-applications"] });
      qc.invalidateQueries({ queryKey: ["admin-ad-applications"] });
    },
  });
};

/** Stripe checkout for brand ad campaigns */
export const useStripePayAdApplication = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; package: AdApplication["package"] }) => {
      const { startAdCheckout, adPriceIdForPackage } = await import("@/lib/stripePaymentsApi");
      await startAdCheckout({
        applicationId: vars.id,
        package: vars.package,
        successPath: "/advertise?paid=1",
        cancelPath: "/advertise?pay=canceled",
      });
      return adPriceIdForPackage(vars.package);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-ad-applications"] });
    },
  });
};

/* ------------------- admin actions ------------------- */
export const useApproveAdApplication = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; durationDays?: number }) => {
      const { data, error } = await supabase.rpc("admin_approve_ad_application", {
        _id: vars.id,
        _duration_days: vars.durationDays ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-ad-campaigns"] });
      qc.invalidateQueries({ queryKey: ["admin-ad-applications"] });
      qc.invalidateQueries({ queryKey: ["my-ad-applications"] });
      qc.invalidateQueries({ queryKey: ["active-ads"] });
      qc.invalidateQueries({ queryKey: ["admin-ad-overview"] });
    },
  });
};

export const useRejectAdApplication = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; note?: string }) => {
      const { data, error } = await supabase.rpc("admin_reject_ad_application", {
        _id: vars.id,
        _note: vars.note ?? "",
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-ad-applications"] });
      qc.invalidateQueries({ queryKey: ["my-ad-applications"] });
      qc.invalidateQueries({ queryKey: ["admin-ad-overview"] });
    },
  });
};

export const useUpdateAdCampaign = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; patch: Partial<AdCampaign> }) => {
      const { error } = await supabase.from("ad_campaigns").update(vars.patch).eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-ad-campaigns"] });
      qc.invalidateQueries({ queryKey: ["active-ads"] });
    },
  });
};

export const useDeleteAdCampaign = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ad_campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-ad-campaigns"] });
      qc.invalidateQueries({ queryKey: ["active-ads"] });
    },
  });
};

/* ------------------- packages ------------------- */
export const AD_PACKAGES = [
  {
    id: "basic" as const,
    name: "Basic",
    priceTHB: 990,
    pricePx: 9_900,
    durationDays: 7,
    estImpressions: "≈ 3,000",
    perks: ["แสดงในฟีดหลัก 7 วัน", "แท็ก Sponsored", "รายงานจำนวนการแสดง/คลิก"],
  },
  {
    id: "standard" as const,
    name: "Standard",
    priceTHB: 2_490,
    pricePx: 24_900,
    durationDays: 14,
    estImpressions: "≈ 10,000",
    perks: [
      "แสดงในฟีดหลัก 14 วัน",
      "ลำดับการแสดงสูงกว่า",
      "รายงานสถิติเชิงลึก",
      "ปุ่ม CTA แบบกำหนดเอง",
    ],
  },
  {
    id: "premium" as const,
    name: "Premium",
    priceTHB: 5_900,
    pricePx: 59_000,
    durationDays: 30,
    estImpressions: "≈ 30,000",
    perks: [
      "แสดงในฟีดหลัก 30 วัน",
      "ความถี่สูงสุด",
      "Targeting ตามหมวด",
      "Account manager ดูแลเฉพาะ",
    ],
  },
];

/* ------------------- notifications derived from my applications ------------------- */
export interface AdAppNotif {
  id: string;
  appId: string;
  status: AdApplicationStatus;
  adTitle: string;
  imageUrl: string;
  adminNote: string;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
}

export const useAdApplicationNotifications = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["ad-app-notifications", user?.id],
    enabled: !!user?.id,
    refetchInterval: 30_000,
    queryFn: async (): Promise<AdAppNotif[]> => {
      const { data, error } = await supabase
        .from("ad_applications")
        .select(
          "id, status, ad_title, image_url, admin_note, created_at, updated_at, reviewed_at"
        )
        .eq("user_id", user!.id)
        .in("status", ["approved", "rejected", "paid"])
        .order("updated_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: `ad-app-${r.id}`,
        appId: r.id,
        status: r.status as AdApplicationStatus,
        adTitle: r.ad_title,
        imageUrl: r.image_url,
        adminNote: r.admin_note ?? "",
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        reviewedAt: r.reviewed_at,
      }));
    },
  });
};
