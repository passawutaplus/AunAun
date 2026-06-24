import { Loader2 } from "lucide-react";
import { InhouseLayout } from "@/components/inhouse/InhouseLayout";
import { InhouseOverviewTab } from "@/components/inhouse/InhouseOverviewTab";
import { InhouseKanbanTab } from "@/components/inhouse/InhouseKanbanTab";
import { InhouseTodosTab } from "@/components/inhouse/InhouseTodosTab";
import { InhouseChatTab } from "@/components/inhouse/InhouseChatTab";
import { InhouseMonitorTab } from "@/components/inhouse/InhouseMonitorTab";
import { InhouseCanvasTab } from "@/components/inhouse/InhouseCanvasTab";
import { useInhouseOrgBySlug } from "@/hooks/inhouse/useInhouseOrg";
import { useInhouseWorkspace } from "@/hooks/inhouse/useInhouseWorkspace";
import { useLogInhouseWorkspaceView } from "@/hooks/inhouse/useInhouseMonitor";
import type { InhouseWorkspaceView } from "@/lib/inhouse/types";
import { isInhouseWorkspaceEnabled } from "@/lib/inhouseAccess";
import { Link } from "@tanstack/react-router";

interface Props {
  orgSlug: string;
  workspaceSlug: string;
  view: InhouseWorkspaceView;
}

export function InhouseWorkspacePage({ orgSlug, workspaceSlug, view }: Props) {
  const { data: org, isLoading: orgLoading } = useInhouseOrgBySlug(orgSlug);
  const { data: workspace, isLoading: wsLoading } = useInhouseWorkspace(orgSlug, workspaceSlug);

  useLogInhouseWorkspaceView(org?.id, workspace?.id);

  if (!isInhouseWorkspaceEnabled()) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
        In-House workspace ยังไม่เปิดใช้งาน
      </div>
    );
  }

  if (orgLoading || wsLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!org || !workspace) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground">ไม่พบ workspace</p>
        <Link to="/inhouse" className="text-primary underline text-sm">
          กลับหน้า In-House
        </Link>
      </div>
    );
  }

  let content;
  switch (view) {
    case "kanban":
      content = <InhouseKanbanTab org={org} workspace={workspace} />;
      break;
    case "todos":
      content = <InhouseTodosTab org={org} workspace={workspace} />;
      break;
    case "chat":
      content = <InhouseChatTab org={org} workspace={workspace} />;
      break;
    case "monitor":
      content = <InhouseMonitorTab org={org} workspace={workspace} />;
      break;
    case "canvas":
      content = <InhouseCanvasTab org={org} workspace={workspace} />;
      break;
    default:
      content = <InhouseOverviewTab org={org} workspace={workspace} />;
  }

  return (
    <InhouseLayout org={org} workspace={workspace} view={view}>
      {content}
    </InhouseLayout>
  );
}
