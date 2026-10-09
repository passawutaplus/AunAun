import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ADMIN_NAV_GROUPS,
  ADMIN_QUEUE_ORDER,
  adminBadgeCounts,
  adminNavGroups,
  adminPageMeta,
  adminQueueEntries,
  adminSearchEntries,
  adminSearchHaystack,
  isAdminLaunchHiddenPath,
  isAdminRetiredPath,
  type AdminBadgeCounts,
} from "@/lib/admin/adminNavigation";
import { ADMIN_DB_GAPS, adminDbGapForPath } from "@/lib/admin/adminDbGaps";

const MINIMAL = () => vi.stubEnv("VITE_APLUS1_FULL_PRODUCT", "");
const FULL = () => vi.stubEnv("VITE_APLUS1_FULL_PRODUCT", "true");

const zeroCounts = (): AdminBadgeCounts => ({ kyc: 0, reports: 0, cashouts: 0, finance: 0, aml: 0, hiring: 0, collabs: 0, feedback: 0 });

const flatPaths = () => adminNavGroups().flatMap((g) => g.items.map((i) => i.to.split("?")[0]));

describe("admin menu — structure", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("has unique page paths and unique group ids", () => {
    const all = ADMIN_NAV_GROUPS.flatMap((g) => g.items.map((i) => i.to));
    expect(new Set(all).size).toBe(all.length);
    expect(new Set(ADMIN_NAV_GROUPS.map((g) => g.id)).size).toBe(ADMIN_NAV_GROUPS.length);
  });

  it("every menu entry points at a route that exists in App.tsx", () => {
    const app = readFileSync(resolve(__dirname, "../../../App.tsx"), "utf8");
    const adminBlock = app.slice(app.indexOf('<Route path="/admin"'));
    for (const g of ADMIN_NAV_GROUPS) {
      for (const item of g.items) {
        const path = item.to.split("?")[0];
        if (path === "/admin") continue; // index route
        const segment = path.replace(/^\/admin\//, "");
        expect(adminBlock, `${path} has no <Route path="${segment}">`).toContain(`path="${segment}"`);
      }
    }
  });

  it("every group has a tone, an icon and at least one item", () => {
    for (const g of ADMIN_NAV_GROUPS) {
      expect(g.tone).toBeTruthy();
      expect(g.icon).toBeTruthy();
      expect(g.items.length).toBeGreaterThan(0);
      for (const i of g.items) expect(i.icon).toBeTruthy();
    }
  });

  it("each work queue maps to exactly one menu page", () => {
    for (const key of ADMIN_QUEUE_ORDER) {
      const owners = ADMIN_NAV_GROUPS.flatMap((g) => g.items).filter((i) => i.badgeKey === key);
      expect(owners, `queue "${key}"`).toHaveLength(1);
    }
  });
});

describe("admin menu — launch minimal vs full product", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("shows the pages whose public features are live (jobs, hiring, forum, inspire, wallet…) even in launch minimal", () => {
    MINIMAL();
    const paths = flatPaths();
    for (const p of ["/admin/jobs", "/admin/hiring", "/admin/collabs", "/admin/forum", "/admin/inspire", "/admin/collections", "/admin/wallet", "/admin/finance", "/admin/kyc", "/admin/aml", "/admin/compliance", "/admin/audit", "/admin/data", "/admin/projects", "/admin/chats"]) {
      expect(paths, p).toContain(p);
    }
  });

  it("hides only what the public app has switched off: contracts and ads", () => {
    MINIMAL();
    expect(isAdminLaunchHiddenPath("/admin/contracts")).toBe(true);
    expect(isAdminLaunchHiddenPath("/admin/ads")).toBe(true);
    expect(isAdminLaunchHiddenPath("/admin/jobs")).toBe(false);
    expect(isAdminLaunchHiddenPath("/admin/marketing")).toBe(false);
    expect(isAdminLaunchHiddenPath("/admin")).toBe(false);
    const paths = flatPaths();
    expect(paths).not.toContain("/admin/contracts");
    expect(paths).not.toContain("/admin/ads");
  });

  it("shows contracts and ads again with the full product", () => {
    FULL();
    expect(isAdminLaunchHiddenPath("/admin/contracts")).toBe(false);
    const paths = flatPaths();
    expect(paths).toContain("/admin/contracts");
    expect(paths).toContain("/admin/ads");
  });

  it("retired Area / Studio pages are out of the menu in every mode but still searchable", () => {
    for (const mode of [MINIMAL, FULL]) {
      mode();
      expect(isAdminRetiredPath("/admin/community")).toBe(true);
      expect(isAdminRetiredPath("/admin/studios")).toBe(true);
      expect(flatPaths()).not.toContain("/admin/community");
      expect(flatPaths()).not.toContain("/admin/studios");
      const retired = adminSearchEntries().filter((e) => e.retired).map((e) => e.to);
      expect(retired).toEqual(expect.arrayContaining(["/admin/community", "/admin/studios"]));
      vi.unstubAllEnvs();
    }
  });

  it("search never offers a page the launch gate would bounce", () => {
    MINIMAL();
    const search = adminSearchEntries().map((e) => e.to);
    expect(search).not.toContain("/admin/contracts");
    expect(search).not.toContain("/admin/ads");
  });
});

