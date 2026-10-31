import { Navigate, Outlet, useLocation } from "react-router-dom";
import CommerceLinkRedirect from "@/components/CommerceLinkRedirect";
import { isCommercePath, isLaunchHiddenPath, isRetiredPublicPath } from "@/lib/aplus1Launch";
import LaunchUnavailablePage from "@/pages/LaunchUnavailablePage";

/** Blocks routes outside launch allowlist when minimal mode is active. */
export default function LaunchMinimalGate() {
  const { pathname } = useLocation();
  if (isRetiredPublicPath(pathname)) {
    return <Navigate to="/" replace />;
  }
  const commerceLink = isCommercePath(pathname) ? pathname.match(/^\/(service|object)\/([^/]+)$/) : null;
  if (commerceLink) {
    return <CommerceLinkRedirect kind={commerceLink[1] as "service" | "object"} id={commerceLink[2]} />;
  }
  if (isLaunchHiddenPath(pathname)) {
    return <LaunchUnavailablePage />;
  }
  return <Outlet />;
}
