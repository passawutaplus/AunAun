import { useEffect } from "react";

/**
 * Privacy switches of Settings kept in profiles.public_visibility (read by anyone, like the other keys there):
 * "creators" = show on the Creators tab and in people search, "search" = let Google find the profile and works.
 * A missing key means on (the default of the mock).
 */
const flag = (pv: unknown, key: "creators" | "search") =>
  !(pv && typeof pv === "object" && (pv as Record<string, unknown>)[key] === false);

export const listedOnCreators = (pv: unknown) => flag(pv, "creators");
export const indexableBySearch = (pv: unknown) => flag(pv, "search");

/** `<meta name="robots" content="noindex">` while a page of someone who turned "ให้ค้นเจอจาก Google" off is open. */
export function useNoIndex(noindex: boolean) {
  useEffect(() => {
    if (!noindex) return;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const created = !meta;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "robots";
      document.head.appendChild(meta);
    }
    const before = meta.content;
    meta.content = "noindex, nofollow";
    return () => {
      if (created) meta?.remove();
      else if (meta) meta.content = before;
    };
  }, [noindex]);
}
