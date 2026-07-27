import { useEffect } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import PageLoader from "@/components/ui/PageLoader";
import { useAuth } from "@/hooks/useAuth";

/**
 * Legacy /collections manage — Collections now live on /portfolio?tab=collections
 * Public collection detail remains at /collections/:id
 */
export default function CollectionsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    if (!loading && !user) navigate("/auth?redirect=/portfolio?tab=collections");
  }, [loading, user, navigate]);

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/auth?redirect=/portfolio?tab=collections" replace />;

  const next = new URLSearchParams();
  next.set("tab", "collections");
  const c = params.get("c");
  if (c) next.set("c", c);
  return <Navigate to={`/portfolio?${next.toString()}`} replace />;
}
