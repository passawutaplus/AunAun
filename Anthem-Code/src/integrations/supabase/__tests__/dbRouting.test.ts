import { describe, expect, it } from "vitest";
import { schemaForTable } from "@/integrations/supabase/db";

describe("schemaForTable", () => {
  it("routes profiles_public to public schema", () => {
    expect(schemaForTable("profiles_public")).toBe("public");
    expect(schemaForTable("profiles")).toBe("public");
  });

  it("routes anthem tables to anthem schema", () => {
    expect(schemaForTable("projects")).toBe("anthem");
  });
});
