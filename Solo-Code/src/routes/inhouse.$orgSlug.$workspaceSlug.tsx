import { createFileRoute } from "@tanstack/react-router";
import { RouteError } from "@/components/RouteError";
import { RequireAuth } from "@/auth/RequireAuth";
import { Toaster } from "@/components/ui/sonner";
import { InhouseWorkspacePage } from "@/components/inhouse/InhouseWorkspacePage";

export const Route = createFileRoute("/inhouse/$orgSlug/$workspaceSlug")({
  errorComponent: ({ error }) => <RouteError error={error} />,
  component: () => (
    <RequireAuth>
      <InhouseWorkspaceRoute view="overview" />
    </RequireAuth>
  ),
});

function InhouseWorkspaceRoute({ view }: { view: "overview" }) {
  const { orgSlug, workspaceSlug } = Route.useParams();
  return (
    <>
      <Toaster />
      <InhouseWorkspacePage orgSlug={orgSlug} workspaceSlug={workspaceSlug} view={view} />
    </>
  );
}
