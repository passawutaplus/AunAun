import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isLaunchHiddenPath } from "@/lib/aplus1Launch";
import { SUPPORT } from "@/lib/i18n/support";
import {
  DEMO_SHIPPING_THB,
  MAX_QTY_PER_LINE,
  addToBag,
  findDemoOrder,
  makeDemoRef,
  placeDemoOrder,
  removeLine,
  setLineQty,
  summariseBag,
  type BagLine,
} from "@/lib/support/bag";
import { findProduct, formatThb, isPurchasable, listProducts, sortForShelf } from "@/lib/support/catalog";
import { resolveDonation } from "@/lib/support/donate";
import { DONATE_MAX_THB, DONATE_MIN_THB, isSupportDemo, isSupportPath, isSupportSpaceEnabled } from "@/lib/support/flags";
import {
  EMPTY_SPONSOR_INQUIRY,
  SPONSOR_LIMITS,
  normaliseSponsorInquiry,
  validateSponsorInquiry,
  type SponsorInquiry,
} from "@/lib/support/sponsorForm";

afterEach(() => {
  vi.unstubAllEnvs();
  window.sessionStorage.clear();
});

describe("support space: flags and route gate", () => {
  it("is off unless switched on (tests and production builds)", () => {
    expect(isSupportSpaceEnabled()).toBe(false);
    expect(isSupportDemo()).toBe(false);
    vi.stubEnv("VITE_SUPPORT_SPACE_ENABLED", "true");
    expect(isSupportSpaceEnabled()).toBe(true);
    expect(isSupportDemo()).toBe(false);
  });

  it("test mode needs the space itself to be on", () => {
    vi.stubEnv("VITE_SUPPORT_DEMO", "true");
    expect(isSupportDemo()).toBe(false);
    vi.stubEnv("VITE_SUPPORT_SPACE_ENABLED", "true");
    expect(isSupportDemo()).toBe(true);
  });

  it.each(["/support", "/support/donate", "/support/partners", "/shop", "/shop/picker", "/shop/bag", "/shop/order/DEMO-AAAAAA"])(
    "%s is hidden while off and open once on",
    (path) => {
      vi.stubEnv("VITE_APLUS1_FULL_PRODUCT", "");
      expect(isSupportPath(path)).toBe(true);
      expect(isLaunchHiddenPath(path)).toBe(true);
      vi.stubEnv("VITE_SUPPORT_SPACE_ENABLED", "true");
      expect(isSupportPath(path)).toBe(false);
      expect(isLaunchHiddenPath(path)).toBe(false);
    },
  );

  it("does not swallow look-alike paths", () => {
    expect(isSupportPath("/supporters")).toBe(false);
    expect(isSupportPath("/shopping")).toBe(false);
    expect(isSupportPath("/showcase/abc")).toBe(false);
  });
});

describe("shop catalogue", () => {
  it("hides the sample items outside test mode, and nothing real is for sale yet", () => {
    const real = listProducts(false);
    expect(real.map((p) => p.slug)).toEqual(["picker", "twin"]);
    expect(real.some((p) => isPurchasable(p))).toBe(false);
    expect(findProduct("arc-tray", false)).toBeNull();
  });

  it("test mode adds exactly three sample items, all marked as samples", () => {
    const demo = listProducts(true).filter((p) => p.demo);
    expect(demo.map((p) => p.slug)).toEqual(["arc-tray", "frame-stand", "dot-clip"]);
    expect(demo.every((p) => isPurchasable(p) && (p.variants?.length ?? 0) > 0)).toBe(true);
  });

  it("puts what you can buy first", () => {
    const shelf = sortForShelf(listProducts(true));
    expect(shelf.slice(0, 3).every((p) => isPurchasable(p))).toBe(true);
    expect(shelf.at(-1)?.slug).toBe("twin");
  });

  it("formats baht", () => {
    expect(formatThb(1250)).toBe("฿1,250");
  });
});

