import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: vi.fn() },
}));

import { supabase } from "@/integrations/supabase/client";
import { fetchReferralDashboard } from "@/lib/referralDashboard";

describe("fetchReferralDashboard", () => {
  it("uses dashboard RPC when available", async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({
      data: {
        code: "ABC12345",
        signup_reward_px: 20,
        activation_reward_px: 100,
        referrer_reward_px: 50,
        invited_count: 2,
        qualified_count: 1,
        earned_px: 50,
        my_referral_status: null,
        my_signup_reward_px: 20,
        my_activation_reward_px: 100,
        recent: [],
      },
      error: null,
    } as never);

    const dash = await fetchReferralDashboard();
    expect(dash.code).toBe("ABC12345");
    expect(dash.qualified_count).toBe(1);
  });

  it("falls back to get_or_create_referral_code when dashboard RPC missing", async () => {
    vi.mocked(supabase.rpc)
      .mockResolvedValueOnce({ data: null, error: { message: "not found" } } as never)
      .mockResolvedValueOnce({ data: "DEADBEEF", error: null } as never);

    const dash = await fetchReferralDashboard();
    expect(dash.code).toBe("DEADBEEF");
    expect(dash.qualified_count).toBe(0);
  });
});
