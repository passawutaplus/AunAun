import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { RouteError } from "@/components/RouteError";
import { RequireAuth } from "@/auth/RequireAuth";
import { Loader2 } from "lucide-react";
import * as React from "react";
import { useInhouseOrgBySlug } from "@/hooks/inhouse/useInhouseOrg";
import { useInhouseWorkspaces } from "@/hooks/inhouse/useInhouseWorkspace";
import { inhouseOrgSettingsPath, inhouseWorkspacePath } from "@/lib/inhouseAccess";

export const Route = createFileRoute("/inhouse/$orgSlug")({
  errorComponent: ({ error }) => <RouteError error={error} />,
  component: () => (
    <RequireAuth>
      <InhouseOrgRedirect />
    </RequireAuth>
  ),
});

function InhouseOrgRedirect() {
  const { orgSlug } = Route.useParams();
  const navigate = useNavigate();
  const { data: org, isLoading: orgLoading } = useInhouseOrgBySlug(orgSlug);
  const { data: workspaces = [], isLoading: wsLoading } = useInhouseWorkspaces(org?.id);

  React.useEffect(() => {
    if (orgLoading || wsLoading || !org) return;
    const first = workspaces[0];
    if (first) {
      navigate({ to: inhouseWorkspacePath(org.slug, first.slug), replace: true });
    } else {
      navigate({ to: inhouseOrgSettingsPath(org.slug), replace: true });
    }
  }, [org, workspaces, orgLoading, wsLoading, navigate]);

  if (orgLoading || wsLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2">
        <p className="text-muted-foreground">ไม่พบ org</p>
        <Link to="/inhouse" className="text-sm text-primary underline">
          กลับหน้า In-House
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}
