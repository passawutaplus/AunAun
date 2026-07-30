import { describe, expect, it } from "vitest";
import { validateProjectInquiry } from "@/domain/inquiry";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("validateProjectInquiry", () => {
  it("allows profile-sourced inquiry without project id", () => {
    expect(validateProjectInquiry({ source: "profile" })).toBeNull();
  });

  it("requires project id when source is project", () => {
    expect(validateProjectInquiry({ source: "project" })).toMatch(/ผลงานอ้างอิง/);
    expect(validateProjectInquiry({ source: "project", projectId: "not-a-uuid" })).toMatch(
      /ผลงานอ้างอิง/,
    );
  });

  it("accepts valid project id for project source", () => {
    expect(validateProjectInquiry({ source: "project", projectId: VALID_UUID })).toBeNull();
  });

  it("requires service id when source is service", () => {
    expect(validateProjectInquiry({ source: "service" })).toMatch(/บริการอ้างอิง/);
    expect(validateProjectInquiry({ source: "service", serviceId: "bad" })).toMatch(/บริการอ้างอิง/);
  });

  it("accepts valid service id for service source", () => {
    expect(validateProjectInquiry({ source: "service", serviceId: VALID_UUID })).toBeNull();
  });
});
