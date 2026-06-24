import * as React from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, Loader2, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LINE_ID, LINE_URL, LineGlyph } from "@/components/LineContactButton";
import {
  LINE_NOTIFY_GROUPS,
  mergeLineNotifyPrefs,
  pickLocale,
  type LineNotifyKind,
  type UserLocale,
} from "@/lib/lineNotificationKinds";
import { cn } from "@/lib/utils";
import { useServerFn } from "@tanstack/react-start";
import { sendLineTestSamples } from "@/server/lineNotifications.functions";

export type LineNotificationPrefsPanelProps = {
  variant?: "settings" | "onboarding";
  defaultOpen?: boolean;
  showLinkStatus?: boolean;
  showTestSamples?: boolean;
  showInhouseGroup?: boolean;
  /** Omit Card wrapper — for embedding in /line-link */
  embedded?: boolean;
  tierLabel?: string;
};

function LineGlyphBadge({ className, onboarding }: { className?: string; onboarding?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-soft",
        onboarding ? "bg-[#06C755]" : "bg-[#06C755]",
        className,
      )}
    >
      <LineGlyph className="h-5 w-5" />
    </span>
  );
}

function countEnabledPrefs(prefs: Record<LineNotifyKind, boolean>): number {
  return Object.values(prefs).filter(Boolean).length;
}

