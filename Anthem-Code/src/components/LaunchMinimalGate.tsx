import { Outlet, useLocation } from "react-router-dom";
import { isLaunchHiddenPath } from "@/lib/aplus1Launch";
import LaunchUnavailablePage from "@/pages/LaunchUnavailablePage";

/** Blocks routes outside launch allowlist when minimal mode is active. */
export default function LaunchMinimalGate() {
  const { pathname } = useLocation();
  if (isLaunchHiddenPath(pathname)) {
    return <LaunchUnavailablePage />;
  }
  return <Outlet />;
}
