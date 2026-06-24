import { describe, it, expect } from "vitest";
import { thaiPhoneRegex, hireRequestSchema, profileSchema, commentSchema, projectSchema } from "../validators";

describe("thaiPhoneRegex", () => {
  it("accepts valid TH mobile", () => {
    expect(thaiPhoneRegex.test("0812345678")).toBe(true);
    expect(thaiPhoneRegex.test("+66812345678")).toBe(true);
  });
  it("rejects invalid", () => {
    expect(thaiPhoneRegex.test("12345")).toBe(false);
    expect(thaiPhoneRegex.test("0512345678")).toBe(false);
    expect(thaiPhoneRegex.test("081234567")).toBe(false);
  });
});

describe("hireRequestSchema", () => {
  it("requires name + valid email", () => {
    const r = hireRequestSchema.safeParse({ clientName: "A", email: "bad" });
    expect(r.success).toBe(false);
  });
  it("passes minimal valid", () => {
    const r = hireRequestSchema.safeParse({ clientName: "John", email: "a@b.co" });
    expect(r.success).toBe(true);
  });
  it("caps message length", () => {
    const r = hireRequestSchema.safeParse({
      clientName: "John", email: "a@b.co", message: "x".repeat(1001),
    });
    expect(r.success).toBe(false);
  });
});

describe("profileSchema", () => {
  it("rejects bad username chars", () => {
    const r = profileSchema.safeParse({
      displayName: "A", username: "bad name!", email: "a@b.co",
    });
    expect(r.success).toBe(false);
  });
  it("accepts clean profile", () => {
    const r = profileSchema.safeParse({
      displayName: "A", username: "good_name.1", email: "a@b.co",
    });
    expect(r.success).toBe(true);
  });
});

describe("commentSchema", () => {
  it("rejects empty and oversized", () => {
    expect(commentSchema.safeParse({ content: "" }).success).toBe(false);
    expect(commentSchema.safeParse({ content: "x".repeat(801) }).success).toBe(false);
  });
  it("accepts normal", () => {
    expect(commentSchema.safeParse({ content: "hi" }).success).toBe(true);
  });
});

describe("projectSchema", () => {
  it("requires title and category", () => {
    const r = projectSchema.safeParse({ title: "ab", category: "", status: "Draft", cover_url: "" });
    expect(r.success).toBe(false);
  });
  it("accepts valid draft", () => {
    const r = projectSchema.safeParse({
      title: "My Project", category: "Design", status: "Draft", cover_url: "",
    });
    expect(r.success).toBe(true);
  });
});
