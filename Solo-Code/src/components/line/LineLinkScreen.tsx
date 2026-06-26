import * as React from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  Crown,
  ExternalLink,
  Loader2,
  LogOut,
  Shield,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";
import { LINE_ID, LINE_URL, LineGlyph } from "@/components/LineContactButton";
import { OfficialPartnershipBadge } from "@/components/brand/OfficialPartnershipBadge";
import {
  LINE_CHANNEL_ID,
  LINE_LIFF_ID,
  LINE_OA_ID,
  LINE_OAUTH_CODE_KEY,
  LINE_OAUTH_STATE_KEY,
  buildLineAuthorizeUrl,
  lineOAuthRedirectUri,
} from "@/lib/lineConfig";
import { initLiff, isLineInAppBrowser, liffConfigured } from "@/lib/lineLiff";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/useSubscription";
import { useMyInhouseOrgs } from "@/hooks/inhouse/useInhouseOrg";
import { LineNotificationPrefsPanel } from "@/components/line/LineNotificationPrefsPanel";

type Phase = "boot" | "need_auth" | "ready" | "linking" | "success" | "error";

type LineMeta = {
  displayName?: string;
  pictureUrl?: string;
};

const STEPS = [
  { id: 1, label: "เข้าสู่ระบบ So1o" },
  { id: 2, label: "ยืนยัน LINE" },
  { id: 3, label: "เปิดแจ้งเตือน" },
] as const;

