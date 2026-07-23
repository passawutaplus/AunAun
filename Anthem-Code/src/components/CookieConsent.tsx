import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { isAuthRoute } from "@/lib/onboardingRoutes";
import { Cookie, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import CookiePreferencesDialog from "@/components/CookiePreferencesDialog";
import {
  acceptAllCookies,
  acceptEssentialOnly,
  COOKIE_PREFERENCES_OPEN_EVENT,
  hasConsentBannerPending,
} from "@/lib/cookieConsent";
import { useAuth } from "@/hooks/useAuth";
import { useEnsureSensitiveAction } from "@/components/legal/SensitiveActionReauthProvider";

const CookieConsent = () => {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const ensureVerified = useEnsureSensitiveAction();
  const compactAuth = isAuthRoute(pathname);
  const [bannerOpen, setBannerOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);

  useEffect(() => {
    setBannerOpen(hasConsentBannerPending());
  }, []);

  useEffect(() => {
    const openPrefs = () => {
      setBannerOpen(false);
      setPrefsOpen(true);
    };
    window.addEventListener(COOKIE_PREFERENCES_OPEN_EVENT, openPrefs);
    return () => window.removeEventListener(COOKIE_PREFERENCES_OPEN_EVENT, openPrefs);
  }, []);

  const onSaved = () => {
    setBannerOpen(false);
    setPrefsOpen(false);
  };

  const withLoggedInReauth = async (action: () => void) => {
    try {
      if (user) {
        await ensureVerified("เปลี่ยนการตั้งค่าความยินยอมคุกกี้");
      }
      action();
      onSaved();
    } catch {
      /* ยกเลิก */
    }
  };

  const acceptAll = () => void withLoggedInReauth(acceptAllCookies);

  const essentialOnly = () => void withLoggedInReauth(acceptEssentialOnly);

  return (
    <>
      {bannerOpen && (
        <div
          className={
            compactAuth
              ? "fixed bottom-3 right-3 z-40 max-w-[min(100vw-1.5rem,22rem)] pointer-events-none sm:bottom-4 sm:right-4"
              : "fixed inset-x-0 bottom-0 z-40 pb-2 sm:pb-3 pointer-events-none"
          }
          role="dialog"
          aria-label="แบนเนอร์ความยินยอมคุกกี้"
        >
          {compactAuth ? (
            <div className="pointer-events-auto rounded-xl border border-border/60 bg-background/95 backdrop-blur-xl shadow-lg p-3">
              <div className="flex items-start gap-2">
                <div className="shrink-0 flex items-center justify-center text-primary">
                  <Cookie className="w-4 h-4" strokeWidth={2.25} aria-hidden />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">
                    เราใช้คุกกี้ตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA)
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <Button
                      size="sm"
                      onClick={acceptAll}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 min-h-11"
                    >
                      ยอมรับทั้งหมด
                    </Button>
                    <Button size="sm" variant="outline" onClick={essentialOnly} className="min-h-11">
                      ปฏิเสธที่ไม่จำเป็น
                    </Button>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="ปิดและใช้คุกกี้จำเป็นเท่านั้น"
                  onClick={essentialOnly}
                  className="p-2 min-h-11 min-w-11 inline-flex items-center justify-center rounded-full hover:bg-accent text-muted-foreground shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="mx-auto w-fit max-w-[calc(100%-1.5rem)] sm:max-w-[min(100%-2rem,52rem)] pointer-events-none">
              <div
                className={
                  "pointer-events-auto rounded-2xl border border-white/15 " +
                  "bg-background/45 backdrop-blur-2xl backdrop-saturate-150 " +
                  "supports-[backdrop-filter]:bg-background/35 " +
                  "shadow-[0_8px_32px_-12px_rgba(0,0,0,0.45),inset_0_1px_0_0_hsl(0_0%_100%_/_0.08)] " +
                  "dark:border-white/10 dark:bg-background/40 dark:supports-[backdrop-filter]:bg-background/30 " +
                  "px-4 py-3 sm:px-5"
                }
              >
              <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:gap-4">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <Cookie className="w-5 h-5 shrink-0 text-primary mt-0.5" strokeWidth={2.25} aria-hidden />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      เราใช้คุกกี้ตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA)
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      คุกกี้ที่จำเป็นช่วยให้ใช้งานได้ ส่วนคุกกี้อื่นช่วยจดจำการตั้งค่าและวิเคราะห์การใช้งาน — อ่าน{" "}
                      <Link to="/legal/cookies" className="text-primary hover:underline">
                        นโยบายคุกกี้
                      </Link>
                      {" · "}
                      <Link to="/legal/privacy" className="text-primary hover:underline">
                        ความเป็นส่วนตัว
                      </Link>
                      {" · "}
                      <Link to="/legal/terms" className="text-primary hover:underline">
                        ข้อกำหนด
                      </Link>
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 lg:shrink-0 lg:justify-end">
                  <Button
                    size="sm"
                    onClick={acceptAll}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 min-h-10"
                  >
                    ยอมรับทั้งหมด
                  </Button>
                  <Button size="sm" variant="outline" onClick={essentialOnly} className="min-h-10">
                    ปฏิเสธที่ไม่จำเป็น
                  </Button>
                </div>
              </div>
              </div>
            </div>
          )}
        </div>
      )}

      <CookiePreferencesDialog open={prefsOpen} onOpenChange={setPrefsOpen} onSaved={onSaved} />
    </>
  );
};

export default CookieConsent;
