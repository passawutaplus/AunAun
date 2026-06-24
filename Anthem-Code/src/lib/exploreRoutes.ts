/** URL helpers for tool/tag explore galleries */

export type ExploreKind = "tool" | "tag";

export function exploreProjectsUrl(kind: ExploreKind, value: string): string {
  return `/explore/${kind}/${encodeURIComponent(value.trim())}`;
}

export function decodeExploreParam(raw: string | undefined): string {
  if (!raw) return "";
  try {
    return decodeURIComponent(raw).trim();
  } catch {
    return raw.trim();
  }
}

export function normalizeTag(tag: string): string {
  return tag.trim().replace(/^#+/, "").toLowerCase();
}

export function normalizeToolName(tool: string): string {
  return tool.trim().toLowerCase();
}

/** Extra tools in multi-tool explore (`?with=Premiere,Photoshop`). */
export function parseExtraTools(searchParams: URLSearchParams): string[] {
  const raw = searchParams.get("with");
  if (!raw) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(",")) {
    let label = part.trim();
    if (!label) continue;
    try {
      label = decodeURIComponent(label).trim();
    } catch {
      /* keep raw */
    }
    const key = normalizeToolName(label);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out;
}

export function extraToolsQuery(extraTools: string[]): string {
  if (extraTools.length === 0) return "";
  return `with=${extraTools.map((t) => encodeURIComponent(t.trim())).join(",")}`;
}
