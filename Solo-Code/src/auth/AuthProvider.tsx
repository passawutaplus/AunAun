import * as React from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { trackDeviceOnce } from "@/lib/deviceTracking";
import { CONSENT_CHANGE_EVENT, hasAnalyticsConsent } from "@/lib/cookieConsent";
import { isEarlyAccessMode } from "@/lib/publicAccess";
import { emailRedirectUrlFromSearch } from "@/lib/resolvePostAuthPath";
import { ensurePublicAccessApproved } from "@/server/account.functions";

export type AppRole = "admin" | "user";

export interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  display_name: string | null;
  brand_name: string | null;
  logo_url: string | null;
  avatar_url: string | null;
  tagline: string | null;
  phone: string | null;
  address: string | null;
  tax_id: string | null;
  currency: string;
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  payment_qr_url: string | null;
  social_link: string | null;
  terms: string | null;
  onboarding_completed?: boolean;
  persona?: string | null;
  onboarding_data?: Record<string, unknown>;
  tester_approved?: boolean;
  tester_applied_at?: string | null;
  is_active?: boolean;
  deactivated_at?: string | null;
  purge_after?: string | null;
  locale?: string;
  line_messaging_user_id?: string | null;
  line_linked_at?: string | null;
  line_notify_enabled?: boolean;
  line_notify_prefs?: Record<string, boolean>;
  document_theme?: Record<string, unknown> | null;
  signature_url?: string | null;
  esign_acknowledged_at?: string | null;
  subscription_tier?: string | null;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    displayName?: string,
    freelanceField?: string,
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null);
  const [user, setUser] = React.useState<User | null>(null);
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [role, setRole] = React.useState<AppRole | null>(null);
  const [loading, setLoading] = React.useState(true);

  const loadProfileAndRole = React.useCallback(async (uid: string) => {
    const [{ data: prof }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);

    let profileRow = (prof as Profile) ?? null;

    if (!isEarlyAccessMode() && profileRow && !profileRow.tester_approved) {
      try {
        const result = await ensurePublicAccessApproved();
        if (result.approved && result.profile) {
          profileRow = result.profile as Profile;
        } else if (result.approved) {
          profileRow = { ...profileRow, tester_approved: true };
        }
      } catch (e) {
        console.warn("[auth] ensurePublicAccessApproved failed", e);
      }
    }

    setProfile(profileRow);
    const isAdminRole = (roles ?? []).some((r) => r.role === "admin");
    setRole(isAdminRole ? "admin" : ((roles?.[0]?.role as AppRole) ?? "user"));
  }, []);

  React.useEffect(() => {
    // CRITICAL: set listener BEFORE getSession
    const { data: subscription } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession((prev) => {
        if (
          prev?.access_token === newSession?.access_token &&
          prev?.user?.id === newSession?.user?.id
        ) {
          return prev;
        }
        return newSession;
      });
      setUser((prev) => {
        const nextUser = newSession?.user ?? null;
        if (prev?.id === nextUser?.id) return prev; // keep stable ref to avoid downstream churn
        return nextUser;
      });
      if (newSession?.user) {
        // Skip profile reload on token refresh — it didn't change.
        if (event === "TOKEN_REFRESHED") return;
        // defer fetch to avoid deadlock with auth callback
        setTimeout(() => {
          loadProfileAndRole(newSession.user.id);
        }, 0);
      } else {
        setProfile(null);
        setRole(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      setSession(existing);
      setUser(existing?.user ?? null);
      if (existing?.user) {
        loadProfileAndRole(existing.user.id).finally(() => {
          setLoading(false);
          if (hasAnalyticsConsent()) void trackDeviceOnce();
        });
      } else {
        setLoading(false);
        if (hasAnalyticsConsent()) void trackDeviceOnce();
      }
    });

    const onConsent = () => {
      if (hasAnalyticsConsent()) void trackDeviceOnce();
    };
    window.addEventListener(CONSENT_CHANGE_EVENT, onConsent);

    return () => {
      subscription.subscription.unsubscribe();
      window.removeEventListener(CONSENT_CHANGE_EVENT, onConsent);
    };
  }, [loadProfileAndRole]);

  const signIn = React.useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  }, []);

  const signUp = React.useCallback(
    async (email: string, password: string, displayName?: string, freelanceField?: string) => {
      const redirectUrl = emailRedirectUrlFromSearch();
      const meta: Record<string, string> = {};
      if (displayName) meta.display_name = displayName;
      if (freelanceField) meta.freelance_field = freelanceField;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: Object.keys(meta).length ? meta : undefined,
        },
      });
      return { error: error as Error | null };
    },
    [],
  );

  const signOut = React.useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const refreshProfile = React.useCallback(async () => {
    if (user) await loadProfileAndRole(user.id);
  }, [user, loadProfileAndRole]);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      profile,
      role,
      loading,
      isAdmin: role === "admin",
      signIn,
      signUp,
      signOut,
      refreshProfile,
    }),
    [session, user, profile, role, loading, signIn, signUp, signOut, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
