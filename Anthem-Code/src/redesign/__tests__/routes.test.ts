import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { mergeRedirectTarget } from "@/lib/mergeRedirectTarget";
import { isKnownPublicPath, isRedesignCutPath } from "../../../api/seo-preview.js";
import { EVENT_TYPES } from "../main/useHomeEvents";
import { NOT_FOUND_PAGE, redesignRouteFor, shellPageFor, type RedesignRoute } from "../routes";

/** Short form of a decision: "page:<mock page>", "old", "404", "→ <url>", "commerce". */
function decision(path: string): string {
  const r: RedesignRoute = redesignRouteFor(path);
  switch (r.kind) {
    case "page":
      return `page:${r.page.page}`;
    case "legacy":
      return "old";
    case "redirect":
      return `→ ${r.to}`;
    case "commerce":
      return "commerce";
    default:
      return "404";
  }
}

/**
 * Step 14 route table: one sample URL per route in App.tsx (params written "x"), plus nested ones.
 * Under the new design only; with VITE_REDESIGN off the old routes are untouched.
 */
const TABLE: Record<string, string> = {
  // Pages of the new design (steps 3–13), on their old URLs.
  "/": "page:main",
  "/showcase/x": "page:work",
  "/sc/shell": "page:not-found",
  "/legal/terms": "page:terms",
  "/legal/privacy": "page:privacy",
  "/help": "page:help",
  "/me/feedback": "page:feedback",
  "/error/404": "page:not-found",
  "/learn": "page:get-in-touch",
  "/auth": "page:login",
  "/auth/forgot": "page:login",
  "/reset-password": "page:login",
  "/settings": "page:account-settings",
  "/portfolio": "page:my-profile",
  "/portfolio/saved": "page:my-profile",
  "/portfolio/followers": "page:my-profile",
  "/collections": "page:my-profile",
  "/portfolio/new": "page:upload",
  "/portfolio/x/edit": "page:upload",
  "/dashboard": "page:my-studio",
  "/dashboard/projects": "page:my-studio",
  "/dashboard/catalogs": "page:my-studio",
  "/dashboard/insights": "page:my-studio",
  "/dashboard/exhibition": "page:my-studio",
  "/portfolio/manage": "page:my-studio",
  "/dashboard/exhibition/new": "page:event-post",
  "/dashboard/exhibition/x/edit": "page:event-post",
  "/explore/tag/x": "page:explore",
  "/explore/tool/x": "page:explore",
  "/similar/x": "page:similar",
  "/exhibition/x": "page:event",
  "/exhibition/x/locations": "page:locations",
  "/u/x": "page:profile",
  "/@x": "page:profile",
  // A single segment that is not @handle: Profile shows the 404 on the same URL.
  "/x": "404",

  // Old URLs of pages the new design has elsewhere.
  "/exhibition": "→ /?tab=event",
  "/exhibition/category/x": "→ /?tab=event",
  "/exhibition/category/art-fair": "→ /?tab=event&type=art_fair",
  "/project/x": "→ /showcase/x",
  "/u/x/followers": "→ /u/x",
  "/search": "→ /",
  "/learn/who": "→ /learn",
  "/learn/start": "→ /learn",
  "/learn/creators": "→ /learn",
  "/learn/hirers": "→ /learn",
  "/learn/opportunity-loop": "→ /learn",
  "/learn/features": "→ /learn",
  "/learn/trust": "→ /learn",
  "/learn/px": "→ /learn",
  "/learn/faq": "→ /help",
  "/me/reports": "→ /me/feedback",
  "/reports": "→ /me/feedback",
  "/feedback": "→ /me/feedback",
  "/research/feedback": "→ /me/feedback",
  "/series": "→ /dashboard/catalogs",
  "/inspire": "→ /portfolio",
  "/inspire/x": "→ /portfolio",
  // Studio tabs of cut features → My Studio.
  "/dashboard/hire": "→ /dashboard",
  "/dashboard/collab": "→ /dashboard",
  "/dashboard/packages": "→ /dashboard",
  "/dashboard/objects": "→ /dashboard",
  "/dashboard/billing": "→ /dashboard",
  "/dashboard/reviews": "→ /dashboard",
  "/dashboard/documents": "→ /dashboard",
  "/dashboard/payout": "→ /dashboard",
  "/portfolio/packages": "→ /dashboard",
  "/portfolio/packages/new": "→ /dashboard",
  "/portfolio/packages/x/edit": "→ /dashboard",
  // Package / object links: the creator's profile (as today).
  "/service/x": "commerce",
  "/object/x": "commerce",

  // Old pages kept as they are.
  "/admin": "old",
  "/admin/users": "old",
  "/admin/growth/campaigns/x": "old",
  "/dev/review-form": "old",
  "/dev/hire-cancel": "old",
  "/dev/offer-dialog": "old",
  "/dev/billing": "old",
  "/dev/creator-invitations": "old",
  "/dev/creator-invitations/new": "old",
  "/dev/growth": "old",
  "/chat": "page:chat",
  "/chat/x": "page:chat",
  "/notifications": "old",
  "/auth/callback": "old",
  "/account/set-password": "old",
  "/invite/creator/x": "old",
  "/invite/creator/x/form": "old",
  "/invite/review/x": "old",
  "/journal": "old",
  "/journal/x": "old",
  "/exhibition/category/journal": "old",
  "/support": "old",
  "/support/donate": "old",
  "/support/partners": "old",
  "/shop": "old",
  "/shop/bag": "old",
  "/shop/order/x": "old",
  "/shop/x": "old",
  "/legal": "old",
  "/legal/cookies": "old",
  "/legal/rights": "old",
  "/legal/delete-account": "old",
  "/legal/ip": "old",
  "/legal/community": "old",
  "/legal/copyright-report": "old",
  "/legal/payment-refund": "old",
  "/legal/service-agreement": "old",
  "/legal/packages": "old",
  "/legal/kyc-aml": "old",
  "/help/x": "old",
  "/help/x/x": "old",
  "/series/x": "old",
  "/collections/x": "old",
  "/error": "old",
  "/error/400": "old",
  "/error/403": "old",
  "/error/405": "old",
  "/error/500": "old",
  "/error/502": "old",
  "/error/503": "old",

  // Cut: the new 404 in the new frame.
  "/changelog": "404",
  "/research": "404",
  "/hire/start": "404",
  "/hire-requests": "404",
  "/collab-requests": "404",
  "/founding": "404",
  "/founding/x": "404",
  "/drill": "404",
  "/explore/x/x": "404",
  "/earnings": "404",
  "/earnings/withdraw": "404",
  "/earnings/withdraw/pin": "404",
  "/referrals": "404",
  "/community": "404",
  "/community/new": "404",
  "/community/x": "404",
  "/community/x/edit": "404",
  "/forum": "404",
  "/forum/search": "404",
  "/forum/me": "404",
  "/forum/new": "404",
  "/forum/admin": "404",
  "/forum/c/x": "404",
  "/forum/t/x": "404",
  "/verify": "404",
  "/hiring": "404",
  "/hiring/new": "404",
  "/hiring/x": "404",
  "/jobs": "404",
  "/jobs/new": "404",
  "/jobs/x": "404",
  "/org/register": "404",
  "/org/status": "404",
  "/advertise": "404",
  "/upgrade": "404",
  "/ads/x": "404",
  "/contracts": "404",
  "/contracts/new": "404",
  "/s/x": "404",
  "/studio/new": "404",
  "/studio/invites": "404",
  "/studio/manage": "404",
  // Unknown URLs.
  "/no/such/page": "404",
  "/showcase": "404",
  "/chat/x/x": "404",
};

