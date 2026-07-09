import { Navigate, Outlet, useLocation } from "react-router-dom";
import { isLaunchHiddenPath } from "@/lib/aplus1Launch";

/** Redirects hidden routes when VITE_APLUS1_LAUNCH_MINIMAL=true. */
export default function LaunchMinimalGate() {
  const { pathname } = useLocation();
  if (isLaunchHiddenPath(pathname)) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
