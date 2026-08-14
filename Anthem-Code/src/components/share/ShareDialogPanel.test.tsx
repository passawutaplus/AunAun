import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import SharePopover from "@/components/SharePopover";

describe("SharePopover", () => {
  it("opens a share dialog with a 1.91 preview card and working destinations", () => {
    render(
      <SharePopover
        url="https://aplus1.app/project/1"
        title="งานทดสอบ"
        label="แชร์"
        imageUrl="https://aplus1.app/cover.jpg"
      >
        <button type="button">เปิดแชร์</button>
      </SharePopover>,
    );

    fireEvent.click(screen.getByRole("button", { name: "เปิดแชร์" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "แชร์" })).toBeInTheDocument();
    expect(screen.getByText("ตัวอย่างการ์ดที่เพื่อนจะเห็น")).toBeInTheDocument();
    expect(screen.getByText("งานทดสอบ")).toBeInTheDocument();
    expect(screen.getByText("aplus1.app")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "Facebook" })).toHaveAttribute(
      "href",
      expect.stringContaining("facebook.com/sharer"),
    );
    expect(screen.getByRole("link", { name: "LINE" })).toHaveAttribute(
      "href",
      expect.stringContaining("line.me"),
    );
    expect(screen.getByRole("link", { name: "WhatsApp" })).toHaveAttribute(
      "href",
      expect.stringContaining("api.whatsapp.com/send"),
    );
    expect(screen.getByRole("link", { name: "X" })).toHaveAttribute(
      "href",
      expect.stringContaining("twitter.com/intent/tweet"),
    );
    expect(screen.getByRole("link", { name: "อีเมล" })).toHaveAttribute(
      "href",
      expect.stringContaining("mailto:"),
    );
    expect(screen.getByRole("link", { name: "Instagram" })).toHaveAttribute(
      "href",
      "https://www.instagram.com/",
    );
    expect(screen.getByRole("link", { name: "Instagram" })).toHaveAttribute("target", "_blank");
    expect(screen.getByRole("link", { name: "WeChat" })).toHaveAttribute(
      "href",
      "https://web.wechat.com/",
    );
    expect(screen.getByRole("link", { name: "Messenger" })).toHaveAttribute(
      "href",
      "https://www.messenger.com/",
    );
    expect(screen.getByRole("button", { name: "คัดลอกลิงก์" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("https://aplus1.app/project/1")).toBeInTheDocument();
  });
});
