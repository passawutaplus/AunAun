import { beforeEach, describe, expect, it } from "vitest";

const env: Record<string, string> = {};
beforeEach(() => {
  for (const key of Object.keys(env)) delete env[key];
  (globalThis as unknown as { Deno: unknown }).Deno = { env: { get: (k: string) => env[k] } };
});

// Non-literal paths: the modules need the Deno runtime types, which this package's tsc does not have.
const SITE_PATH = "../../../supabase/functions/_shared/samecor-site";
const EMAIL_PATH = "../../../supabase/functions/_shared/anthem-email-html";
const site = async () => await import(/* @vite-ignore */ SITE_PATH);
const email = async () => await import(/* @vite-ignore */ EMAIL_PATH);

describe("SAMECOR email links", () => {
  it("ignores old-brand site URLs left in the secrets", async () => {
    const { samecorSiteUrl, samecorLink } = await site();
    env.APLUS1_APP_URL = "https://an1hem.app/";
    expect(samecorSiteUrl()).toBe("https://samecor.com");
    env.ANTHEM_APP_URL = "https://staging.samecor.com/";
    expect(samecorSiteUrl()).toBe("https://staging.samecor.com");
    const base = "https://samecor.com";
    expect(samecorLink("https://www.aplus1.app/u/x?a=1#b", base)).toBe(
      "https://samecor.com/u/x?a=1#b",
    );
    expect(samecorLink("/@mint", base)).toBe("https://samecor.com/@mint");
    expect(samecorLink("https://solofreelancer.com/a", base)).toBe("https://solofreelancer.com/a");
  });

  it("always sends as SAMECOR and keeps the configured address", async () => {
    const { anthemEmailFrom } = await email();
    expect(anthemEmailFrom().from).toBe("SAMECOR <noreply@samecor.com>");
    env.APLUS1_EMAIL_FROM = "Aplus1 <noreply@aplus1.app>";
    expect(anthemEmailFrom().from).toBe("SAMECOR <noreply@aplus1.app>");
    env.APLUS1_EMAIL_FROM = "hello@samecor.com";
    expect(anthemEmailFrom().from).toBe("SAMECOR <hello@samecor.com>");
  });

  it("follow email opens the follower's profile, with no old-brand links or images", async () => {
    const { renderFollowEmail } = await email();
    env.APLUS1_APP_URL = "https://an1hem.app";
    const mail = renderFollowEmail({
      recipientName: "Aun",
      followerName: "Mint",
      actionUrl: "https://an1hem.app/@mint",
    });
    expect(mail.html).toContain('href="https://samecor.com/@mint"');
    expect(mail.html).toContain('src="https://samecor.com/email/logo-email.png"');
    expect(mail.html).toContain("https://samecor.com/settings#notifications");
    expect(mail.text).toContain("ดูโปรไฟล์: https://samecor.com/@mint");
    expect(`${mail.html}${mail.text}`).not.toMatch(/aplus1\.app|an1hem\.app/);
  });
});
