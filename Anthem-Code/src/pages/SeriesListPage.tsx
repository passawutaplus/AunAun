import { useEffect } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import PageLoader from "@/components/ui/PageLoader";
import { useAuth } from "@/hooks/useAuth";

/**
 * Legacy /series manage — My Catalog now lives in My Studio.
 * Public series detail remains at /series/:id
 */
export default function SeriesListPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    if (!loading && !user) navigate("/auth?redirect=/dashboard/catalogs");
  }, [loading, user, navigate]);

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/auth?redirect=/dashboard/catalogs" replace />;

  const s = params.get("s");
  const to = s ? `/dashboard/catalogs?s=${encodeURIComponent(s)}` : "/dashboard/catalogs";
  return <Navigate to={to} replace />;
}
