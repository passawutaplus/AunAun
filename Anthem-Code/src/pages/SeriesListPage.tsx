import { useEffect } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import PageLoader from "@/components/ui/PageLoader";
import { useAuth } from "@/hooks/useAuth";

/**
 * Legacy /series manage — My Catalog now lives on /portfolio?tab=catalog
 * Public series detail remains at /series/:id
 */
export default function SeriesListPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    if (!loading && !user) navigate("/auth?redirect=/portfolio?tab=catalog");
  }, [loading, user, navigate]);

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/auth?redirect=/portfolio?tab=catalog" replace />;

  const next = new URLSearchParams();
  next.set("tab", "catalog");
  const s = params.get("s");
  if (s) next.set("s", s);
  return <Navigate to={`/portfolio?${next.toString()}`} replace />;
}
