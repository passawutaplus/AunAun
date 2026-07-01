import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RouteError } from "@/components/RouteError";
import { RequireAuth } from "@/auth/RequireAuth";
import { LabsShell } from "@/components/dashboard/labs/LabsShell";

export const Route = createFileRoute("/labs")({
  errorComponent: ({ error }) => <RouteError error={error} />,
  component: LabsLayout,
});

function LabsLayout() {
  return (
    <RequireAuth>
      <LabsShell>
        <Outlet />
      </LabsShell>
    </RequireAuth>
  );
}
