import * as React from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/auth/AuthProvider";
import { EmailVerificationGate } from "@/components/auth/EmailVerificationGate";
import { isEmailVerified } from "@/lib/emailVerification";
import { isEarlyAccessMode } from "@/lib/publicAccess";
import { safeRelativePath } from "@/lib/safeUrl";
import { Loader2 } from "lucide-react";

interface Props {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function RequireAuth({ children, requireAdmin = false }: Props) {
  const { user, isAdmin, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hasResolvedRef = React.useRef(false);

  const earlyAccess = isEarlyAccessMode();
  const needsTesterApproval =
    earlyAccess && !isAdmin && !profile?.tester_approved && pathname !== "/apply";
  const needsEmailVerification = !!user && !isEmailVerified(user);

  React.useEffect(() => {
    if (loading) return;
    if (!user) {
      const redirect = safeRelativePath(pathname, "/dashboard");
      navigate({ to: "/auth", search: { redirect } });
    } else if (profile?.is_active === false) {
      navigate({ to: "/auth", search: { redirect: "/dashboard" } });
    } else if (requireAdmin && !isAdmin) {
      navigate({ to: "/dashboard" });
    } else if (needsTesterApproval) {
      navigate({ to: "/apply" });
    }
  }, [
    user,
    isAdmin,
    profile?.is_active,
    loading,
    requireAdmin,
    navigate,
    needsTesterApproval,
    pathname,
  ]);

  const blocked =
    !user || profile?.is_active === false || (requireAdmin && !isAdmin) || needsTesterApproval;

  if (!blocked && !loading) {
    hasResolvedRef.current = true;
  }

  if ((loading || blocked) && !hasResolvedRef.current) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (needsEmailVerification && user?.email) {
    return <EmailVerificationGate email={user.email} onSignOut={signOut} />;
  }

  return <>{children}</>;
}
