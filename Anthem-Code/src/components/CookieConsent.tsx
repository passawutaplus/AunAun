import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { isAuthRoute } from "@/lib/onboardingRoutes";
import { Cookie, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { CONSENT } from "@/lib/i18n/consent";
import CookiePreferencesDialog from "@/components/CookiePreferencesDialog";
import {
  acceptAllCookies,
  acceptEssentialOnly,
  COOKIE_PREFERENCES_OPEN_EVENT,
  hasConsentBannerPending,
} from "@/lib/cookieConsent";

const acceptClass =
  "min-h-10 rounded-full border-0 bg-foreground px-4 text-background shadow-none hover:bg-foreground/90 hover:text-background";
const declineClass =
  "min-h-10 rounded-full border-border dark:border-border bg-white dark:bg-card text-foreground shadow-none hover:border-border dark:border-border hover:bg-background hover:text-foreground";

const CookieConsent = () => {
  const t = useT(CONSENT);
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
              : "fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom,0px)+5.5rem)] z-40 pointer-events-none sm:inset-x-6 lg:inset-x-0 lg:bottom-3"
          }
          role="dialog"
          aria-label={t("region")}
        >
          {compactAuth ? (
            <div className="pointer-events-auto rounded-2xl border border-white/40 dark:border-white/10 bg-background/60 backdrop-blur-2xl backdrop-saturate-150 p-3 text-foreground shadow-lg">
              <div className="flex items-start gap-2">
                <div className="flex shrink-0 items-center justify-center text-foreground">
                  <Cookie className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground">
                    {t("title")}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Button size="sm" onClick={acceptAll} className={`${acceptClass} min-h-11`}>
                      {t("acceptAll")}
                    </Button>
                    <Button size="sm" variant="outline" onClick={essentialOnly} className={`${declineClass} min-h-11`}>
                      {t("essentialOnly")}
                    </Button>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={t("closeEssential")}
                  onClick={essentialOnly}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/8 hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="pointer-events-none mx-auto w-full max-w-md lg:w-fit lg:max-w-[min(100%-2rem,52rem)]">
              <div className="pointer-events-auto rounded-2xl border border-white/40 dark:border-white/10 bg-background/60 backdrop-blur-2xl backdrop-saturate-150 p-4 text-foreground shadow-lg lg:px-5 lg:py-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
                <div className="flex min-w-0 flex-1 items-start gap-2.5">
                  <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-foreground" strokeWidth={2.25} aria-hidden />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {t("title")}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      <Link to="/legal/cookies" className="text-foreground underline underline-offset-2">
                        {t("cookiePolicy")}
                      </Link>
                      {" · "}
                      <Link to="/legal/privacy" className="text-foreground underline underline-offset-2">
                        {t("privacy")}
                      </Link>
                      {" · "}
                      <Link to="/legal/terms" className="text-foreground underline underline-offset-2">
                        {t("terms")}
                      </Link>
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 lg:flex lg:shrink-0 lg:justify-end">
                  <Button size="sm" onClick={acceptAll} className={`${acceptClass} w-full lg:w-auto`}>
                    {t("acceptAll")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={essentialOnly} className={`${declineClass} w-full lg:w-auto`}>
                    {t("essentialOnly")}
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