/** Absolute route paths written in App.tsx, params as "x" (`/chat/:id?` → `/chat/x`, `/inspire/*` → `/inspire/x`). */
function appRouteSamples(): string[] {
  const src = readFileSync(resolve(__dirname, "../../App.tsx"), "utf8");
  const out = new Set<string>();
  for (const m of src.matchAll(/path="(\/[^"]*)"/g)) {
    out.add(m[1].replace(/\/:[\w-]+\??/g, "/x").replace(/\/\*$/, "/x"));
  }
  return [...out];
}

describe("redesign routes (step 14)", () => {
  it.each(Object.entries(TABLE))("%s → %s", (path, expected) => {
    expect(decision(path)).toBe(expected);
  });

  it("has a decision for every route in App.tsx", () => {
    const missing = appRouteSamples().filter((p) => !(p in TABLE));
    expect(missing).toEqual([]);
  });

  it("treats a trailing slash like the URL without it", () => {
    for (const path of ["/hiring/", "/exhibition/", "/dashboard/hire/", "/admin/", "/legal/cookies/"]) {
      expect(decision(path)).toBe(decision(path.slice(0, -1)));
    }
  });

  it("sends every event type of the Event tab to its chip", () => {
    for (const [type] of EVENT_TYPES) {
      if (type === "highlight") continue;
      expect(decision(`/exhibition/category/${type.replace(/_/g, "-")}`)).toBe(`→ /?tab=event&type=${type}`);
    }
  });

  it("gives cut and unknown URLs the frame of the 404, old pages none", () => {
    expect(shellPageFor("/hiring")).toEqual(NOT_FOUND_PAGE);
    expect(shellPageFor("/no/such/page")).toEqual(NOT_FOUND_PAGE);
    expect(shellPageFor("/exhibition")).toEqual(NOT_FOUND_PAGE);
    expect(shellPageFor("/admin/users")).toBeNull();
    expect(shellPageFor("/notifications")).toBeNull();
    expect(shellPageFor("/chat/x")?.page).toBe("chat");
    expect(shellPageFor("/settings")?.page).toBe("account-settings");
  });

  it("gives bots a 404 + noindex for every URL the new design cuts (api/seo-preview)", () => {
    const on = { VITE_REDESIGN: "true" };
    for (const [path, expected] of Object.entries(TABLE)) {
      const botNotFound = !isKnownPublicPath(path) || isRedesignCutPath(path, on);
      if (expected === "404") expect(botNotFound, path).toBe(true);
      // Pages and kept old pages stay indexable (moved package / research links may be 404 for bots).
      if (expected === "old" || expected.startsWith("page:")) expect(isRedesignCutPath(path, on), path).toBe(false);
      // Flag off: bots see exactly what they see today.
      expect(isRedesignCutPath(path, {}), path).toBe(false);
    }
  });

  it("keeps the query of the old URL when it moves", () => {
    const to = (path: string) => (redesignRouteFor(path) as { to: string }).to;
    expect(mergeRedirectTarget(to("/feedback"), "?type=bug")).toBe("/me/feedback?type=bug");
    expect(mergeRedirectTarget(to("/exhibition/category/workshop"), "?type=exhibition")).toBe("/?tab=event&type=workshop");
    expect(mergeRedirectTarget(to("/project/abc"), "?img=2")).toBe("/showcase/abc?img=2");
  });
});
