import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { isAuthRoute } from "@/lib/onboardingRoutes";
import { Cookie, Settings2, X } from "lucide-react";
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
              : "fixed inset-x-0 bottom-0 z-40 p-3 sm:p-4 pointer-events-none"
          }
          role="dialog"
          aria-label="แบนเนอร์ความยินยอมคุกกี้"
        >
          <div
            className={
              compactAuth
                ? "pointer-events-auto rounded-xl border border-border/60 bg-background/95 backdrop-blur-xl shadow-lg p-3"
                : "max-w-3xl mx-auto pointer-events-auto rounded-2xl border border-border/60 bg-background/95 backdrop-blur-xl shadow-2xl p-4 sm:p-5"
            }
          >
            <div className="flex items-start gap-2 sm:gap-3">
              <div className="shrink-0 flex items-center justify-center text-primary">
                <Cookie className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.25} aria-hidden />
              </div>
              <div className="flex-1 min-w-0">
                <p className={compactAuth ? "text-xs font-medium text-foreground" : "text-sm font-medium text-foreground"}>
                  เราใช้คุกกี้ตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA)
                </p>
                {!compactAuth && (
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    คุกกี้ที่จำเป็นช่วยให้เข้าสู่ระบบได้ ส่วนคุกกี้อื่นช่วยจดจำการตั้งค่าและวิเคราะห์การใช้งาน — อ่าน{" "}
                    <Link to="/legal/cookies" className="inline-flex items-center min-h-11 py-1 text-primary hover:underline">
                      นโยบายคุกกี้
                    </Link>
                    {", "}
                    <Link to="/legal/privacy" className="inline-flex items-center min-h-11 py-1 text-primary hover:underline">
                      นโยบายความเป็นส่วนตัว
                    </Link>
                    {" "}และ{" "}
                    <Link to="/legal/terms" className="inline-flex items-center min-h-11 py-1 text-primary hover:underline">
                      ข้อกำหนด
                    </Link>
                  </p>
                )}
                <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2 sm:mt-3">
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
                  {!compactAuth && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1 min-h-11"
                      onClick={() => {
                        setBannerOpen(false);
                        setPrefsOpen(true);
                      }}
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                      ปรับแต่ง
                    </Button>
                  )}
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
        </div>
      )}

      <CookiePreferencesDialog open={prefsOpen} onOpenChange={setPrefsOpen} onSaved={onSaved} />
    </>
  );
};

export default CookieConsent;
