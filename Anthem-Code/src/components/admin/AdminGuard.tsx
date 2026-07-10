import PageLoader from "@/components/ui/PageLoader";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { data: isAdmin, isLoading, isFetching, isError } = useIsAdmin();

  const checking = <PageLoader label="กำลังตรวจสอบสิทธิ์..." />;

  if (loading) return checking;
  if (!user) return <Navigate to="/auth?redirect=/admin" replace />;
  if (!user.email_confirmed_at) {
    return <Navigate to="/auth?redirect=/admin&verify=1" replace />;
  }
  // Wait until the admin role check has actually resolved (true/false) or errored.
  // Covers the race where useIsAdmin's internal useAuth hasn't enabled the query yet.
  if (isAdmin === undefined && !isError) return checking;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

