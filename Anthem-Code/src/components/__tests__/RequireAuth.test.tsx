import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import RequireAuth from "../RequireAuth";

// Mock supabase client (used inside VerifyEmailGate)
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      resend: vi.fn(async () => ({ error: null })),
      signOut: vi.fn(async () => ({ error: null })),
    },
  },
}));

const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

const renderAt = (path = "/protected") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/auth" element={<div>AUTH PAGE</div>} />
        <Route
          path="/protected"
          element={
            <RequireAuth>
              <div>SECRET CONTENT</div>
            </RequireAuth>
          }
        />
        <Route
          path="/lenient"
          element={
            <RequireAuth allowUnverified>
              <div>LENIENT CONTENT</div>
            </RequireAuth>
          }
        />
      </Routes>
    </MemoryRouter>,
  );

describe("RequireAuth", () => {
  beforeEach(() => mockUseAuth.mockReset());

  it("shows loader while auth is initialising", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    const { container } = renderAt();
    expect(container.querySelector(".animate-spin")).toBeTruthy();
  });

  it("redirects guests to /auth", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    renderAt();
    expect(screen.getByText("AUTH PAGE")).toBeInTheDocument();
  });

  it("blocks unverified users with verify-email gate", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "u1", email: "a@b.co", email_confirmed_at: null },
      loading: false,
    });
    renderAt();
    expect(screen.getByText(/ยืนยันอีเมล/)).toBeInTheDocument();
    expect(screen.queryByText("SECRET CONTENT")).not.toBeInTheDocument();
  });

  it("renders children for verified users", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "u1", email: "a@b.co", email_confirmed_at: "2024-01-01" },
      loading: false,
    });
    renderAt();
    expect(screen.getByText("SECRET CONTENT")).toBeInTheDocument();
  });

  it("allowUnverified lets unverified through", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "u1", email: "a@b.co", email_confirmed_at: null },
      loading: false,
    });
    renderAt("/lenient");
    expect(screen.getByText("LENIENT CONTENT")).toBeInTheDocument();
  });
});
