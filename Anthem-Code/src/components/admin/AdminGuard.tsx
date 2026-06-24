import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { data: isAdmin, isLoading, isFetching, isError } = useIsAdmin();

  const checking = (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
      กำลังตรวจสอบสิทธิ์...
    </div>
  );

  if (loading) return checking;
  if (!user) return <Navigate to="/auth?redirect=/admin" replace />;
  // Wait until the admin role check has actually resolved (true/false) or errored.
  // Covers the race where useIsAdmin's internal useAuth hasn't enabled the query yet.
  if (isAdmin === undefined && !isError) return checking;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

