import { useEffect } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import PageLoader from "@/components/ui/PageLoader";
import { useAuth } from "@/hooks/useAuth";

/**
 * Legacy /inspire — My Inspire now lives on /portfolio?tab=inspire
 */
export default function InspireBoardsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    if (!loading && !user) navigate("/auth?redirect=/portfolio?tab=inspire");
  }, [loading, user, navigate]);

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/auth?redirect=/portfolio?tab=inspire" replace />;

  const next = new URLSearchParams();
  next.set("tab", "inspire");
  const b = params.get("b");
  if (b) next.set("b", b);
  return <Navigate to={`/portfolio?${next.toString()}`} replace />;
}
