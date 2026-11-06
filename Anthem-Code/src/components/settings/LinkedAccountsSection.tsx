import { useCallback, useEffect, useState } from "react";
import { Link2, Loader2, Mail } from "lucide-react";
import type { User, UserIdentity } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { OAuthProviderId } from "@/integrations/oauth";
import { enabledExtraProviders } from "@/lib/authProviders";
import { buildOAuthCallbackUrl, clearStaleOAuthPkceState, storeOAuthRedirect } from "@/lib/oauthRedirect";
import { PROVIDER_ICONS } from "@/components/auth/ProviderIcons";
import { SettingsCard } from "@/components/settings/SettingsCard";
import { userFacingError } from "@/lib/userFacingError";
import { cn } from "@/lib/utils";

type Row = { key: "google" | "line" | "facebook"; id: OAuthProviderId; name: string };

function linkErrorMessage(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error ?? "");
  if (/manual linking/i.test(msg)) return "ยังเชื่อมบัญชีไม่ได้ตอนนี้ ลองใหม่ภายหลัง";
  if (/already/i.test(msg)) return "บัญชีนี้ถูกเชื่อมกับผู้ใช้อื่นอยู่แล้ว";
  return userFacingError(error, "เชื่อมบัญชีไม่สำเร็จ");
}

/**
 * Sign-in methods on this account. Linking needs "Manual linking" turned on in
 * Supabase Auth; accounts with the same verified email are linked automatically.
 */
export function LinkedAccountsSection({ user }: { user: User }) {
  const rows: Row[] = [{ key: "google", id: "google", name: "Google" }, ...enabledExtraProviders()];
  const [identities, setIdentities] = useState<UserIdentity[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmUnlink, setConfirmUnlink] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.auth.getUserIdentities();
    if (error) {
      setIdentities(user.identities ?? []);
      return;
    }
    setIdentities(data?.identities ?? []);
  }, [user.identities]);

  useEffect(() => {
    void load();
  }, [load]);

  const find = (id: string) => identities?.find((i) => i.provider === id) ?? null;
  const emailIdentity = find("email");
  const total = identities?.length ?? 0;

  const link = async (row: Row) => {
    setBusy(row.id);
    storeOAuthRedirect("/settings#account");
    clearStaleOAuthPkceState();
    const { error } = await supabase.auth.linkIdentity({
      // supabase-js types list only built-in providers; "custom:*" ids work at runtime.
      provider: row.id as "google",
      options: { redirectTo: buildOAuthCallbackUrl() },
    });
    if (error) {
      setBusy(null);
      toast.error(linkErrorMessage(error));
    }
    // On success the browser leaves for the provider and comes back to /settings#account.
  };

  const unlink = async (identity: UserIdentity, name: string) => {
    setBusy(identity.provider);
    const { error } = await supabase.auth.unlinkIdentity(identity);
    setBusy(null);
    setConfirmUnlink(null);
    if (error) {
      toast.error(userFacingError(error, `ยกเลิกการเชื่อม ${name} ไม่สำเร็จ`));
      return;
    }
    toast.success(`ยกเลิกการเชื่อม ${name} แล้ว`);
    await supabase.auth.refreshSession();
    void load();
  };

  return (
    <SettingsCard
      icon={Link2}
      title="บัญชีที่เชื่อมไว้"
      description="เข้าสู่ระบบบัญชีเดียวกันได้หลายช่องทาง โปรไฟล์และผลงานยังอยู่ที่เดิม"
    >
      {identities === null ? (
        <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลด…
        </div>
      ) : (
        <ul className="divide-y divide-border/60">
          {emailIdentity ? (
            <li className="flex items-center gap-3 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                <Mail className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">อีเมล</span>
                <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
              </span>
              <span className="text-xs text-muted-foreground">เชื่อมแล้ว</span>
            </li>
          ) : null}
          {rows.map((row) => {
            const Icon = PROVIDER_ICONS[row.key];
            const identity = find(row.id);
            const detail =
              (identity?.identity_data?.email as string | undefined) ||
              (identity?.identity_data?.name as string | undefined) ||
              (identity?.identity_data?.full_name as string | undefined) ||
              "";
            const isOnly = !!identity && total <= 1;
            const asking = confirmUnlink === row.id;
            return (
              <li key={row.key} className="flex items-center gap-3 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted [&_svg]:h-5 [&_svg]:w-5">
                  <Icon />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{row.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {identity ? detail || "เชื่อมแล้ว" : "ยังไม่ได้เชื่อม"}
                  </span>
                </span>
                {identity ? (
                  isOnly ? (
                    <span className="text-xs text-muted-foreground" title="ต้องมีช่องทางเข้าสู่ระบบอย่างน้อย 1 ช่องทาง">
                      ช่องทางหลัก
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={!!busy}
                      onClick={() => (asking ? void unlink(identity, row.name) : setConfirmUnlink(row.id))}
                      onBlur={() => setConfirmUnlink((v) => (v === row.id ? null : v))}
                      className={cn(
                        "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-medium transition-colors disabled:opacity-50",
                        asking
                          ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {busy === row.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      {asking ? "ยืนยันยกเลิก" : "ยกเลิกการเชื่อม"}
                    </button>
                  )
                ) : (
                  <button
                    type="button"
                    disabled={!!busy}
                    onClick={() => void link(row)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full bg-foreground px-3.5 text-xs font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
                  >
                    {busy === row.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    เชื่อม
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </SettingsCard>
  );
}
