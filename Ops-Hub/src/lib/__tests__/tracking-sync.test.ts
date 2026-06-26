import { describe, expect, it } from "vitest";
import type { InfraMonitorResponse } from "@/lib/infra-monitor-types";
import { computeTrackingSyncOverlay } from "@/lib/tracking-sync";

const baseInfra = (overrides: Partial<InfraMonitorResponse> = {}): InfraMonitorResponse => ({
  generated_at: "2026-06-17T00:00:00.000Z",
  health: [
    { name: "So1o", url: "https://www.solofreelancer.com", status: 200, latencyMs: 120, ok: true },
    { name: "Pixel100 demo", url: "https://aplus1-demo.vercel.app", status: 200, latencyMs: 90, ok: true },
    { name: "Ops Hub", url: "https://so1o-ops-hub.vercel.app", status: 200, latencyMs: 100, ok: true },
  ],
  supabase: {} as InfraMonitorResponse["supabase"],
  vercel: {} as InfraMonitorResponse["vercel"],
  ai: {} as InfraMonitorResponse["ai"],
  upgrade_advice: [],
  overall_verdict: "ok",
  ...overrides,
});

describe("computeTrackingSyncOverlay", () => {
  it("matches health probes by name (not label)", () => {
    const overlays = computeTrackingSyncOverlay(baseInfra());
    expect(overlays.some((o) => o.siteId === "so1o")).toBe(true);
    expect(overlays.some((o) => o.siteId === "an1hem")).toBe(true);
    expect(overlays.some((o) => o.siteId === "ops_hub")).toBe(true);
  });

  it("skips ops_hub boost when overall verdict is upgrade_required", () => {
    const overlays = computeTrackingSyncOverlay(
      baseInfra({ overall_verdict: "upgrade_required" }),
    );
    expect(overlays.some((o) => o.siteId === "ops_hub")).toBe(false);
  });
});
