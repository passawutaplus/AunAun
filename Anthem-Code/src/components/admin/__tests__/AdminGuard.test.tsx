import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AdminGuard from "../AdminGuard";

const mockUseAuth = vi.fn();
const mockUseIsAdmin = vi.fn();

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => mockUseAuth() }));
vi.mock("@/hooks/useIsAdmin", () => ({ useIsAdmin: () => mockUseIsAdmin() }));

const verifiedUser = { id: "u1", email_confirmed_at: "2025-01-01T00:00:00.000Z" };

const renderGuard = () =>
  render(
    <MemoryRouter initialEntries={["/admin"]}>
      <Routes>
        <Route path="/" element={<div>HOME</div>} />
        <Route path="/auth" element={<div>AUTH PAGE</div>} />
        <Route
          path="/admin"
          element={
            <AdminGuard>
              <div>ADMIN PANEL</div>
            </AdminGuard>
          }
        />
      </Routes>
    </MemoryRouter>,
  );

describe("AdminGuard", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    mockUseIsAdmin.mockReset();
  });

  it("shows checking state while auth loads", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    mockUseIsAdmin.mockReturnValue({ data: undefined, isLoading: false, isFetching: false, isError: false });
    renderGuard();
    expect(screen.getByText(/กำลังตรวจสอบสิทธิ์/)).toBeInTheDocument();
  });

  it("redirects guests to /auth", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockUseIsAdmin.mockReturnValue({ data: undefined, isLoading: false, isFetching: false, isError: false });
    renderGuard();
    expect(screen.getByText("AUTH PAGE")).toBeInTheDocument();
  });

  it("redirects unverified email to auth", () => {
    mockUseAuth.mockReturnValue({ user: { id: "u1" }, loading: false });
    mockUseIsAdmin.mockReturnValue({ data: true, isLoading: false, isFetching: false, isError: false });
    renderGuard();
    expect(screen.getByText("AUTH PAGE")).toBeInTheDocument();
    expect(screen.queryByText("ADMIN PANEL")).not.toBeInTheDocument();
  });

  it("waits while admin check is still resolving", () => {
    mockUseAuth.mockReturnValue({ user: verifiedUser, loading: false });
    mockUseIsAdmin.mockReturnValue({ data: undefined, isLoading: true, isFetching: true, isError: false });
    renderGuard();
    expect(screen.getByText(/กำลังตรวจสอบสิทธิ์/)).toBeInTheDocument();
    expect(screen.queryByText("ADMIN PANEL")).not.toBeInTheDocument();
  });

  it("redirects non-admins home", () => {
    mockUseAuth.mockReturnValue({ user: verifiedUser, loading: false });
    mockUseIsAdmin.mockReturnValue({ data: false, isLoading: false, isFetching: false, isError: false });
    renderGuard();
    expect(screen.getByText("HOME")).toBeInTheDocument();
    expect(screen.queryByText("ADMIN PANEL")).not.toBeInTheDocument();
  });

  it("renders panel for admins", () => {
    mockUseAuth.mockReturnValue({ user: verifiedUser, loading: false });
    mockUseIsAdmin.mockReturnValue({ data: true, isLoading: false, isFetching: false, isError: false });
    renderGuard();
    expect(screen.getByText("ADMIN PANEL")).toBeInTheDocument();
  });

  it("treats query error as not-admin and redirects home", () => {
    mockUseAuth.mockReturnValue({ user: verifiedUser, loading: false });
    mockUseIsAdmin.mockReturnValue({ data: undefined, isLoading: false, isFetching: false, isError: true });
    renderGuard();
    expect(screen.getByText("HOME")).toBeInTheDocument();
  });
});
