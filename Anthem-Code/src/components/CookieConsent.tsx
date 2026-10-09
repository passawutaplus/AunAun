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

const acceptClass =
  "min-h-10 rounded-full border-0 bg-[#2f2e2c] px-4 text-[#f5f5f5] shadow-none hover:bg-[#2f2e2c]/90 hover:text-[#f5f5f5]";
const declineClass =
  "min-h-10 rounded-full border-[#e4e1db] bg-white text-[#2f2e2c] shadow-none hover:border-[#e4e1db] hover:bg-[#f5f5f5] hover:text-[#2f2e2c]";

const CookieConsent = () => {
  const { pathname } = useLocation();
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

  const acceptAll = () => {
    acceptAllCookies();
    onSaved();
  };

  const essentialOnly = () => {
    acceptEssentialOnly();
    onSaved();
  };

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
            <div className="pointer-events-auto rounded-2xl border border-[#e4e1db] bg-[#f5f5f5] p-3 text-[#2f2e2c] shadow-[0_16px_40px_-18px_rgba(47,46,44,0.45)]">
              <div className="flex items-start gap-2">
                <div className="flex shrink-0 items-center justify-center text-[#2f2e2c]">
                  <Cookie className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-[#2f2e2c]">
                    เราใช้คุกกี้ตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA)
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Button size="sm" onClick={acceptAll} className={`${acceptClass} min-h-11`}>
                      ยอมรับทั้งหมด
                    </Button>
                    <Button size="sm" variant="outline" onClick={essentialOnly} className={`${declineClass} min-h-11`}>
                      ปฏิเสธที่ไม่จำเป็น
                    </Button>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="ปิดและใช้คุกกี้จำเป็นเท่านั้น"
                  onClick={essentialOnly}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#6b6862] hover:bg-[#2f2e2c]/8 hover:text-[#2f2e2c]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="pointer-events-none mx-auto w-fit max-w-[calc(100%-1.5rem)] sm:max-w-[min(100%-2rem,52rem)]">
              <div className="pointer-events-auto rounded-2xl border border-[#e4e1db] bg-[#f5f5f5] px-4 py-3 text-[#2f2e2c] shadow-[0_16px_48px_-20px_rgba(47,46,44,0.45)] sm:px-5">
              <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:gap-4">
                <div className="flex min-w-0 flex-1 items-start gap-2.5">
                  <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-[#2f2e2c]" strokeWidth={2.25} aria-hidden />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#2f2e2c]">
                      เราใช้คุกกี้ตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA)
                    </p>
                    <p className="mt-0.5 text-xs text-[#6b6862]">
                      คุกกี้ที่จำเป็นช่วยให้ใช้งานได้ ส่วนคุกกี้อื่นช่วยจดจำการตั้งค่าและวิเคราะห์การใช้งาน — อ่าน{" "}
                      <Link to="/legal/cookies" className="text-[#2f2e2c] underline underline-offset-2">
                        นโยบายคุกกี้
                      </Link>
                      {" · "}
                      <Link to="/legal/privacy" className="text-[#2f2e2c] underline underline-offset-2">
                        ความเป็นส่วนตัว
                      </Link>
                      {" · "}
                      <Link to="/legal/terms" className="text-[#2f2e2c] underline underline-offset-2">
                        ข้อกำหนด
                      </Link>
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 lg:shrink-0 lg:justify-end">
                  <Button size="sm" onClick={acceptAll} className={acceptClass}>
                    ยอมรับทั้งหมด
                  </Button>
                  <Button size="sm" variant="outline" onClick={essentialOnly} className={declineClass}>
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
