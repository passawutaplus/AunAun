import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Footer from "../Footer";

const mockNavigate = vi.fn();
const mockOpenSignup = vi.fn();
const mockUseAuth = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/stores/authDialogStore", () => ({
  useAuthDialog: (sel: (s: { openSignup: typeof mockOpenSignup }) => unknown) =>
    sel({ openSignup: mockOpenSignup }),
}));

const renderFooter = () =>
  render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>,
  );

describe("Footer", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockOpenSignup.mockReset();
    mockUseAuth.mockReturnValue({ user: null, loading: false });
  });

  it("renders Cline-style CTA, legal split, and cropped wordmark", () => {
    renderFooter();
    expect(screen.getByRole("heading", { name: /ผลงานจริง/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "แชร์ผลงาน" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "จ้างครีเอเตอร์" })).not.toBeInTheDocument();
    expect(screen.getByText(/สงวนลิขสิทธิ์/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ข้อกำหนด" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "สำรวจ" })).toBeInTheDocument();
    expect(screen.getByText("กรุงเทพฯ")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("opens signup when a guest posts work", () => {
    renderFooter();
    fireEvent.click(screen.getByRole("button", { name: "แชร์ผลงาน" }));
    expect(mockOpenSignup).toHaveBeenCalledWith("/portfolio/new");
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("navigates to the editor when a signed-in user posts work", () => {
    mockUseAuth.mockReturnValue({ user: { id: "u1" }, loading: false });
    renderFooter();
    fireEvent.click(screen.getByRole("button", { name: "แชร์ผลงาน" }));
    expect(mockNavigate).toHaveBeenCalledWith("/portfolio/new");
    expect(mockOpenSignup).not.toHaveBeenCalled();
  });
});
