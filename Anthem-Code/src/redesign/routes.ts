/**
 * Pages of the new design and how the shared frame behaves on each of them.
 * A path listed here renders inside RedesignShell and the old site chrome stays off.
 */
export type ShellTab = "home" | "event" | "me" | "";

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
  settings: "/settings",
  login: "/auth",
  help: "/help",
  terms: "/legal/terms",
  privacy: "/legal/privacy",
} as const;

const PAGES: ReadonlyArray<{ match: RegExp; page: ShellPage }> = [
  { match: /^\/$/, page: { page: "main", tabbar: true, tab: "home", footer: true, header: "main" } },
  // Work on its own page: no header, footer or tab bar, only the × of the page (mock: body[data-tab="off"]).
  { match: /^\/showcase\/[^/]+\/?$/, page: { page: "work", tabbar: false, tab: "", footer: false, header: "none" } },
  // Preview of the frame while pages are being rebuilt (step 2a).
  { match: /^\/sc\/shell\/?$/, page: { page: "not-found", tabbar: true, tab: "", footer: true } },
  // Text pages (step 13), on their old URLs.
  { match: /^\/legal\/terms\/?$/, page: { page: "terms", tabbar: true, tab: "", footer: true } },
  { match: /^\/legal\/privacy\/?$/, page: { page: "privacy", tabbar: true, tab: "", footer: true } },
  { match: /^\/help\/?$/, page: { page: "help", tabbar: true, tab: "", footer: true } },
  { match: /^\/me\/feedback\/?$/, page: { page: "feedback", tabbar: true, tab: "", footer: true } },
  { match: /^\/error\/404\/?$/, page: { page: "not-found", tabbar: true, tab: "", footer: true } },
  { match: /^\/learn\/?$/, page: { page: "get-in-touch", tabbar: true, tab: "", footer: true } },
  // Login, sign-up and password pages (step 7): the mock's centre box only, no header, footer or tab bar.
  { match: /^\/(auth|auth\/forgot|reset-password)\/?$/, page: { page: "login", tabbar: false, tab: "", footer: false, header: "none" } },
  // Settings (step 7): a sub-page of "ฉัน" — phones get the page's own ← instead of the tab bar (mock).
  { match: /^\/settings\/?$/, page: { page: "account-settings", tabbar: false, tab: "me", footer: true } },
  // My profile (step 8): "ฉัน" in the tab bar; the account button becomes ☰ on phones (mock).
  { match: /^\/(portfolio|portfolio\/saved|portfolio\/followers|collections)\/?$/, page: { page: "my-profile", tabbar: true, tab: "me", footer: true } },
  // Someone's profile (step 5), on the old URLs /@handle and /u/:id.
  { match: /^\/(@[^/]+|u\/[^/]+)\/?$/, page: { page: "profile", tabbar: true, tab: "", footer: true, back: true } },
  // An event or venue (step 6), on its old URL. Phones hide the header; the page has its own bottom bar.
  { match: /^\/exhibition\/(?!category(?:\/|$))[^/]+\/?$/, page: { page: "event", tabbar: false, tab: "event", footer: true } },
  // Venues of a multi-venue event on their own page ("ดูเส้นทาง" on the home highlight); its own ← stays on phones (mock).
  { match: /^\/exhibition\/[^/]+\/locations\/?$/, page: { page: "locations", tabbar: false, tab: "event", footer: true } },
];

export function shellPageFor(pathname: string): ShellPage | null {
  return PAGES.find((p) => p.match.test(pathname))?.page ?? null;
}

export function isRedesignPath(pathname: string): boolean {
  return shellPageFor(pathname) !== null;
}