describe("admin search", () => {
  it("finds pages by Thai and English synonyms", () => {
    const hit = (q: string) =>
      adminSearchEntries()
        .filter((e) => adminSearchHaystack(e).includes(q.toLowerCase()))
        .map((e) => e.to);
    expect(hit("kyc")).toContain("/admin/kyc");
    expect(hit("ถอนเงิน")).toContain("/admin/wallet");
    expect(hit("ลิขสิทธิ์")).toContain("/admin/compliance");
    expect(hit("pdpa")).toContain("/admin/compliance");
    expect(hit("omise")).toContain("/admin/finance");
    expect(hit("แบน")).toContain("/admin/moderation");
  });
});

describe("page meta (breadcrumb)", () => {
  it("resolves a URL to its group and page, longest path wins", () => {
    expect(adminPageMeta("/admin")?.item.label).toBe("แดชบอร์ด");
    expect(adminPageMeta("/admin/")?.item.label).toBe("แดชบอร์ด");
    expect(adminPageMeta("/admin/marketing/leads")?.item.to).toBe("/admin/marketing");
    expect(adminPageMeta("/admin/compliance/privacy")?.group.id).toBe("safety");
    expect(adminPageMeta("/admin/users?kyc=verified")?.item.to).toBe("/admin/users");
    expect(adminPageMeta("/admin/community")?.item.label).toContain("เลิกใช้");
  });

  it("dashboard only matches the exact /admin path", () => {
    expect(adminPageMeta("/admin/nope")).toBeNull();
  });
});

describe("work queue", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("combines alert counters with extra stats and never goes negative or NaN", () => {
    const c = adminBadgeCounts(
      { openReports: 3, pendingCashouts: 1, pendingKyc: 2, openAml: 0, highRiskKyc: 1, urgentReports: 1, financePayoutQueue: 2, financeWebhookIssues: 1, openFinanceDisputes: 1, unavailable: [] },
      { pendingHiring: 4, pendingCollabs: 0, openFeedback: 5 },
    );
    expect(c).toEqual({ kyc: 2, reports: 3, cashouts: 1, finance: 4, aml: 0, hiring: 4, collabs: 0, feedback: 5 });
    expect(adminBadgeCounts(undefined, undefined)).toEqual(zeroCounts());
    expect(adminBadgeCounts(undefined, { openFeedback: Number.NaN, pendingHiring: -3 })).toEqual(zeroCounts());
  });

  it("lists only queues with work, most sensitive first", () => {
    FULL();
    const counts = { ...zeroCounts(), feedback: 2, kyc: 1, reports: 7, finance: 1 };
    expect(adminQueueEntries(counts).map((e) => e.key)).toEqual(["kyc", "reports", "finance", "feedback"]);
    expect(adminQueueEntries(zeroCounts())).toEqual([]);
  });

  it("links each queue entry to its page", () => {
    FULL();
    const byKey = Object.fromEntries(adminQueueEntries({ ...zeroCounts(), kyc: 1, reports: 1, cashouts: 1, finance: 1, aml: 1, hiring: 1, collabs: 1, feedback: 1 }).map((e) => [e.key, e.item.to]));
    expect(byKey).toEqual({ kyc: "/admin/kyc", reports: "/admin/reports", cashouts: "/admin/wallet", finance: "/admin/finance", aml: "/admin/aml", hiring: "/admin/hiring", collabs: "/admin/collabs", feedback: "/admin/feedback" });
  });
});

describe("pages waiting on the database", () => {
  it("matches the longest prefix", () => {
    expect(adminDbGapForPath("/admin/compliance/privacy")?.missing).toEqual(["privacy_requests"]);
    expect(adminDbGapForPath("/admin/compliance/copyright")?.missing).toEqual(["copyright_reports"]);
    expect(adminDbGapForPath("/admin/compliance")?.missing).toEqual(["copyright_reports", "privacy_requests"]);
    expect(adminDbGapForPath("/admin/finance?tab=payouts")?.missing).toContain("admin_finance_overview");
  });

  it("does not flag pages that work", () => {
    expect(adminDbGapForPath("/admin/kyc")).toBeNull();
    expect(adminDbGapForPath("/admin/reports")).toBeNull();
    expect(adminDbGapForPath("/admin")).toBeNull();
  });

  it("only references pages that exist in the menu", () => {
    const all = new Set(ADMIN_NAV_GROUPS.flatMap((g) => g.items.map((i) => i.to.split("?")[0])));
    for (const key of Object.keys(ADMIN_DB_GAPS)) {
      const known = [...all].some((p) => key === p || key.startsWith(`${p}/`));
      expect(known, key).toBe(true);
    }
  });
});
