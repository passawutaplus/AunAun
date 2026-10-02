import { esc, escA } from "./utils.js";

/** How a saved reference may be used in client work. Guessed from the source, user can override. */
export const USAGE_RIGHTS = {
  free: { label: "Free to use", short: "Free to use", hint: "Public domain / CC0. Use in client work; credit is appreciated." },
  credit: { label: "Free license", short: "Free license", hint: "Free under the site's own license (e.g. Unsplash). Check its terms; credit is good practice." },
  reference: { label: "Reference only", short: "Reference", hint: "Rights unknown. Use for inspiration, not in final work." },
};

export const USAGE_RIGHTS_LEVELS = Object.keys(USAGE_RIGHTS);

/**
 * Stock sites whose own license allows free commercial use. Museum sites are NOT listed:
 * they mix public-domain and copyrighted objects, so only an explicit CC0 license marks an item free.
 */
const FREE_LICENSE_HOSTS = ["unsplash.com", "pexels.com", "pixabay.com"];

/** Open-access museums: still reference-only by default, but the hint points to the object page. */
const OPEN_ACCESS_HOSTS = ["metmuseum.org", "artic.edu", "clevelandart.org", "si.edu", "cooperhewitt.org", "nga.gov", "rijksmuseum.nl"];

function sourceKey(url) {
  try {
    const u = new URL(String(url || ""));
    return (u.hostname.replace(/^www\./, "") + u.pathname).toLowerCase();
  } catch (e) {
    return "";
  }
}

function matches(key, list) {
  return list.some(rule => {
    const [host, ...path] = rule.split("/");
    const keyHost = key.split("/")[0];
    const hostOk = keyHost === host || keyHost.endsWith("." + host);
    return hostOk && (!path.length || key.includes("/" + path.join("/")));
  });
}

/** Level guessed from license fields and the source URL, ignoring any user override. */
export function guessUsageRights(item) {
  const ctx = (item && item.captureContext) || {};
  const license = String(ctx.license || "").toLowerCase();
  if (license === "cc0" || license === "public-domain") return "free";
  if (/^cc-by/.test(license)) return "credit";
  const key = sourceKey(item && item.sourceUrl);
  if (!key) return "reference";
  if (matches(key, FREE_LICENSE_HOSTS)) return "credit";
  return "reference";
}

let rightsMode = "auto";

/** "reference" makes every unlabeled item reference-only (user preference in Settings). */
export function setUsageRightsMode(mode) {
  rightsMode = mode === "reference" ? "reference" : "auto";
}

export function usageRights(item) {
  const set = String(((item && item.captureContext) || {}).usageRights || "");
  if (USAGE_RIGHTS[set]) return { level: set, auto: false };
  return { level: rightsMode === "reference" ? "reference" : guessUsageRights(item), auto: true };
}

const SHIELD = "<svg viewBox='0 0 24 24' width='12' height='12' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path d='M12 3 5 6v5c0 4.4 3 8.3 7 9.5 4-1.2 7-5.1 7-9.5V6z'/><path d='m9 12 2 2 4-4'/></svg>";

/** Small pill on grid cards. Reference-only is the default state, so it stays hidden to keep cards quiet. */
export function usageRightsCardBadge(item) {
  const { level } = usageRights(item);
  if (level === "reference") return "";
  const r = USAGE_RIGHTS[level];
  return `<span class='rights-badge is-${level}' title='${escA(r.label + " — " + r.hint)}'>${SHIELD}${esc(r.short)}</span>`;
}

/** Detail drawer section: current level (click = filter Vault by it) + override select. */
export function usageRightsDetailMarkup(item) {
  const { level, auto } = usageRights(item);
  const r = USAGE_RIGHTS[level];
  const options = [`<option value=''${auto ? " selected" : ""}>Auto (${esc(USAGE_RIGHTS[guessUsageRights(item)].label)})</option>`]
    .concat(USAGE_RIGHTS_LEVELS.map(k => `<option value='${k}'${!auto && k === level ? " selected" : ""}>${esc(USAGE_RIGHTS[k].label)}</option>`))
    .join("");
  return `<div class='analysis-section rights-section'><span>Usage rights</span><div class='rights-row'><button type='button' class='rights-badge is-${level} is-large' data-filter-rights='${level}' title='Show all ${escA(r.label.toLowerCase())} items'>${SHIELD}${esc(r.label)}</button><select class='rights-select' data-rights-select='${escA(item.id)}' aria-label='Set usage rights'>${options}</select></div><p class='rights-hint'>${esc(r.hint)}${auto ? (level === "reference" && matches(sourceKey(item.sourceUrl), OPEN_ACCESS_HOSTS) ? " This museum publishes many works as CC0 — check the object page, then set Free to use." : " Guessed from the source.") : ""}</p></div>`;
}
