import { describe, expect, it } from "vitest";
import { userFacingError } from "../userFacingError";

describe("userFacingError", () => {
  it("keeps our own Thai messages", () => {
    expect(userFacingError(new Error("อัปโหลดไม่สำเร็จ ไฟล์ใหญ่เกิน 20MB"))).toBe("อัปโหลดไม่สำเร็จ ไฟล์ใหญ่เกิน 20MB");
  });
  it("maps known technical errors to what happened + what to do", () => {
    expect(userFacingError(new Error("Failed to fetch"))).toContain("ลองใหม่");
    expect(userFacingError({ message: "Invalid login credentials" })).toContain("รหัสผ่าน");
  });
  it("never shows raw codes", () => {
    expect(userFacingError({ message: "PGRST301: JWS invalid" }, "บันทึกไม่สำเร็จ")).toBe("บันทึกไม่สำเร็จ");
    expect(userFacingError(null)).toBe("ทำรายการไม่สำเร็จ ลองใหม่อีกครั้ง");
  });
});
