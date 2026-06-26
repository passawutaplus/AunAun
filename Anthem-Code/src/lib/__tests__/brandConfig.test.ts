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
  it("exposes consistent Aplus1 identity across SEO and legal", () => {
    expect(BRAND_NAME).toBe("Aplus1");
    expect(SITE_NAME).toBe(BRAND_NAME);
    expect(LEGAL_APP_NAME).toBe(BRAND_NAME);
    expect(BRAND_DOMAIN).toBe("aplus1.app");
    expect(APLUS1_DEMO_URL).toBe("https://aplus1-demo.vercel.app");
    expect(defaultSiteUrl()).toBe(APLUS1_DEMO_URL);
  });

  it("uses brand mark in the logo box", () => {
    expect(BRAND_MARK).toBe("1");
  });

  it("keeps legacy storage keys for backward compatibility", () => {
    expect(BRAND_STORAGE_ONBOARDING).toBe("an1hem_onboarding");
    expect(BRAND_STORAGE_NO_PERSIST).toBe("an1hem_no_persist");
  });
});
