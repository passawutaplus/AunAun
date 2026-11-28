/**
 * Pages of the new design and how the shared frame behaves on each of them.
 * A path listed here renders inside RedesignShell and the old site chrome stays off.
 */
export type ShellTab = "home" | "event" | "chat" | "me" | "";

export type ShellPage = {
  /** Mock route name (`data-page`), e.g. "my-profile"; some phone rules depend on it. */
  page: string;
  /** Floating tab bar on phones: top-level pages only. */
  tabbar: boolean;
  /** Tab shown as current. */
  tab: ShellTab;
  footer: boolean;
  /** "main": the home header — search sits in the page instead of the header. "none": no header (Work on its own page). */
  header?: "main" | "none";
  /** Phones: a back arrow takes the place of the logo (mock Profile: `.hd-back`). */
  back?: boolean;
};

/** The old URLs stay (owner decision), so the new frame links to them. */
export const SC_LINKS = {
  home: "/",
  events: "/?tab=event",
  getInTouch: "/learn",
  feedback: "/me/feedback",
  chat: "/chat",
  notifications: "/notifications",
  upload: "/portfolio/new",
  /** Any member can post an event; it waits for the team's review. */
  eventNew: "/dashboard/exhibition/new",
  myProfile: "/portfolio",
  myStudio: "/dashboard",
  /** Upload × / "กลับ My Studio" land on the Works tab (mock scStudioTab). */
  studioWorks: "/dashboard?tab=works",
  settings: "/settings",
  login: "/auth",
  help: "/help",
  terms: "/legal/terms",
  privacy: "/legal/privacy",
} as const;

/** Frame of the 404 page (mock `not-found`): also used for every unknown or cut URL (step 14). */
export const NOT_FOUND_PAGE: ShellPage = { page: "not-found", tabbar: true, tab: "", footer: true };

