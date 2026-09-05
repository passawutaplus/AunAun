import { Navigate, Outlet, useLocation } from "react-router-dom";
import { isLaunchHiddenPath, isRetiredPublicPath } from "@/lib/aplus1Launch";
import LaunchUnavailablePage from "@/pages/LaunchUnavailablePage";

/** Blocks routes outside launch allowlist when minimal mode is active. */
export default function LaunchMinimalGate() {
  const { pathname } = useLocation();
  if (isRetiredPublicPath(pathname)) {
    return <Navigate to="/" replace />;
  }
  if (isLaunchHiddenPath(pathname)) {
    return <LaunchUnavailablePage />;
  }
  return <Outlet />;
}
