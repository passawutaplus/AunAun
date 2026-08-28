import { describe, expect, it } from "vitest";
import { resolveNotificationLink } from "@/lib/notificationLinks";

describe("resolveNotificationLink", () => {
  it("keeps My Studio home on /dashboard", () => {
    expect(resolveNotificationLink("/dashboard")).toBe("/dashboard");
  });

  it("maps legacy hire inbox links to /dashboard/hire", () => {
    expect(resolveNotificationLink("/dashboard?mode=hire")).toBe("/dashboard/hire");
    expect(resolveNotificationLink("/dashboard?focus=hiring")).toBe("/dashboard/hire");
    expect(resolveNotificationLink("/dashboard#hiring")).toBe("/dashboard/hire");
    expect(resolveNotificationLink("/hire-requests")).toBe("/dashboard/hire");
  });

  it("maps collab and wallet legacy dashboard links", () => {
    expect(resolveNotificationLink("/dashboard?mode=collab")).toBe("/dashboard/collab");
    expect(resolveNotificationLink("/dashboard?mode=wallet")).toBe("/earnings");
    expect(resolveNotificationLink("/collab-requests")).toBe("/dashboard/collab");
  });
});
