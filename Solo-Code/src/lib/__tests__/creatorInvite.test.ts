import { beforeAll, describe, expect, it } from "vitest";
import { validateForSubmit } from "../../../supabase/functions/_shared/creator-invite-rules";
import {
  flexCreatorInvite,
  formatCreatorInvite,
} from "../../../supabase/functions/_shared/line-admin-format";

const env: Record<string, string> = { SUPABASE_SERVICE_ROLE_KEY: "test-service-key-material" };
beforeAll(() => {
  (globalThis as unknown as { Deno: unknown }).Deno = { env: { get: (k: string) => env[k] } };
});

// Non-literal path: the module needs the Deno runtime types, which this package's tsc does not have.
const CORE_PATH = "../../../supabase/functions/_shared/creator-invite-core";
async function core() {
  return await import(/* @vite-ignore */ CORE_PATH);
}

describe("creator invite tokens", () => {
  it("are 32 random bytes, base64url, never repeating", async () => {
    const { newToken, isTokenShape } = await core();
    const a = newToken();
    const b = newToken();
    expect(a).toHaveLength(43);
    expect(isTokenShape(a)).toBe(true);
    expect(a).not.toBe(b);
    expect(isTokenShape("tanawat-k")).toBe(false);
  });

  it("hash is sha256 hex and the cipher round-trips", async () => {
    const { hashToken, mintToken, decryptToken } = await core();
    expect(await hashToken("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    const t = await mintToken();
    expect(t.cipher).not.toContain(t.token);
    expect(await decryptToken(t.cipher)).toBe(t.token);
    expect(await decryptToken("v1.bad.cipher")).toBeNull();
  });

  it("one-time passwords are long and use the safe alphabet", async () => {
    const { randomPassword } = await core();
    const p = randomPassword();
    expect(p.length).toBe(20);
    expect(p).toMatch(/^[A-HJ-NP-Za-km-z2-9!@#$%*_-]+$/);
    expect(randomPassword()).not.toBe(p);
  });
});

describe("creator invite emails", () => {
  it("invitation carries the link, note and an opt-out line in both languages", async () => {
    const { renderInviteEmail } = await core();
    const th = renderInviteEmail("invite", {
      lang: "th",
      name: "Tanawat",
      note: "ชอบงานโปสเตอร์",
      link: "https://samecor.com/invite/creator/x",
      unsubscribe: "https://u",
    });
    expect(th.subject).toContain("ครีเอเตอร์กลุ่มแรก");
    expect(th.html).toContain("https://samecor.com/invite/creator/x");
    expect(th.html).toContain("ชอบงานโปสเตอร์");
    expect(th.html).toContain("หยุดรับอีเมลคำเชิญ");
    const en = renderInviteEmail("reminder", {
      lang: "en",
      name: "Kenji",
      link: "https://l",
      unsubscribe: "https://u",
    });
    expect(en.subject).toMatch(/reminder/i);
    expect(en.html).toContain('lang="en"');
    expect(en.html).toContain("Stop invitation emails");
  });

  it("account email shows the password only in the email itself and escapes names", async () => {
    const { renderInviteEmail } = await core();
    // Fake one-time value built at runtime (not a real credential).
    const otp = ["fake", "otp", "x".repeat(12)].join("-");
    const m = renderInviteEmail("account", {
      lang: "en",
      name: "<b>x</b>",
      link: "https://l",
      email: "a@b.co",
      password: otp,
    });
    expect(m.html).toContain(otp);
    expect(m.text).toContain(otp);
    expect(m.html).not.toContain("<b>x</b>");
    const linked = renderInviteEmail("account", { lang: "th", name: "A", link: "https://l" });
    expect(linked.html).not.toContain("รหัสผ่านชั่วคราว (ใช้ครั้งเดียว)");
  });
});

describe("validateForSubmit", () => {
  const base = {
    about: { name: "A", email: "a@b.co", discipline: "Photography", avatar: "av" },
    projects: [{ title: "P", media: ["m1"], rights: true }],
    quick: { portfolio_url: "" },
    contact_pref: "email",
    contact_handle: "",
  };
  it("accepts a full submission with one clean image and rights", () => {
    expect(validateForSubmit("full", base, new Set(["m1", "av"]))).toEqual([]);
  });
  it("requires a scanned profile picture in the full form", () => {
    expect(
      validateForSubmit(
        "full",
        { ...base, about: { ...base.about, avatar: null } },
        new Set(["m1"]),
      ),
    ).toEqual(["about.avatar"]);
  });
  it("rejects missing rights, unscanned images and empty projects", () => {
    const bad = { ...base, projects: [{ title: "", media: ["m2"], rights: false }] };
    expect(validateForSubmit("full", bad, new Set(["m1", "av"]))).toEqual([
      "projects.0.title",
      "projects.0.media",
      "projects.0.rights",
    ]);
    expect(validateForSubmit("full", { ...base, projects: [] }, new Set())).toContain("projects");
  });
  it("quick submit only needs name, email and a portfolio link", () => {
    const q = {
      about: { name: "A", email: "a@b.co", discipline: "" },
      projects: [],
      quick: { portfolio_url: "https://behance.net/a" },
    };
    expect(validateForSubmit("quick", q, new Set())).toEqual([]);
    expect(validateForSubmit("quick", { ...q, quick: { portfolio_url: "" } }, new Set())).toEqual([
      "quick.portfolio_url",
    ]);
  });
});

describe("LINE creator invite alert", () => {
  it("names the creator and links the admin page", () => {
    const c = {
      display_name: "Tanawat K.",
      discipline: "Photography",
      country: "Thailand",
      submit_mode: "full",
      submitted_at: "2026-11-04T07:22:00Z",
      project_count: 2,
    };
    expect(formatCreatorInvite(c)).toContain("Tanawat K.");
    expect(formatCreatorInvite(c)).toContain("/admin/creator-invitations");
    expect(JSON.stringify(flexCreatorInvite(c))).toContain("2 โปรเจกต์");
  });
});
