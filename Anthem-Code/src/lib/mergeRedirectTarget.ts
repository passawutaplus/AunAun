/** Merge incoming location search into the redirect target (target params win on conflict). */
export function mergeRedirectTarget(base: string, incomingSearch: string): string {
  const hashIndex = base.indexOf("#");
  const hash = hashIndex >= 0 ? base.slice(hashIndex) : "";
  const withoutHash = hashIndex >= 0 ? base.slice(0, hashIndex) : base;
  const qIndex = withoutHash.indexOf("?");
  const pathname = qIndex >= 0 ? withoutHash.slice(0, qIndex) : withoutHash;
  const baseParams = new URLSearchParams(qIndex >= 0 ? withoutHash.slice(qIndex + 1) : "");
  const incomingParams = new URLSearchParams(
    incomingSearch.startsWith("?") ? incomingSearch.slice(1) : incomingSearch,
  );
  incomingParams.forEach((value, key) => {
    if (!baseParams.has(key)) baseParams.set(key, value);
  });
  const qs = baseParams.toString();
  return `${qs ? `${pathname}?${qs}` : pathname}${hash}`;
}
