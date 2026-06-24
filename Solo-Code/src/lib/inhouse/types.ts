export type InhouseMemberRole = "owner" | "admin" | "member" | "viewer";
export type InhouseMemberStatus = "invited" | "active" | "removed";

export type InhouseWorkspaceView =
  | "overview"
  | "kanban"
  | "todos"
  | "chat"
  | "monitor"
  | "canvas"
  | "settings";

export interface InhouseOrg {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  avatar_url: string | null;
  seat_limit: number;
  settings: Record<string, unknown>;
  document_theme?: Record<string, unknown> | null;
  brand_name?: string | null;
  brand_tagline?: string | null;
  legal_name?: string | null;
  tax_id?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  created_at: string;
  updated_at: string;
}

export interface InhouseOrgMember {
  id: string;
  org_id: string;
  user_id: string;
  role: InhouseMemberRole;
  status: InhouseMemberStatus;
  invited_by: string | null;
  invited_at: string | null;
  joined_at: string | null;
  removed_at: string | null;
  created_at: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
    email?: string | null;
  };
}

export interface InhouseWorkspace {
  id: string;
  org_id: string;
  name: string;
  slug: string;
  description: string | null;
  linked_quotation_id: string | null;
  settings: { columns?: string[] };
  archived_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface InhouseTask {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  column_key: string;
  assignee_id: string | null;
  priority: string;
  due_date: string | null;
  position: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  assignee?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

export interface InhouseChannel {
  id: string;
  workspace_id: string;
  name: string;
  is_default: boolean;
  created_at: string;
}

export interface InhouseMessage {
  id: string;
  channel_id: string;
  sender_id: string;
  body: string;
  attachments: unknown[];
  created_at: string;
  sender?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

export interface InhouseActivityEvent {
  id: string;
  org_id: string;
  workspace_id: string | null;
  user_id: string | null;
  event_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
  user?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

export interface InhouseInvite {
  id: string;
  org_id: string;
  token: string;
  email: string | null;
  role: InhouseMemberRole;
  workspace_ids: string[];
  invited_by: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface InhouseCanvas {
  id: string;
  workspace_id: string;
  name: string;
  scene_data: Record<string, unknown>;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_KANBAN_COLUMNS = ["backlog", "todo", "doing", "review", "done"] as const;

export const COLUMN_LABELS: Record<string, string> = {
  backlog: "Backlog",
  todo: "To Do",
  doing: "Doing",
  review: "Review",
  done: "Done",
};