export function LineNotificationPrefsPanel({
  variant = "settings",
  defaultOpen = false,
  showLinkStatus = true,
  showTestSamples = false,
  showInhouseGroup = false,
  embedded = false,
  tierLabel,
}: LineNotificationPrefsPanelProps) {
  const onboarding = variant === "onboarding";
  const { profile, refreshProfile } = useAuth();
  const locale = pickLocale(profile?.locale);
  const [open, setOpen] = React.useState(defaultOpen);
  const [saving, setSaving] = React.useState(false);
  const [sendingSamples, setSendingSamples] = React.useState(false);
  const sendSamplesFn = useServerFn(sendLineTestSamples);
  const [enabled, setEnabled] = React.useState(false);
  const [prefs, setPrefs] = React.useState(mergeLineNotifyPrefs(null));

  const linked = Boolean(profile?.line_messaging_user_id);
  const linkedAt = profile?.line_linked_at;
  const enabledCount = countEnabledPrefs(prefs);

  const visibleGroups = LINE_NOTIFY_GROUPS.filter((g) => g.id !== "inhouse" || showInhouseGroup);

  React.useEffect(() => {
    setEnabled(!!profile?.line_notify_enabled);
    setPrefs(mergeLineNotifyPrefs(profile?.line_notify_prefs));
  }, [profile]);

  React.useEffect(() => {
    if (defaultOpen) setOpen(true);
  }, [defaultOpen]);

  const t = (th: string, en: string) => (locale === "en" ? en : th);

  const collapsedSummary = linked
    ? enabled
      ? t(`เปิดอยู่ ${enabledCount} รายการ`, `${enabledCount} alerts on`)
      : t("ปิดการแจ้งเตือน", "Notifications off")
    : t("ยังไม่ได้เชื่อมบัญชี", "Not linked");

  async function persist(
    nextEnabled: boolean,
    nextPrefs: typeof prefs,
    rollback: { enabled: boolean; prefs: typeof prefs },
    quiet = false,
  ) {
    if (!profile?.user_id) return false;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        line_notify_enabled: nextEnabled,
        line_notify_prefs: nextPrefs,
      })
      .eq("user_id", profile.user_id);
    setSaving(false);
    if (error) {
      setEnabled(rollback.enabled);
      setPrefs(rollback.prefs);
      toast.error(t("บันทึกไม่สำเร็จ", "Could not save settings"));
      return false;
    }
    if (!quiet) toast.success(t("บันทึกการตั้งค่าแล้ว", "Settings saved"));
    await refreshProfile();
    return true;
  }

  function toggleMaster(checked: boolean) {
    const rollback = { enabled, prefs };
    setEnabled(checked);
    void persist(checked, prefs, rollback);
  }

  function toggleKind(key: LineNotifyKind, checked: boolean) {
    const rollback = { enabled, prefs };
    const next = { ...prefs, [key]: checked };
    setPrefs(next);
    void persist(enabled, next, rollback);
  }

  async function enableMasterAndSave() {
    if (enabled) return true;
    const rollback = { enabled, prefs };
    setEnabled(true);
    return persist(true, prefs, rollback);
  }

  function sampleErrorMessage(err: unknown): string {
    const code = err instanceof Error ? err.message : "";
    if (code === "line_not_linked") return t("เชื่อมบัญชีก่อนนะ", "Link your account first");
    if (code === "pro_required") return t("ต้องเป็นสมาชิกโปร", "Pro membership required");
    if (code === "line_not_configured" || code === "line_push_failed") {
      return t("ระบบไลน์ยังไม่พร้อม ลองใหม่ภายหลัง", "LINE is not configured yet");
    }
    return t("ส่งไม่สำเร็จ — ตรวจสอบการเชื่อมต่อ", "Could not send — check your connection");
  }

  async function sendAllSamples() {
    setSendingSamples(true);
    try {
      const data = await sendSamplesFn();
      toast.success(
        t(
          `ส่งตัวอย่าง ${data.sent}/${data.total} ข้อความแล้ว`,
          `Sent ${data.sent}/${data.total} sample messages`,
        ),
      );
    } catch (err) {
      toast.error(sampleErrorMessage(err));
    } finally {
      setSendingSamples(false);
    }
  }

  const content = (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className={cn("space-y-4", embedded ? "p-0" : "p-4 sm:p-5")}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-start justify-between gap-3 text-left group"
          >
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <LineGlyphBadge className="shrink-0" onboarding={onboarding} />
              <div className="min-w-0">
                <h2
                  className={cn(
                    "text-sm font-semibold tracking-tight flex items-center gap-1.5 flex-wrap",
                    onboarding ? "text-white" : "text-foreground",
                  )}
                >
                  {onboarding
                    ? t("เลือกแจ้งเตือนที่ต้องการ", "Choose notifications")
                    : t("แจ้งเตือนผ่านไลน์", "LINE notifications")}
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform shrink-0",
                      onboarding ? "text-white/60" : "text-muted-foreground",
                      open && "rotate-180",
                    )}
                  />
                </h2>
                <p
                  className={cn(
                    "text-xs mt-1 leading-relaxed",
                    onboarding ? "text-white/55" : "text-muted-foreground",
                  )}
                >
                  {open
                    ? onboarding
                      ? t(
                          "รับ Push ทันทีเมื่อลูกค้า หน้าร้าน หรือทีม In-House ติดต่อคุณ",
                          "Get instant push for portal, showcase, and In-House events",
                        )
                      : t(
                          "เลือกประเภทเหตุการณ์ที่ต้องการรับแจ้งเตือน — ข้อความตามภาษาที่ตั้งใน「ปรับโหมด」",
                          "Choose which events to notify — messages follow your language in Display mode",
                        )
                    : collapsedSummary}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {saving && (
                <Loader2
                  className={cn(
                    "h-3.5 w-3.5 animate-spin",
                    onboarding ? "text-white/50" : "text-muted-foreground",
                  )}
                />
              )}
              {tierLabel && !onboarding && (
                <Badge
                  variant="outline"
                  className="text-[10px] bg-primary/10 text-primary border-primary/20"
                >
                  {tierLabel}
                </Badge>
              )}
            </div>
          </button>
        </CollapsibleTrigger>

        {showLinkStatus && (
          <div
            className={cn(
              "rounded-xl border p-3.5 space-y-2",
              linked
                ? "border-[#06C755]/40 bg-[#06C755]/5"
                : "border-dashed border-border bg-muted/30",
            )}
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-sm font-medium">
                <MessageCircle className="h-4 w-4 text-[#06C755]" />
                {linked
                  ? t("เชื่อมบัญชีแล้ว", "Account linked")
                  : t("ยังไม่ได้เชื่อมบัญชี", "Not linked yet")}
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  asChild
                  size="sm"
                  className={cn(
                    "h-8 text-xs gap-1",
                    linked
                      ? "bg-[#06C755]/10 text-[#06C755] border border-[#06C755]/30 hover:bg-[#06C755]/15"
                      : "bg-[#06C755] hover:bg-[#05b34c] text-white",
                  )}
                  variant={linked ? "outline" : "default"}
                >
                  <Link to="/line-link">
                    <LineGlyph className="h-3.5 w-3.5" />
                    {linked
                      ? t("จัดการการเชื่อม", "Manage link")
                      : t("เชื่อมบัญชี", "Link account")}
                  </Link>
                </Button>
                {!linked && (
                  <Button asChild size="sm" variant="ghost" className="h-8 text-xs">
                    <a href={LINE_URL} target="_blank" rel="noopener noreferrer">
                      {t("เพิ่มเพื่อน", "Add friend")} {LINE_ID}
                    </a>
                  </Button>
                )}
              </div>
            </div>
            {linked && linkedAt && (
              <p className="text-[11px] text-muted-foreground">
                {t("เชื่อมเมื่อ", "Linked")}{" "}
                {new Date(linkedAt).toLocaleString(locale === "en" ? "en-US" : "th-TH")}
              </p>
            )}
            {linked && (
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {t(
                  "ปรึกษา AI ในแชท @solofreelancer ได้ — ใช้เครดิตร่วมกับ Assistant บนเว็บ · พิมพ์「ทีมงาน」เพื่อคุยแอดมิน",
                  "Ask AI in @solofreelancer chat — shares credits with web Assistant · type「ทีมงาน」for human support",
                )}
              </p>
            )}
            {!linked && (
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {t(
                  "กด「เชื่อมบัญชี」เพื่อล็อกอิน — ใช้บัญชีเดียวกับแพลตฟอร์มโชว์เคส",
                  "Tap Link account to sign in — one account for showcase and desk",
                )}
              </p>
            )}
          </div>
        )}
      </div>

      <CollapsibleContent>
        <div
          className={cn(
            "space-y-5 border-t pt-4",
            embedded ? "px-0 pb-0 border-white/10" : "px-4 sm:px-5 pb-4 sm:pb-5 border-border/50",
          )}
        >
          {showTestSamples && linked && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5 w-full sm:w-auto"
              disabled={sendingSamples}
              onClick={() => void sendAllSamples()}
            >
              {sendingSamples ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              {t("ส่งตัวอย่างทั้งหมด", "Send all samples")}
            </Button>
          )}

          <div
            className={cn(
              "flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3",
              onboarding ? "border-white/10 bg-white/[0.04]" : "border-border/60 bg-muted/20",
            )}
          >
            <div>
              <Label className={cn("text-sm font-medium", onboarding && "text-white")}>
                {t("เปิดการแจ้งเตือน", "Enable notifications")}
              </Label>
              <p
                className={cn(
                  "text-[11px] mt-0.5",
                  onboarding ? "text-white/50" : "text-muted-foreground",
                )}
              >
                {linked
                  ? t(
                      "ส่งแจ้งเตือนเมื่อมีเหตุการณ์ที่เลือกด้านล่าง",
                      "Notify for selected events below",
                    )
                  : t("ต้องเชื่อมบัญชีก่อนจึงจะส่งได้", "Link your account first")}
              </p>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={toggleMaster}
              disabled={!linked || saving}
              aria-label={t("เปิดการแจ้งเตือน", "Enable notifications")}
            />
          </div>

          {visibleGroups.map((group) => (
            <div key={group.id} className="space-y-2.5">
              <div>
                <h3
                  className={cn(
                    "text-xs font-semibold",
                    onboarding ? "text-white/90" : "text-foreground",
                  )}
                >
                  {group.label[locale as UserLocale]}
                </h3>
                <p
                  className={cn(
                    "text-[11px]",
                    onboarding ? "text-white/45" : "text-muted-foreground",
                  )}
                >
                  {group.description[locale as UserLocale]}
                </p>
              </div>
              <div className="space-y-1.5">
                {group.kinds.map((kind) => {
                  const isQuotation = kind.key === "portal_quotation";
                  return (
                    <div
                      key={kind.key}
                      className={cn(
                        "flex items-start justify-between gap-3 rounded-lg border px-3 py-2.5",
                        onboarding ? "border-white/10 bg-white/[0.03]" : "border-border/50",
                        isQuotation && "opacity-60",
                      )}
                    >
                      <div className="min-w-0">
                        <p
                          className={cn(
                            "text-xs font-medium leading-snug",
                            onboarding ? "text-white/90" : undefined,
                          )}
                        >
                          {kind.label[locale as UserLocale]}
                        </p>
                        <p
                          className={cn(
                            "text-[10px] mt-0.5 leading-relaxed",
                            onboarding ? "text-white/45" : "text-muted-foreground",
                          )}
                        >
                          {kind.hint[locale as UserLocale]}
                        </p>
                      </div>
                      <Switch
                        checked={prefs[kind.key]}
                        onCheckedChange={(c) => toggleKind(kind.key, c)}
                        disabled={!enabled || !linked || saving || isQuotation}
                        className="shrink-0 mt-0.5"
                        aria-label={kind.label[locale as UserLocale]}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {onboarding && linked && (
            <Button
              type="button"
              className="w-full h-11 bg-[#06C755] hover:bg-[#05b34c] text-white font-semibold"
              disabled={saving}
              onClick={() => void enableMasterAndSave()}
            >
              {enabled
                ? t("บันทึกการตั้งค่าแล้ว ✓", "Settings saved ✓")
                : t("บันทึกและเปิดแจ้งเตือน", "Save and enable notifications")}
            </Button>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );

  if (embedded) return content;

  return (
    <Card className="glass border-border shadow-soft overflow-hidden">
      <CardContent className="p-0">{content}</CardContent>
    </Card>
  );
}
