import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isAdminLaunchHiddenPath } from "@/lib/admin/adminNavigation";

/** Redirects admin routes hidden during launch minimal. */
export default function AdminLaunchGate({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  if (isAdminLaunchHiddenPath(pathname)) {
    return <Navigate to="/admin" replace />;
  }
  return children;
}
