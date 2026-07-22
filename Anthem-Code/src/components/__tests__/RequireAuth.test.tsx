import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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

const renderAt = (path = "/protected") => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
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
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe("RequireAuth", () => {
  beforeEach(() => mockUseAuth.mockReset());

  it("shows loader while auth is initialising", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    const { container } = renderAt();
    expect(container.querySelector(".banter-loader")).toBeTruthy();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("redirects guests to /auth", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    renderAt();
    expect(screen.getByText("AUTH PAGE")).toBeInTheDocument();
  });

  it("blocks unverified email/password users with verify-email gate", () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: "u1",
        email: "a@b.co",
        email_confirmed_at: null,
        identities: [{ provider: "email" }],
        app_metadata: { providers: ["email"] },
      },
      loading: false,
    });
    renderAt();
    expect(screen.getByText(/ยืนยันอีเมล/)).toBeInTheDocument();
    expect(screen.queryByText("SECRET CONTENT")).not.toBeInTheDocument();
  });

  it("lets Google/OAuth users through without email_confirmed_at", () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: "u1",
        email: "a@b.co",
        email_confirmed_at: null,
        identities: [{ provider: "google" }],
        app_metadata: { providers: ["google"] },
      },
      loading: false,
    });
    renderAt();
    expect(screen.getByText("SECRET CONTENT")).toBeInTheDocument();
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
