import { describe, expect, it } from "vitest";
import {
  APLUS1_DEMO_URL,
  BRAND_DOMAIN,
  BRAND_MARK,
  BRAND_NAME,
  BRAND_STORAGE_NO_PERSIST,
  BRAND_STORAGE_ONBOARDING,
  defaultSiteUrl,
} from "@/lib/brandConfig";
import { SITE_NAME } from "@/lib/seo";
import { LEGAL_APP_NAME } from "@/lib/legalConfig";

describe("brandConfig", () => {
  it("exposes consistent SAMECOR identity across SEO and legal", () => {
    expect(BRAND_NAME).toBe("SAMECOR");
    expect(SITE_NAME).toBe(BRAND_NAME);
    expect(LEGAL_APP_NAME).toBe(BRAND_NAME);
    expect(BRAND_DOMAIN).toBe("samecor.com");
    expect(APLUS1_DEMO_URL).toBe("https://aplus1-demo.vercel.app");
    expect(defaultSiteUrl()).toBe(APLUS1_DEMO_URL);
  });

  it("uses brand mark in the logo box", () => {
    expect(BRAND_MARK).toBe("S");
  });

  it("keeps legacy storage keys for backward compatibility", () => {
    expect(BRAND_STORAGE_ONBOARDING).toBe("an1hem_onboarding");
    expect(BRAND_STORAGE_NO_PERSIST).toBe("an1hem_no_persist");
  });
});