async function callLineConnect(payload: Record<string, string>) {
  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;
  if (!token) throw new Error("กรุณาเข้าสู่ระบบก่อน");

  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/line-connect`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    const code = data?.error as string | undefined;
    if (code === "line_already_linked") {
      throw new Error("บัญชี LINE นี้เชื่อมกับ So1o อื่นแล้ว — ยกเลิกการเชื่อมที่บัญชีเดิมก่อน");
    }
    throw new Error(code ?? "เชื่อม LINE ไม่สำเร็จ");
  }
  return data as LineMeta & { ok: boolean; line_user_id?: string };
}

export function LineLinkScreen() {
  const navigate = useNavigate();
  const { user, loading: authLoading, profile, refreshProfile } = useAuth();
  const { isPro, tier } = useSubscription();
  const { data: inhouseOrgs = [] } = useMyInhouseOrgs();
  const showInhouseGroup = tier === "inhouse" || inhouseOrgs.length > 0;
  const [phase, setPhase] = React.useState<Phase>("boot");
  const [message, setMessage] = React.useState("");
  const [lineMeta, setLineMeta] = React.useState<LineMeta>({});
  const [unlinking, setUnlinking] = React.useState(false);
  const oauthCodeProcessedRef = React.useRef(false);

  const alreadyLinked = Boolean(profile?.line_messaging_user_id);

  const connectWithCode = React.useCallback(
    async (code: string) => {
      setPhase("linking");
      setMessage("");
      try {
        const result = await callLineConnect({
          mode: "oauth_code",
          code,
          redirect_uri: lineOAuthRedirectUri(),
        });
        setLineMeta({
          displayName: result.displayName,
          pictureUrl: result.pictureUrl,
        });
        await refreshProfile();
        setPhase("success");
        window.history.replaceState({}, "", "/line-link");
      } catch (e) {
        setPhase("error");
        setMessage(e instanceof Error ? e.message : "เชื่อม LINE ไม่สำเร็จ");
      }
    },
    [refreshProfile],
  );

  const connectWithLiff = React.useCallback(async () => {
    setPhase("linking");
    setMessage("");
    try {
      const liff = await initLiff();
      if (!liff.isLoggedIn()) {
        liff.login({ redirectUri: lineOAuthRedirectUri() });
        return;
      }
      const idToken = liff.getIDToken();
      if (!idToken) throw new Error("ไม่ได้รับ LINE ID token — ลองใหม่อีกครั้ง");
      const result = await callLineConnect({ mode: "id_token", id_token: idToken });
      const p = await liff.getProfile().catch(() => null);
      setLineMeta({
        displayName: result.displayName ?? p?.displayName,
        pictureUrl: result.pictureUrl ?? p?.pictureUrl,
      });
      await refreshProfile();
      setPhase("success");
    } catch (e) {
      setPhase("error");
      setMessage(e instanceof Error ? e.message : "เชื่อม LINE ไม่สำเร็จ");
    }
  }, [refreshProfile]);

  React.useEffect(() => {
    if (authLoading) return;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const oauthError = params.get("error");

    if (oauthError) {
      setPhase("error");
      setMessage("ยกเลิกการเชื่อม LINE หรือเกิดข้อผิดพลาด");
      return;
    }

    if (code && !oauthCodeProcessedRef.current) {
      oauthCodeProcessedRef.current = true;
      const saved = sessionStorage.getItem(LINE_OAUTH_STATE_KEY);
      if (!saved || saved !== state) {
        setPhase("error");
        setMessage("รหัสยืนยันไม่ตรง — ลองเชื่อมใหม่อีกครั้ง");
        return;
      }
      sessionStorage.removeItem(LINE_OAUTH_STATE_KEY);
      if (!user) {
        sessionStorage.setItem(LINE_OAUTH_CODE_KEY, code);
        setPhase("need_auth");
        return;
      }
      void connectWithCode(code);
      return;
    }

    if (!user) {
      setPhase("need_auth");
      return;
    }

    const pendingCode = sessionStorage.getItem(LINE_OAUTH_CODE_KEY);
    if (pendingCode) {
      sessionStorage.removeItem(LINE_OAUTH_CODE_KEY);
      void connectWithCode(pendingCode);
      return;
    }

    if (alreadyLinked) {
      setPhase("success");
      return;
    }

    if (liffConfigured() && isLineInAppBrowser()) {
      void connectWithLiff();
      return;
    }

    setPhase("ready");
  }, [authLoading, user, alreadyLinked, connectWithCode, connectWithLiff]);

  function startOAuth() {
    const state = crypto.randomUUID();
    sessionStorage.setItem(LINE_OAUTH_STATE_KEY, state);
    window.location.href = buildLineAuthorizeUrl(state);
  }

  async function unlink() {
    if (!confirm("ยกเลิกการเชื่อม LINE? จะไม่ได้รับ Push แจ้งเตือนอีก")) return;
    setUnlinking(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) throw new Error("กรุณาเข้าสู่ระบบก่อน");
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/line-connect`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
        },
      });
      if (!res.ok) throw new Error("ยกเลิกการเชื่อมไม่สำเร็จ");
      await refreshProfile();
      setLineMeta({});
      setPhase("ready");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "ยกเลิกการเชื่อมไม่สำเร็จ");
      setPhase("error");
    } finally {
      setUnlinking(false);
    }
  }

  const stepDone =
    phase === "success" ? 3 : phase === "linking" || phase === "ready" ? 2 : user ? 2 : 1;

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0b1410] text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(6,199,85,0.35), transparent 55%), radial-gradient(ellipse 50% 40% at 100% 100%, rgba(6,199,85,0.12), transparent 50%)",
        }}
      />

      <div className="relative z-10 max-w-lg mx-auto px-4 py-8 sm:py-12">
        <button
          type="button"
          onClick={() => navigate({ to: "/dashboard", search: { tab: "settings" } })}
          className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          กลับการตั้งค่า
        </button>

        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#06C755] shadow-lg shadow-[#06C755]/30 mb-4">
            <LineGlyph className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">เชื่อม LINE</h1>
          <p className="text-sm text-white/60 mt-2 leading-relaxed max-w-sm mx-auto">
            รับ Push ทันทีเมื่อมีคำขอจ้างจาก Aplus1 ลูกค้าอัปสลิป หรือยืนยันบรีฟ — บัญชีเดียวกับ
            So1o Pro
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s) => (
            <div key={s.id} className="flex items-center gap-2">
              <div
                className={cn(
                  "h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold border transition-colors",
                  stepDone >= s.id
                    ? "bg-[#06C755] border-[#06C755] text-white"
                    : "border-white/20 text-white/40",
                )}
              >
                {stepDone > s.id ? <CheckCircle2 className="h-4 w-4" /> : s.id}
              </div>
              <span
                className={cn(
                  "text-[11px] hidden sm:inline",
                  stepDone >= s.id ? "text-white/80" : "text-white/35",
                )}
              >
                {s.label}
              </span>
              {s.id < STEPS.length && <div className="w-6 h-px bg-white/15 hidden sm:block" />}
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl p-6 sm:p-8 shadow-2xl space-y-5">
          {phase === "boot" || phase === "linking" ? (
            <div className="py-10 flex flex-col items-center gap-3 text-white/70">
              <Loader2 className="h-8 w-8 animate-spin text-[#06C755]" />
              <p className="text-sm">กำลังเชื่อมบัญชี LINE…</p>
            </div>
          ) : null}

          {phase === "need_auth" && (
            <div className="text-center space-y-4 py-4">
              <Shield className="h-10 w-10 text-[#06C755] mx-auto opacity-80" />
              <p className="text-sm text-white/70">
                เข้าสู่ระบบ So1o หรือ Aplus1 ก่อน แล้วกลับมาเชื่อม LINE
              </p>
              <Button asChild className="w-full bg-[#06C755] hover:bg-[#05b34c] text-white h-11">
                <Link to="/auth" search={{ redirect: "/line-link" }}>
                  เข้าสู่ระบบ
                </Link>
              </Button>
            </div>
          )}

          {phase === "ready" && (
            <div className="space-y-5">
              <div className="rounded-xl bg-black/25 border border-white/8 p-4 space-y-3 text-sm text-white/75">
                <div className="flex gap-3">
                  <span className="text-[#06C755] font-bold">1</span>
                  <span>กดปุ่มด้านล่างเพื่อล็อกอิน LINE (ช่อง {LINE_OA_ID})</span>
                </div>
                <div className="flex gap-3">
                  <span className="text-[#06C755] font-bold">2</span>
                  <span>เพิ่มเพื่อน Official Account ถ้ายังไม่ได้เพิ่ม</span>
                </div>
                <div className="flex gap-3">
                  <span className="text-[#06C755] font-bold">3</span>
                  <span>เปิดแจ้งเตือนใน Settings → LINE</span>
                </div>
              </div>

              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-2 text-left">
                <p className="text-xs font-medium text-amber-200">
                  ถ้าเจอ 400 Bad Request — ลงทะเบียน Callback URL นี้ใน LINE Console (ช่อง Login{" "}
                  {LINE_CHANNEL_ID})
                </p>
                <code className="block text-[11px] text-white/90 break-all rounded-lg bg-black/30 px-2.5 py-2 font-mono">
                  {lineOAuthRedirectUri()}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs border-white/20 text-white hover:bg-white/10"
                  onClick={() => {
                    void navigator.clipboard.writeText(lineOAuthRedirectUri());
                    toast.success("คัดลอก Callback URL แล้ว");
                  }}
                >
                  คัดลอก URL ไปวางใน LINE Console
                </Button>
              </div>

              <Button
                type="button"
                onClick={() =>
                  liffConfigured() && isLineInAppBrowser() ? void connectWithLiff() : startOAuth()
                }
                className="w-full h-12 bg-[#06C755] hover:bg-[#05b34c] text-white font-semibold text-base gap-2 shadow-lg shadow-[#06C755]/25"
              >
                <LineGlyph className="h-5 w-5" />
                เชื่อมด้วย LINE
              </Button>

              <Button
                asChild
                variant="outline"
                className="w-full border-white/15 bg-transparent text-white hover:bg-white/5 h-10"
              >
                <a href={LINE_URL} target="_blank" rel="noopener noreferrer">
                  เพิ่มเพื่อน {LINE_ID}
                  <ExternalLink className="h-3.5 w-3.5 ml-2 opacity-60" />
                </a>
              </Button>

              <p className="text-[10px] text-center text-white/35">
                Channel {LINE_CHANNEL_ID}
                {liffConfigured() ? ` · LIFF ${LINE_LIFF_ID.slice(0, 8)}…` : ""}
              </p>
            </div>
          )}

          {phase === "success" && (
            <div className="space-y-4 py-2">
              <div className="text-center space-y-3">
                <OfficialPartnershipBadge />
                {lineMeta.pictureUrl ? (
                  <img
                    src={lineMeta.pictureUrl}
                    alt=""
                    className="h-16 w-16 rounded-full mx-auto ring-2 ring-[#06C755]/50 object-cover"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full mx-auto bg-[#06C755]/20 flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8 text-[#06C755]" />
                  </div>
                )}
                <div>
                  <p className="text-lg font-semibold text-[#06C755]">เชื่อมสำเร็จ</p>
                  {lineMeta.displayName && (
                    <p className="text-sm text-white/70 mt-1">{lineMeta.displayName}</p>
                  )}
                  <p className="text-xs text-white/50 mt-2">
                    ใช้ได้ทั้ง So1o และ Aplus1 · เลือกประเภทแจ้งเตือนด้านล่าง
                  </p>
                </div>
              </div>

              {isPro ? (
                <LineNotificationPrefsPanel
                  variant="onboarding"
                  defaultOpen
                  embedded
                  showLinkStatus={false}
                  showInhouseGroup={showInhouseGroup}
                />
              ) : (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-center space-y-3">
                  <p className="text-sm text-amber-100/90">
                    เชื่อมบัญชีแล้ว — อัปเกรด Pro เพื่อรับ Push แจ้งเตือน
                  </p>
                  <Button
                    asChild
                    className="w-full bg-[#06C755] hover:bg-[#05b34c] text-white h-10 gap-2"
                  >
                    <Link to="/pricing">
                      <Crown className="h-4 w-4" />
                      อัปเกรดเป็น Pro
                    </Link>
                  </Button>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-1">
                <Button
                  asChild
                  variant="outline"
                  className="w-full border-white/15 text-white hover:bg-white/5 h-10 gap-2"
                >
                  <a href={LINE_URL} target="_blank" rel="noopener noreferrer">
                    <Sparkles className="h-4 w-4 text-[#06C755]" />
                    เปิดแชท {LINE_ID}
                  </a>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-white/45 hover:text-white/70 hover:bg-white/5 h-9 text-xs gap-1.5"
                  disabled={unlinking}
                  onClick={() => void unlink()}
                >
                  {unlinking ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <LogOut className="h-3.5 w-3.5" />
                  )}
                  ยกเลิกการเชื่อม
                </Button>
              </div>
            </div>
          )}

          {phase === "error" && (
            <div className="text-center space-y-4 py-4">
              <p className="text-sm text-rose-300">{message || "เกิดข้อผิดพลาด"}</p>
              {(message.includes("redirect_uri") ||
                message.includes("line_token_exchange") ||
                message.includes("invalid_client")) && (
                <div className="text-left text-[11px] text-white/55 rounded-lg border border-white/10 bg-black/20 p-3 space-y-1.5">
                  <p className="font-medium text-white/75">หา Callback URL ไม่เจอ?</p>
                  <p>
                    ช่อง Messaging API (@solofreelancer) <strong>ไม่มี</strong> ช่องใส่ Callback —
                    ต้องสร้างช่อง
                    <strong> LINE Login</strong> แยก (Provider เดียวกัน) แล้วใส่ Callback ที่แท็บ
                    LINE Login
                  </p>
                  <p className="text-white/40">
                    ดูขั้นตอน: docs/setup-line.md → 「ทำไมหา Callback ไม่เจอ」
                  </p>
                </div>
              )}
              <Button
                type="button"
                onClick={() => {
                  setMessage("");
                  setPhase("ready");
                }}
                className="w-full bg-[#06C755] hover:bg-[#05b34c] text-white"
              >
                ลองใหม่
              </Button>
            </div>
          )}
        </div>

        <p className="text-center text-[10px] text-white/30 mt-6 leading-relaxed">
          ข้อมูล LINE ใช้เฉพาะส่งแจ้งเตือน Push · ไม่แชร์กับบุคคลที่สาม
        </p>
      </div>
    </div>
  );
}
