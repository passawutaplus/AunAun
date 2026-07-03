import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Loader2, MessageCircle } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { SO1O_APP_URL } from "@/lib/productLinks";
import { isSoloEcosystemEnabled } from "@/lib/aplus1Launch";
import { notifySoloComingSoon } from "@/lib/soloEcosystemGate";
import { toast } from "sonner";
import {
  LINE_NOTIFY_GROUPS,
  mergeLineNotifyPrefs,
  pickLocale,
  type LineNotifyKind,
  type UserLocale,
} from "@/lib/lineNotificationKinds";
import { cn } from "@/lib/utils";

const LINE_URL = "https://lin.ee/q3W9Qds";
const LINE_ID = "@solofreelancer";

function LineGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .628.285.628.63 0 .349-.282.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
    </svg>
  );
}

function countEnabledPrefs(prefs: Record<LineNotifyKind, boolean>): number {
  return Object.values(prefs).filter(Boolean).length;
}

export type LineNotificationPrefsPanelProps = {
  defaultOpen?: boolean;
  showLinkStatus?: boolean;
  showInhouseGroup?: boolean;
  tierLabel?: string;
};

export function LineNotificationPrefsPanel({
  defaultOpen = false,
  showLinkStatus = true,
  showInhouseGroup = false,
  tierLabel,
}: LineNotificationPrefsPanelProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: profile } = useProfile(user?.id);
  const locale = pickLocale((profile as { locale?: string } | undefined)?.locale);
  const [open, setOpen] = useState(defaultOpen);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [prefs, setPrefs] = useState(mergeLineNotifyPrefs(null));

  const p = profile as {
    line_messaging_user_id?: string | null;
    line_linked_at?: string | null;
    line_notify_enabled?: boolean | null;
    line_notify_prefs?: unknown;
  } | undefined;

  const linked = Boolean(p?.line_messaging_user_id);
  const linkedAt = p?.line_linked_at;
  const lineLinkUrl = `${SO1O_APP_URL.replace(/\/$/, "")}/line-link`;
  const enabledCount = countEnabledPrefs(prefs);

  const visibleGroups = LINE_NOTIFY_GROUPS.filter(
    (g) => g.id !== "inhouse" || showInhouseGroup,
  );

  useEffect(() => {
    setEnabled(!!p?.line_notify_enabled);
    setPrefs(mergeLineNotifyPrefs(p?.line_notify_prefs));
  }, [p?.line_notify_enabled, p?.line_notify_prefs]);

  const t = (th: string, en: string) => (locale === "en" ? en : th);

  const collapsedSummary = linked
    ? enabled
      ? t(`เปิดอยู่ ${enabledCount} รายการ`, `${enabledCount} alerts on`)
      : t("ปิดการแจ้งเตือน", "Notifications off")
    : t("ยังไม่ได้เชื่อมบัญชี", "Not linked");

  async function persist(nextEnabled: boolean, nextPrefs: typeof prefs) {
    if (!user?.id) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        line_notify_enabled: nextEnabled,
        line_notify_prefs: nextPrefs,
      })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast.error(t("บันทึกไม่สำเร็จ", "Could not save settings"));
      return;
    }
    toast.success(t("บันทึกการตั้งค่าแล้ว", "Settings saved"));
    void qc.invalidateQueries({ queryKey: ["profile", user.id] });
  }

  function toggleMaster(checked: boolean) {
    setEnabled(checked);
    void persist(checked, prefs);
  }

  function toggleKind(key: LineNotifyKind, checked: boolean) {
    const next = { ...prefs, [key]: checked };
    setPrefs(next);
    void persist(enabled, next);
  }

  return (
    <section className="rounded-2xl glass-panel overflow-hidden">
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="p-6 space-y-4">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="w-full flex items-start justify-between gap-3 text-left group"
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#06C755] text-white shrink-0">
                  <LineGlyph className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="font-semibold text-foreground flex items-center gap-1.5 flex-wrap">
                    {t("แจ้งเตือนผ่านไลน์", "LINE notifications")}
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform shrink-0",
                        open && "rotate-180",
                      )}
                    />
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {open
                      ? t(
                          "ตั้งค่าร่วมกับหลังบ้าน — เชื่อมบัญชีครั้งเดียวใช้ได้ทั้งสองแพลตฟอร์ม",
                          "Shared with desk — one LINE link for both apps",
                        )
                      : collapsedSummary}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                {tierLabel && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">
                    {tierLabel}
                  </span>
                )}
              </div>
            </button>
          </CollapsibleTrigger>

          {showLinkStatus && (
            <div
              className={cn(
                "rounded-xl border p-3.5 space-y-2",
                linked ? "border-[#06C755]/40 bg-[#06C755]/5" : "border-dashed border-border bg-muted/30",
              )}
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <MessageCircle className="h-4 w-4 text-[#06C755]" />
                  {linked ? t("เชื่อมบัญชีแล้ว", "Account linked") : t("ยังไม่ได้เชื่อมบัญชี", "Not linked yet")}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {isSoloEcosystemEnabled() ? (
                    <a
                      href={lineLinkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                        linked
                          ? "border border-[#06C755]/40 text-[#06C755] hover:bg-[#06C755]/10"
                          : "bg-[#06C755] text-white hover:bg-[#05b34c] shadow-sm",
                      )}
                    >
                      <LineGlyph className="h-3.5 w-3.5" />
                      {linked ? t("จัดการการเชื่อม", "Manage link") : t("เชื่อมบัญชี", "Link account")}
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={notifySoloComingSoon}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                        "border border-dashed border-[#06C755]/40 text-[#06C755] hover:bg-[#06C755]/10",
                      )}
                    >
                      <LineGlyph className="h-3.5 w-3.5" />
                      {t("เชื่อมบัญชี — เร็ว ๆ นี้", "Link account — coming soon")}
                    </button>
                  )}
                  {!linked && (
                    <a
                      href={LINE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/50"
                    >
                      {t("เพิ่มเพื่อน", "Add friend")} {LINE_ID}
                    </a>
                  )}
                </div>
              </div>
              {linked && linkedAt && (
                <p className="text-[11px] text-muted-foreground">
                  {t("เชื่อมเมื่อ", "Linked")}{" "}
                  {new Date(linkedAt).toLocaleString(locale === "en" ? "en-US" : "th-TH")}
                </p>
              )}
            </div>
          )}
        </div>

        <CollapsibleContent>
          <div className="px-6 pb-6 space-y-4 border-t border-border/50 pt-4">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 px-3.5 py-3">
              <div>
                <p className="text-sm font-medium">{t("เปิดการแจ้งเตือน", "Enable notifications")}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {linked
                    ? t("ส่งแจ้งเตือนเมื่อมีเหตุการณ์ที่เลือกด้านล่าง", "Notify for selected events below")
                    : t("ต้องเชื่อมบัญชีก่อนจึงจะส่งได้", "Link your account first")}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                disabled={!linked || saving}
                onClick={() => toggleMaster(!enabled)}
                className={cn(
                  "relative w-11 h-6 rounded-full transition-colors shrink-0",
                  enabled ? "bg-primary" : "bg-muted",
                  (!linked || saving) && "opacity-50",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform",
                    enabled && "translate-x-5",
                  )}
                />
              </button>
            </div>

            {visibleGroups.map((group) => (
              <div key={group.id} className="space-y-2">
                <div>
                  <h3 className="text-xs font-semibold">{group.label[locale as UserLocale]}</h3>
                  <p className="text-[11px] text-muted-foreground">{group.description[locale as UserLocale]}</p>
                </div>
                <div className="space-y-1.5">
                  {group.kinds.map((kind) => {
                    const isQuotation = kind.key === "portal_quotation";
                    return (
                      <div
                        key={kind.key}
                        className={cn(
                          "flex items-start justify-between gap-3 rounded-lg border border-border/50 px-3 py-2.5",
                          isQuotation && "opacity-60",
                        )}
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-medium">{kind.label[locale as UserLocale]}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {kind.hint[locale as UserLocale]}
                          </p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={prefs[kind.key]}
                          disabled={!enabled || !linked || saving || isQuotation}
                          onClick={() => toggleKind(kind.key, !prefs[kind.key])}
                          className={cn(
                            "relative w-9 h-5 rounded-full transition-colors shrink-0 mt-0.5",
                            prefs[kind.key] ? "bg-primary" : "bg-muted",
                          )}
                        >
                          <span
                            className={cn(
                              "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform",
                              prefs[kind.key] && "translate-x-4",
                            )}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}
