import { describe, expect, it } from "vitest";
import { passwordChangeFormError } from "@/lib/passwordChange";

describe("passwordChangeFormError", () => {
  it("requires the current password when the account already has one", () => {
    expect(
      passwordChangeFormError({
        current: "",
        next: "Newpass12",
        confirm: "Newpass12",
        needsCurrent: true,
      }),
    ).toMatch(/รหัสผ่านเดิม/);
  });

  it("allows first-time password without a current value", () => {
    expect(
      passwordChangeFormError({
        current: "",
        next: "Newpass12",
        confirm: "Newpass12",
        needsCurrent: false,
      }),
    ).toBeNull();
  });

  it("rejects a new password that matches the current one", () => {
    expect(
      passwordChangeFormError({
        current: "SamePass1",
        next: "SamePass1",
        confirm: "SamePass1",
        needsCurrent: true,
      }),
    ).toMatch(/ไม่ซ้ำ/);
  });
});
