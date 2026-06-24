/** Merge incoming location search into the redirect target (target params win on conflict). */
export function mergeRedirectTarget(base: string, incomingSearch: string): string {
  const qIndex = base.indexOf("?");
  const pathname = qIndex >= 0 ? base.slice(0, qIndex) : base;
  const baseParams = new URLSearchParams(qIndex >= 0 ? base.slice(qIndex + 1) : "");
  const incomingParams = new URLSearchParams(
    incomingSearch.startsWith("?") ? incomingSearch.slice(1) : incomingSearch,
  );
  incomingParams.forEach((value, key) => {
    if (!baseParams.has(key)) baseParams.set(key, value);
  });
  const qs = baseParams.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}