describe("bag", () => {
  const tray = (qty: number, variantId = "ink"): BagLine => ({ slug: "arc-tray", variantId, qty });

  it("merges the same item and colour, keeps other colours apart", () => {
    let lines = addToBag([], tray(1), true);
    lines = addToBag(lines, tray(1), true);
    lines = addToBag(lines, tray(1, "red"), true);
    expect(lines).toEqual([tray(2), tray(1, "red")]);
  });

  it("refuses items that are not for sale (same array back)", () => {
    const start: BagLine[] = [];
    expect(addToBag(start, { slug: "picker", variantId: null, qty: 1 }, true)).toBe(start);
    expect(addToBag(start, tray(1), false)).toBe(start);
    expect(addToBag(start, { slug: "nope", variantId: null, qty: 1 }, true)).toBe(start);
  });

  it("caps a row at the per-row limit", () => {
    const lines = addToBag([], tray(99), true);
    expect(lines[0].qty).toBe(MAX_QTY_PER_LINE);
    expect(addToBag(lines, tray(1), true)).toBe(lines);
  });

  it("shares stock between colours (Frame Stand has 2 left)", () => {
    let lines = addToBag([], { slug: "frame-stand", variantId: "ink", qty: 1 }, true);
    lines = addToBag(lines, { slug: "frame-stand", variantId: "grey", qty: 5 }, true);
    expect(lines.map((l) => l.qty)).toEqual([1, 1]);
    const again = addToBag(lines, { slug: "frame-stand", variantId: "ink", qty: 1 }, true);
    expect(again).toBe(lines);
    expect(summariseBag(lines, true).rows.map((r) => r.maxQty)).toEqual([1, 1]);
  });

  it("changes and removes rows", () => {
    const lines = [tray(2), tray(1, "red")];
    expect(setLineQty(lines, "arc-tray::ink", 3, true)[0].qty).toBe(3);
    expect(setLineQty(lines, "arc-tray::ink", 0, true)).toEqual([tray(1, "red")]);
    expect(removeLine(lines, "arc-tray::red")).toEqual([tray(2)]);
  });

  it("totals from catalogue prices plus flat test shipping", () => {
    const bag = summariseBag([tray(1, "red"), { slug: "frame-stand", variantId: "ink", qty: 2 }], true);
    expect(bag.count).toBe(3);
    expect(bag.subtotalThb).toBe(290 + 190 * 2);
    expect(bag.shippingThb).toBe(DEMO_SHIPPING_THB);
    expect(bag.totalThb).toBe(670 + DEMO_SHIPPING_THB);
    expect(bag.canCheckout).toBe(true);
  });

  it("blocks checkout when a row can no longer be bought", () => {
    const gone = summariseBag([{ slug: "nope", variantId: null, qty: 1 }], true);
    expect(gone.rows[0].problem).toBe("gone");
    expect(gone.canCheckout).toBe(false);
    // A bag filled in test mode, opened where the samples do not exist.
    expect(summariseBag([tray(1)], false).canCheckout).toBe(false);
    const tooMany = summariseBag([{ slug: "frame-stand", variantId: "ink", qty: 3 }], true);
    expect(tooMany.rows[0].problem).toBe("not_enough");
    expect(summariseBag([], true).canCheckout).toBe(false);
  });

  it("stores a test order in this tab and finds it again", () => {
    const bag = summariseBag([tray(2, "red")], true);
    const order = placeDemoOrder(bag, () => "Red");
    expect(order?.ref).toMatch(/^DEMO-[A-Z2-9]{6}$/);
    expect(order?.rows).toEqual([{ name: "Arc Tray", variant: "Red", qty: 2, lineThb: 580 }]);
    expect(findDemoOrder(order?.ref)?.totalThb).toBe(580 + DEMO_SHIPPING_THB);
    expect(findDemoOrder("DEMO-NOPE00")).toBeNull();
    expect(placeDemoOrder(summariseBag([], true), () => null)).toBeNull();
  });

  it("makes readable references", () => {
    expect(makeDemoRef(() => 0)).toBe("DEMO-AAAAAA");
  });
});

describe("donation amount", () => {
  it("takes a preset as it is", () => {
    expect(resolveDonation(99, "").amount).toBe(99);
  });

  it("checks a custom amount", () => {
    expect(resolveDonation("other", "").amount).toBeNull();
    expect(resolveDonation("other", String(DONATE_MIN_THB - 1)).amount).toBeNull();
    expect(resolveDonation("other", String(DONATE_MIN_THB)).amount).toBe(DONATE_MIN_THB);
    expect(resolveDonation("other", String(DONATE_MAX_THB + 1)).amount).toBeNull();
    expect(resolveDonation("other", "12.5").amount).toBeNull();
  });
});

describe("sponsor form rules", () => {
  const good: SponsorInquiry = {
    ...EMPTY_SPONSOR_INQUIRY,
    company: "  Studio Test  ",
    contact: "Tester",
    email: " QA@Example.com ",
    consent: true,
  };

  it("an empty form misses four things", () => {
    expect(Object.keys(validateSponsorInquiry(EMPTY_SPONSOR_INQUIRY)).sort()).toEqual(["company", "consent", "contact", "email"]);
  });

  it("accepts a filled form and tidies it", () => {
    expect(validateSponsorInquiry(good)).toEqual({});
    const n = normaliseSponsorInquiry(good);
    expect(n.company).toBe("Studio Test");
    expect(n.email).toBe("qa@example.com");
  });

  it.each(["qa@example", "qa example@x.com", "@x.com", "qa@.c"])("rejects the email %s", (email) => {
    expect(validateSponsorInquiry({ ...good, email }).email).toBe(true);
  });

  it("cuts over-long text and repairs unknown choices", () => {
    const n = normaliseSponsorInquiry({
      ...good,
      message: "x".repeat(SPONSOR_LIMITS.message + 50),
      interest: "hack" as SponsorInquiry["interest"],
      budget: "lots" as SponsorInquiry["budget"],
    });
    expect(n.message).toHaveLength(SPONSOR_LIMITS.message);
    expect(n.interest).toBe("unsure");
    expect(n.budget).toBe("undecided");
  });
});

describe("support dictionary", () => {
  const entries = Object.entries(SUPPORT);

  beforeEach(() => {
    expect(entries.length).toBeGreaterThan(60);
  });

  it("has every string in th, en and zh", () => {
    for (const [key, e] of entries) {
      for (const lang of ["th", "en", "zh"] as const) {
        expect(e[lang]?.trim(), `${key}.${lang}`).toBeTruthy();
      }
    }
  });

  it("keeps the same placeholders in every language", () => {
    const vars = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(",");
    for (const [key, e] of entries) {
      expect(vars(e.en), key).toBe(vars(e.th));
      expect(vars(e.zh), key).toBe(vars(e.th));
    }
  });

  it("never says AI, and keeps Thai lines short", () => {
    for (const [key, e] of entries) {
      expect(`${e.th} ${e.en} ${e.zh}`, key).not.toMatch(/\bAI\b|เอไอ|人工智能/);
      expect(e.th.length, key).toBeLessThanOrEqual(60);
    }
  });
});
