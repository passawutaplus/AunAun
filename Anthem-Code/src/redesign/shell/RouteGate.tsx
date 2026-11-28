import { Navigate, useLocation } from "react-router-dom";
import CommerceLinkRedirect from "@/components/CommerceLinkRedirect";
import LaunchMinimalGate from "@/components/LaunchMinimalGate";
import { mergeRedirectTarget } from "@/lib/mergeRedirectTarget";
import NotFound from "../pages/NotFound";
import { redesignRouteFor } from "../routes";
import RedesignShell from "./RedesignShell";

const SEARCH_PATH = /^\/search\/?$/;

/**
 * New design only (step 14): stands in front of the old routes. Old pages the new design keeps
 * go on as before (LaunchMinimalGate); cut ones move to their new page or show the new 404 in the new frame.
 */
export default function RouteGate() {
  const { pathname, search } = useLocation();
  const route = redesignRouteFor(pathname);
  switch (route.kind) {
    case "redirect":
      // App-icon shortcut `/search`: the home page opens its search panel (Main reads `?search`).
      return <Navigate to={mergeRedirectTarget(SEARCH_PATH.test(pathname) ? `${route.to}?search=1` : route.to, search)} replace />;
    case "commerce":
      return <CommerceLinkRedirect kind={route.type} id={route.id} />;
    case "not-found":
      return (
        <RedesignShell>
          <NotFound />
        </RedesignShell>
      );
    default:
      return <LaunchMinimalGate />;
  }
}
