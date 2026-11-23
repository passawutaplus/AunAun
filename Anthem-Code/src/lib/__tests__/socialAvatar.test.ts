import { describe, expect, it } from "vitest";
import { isExpiringSocialAvatar, signedInWithFacebook } from "@/lib/socialAvatar";

describe("isExpiringSocialAvatar", () => {
  it("matches Facebook picture hosts over https only", () => {
    expect(isExpiringSocialAvatar("https://platform-lookaside.fbsbx.com/platform/profilepic/?asid=1&ext=2")).toBe(true);
    expect(isExpiringSocialAvatar("https://scontent.xx.fbcdn.net/v/t1/p.jpg")).toBe(true);
    expect(isExpiringSocialAvatar("http://platform-lookaside.fbsbx.com/x")).toBe(false);
  });

  it("ignores our own storage, other providers and look-alike hosts", () => {
    expect(isExpiringSocialAvatar("https://abc.supabase.co/storage/v1/object/public/project-media/a.webp")).toBe(false);
    expect(isExpiringSocialAvatar("https://profile.line-scdn.net/abc")).toBe(false);
    expect(isExpiringSocialAvatar("https://fbsbx.com.evil.example/x")).toBe(false);
    expect(isExpiringSocialAvatar("https://evilfbcdn.net/x")).toBe(false);
    expect(isExpiringSocialAvatar(null)).toBe(false);
    expect(isExpiringSocialAvatar("not a url")).toBe(false);
  });
});

describe("signedInWithFacebook", () => {
  it("reads the linked providers", () => {
    expect(signedInWithFacebook({ app_metadata: { provider: "email", providers: ["email", "facebook"] } })).toBe(true);
    expect(signedInWithFacebook({ app_metadata: { provider: "facebook" } })).toBe(true);
    expect(signedInWithFacebook({ app_metadata: { provider: "google", providers: ["google"] } })).toBe(false);
    expect(signedInWithFacebook(null)).toBe(false);
  });
});
