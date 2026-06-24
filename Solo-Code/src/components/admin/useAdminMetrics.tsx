import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AdminProfileRow {
  id: string;
  user_id: string;
  email: string | null;
  display_name: string | null;
  brand_name: string | null;
  created_at: string;
  last_active_at: string | null;
  is_active?: boolean;
  deactivated_at?: string | null;
  purge_after?: string | null;
  tester_approved?: boolean;
  tester_applied_at?: string | null;
}

export interface QuotationRow {
  id: string;
  user_id: string;
  number: string;
  client_name: string;
  project_name: string;
  status: string;
  created_at: string;
  updated_at: string;
  items: unknown;
}

export interface IncomeRow {
  id: string;
  user_id: string;
  source: string;
  category: string;
  gross: number;
  net: number;
  vat: number;
  wht: number;
  month: string;
  receive_date: string | null;
  created_at: string;
}

export interface ExpenseRow {
  id: string;
  user_id: string;
  label: string;
  amount: number;
  category: string | null;
  month: string;
  scope: string;
  created_at: string;
}

export interface SubscriptionRow {
  id: string;
  user_id: string;
  name: string;
  price: number;
  cycle: string;
  is_active: boolean;
  next_renewal: string | null;
  created_at: string;
}

export interface SavedClientRow {
  id: string;
  user_id: string;
  name: string;
  type: string | null;
  created_at: string;
}

export interface AdminMetrics {
  profiles: AdminProfileRow[];
  adminIds: Set<string>;
  quotations: QuotationRow[];
  incomes: IncomeRow[];
  expenses: ExpenseRow[];
  subscriptions: SubscriptionRow[];
  savedClients: SavedClientRow[];
  lastSeen: Map<string, Date>;
  /** AI chat usage today: user_id -> count today */
  aiUsageToday: Map<string, number>;
  /** AI chat usage all-time: user_id -> total count */
  aiUsageTotal: Map<string, number>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  lastFetched: Date | null;
}

const empty: Omit<AdminMetrics, "refresh" | "loading" | "lastFetched" | "error"> = {
  profiles: [],
  adminIds: new Set(),
  quotations: [],
  incomes: [],
  expenses: [],
  subscriptions: [],
  savedClients: [],
  lastSeen: new Map(),
  aiUsageToday: new Map(),
  aiUsageTotal: new Map(),
};

type RpcResult<T> = { data: T | null; error: { message: string } | null };

function pickError(...results: Array<{ error: { message: string } | null }>): string | null {
  const err = results.find((r) => r.error);
  return err?.error?.message ?? null;
}

export function useAdminMetrics(): AdminMetrics {
  const [state, setState] = React.useState(empty);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [lastFetched, setLastFetched] = React.useState<Date | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const [
        profilesRes,
        rolesRes,
        quotationsRes,
        incomesRes,
        expensesRes,
        subscriptionsRes,
        savedClientsRes,
        usageRes,
        aiUsageRes,
      ] = await Promise.all([
        (supabase.rpc as unknown as (fn: string) => Promise<RpcResult<unknown[]>>)(
          "admin_list_profiles_safe",
        ).then((res) => ({
          ...res,
          data: res.data
            ? [...(res.data as Array<{ created_at: string | null }>)].sort((a, b) =>
                (b.created_at ?? "").localeCompare(a.created_at ?? ""),
              )
            : res.data,
        })),
        supabase.from("user_roles").select("user_id,role").eq("role", "admin"),
        supabase
          .from("quotations")
          .select("id,user_id,number,client_name,project_name,status,created_at,updated_at,items")
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("finance_incomes")
          .select("id,user_id,source,category,gross,net,vat,wht,month,receive_date,created_at")
          .order("created_at", { ascending: false })
          .limit(1000),
        supabase
          .from("finance_expenses")
          .select("id,user_id,label,amount,category,month,scope,created_at")
          .order("created_at", { ascending: false })
          .limit(1000),
        supabase
          .from("finance_subscriptions")
          .select("id,user_id,name,price,cycle,is_active,next_renewal,created_at")
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("saved_clients")
          .select("id,user_id,name,type,created_at")
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("feature_usage_events")
          .select("user_id,created_at")
          .order("created_at", { ascending: false })
          .limit(2000),
        supabase.from("ai_chat_usage").select("user_id,usage_date,count,total_count").limit(2000),
      ]);

      const queryError = pickError(
        profilesRes,
        rolesRes,
        quotationsRes,
        incomesRes,
        expensesRes,
        subscriptionsRes,
        savedClientsRes,
        usageRes,
        aiUsageRes,
      );

      if (queryError) {
        setError(queryError);
        toast.error("โหลดข้อมูล Mission Control ไม่ครบ", { description: queryError });
      } else {
        setError(null);
      }

      const usage = usageRes.data;
      const aiUsage = aiUsageRes.data;

      const lastSeen = new Map<string, Date>();
      (usage ?? []).forEach((u: { user_id: string; created_at: string }) => {
        if (!lastSeen.has(u.user_id)) lastSeen.set(u.user_id, new Date(u.created_at));
      });

      const today = new Date().toISOString().slice(0, 10);
      const aiUsageToday = new Map<string, number>();
      const aiUsageTotal = new Map<string, number>();
      (aiUsage ?? []).forEach(
        (r: { user_id: string; usage_date: string; count: number; total_count: number }) => {
          if (r.usage_date === today) aiUsageToday.set(r.user_id, r.count);
          const cur = aiUsageTotal.get(r.user_id) ?? 0;
          aiUsageTotal.set(r.user_id, Math.max(cur, r.total_count ?? 0));
        },
      );

      setState({
        profiles: (profilesRes.data as AdminProfileRow[]) ?? [],
        adminIds: new Set((rolesRes.data ?? []).map((r) => r.user_id)),
        quotations: (quotationsRes.data as QuotationRow[]) ?? [],
        incomes: (incomesRes.data as IncomeRow[]) ?? [],
        expenses: (expensesRes.data as ExpenseRow[]) ?? [],
        subscriptions: (subscriptionsRes.data as SubscriptionRow[]) ?? [],
        savedClients: (savedClientsRes.data as SavedClientRow[]) ?? [],
        lastSeen,
        aiUsageToday,
        aiUsageTotal,
      });
      setLastFetched(new Date());
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg);
      toast.error("โหลดข้อมูล Mission Control ล้มเหลว", { description: msg });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...state, loading, error, refresh, lastFetched };
}

// ============== Helpers ==============
export const fmtTHB = (n: number) =>
  new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(Math.round(n));

export const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

export function activeUserIds(rows: { user_id: string; created_at: string }[], days: number) {
  const since = daysAgo(days).getTime();
  const ids = new Set<string>();
  rows.forEach((r) => {
    if (new Date(r.created_at).getTime() >= since) ids.add(r.user_id);
  });
  return ids;
}

export function groupByDay<T extends { created_at: string }>(
  rows: T[],
  days: number,
  pick: (rs: T[]) => number = (rs) => rs.length,
) {
  const out: { day: string; value: number }[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const subset = rows.filter((r) => r.created_at.slice(0, 10) === key);
    out.push({ day: key.slice(5), value: pick(subset) });
  }
  return out;
}
