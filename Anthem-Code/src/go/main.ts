/**
 * /go — landing page behind the NFC business card (`/go?src=card`) and printed QR codes
 * (`?src=qr|poster|flyer|booth`). Kept outside the React app so it stays tiny (no app bundle).
 */
import "./go.css";
import { joinedPillPath } from "./shape";

// ---- config: every outbound link and asset lives here ----
const config = {
  web: "https://samecor.com/",
  stores: [
    // Flip `live` to true and set `href` when each store listing is public.
    { name: "Google Play", img: "/go/badges/google-play.png", href: "https://play.google.com/store/apps/details?id=com.samecor.app", live: false },
    { name: "App Store", img: "/go/badges/app-store.png", href: "", live: false },
  ],
  socials: [
    {
      name: "Facebook",
      href: "https://www.facebook.com/samecor2026",
      icon: '<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z"/>',
    },
    {
      name: "LINE Official Account",
      href: "https://lin.ee/VMcniAW",
      icon: '<path d="M12 4C7 4 3 7.2 3 11.2c0 3.6 3.2 6.6 7.5 7.1l-.4 2.2c-.1.4.3.7.7.5 2.6-1.5 7.6-4.8 8.9-7.4.5-.8.3-1.6.3-2.4C21 7.2 17 4 12 4z"/>',
    },
  ],
  // Shown only if the live works can't be loaded (offline, API down).
  fallbackWorks: [
    { src: "/go/works/01-posters-lamp.jpg", alt: "Poster series beside a desk lamp" },
    { src: "/go/works/02-show-posters.jpg", alt: "Exhibition show posters" },
    { src: "/go/works/03-campaign-hero.jpg", alt: "Campaign hero visual" },
    { src: "/go/works/04-social-row.jpg", alt: "Row of social media posts" },
    { src: "/go/works/05-profile-set.jpg", alt: "Designer profile set" },
    { src: "/go/works/06-profile-posters.jpg", alt: "Profile posters on a wall" },
  ],
  /** How many of the most-liked / most-viewed published works to pull, then shuffle. */
  liveWorks: 12,
};

const SOURCES = new Set(["card", "qr", "poster", "flyer", "booth"]);
const rawSrc = new URLSearchParams(location.search).get("src") ?? "";
const src = SOURCES.has(rawSrc) ? rawSrc : "direct";

/** Our own links carry `src` on, so the web app's page_view records where the visit came from. */
function withSrc(url: string): string {
  const u = new URL(url);
  if (u.hostname.endsWith("samecor.com")) u.searchParams.set("src", src);
  return u.toString();
}

const escapeAttr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

function render() {
  const web = document.getElementById("web") as HTMLAnchorElement;
  web.href = withSrc(config.web);
  web.addEventListener("click", () => track("cta_ecosystem", { target: "web" }));

  // Draw the joined pill + circle to the button's current width (it shrinks on very narrow phones).
  const drawCta = () => {
    const { width, height } = web.getBoundingClientRect();
    const svg = web.querySelector<SVGSVGElement>(".cta-bg")!;
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.querySelector("path")!.setAttribute("d", joinedPillPath(width - height - 12, height));
  };
  drawCta();
  new ResizeObserver(drawCta).observe(web);

  document.getElementById("stores")!.innerHTML = config.stores
    .map((s) =>
      s.live && s.href
        ? `<a class="store" href="${escapeAttr(s.href)}" rel="noopener"><img src="${s.img}" alt="Get it on ${escapeAttr(s.name)}"></a>`
        : `<span class="store" aria-disabled="true"><img src="${s.img}" alt="${escapeAttr(s.name)} — coming soon"><span class="soon">Coming soon</span></span>`,
    )
    .join("");

  document.getElementById("soc")!.innerHTML = config.socials
    .map(
      (s) =>
        `<a href="${escapeAttr(s.href)}" aria-label="${escapeAttr(s.name)}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true">${s.icon}</svg></a>`,
    )
    .join("");

}

type Work = { src: string; alt: string };

/** Works wall: display only, not tappable. Each column holds its set twice so the loop is seamless. */
function renderWorks(works: Work[]) {
  const column = (items: Work[], dir: "up" | "down") => {
    const set = (hidden: boolean) =>
      items
        .map((w) => `<img src="${escapeAttr(w.src)}" alt="${hidden ? "" : escapeAttr(w.alt)}" decoding="async">`)
        .join("");
    return `<div class="col ${dir}"><div class="set">${set(false)}</div><div class="set" aria-hidden="true">${set(true)}</div></div>`;
  };
  const half = Math.ceil(works.length / 2);
  document.getElementById("mq")!.innerHTML = column(works.slice(0, half), "up") + column(works.slice(half), "down");
}

/** Most-liked, then most-viewed published projects (public by RLS), shuffled so each visit differs. */
async function loadLiveWorks(): Promise<Work[]> {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return [];
  const q = new URLSearchParams({
    select: "title,cover_url",
    status: "eq.Published",
    cover_url: "not.is.null",
    order: "likes.desc.nullslast,views.desc.nullslast",
    limit: String(config.liveWorks),
  });
  const res = await fetch(`${url}/rest/v1/projects?${q}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Accept-Profile": "anthem" },
  });
  if (!res.ok) return [];
  const rows = (await res.json()) as { title: string | null; cover_url: string | null }[];
  const works = rows
    .filter((r) => r.cover_url?.startsWith("https://"))
    .map((r) => ({ src: r.cover_url!, alt: r.title?.trim() || "Work on SAMECOR" }));
  for (let i = works.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [works[i], works[j]] = [works[j], works[i]];
  }
  return works;
}

/**
 * Anonymous, cookieless count: a per-load random id, nothing stored on the device, so no
 * consent banner is needed. Lands in product_events next to the web app's own events.
 */
const sessionId = crypto.randomUUID();
function track(event: "page_view" | "cta_ecosystem", props: Record<string, string>) {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return;
  fetch(`${url}/rest/v1/rpc/log_product_event`, {
    method: "POST",
    keepalive: true,
    headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      _event_name: event,
      _session_id: sessionId,
      _path: `/go?src=${src}`,
      _referrer: document.referrer ? document.referrer.slice(0, 500) : null,
      _props: { landing: "go", src, ...props },
      _app: "aplus1",
    }),
  }).catch(() => {
    /* analytics must never break the page */
  });
}

render();
loadLiveWorks()
  .catch(() => [])
  .then((works) => renderWorks(works.length >= 4 ? works : config.fallbackWorks));
track("page_view", { event: "landing_view" });
