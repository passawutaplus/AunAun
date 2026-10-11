import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Footer from "../Footer";

vi.mock("@/hooks/useProjects", () => ({
  useTopProjects: () => ({ data: [] }),
}));

const renderFooter = () =>
  render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>,
  );

describe("Footer", () => {
  it("renders a dark monolith footer with legal links and the wordmark", () => {
    renderFooter();
    expect(screen.queryByRole("heading", { name: /ผลงานจริง/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "แชร์ผลงาน" })).not.toBeInTheDocument();
    expect(screen.getByText(/สงวนลิขสิทธิ์/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ข้อกำหนด" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ศูนย์ช่วยเหลือ" })).toBeInTheDocument();
    expect(screen.getByText("sameCOR")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
