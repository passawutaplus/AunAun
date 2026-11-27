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
};

/** The old URLs stay (owner decision), so the new frame links to them. */
export const SC_LINKS = {
  home: "/",
  events: "/exhibition",
  getInTouch: "/learn",
  feedback: "/me/feedback",
  search: "/search",
  chat: "/chat",
  notifications: "/notifications",
  upload: "/portfolio/new",
  myProfile: "/portfolio",
  myStudio: "/dashboard",
  settings: "/settings",
  login: "/auth",
  help: "/help",
  terms: "/legal/terms",
  privacy: "/legal/privacy",
} as const;

const PAGES: ReadonlyArray<{ match: RegExp; page: ShellPage }> = [
  // Preview of the frame while pages are being rebuilt (step 2a).
  { match: /^\/sc\/shell\/?$/, page: { page: "not-found", tabbar: true, tab: "", footer: true } },
];

export function shellPageFor(pathname: string): ShellPage | null {
  return PAGES.find((p) => p.match.test(pathname))?.page ?? null;
}

export function isRedesignPath(pathname: string): boolean {
  return shellPageFor(pathname) !== null;
}