const PAGES: ReadonlyArray<{ match: RegExp; page: ShellPage }> = [
  { match: /^\/$/, page: { page: "main", tabbar: true, tab: "home", footer: true, header: "main" } },
  // Work on its own page: no header, footer or tab bar, only the × of the page (mock: body[data-tab="off"]).
  { match: /^\/showcase\/[^/]+\/?$/, page: { page: "work", tabbar: false, tab: "", footer: false, header: "none" } },
  // Preview of the frame while pages are being rebuilt (step 2a).
  { match: /^\/sc\/shell\/?$/, page: NOT_FOUND_PAGE },
  // Text pages (step 13), on their old URLs.
  { match: /^\/legal\/terms\/?$/, page: { page: "terms", tabbar: true, tab: "", footer: true } },
  { match: /^\/legal\/privacy\/?$/, page: { page: "privacy", tabbar: true, tab: "", footer: true } },
  { match: /^\/help\/?$/, page: { page: "help", tabbar: true, tab: "", footer: true } },
  { match: /^\/me\/feedback\/?$/, page: { page: "feedback", tabbar: true, tab: "", footer: true } },
  { match: /^\/error\/404\/?$/, page: NOT_FOUND_PAGE },
  { match: /^\/learn\/?$/, page: { page: "get-in-touch", tabbar: true, tab: "", footer: true } },
  // Login, sign-up and password pages (step 7): the mock's centre box only, no header, footer or tab bar.
  { match: /^\/(auth|auth\/forgot|reset-password)\/?$/, page: { page: "login", tabbar: false, tab: "", footer: false, header: "none" } },
  // Settings (step 7): a sub-page of "ฉัน" — phones get the page's own ← instead of the tab bar (mock).
  { match: /^\/settings\/?$/, page: { page: "account-settings", tabbar: false, tab: "me", footer: true } },
  // My profile (step 8): "ฉัน" in the tab bar; the account button becomes ☰ on phones (mock).
  { match: /^\/(portfolio|portfolio\/saved|portfolio\/followers|collections)\/?$/, page: { page: "my-profile", tabbar: true, tab: "me", footer: true } },
  // My Studio (step 10) on /dashboard and the old studio URLs (documents + billing → the Documents tab); "ฉัน" in the tab bar (mock).
  { match: /^\/(dashboard(\/(projects|catalogs|insights|exhibition|documents|billing))?|portfolio\/manage)\/?$/, page: { page: "my-studio", tabbar: true, tab: "me", footer: true } },
  // Post / edit an event (step 11): the page has its own header (logo · New Event · ×); no tab bar, no footer on phones (mock).
  { match: /^\/dashboard\/exhibition\/(new|[^/]+\/edit)\/?$/, page: { page: "event-post", tabbar: false, tab: "", footer: true, header: "none" } },
  // Works of one tag / one tool, and pictures like one picture (owner 2026-11-28; old URLs, not in the mock).
  { match: /^\/explore\/(tag|tool)\/[^/]+\/?$/, page: { page: "explore", tabbar: true, tab: "home", footer: true, back: true } },
  { match: /^\/similar\/[^/]+\/?$/, page: { page: "similar", tabbar: true, tab: "home", footer: true, back: true } },
  // Post / edit a work (step 9): the page has its own header (logo · New Work · ↶ ↷ · ×); no tab bar, no footer on phones (mock).
  { match: /^\/portfolio\/(new|[^/]+\/edit)\/?$/, page: { page: "upload", tabbar: false, tab: "", footer: true, header: "none" } },
  // Chat (step 12): the list keeps the tab bar on phones (chat button current); an open room hides header + tab bar (chat.css).
  { match: /^\/chat(\/[^/]+)?\/?$/, page: { page: "chat", tabbar: true, tab: "chat", footer: false } },
  // Someone's profile (step 5), on the old URLs /@handle and /u/:id.
  { match: /^\/(@[^/]+|u\/[^/]+)\/?$/, page: { page: "profile", tabbar: true, tab: "", footer: true, back: true } },
  // An event or venue (step 6), on its old URL. Phones hide the header; the page has its own bottom bar.
  { match: /^\/exhibition\/(?!category(?:\/|$))[^/]+\/?$/, page: { page: "event", tabbar: false, tab: "event", footer: true } },
  // Venues of a multi-venue event on their own page ("ดูเส้นทาง" on the home highlight); its own ← stays on phones (mock).
  { match: /^\/exhibition\/[^/]+\/locations\/?$/, page: { page: "locations", tabbar: false, tab: "event", footer: true } },
];

/**
 * Old pages that stay as they are, in the old frame (step 14). Every other old URL is cut:
 * it moves to its new page (REDIRECTS) or shows the new 404.
 */
