import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ProfileSharePopover from "@/components/profile/ProfileSharePopover";

describe("ProfileSharePopover", () => {
  it("opens a centered share dialog like other share actions", () => {
    render(
      <ProfileSharePopover
        url="https://aplus1.app/@demo"
        title="Demo Creator"
        message="ดูพอร์ตโฟล์ Demo"
        pathLabel="/@demo"
        imageUrl="https://aplus1.app/cover.jpg"
      >
        <button type="button">แชร์โปรไฟล์</button>
      </ProfileSharePopover>,
    );

    fireEvent.click(screen.getByRole("button", { name: "แชร์โปรไฟล์" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "แชร์พอร์ตโฟล์สาธารณะ" })).toBeInTheDocument();
    expect(screen.getByText("ตัวอย่างการ์ดที่เพื่อนจะเห็น")).toBeInTheDocument();
    expect(screen.getByText("/@demo")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Facebook" })).toHaveAttribute(
      "href",
      expect.stringContaining("facebook.com/sharer"),
    );
    expect(screen.getByRole("button", { name: "เปิดหน้าที่ลูกค้าเห็น" })).toBeInTheDocument();
  });
});
