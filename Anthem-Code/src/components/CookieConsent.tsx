import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Cookie, Settings2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import CookiePreferencesDialog from "@/components/CookiePreferencesDialog";
import {
  acceptAllCookies,
  acceptEssentialOnly,
  COOKIE_PREFERENCES_OPEN_EVENT,
  hasConsentBannerPending,
} from "@/lib/cookieConsent";

const CookieConsent = () => {
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
          className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4 pointer-events-none"
          role="dialog"
          aria-label="แบนเนอร์ความยินยอมคุกกี้"
        >
          <div className="max-w-3xl mx-auto pointer-events-auto rounded-2xl border border-border/60 bg-background/95 backdrop-blur-xl shadow-2xl p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="shrink-0 flex items-center justify-center text-primary">
                <Cookie className="w-5 h-5" strokeWidth={2.25} aria-hidden />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  เราใช้คุกกี้และการเก็บข้อมูลในอุปกรณ์ตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA)
                </p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  คุกกี้ที่จำเป็นช่วยให้เข้าสู่ระบบได้ ส่วนคุกกี้อื่นช่วยจดจำการตั้งค่าและวิเคราะห์การใช้งาน — อ่าน{" "}
                  <Link to="/legal/cookies" className="text-primary hover:underline">
                    นโยบายคุกกี้
                  </Link>
                  {", "}
                  <Link to="/legal/privacy" className="text-primary hover:underline">
                    นโยบายความเป็นส่วนตัว
                  </Link>
                  {" "}และ{" "}
                  <Link to="/legal/terms" className="text-primary hover:underline">
                    ข้อกำหนด
                  </Link>
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Button
                    size="sm"
                    onClick={acceptAll}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    ยอมรับทั้งหมด
                  </Button>
                  <Button size="sm" variant="outline" onClick={essentialOnly}>
                    จำเป็นเท่านั้น
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1"
                    onClick={() => {
                      setBannerOpen(false);
                      setPrefsOpen(true);
                    }}
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    ปรับแต่ง
                  </Button>
                </div>
              </div>
              <button
                type="button"
                aria-label="ปิดและใช้คุกกี้จำเป็นเท่านั้น"
                onClick={essentialOnly}
                className="p-1.5 rounded-full hover:bg-accent text-muted-foreground"
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
