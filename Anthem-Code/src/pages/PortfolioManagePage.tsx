import { useEffect } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import PageLoader from "@/components/ui/PageLoader";
import { useAuth } from "@/hooks/useAuth";

/**
 * Legacy /portfolio/manage — works dashboard now lives on /portfolio (tab ผลงาน).
 * Community posts manage: /portfolio?manage=posts (optional future) → for now profile works.
 */
export default function PortfolioManagePage() {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const posts = searchParams.get("tab") === "posts";

  useEffect(() => {
    if (!loading && !user) {
      /* Navigate handles via RequireAuth usually; keep safe */
    }
  }, [loading, user]);

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/auth?redirect=/portfolio" replace />;

  // Posts tab used to live on manage — send to community for now if requested
  if (posts) {
    return <Navigate to="/community" replace />;
  }

  return <Navigate to="/portfolio" replace />;
}
