import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ update: () => ({ eq: async () => ({ error: null }) }) }), rpc: async () => ({ data: null, error: null }) },
}));

import {
  GUIDE_TOURS,
  isTourDone,
  markTourDone,
  noteShownThisVisit,
  resetAllTours,
  shouldAutoStartTour,
  turnTourOff,
} from "@/lib/guideTours";

describe("guide tour rules", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("opens by itself on a first visit", () => {
    expect(shouldAutoStartTour(null, "home")).toBe(true);
  });

  it("closing early only hides it for this visit", () => {
    noteShownThisVisit("home");
    expect(shouldAutoStartTour(null, "home")).toBe(false);
    sessionStorage.clear(); // next visit
    expect(shouldAutoStartTour(null, "home")).toBe(true);
  });

  it("finishing stops it for good, on any visit", async () => {
    await markTourDone(null, "home");
    sessionStorage.clear();
    expect(shouldAutoStartTour(null, "home")).toBe(false);
    expect(isTourDone(null, "home")).toBe(true);
  });

  it("'ไม่ต้องแสดงอีก' stops it without counting it as finished", async () => {
    await turnTourOff(null, "chat");
    expect(shouldAutoStartTour(null, "chat")).toBe(false);
    expect(isTourDone(null, "chat")).toBe(false);
  });

  it("signed-in progress is kept per account", async () => {
    await markTourDone("user-1", "studio");
    expect(shouldAutoStartTour("user-1", "studio")).toBe(false);
    expect(shouldAutoStartTour("user-2", "studio")).toBe(true);
  });

  it("a finished tour from the old browser-only flag is respected", () => {
    localStorage.setItem("samecor.profileTour.v1", "done");
    expect(shouldAutoStartTour(null, "profile")).toBe(false);
  });

  it("a newer tour version opens again even when the old one was finished", () => {
    localStorage.setItem("samecor:guide-tours:guest", JSON.stringify({ home: { v: GUIDE_TOURS.home.version - 1, done: true } }));
    expect(shouldAutoStartTour(null, "home")).toBe(true);
  });

  it("reset makes every tour open by itself again", async () => {
    await markTourDone(null, "home");
    await resetAllTours(null);
    expect(shouldAutoStartTour(null, "home")).toBe(true);
  });
});
