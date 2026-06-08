import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useHubAuth } from "@/hooks/useHubAuth";

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useHubAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-lg font-semibold">ไม่มีสิทธิ์ Admin</p>
        <p className="max-w-sm text-sm text-muted">
          บัญชีนี้ยังไม่มี role admin ใน <code className="text-xs">public.user_roles</code>
        </p>
        <a href="/login" className="text-sm text-brand hover:underline">
          กลับหน้า login
        </a>
      </div>
    );
  }

  return <>{children}</>;
}
