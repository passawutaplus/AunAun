import type { InhouseMemberRole, InhouseOrg, InhouseOrgMember } from "@/lib/inhouse/types";
import type { Tier } from "@/hooks/useSubscription";

/** Feature flag — In-House workspace MVP */
export function isInhouseWorkspaceEnabled(): boolean {
  return true;
}

export function canCreateInhouseOrg(tier: Tier): boolean {
  return tier === "inhouse";
}

/** Studio combined quote (an1hem nest) — In-House tier only. */
export function canUseStudioQuote(tier: Tier): boolean {
  return tier === "inhouse";
}

export function canAccessInhouse(tier: Tier, memberships: InhouseOrgMember[]): boolean {
  if (!isInhouseWorkspaceEnabled()) return false;
  if (tier === "inhouse") return true;
  return memberships.some((m) => m.status === "active");
}

export function isInhouseAdmin(role: InhouseMemberRole | undefined): boolean {
  return role === "owner" || role === "admin";
}

export function canManageOrg(
  org: InhouseOrg | undefined,
  userId: string | undefined,
  role?: InhouseMemberRole,
): boolean {
  if (!org || !userId) return false;
  if (org.owner_id === userId) return true;
  return isInhouseAdmin(role);
}

export function inhouseWorkspacePath(
  orgSlug: string,
  workspaceSlug: string,
  view: string = "overview",
): string {
  if (view === "overview") {
    return `/inhouse/${orgSlug}/${workspaceSlug}`;
  }
  return `/inhouse/${orgSlug}/${workspaceSlug}/${view}`;
}

export function inhouseOrgSettingsPath(orgSlug: string): string {
  return `/inhouse/${orgSlug}/settings`;
}
