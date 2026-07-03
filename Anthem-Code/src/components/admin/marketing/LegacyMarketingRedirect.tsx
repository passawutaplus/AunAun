import { Navigate, useLocation } from "react-router-dom";

/** Preserve subpath when redirecting /admin/kuy-radar/* → /admin/marketing/* */
export default function LegacyMarketingRedirect() {
  const { pathname, search } = useLocation();
  const next = pathname.replace(/^\/admin\/kuy-radar/, "/admin/marketing");
  return <Navigate to={`${next}${search}`} replace />;
}