const LEGACY_KEPT: ReadonlyArray<RegExp> = [
  // Back office: keeps its old look (owner decision 4).
  /^\/admin(\/|$)/,
  // Dev-only previews (they exist in `npm run dev` only).
  ...(import.meta.env.DEV ? [/^\/dev\//] : []),
  // Chat: the new pages (step 12, PAGES above) match first; this only keeps the old route behind them. Notifications: the old page.
  /^\/chat(\/[^/]+)?\/?$/,
  /^\/notifications\/?$/,
  // Sign-in logic, and accounts the team created must set their own password first.
  /^\/auth\/callback\/?$/,
  /^\/account\/set-password\/?$/,
  // Creator invitation links never expire (owner decision 3).
  /^\/invite\/(creator\/[^/]+(\/form)?|review\/[^/]+)\/?$/,
  // Journal (SEO), Shop / Support / Donate (real orders), the other legal pages: old pages for now (decision 3).
  /^\/journal(\/[^/]+)?\/?$/,
  /^\/exhibition\/category\/journal\/?$/,
  /^\/support(\/(donate|partners))?\/?$/,
  /^\/shop(\/bag|\/order\/[^/]+|\/[^/]+)?\/?$/,
  /^\/legal(\/[^/]+)?\/?$/,
  // Old help articles (step 13 kept them).
  /^\/help\/[^/]+(\/[^/]+)?\/?$/,
  // A public catalog (series) or collection on its own page: no page in the new design yet.
  /^\/(series|collections)\/[^/]+\/?$/,
  // Error pages other than 404: the mock has a 404 only.
  /^\/error(\/(400|403|405|500|502|503))?\/?$/,
];

/** Event types of the Event tab (`?type=`), as in main/useHomeEvents EVENT_TYPES without "highlight". */
const EVENT_TYPE_IDS = ["open_call", "exhibition", "workshop", "talk_forum", "art_fair", "meetup"] as const;

/** Old `/exhibition/category/<slug>` ("_" written "-") → the Event tab with that type. */
function eventsOfType(slug: string): string {
  const type = slug.toLowerCase().replace(/-/g, "_");
  return (EVENT_TYPE_IDS as ReadonlyArray<string>).includes(type) ? `${SC_LINKS.events}&type=${type}` : SC_LINKS.events;
}

/** Old URLs of a page the new design has elsewhere. The query of the old URL is kept (RedirectTo rules). */
const REDIRECTS: ReadonlyArray<{ match: RegExp; to: (m: RegExpMatchArray) => string }> = [
  { match: /^\/exhibition\/?$/, to: () => SC_LINKS.events },
  { match: /^\/exhibition\/category\/([^/]+)\/?$/, to: (m) => eventsOfType(m[1]) },
  { match: /^\/project\/([^/]+)\/?$/, to: (m) => `/showcase/${m[1]}` },
  { match: /^\/u\/([^/]+)\/followers\/?$/, to: (m) => `/u/${m[1]}` },
  // App-icon shortcut: search sits on the home page.
  { match: /^\/search\/?$/, to: () => SC_LINKS.home },
  { match: /^\/learn\/faq\/?$/, to: () => SC_LINKS.help },
  { match: /^\/learn\/[^/]+\/?$/, to: () => SC_LINKS.getInTouch },
  { match: /^\/(me\/reports|reports|feedback|research\/feedback)\/?$/, to: () => SC_LINKS.feedback },
  // Studio tabs of cut features (hire, collab, packages, objects, payout, reviews)
  // and the packages editor → My Studio. The tabs My Studio has are pages above.
  { match: /^\/dashboard\/.+$/, to: () => SC_LINKS.myStudio },
  { match: /^\/portfolio\/packages(\/.*)?$/, to: () => SC_LINKS.myStudio },
  // My catalogs (series) are a tab of My Studio.
  { match: /^\/series\/?$/, to: () => "/dashboard/catalogs" },
  // Mood boards were already off: they went to My Profile, as today.
  { match: /^\/inspire(\/.*)?$/, to: () => SC_LINKS.myProfile },
];

/** What a URL does under the new design. */
export type RedesignRoute =
  | { kind: "page"; page: ShellPage }
  | { kind: "legacy" }
  | { kind: "redirect"; to: string }
  /** A package / object link (cut): its creator's profile, looked up as today (CommerceLinkRedirect). */
  | { kind: "commerce"; type: "service" | "object"; id: string }
  | { kind: "not-found" };

export function redesignRouteFor(pathname: string): RedesignRoute {
  const page = PAGES.find((p) => p.match.test(pathname))?.page;
  if (page) return { kind: "page", page };
  if (LEGACY_KEPT.some((re) => re.test(pathname))) return { kind: "legacy" };
  for (const r of REDIRECTS) {
    const m = pathname.match(r.match);
    if (m) return { kind: "redirect", to: r.to(m) };
  }
  const commerce = pathname.match(/^\/(service|object)\/([^/]+)\/?$/);
  if (commerce) return { kind: "commerce", type: commerce[1] as "service" | "object", id: commerce[2] };
  return { kind: "not-found" };
}

/** Frame for a URL: null = an old page in the old frame. Cut and unknown URLs get the frame of the 404. */
export function shellPageFor(pathname: string): ShellPage | null {
  const route = redesignRouteFor(pathname);
  if (route.kind === "page") return route.page;
  return route.kind === "legacy" ? null : NOT_FOUND_PAGE;
}

export function isRedesignPath(pathname: string): boolean {
  return shellPageFor(pathname) !== null;
}
