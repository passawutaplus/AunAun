import { describe, expect, it } from "vitest";
import { schemaForTable } from "@/integrations/supabase/db";

describe("schemaForTable", () => {
  it("routes profiles_public to public schema", () => {
    expect(schemaForTable("profiles_public")).toBe("public");
    expect(schemaForTable("profiles")).toBe("public");
  });

  it("routes public-only tables used by Aplus1", () => {
    expect(schemaForTable("avatar_pool")).toBe("public");
    expect(schemaForTable("ecosystem_links")).toBe("public");
  });

  it("routes hire money tables to shared schema", () => {
    expect(schemaForTable("hire_orders")).toBe("shared");
    expect(schemaForTable("hire_quotes")).toBe("shared");
    expect(schemaForTable("payment_disputes")).toBe("shared");
  });

  it("routes anthem tables to anthem schema", () => {
    expect(schemaForTable("projects")).toBe("anthem");
  });
});

describe("schemaForRpc", () => {
  it("routes anthem-only functions to the anthem schema", async () => {
    const { schemaForRpc } = await import("@/integrations/supabase/db");
    expect(schemaForRpc("request_cashout")).toBe("anthem");
    expect(schemaForRpc("log_ad_event_v2")).toBe("anthem");
    expect(schemaForRpc("submit_feedback")).toBe("anthem");
  });

  it("routes shared functions to the shared schema", async () => {
    const { schemaForRpc } = await import("@/integrations/supabase/db");
    expect(schemaForRpc("next_doc_number")).toBe("shared");
  });

  it("defaults to public", async () => {
    const { schemaForRpc } = await import("@/integrations/supabase/db");
    expect(schemaForRpc("has_role")).toBe("public");
    expect(schemaForRpc("claim_daily_px")).toBe("public");
  });
});

describe("routing lists match the database", () => {
  it("never lists a table as both public and shared", async () => {
    const { PUBLIC_TABLE_NAMES, SHARED_TABLE_NAMES } = await import(
      "@/integrations/supabase/tableRouting"
    );
    const shared = new Set<string>(SHARED_TABLE_NAMES);
    expect(PUBLIC_TABLE_NAMES.filter((t) => shared.has(t))).toEqual([]);
  });
});
