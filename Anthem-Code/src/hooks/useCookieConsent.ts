import { useCallback, useEffect, useState } from "react";
import {
  COOKIE_PREFERENCES_OPEN_EVENT,
  type CookieConsentPreferences,
  readCookieConsent,
  writeCookieConsent,
} from "@/lib/cookieConsent";

export function useCookieConsent() {
  const [consent, setConsent] = useState<CookieConsentPreferences | null>(() => readCookieConsent());

  const refresh = useCallback(() => setConsent(readCookieConsent()), []);

  const save = useCallback(
    (functional: boolean, analytics: boolean) => {
      const next = writeCookieConsent({ functional, analytics });
      setConsent(next);
      return next;
    },
    [],
  );

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key.includes("cookie-consent")) refresh();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refresh]);

  return { consent, refresh, save };
}
