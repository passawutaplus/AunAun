import { useEffect, useRef } from "react";
import { useCookieConsent } from "@/hooks/useCookieConsent";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function measurementId(): string | undefined {
  const id = (import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined)?.trim();
  return id || undefined;
}

/**
 * Loads GA4 only when analytics cookie consent is granted and VITE_GA_MEASUREMENT_ID is set.
 */
const GoogleAnalytics = () => {
  const { consent } = useCookieConsent();
  const loaded = useRef(false);
  const id = measurementId();

  useEffect(() => {
    if (!id || !consent?.analytics || loaded.current) return;
    if (typeof document === "undefined") return;

    loaded.current = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer?.push(args);
    };
    window.gtag("js", new Date());
    window.gtag("config", id, { anonymize_ip: true });

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    document.head.appendChild(script);
  }, [consent?.analytics, id]);

  return null;
};

export default GoogleAnalytics;
