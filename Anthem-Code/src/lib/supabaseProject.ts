/** Parse Supabase project metadata from Vite env (safe for client/admin UI). */

export interface SupabaseProjectInfo {
  projectRef: string;
  url: string;
  dashboardUrl: string;
  apiHost: string;
  hasPublishableKey: boolean;
  publishableKeyRef: string | null;
}

function refFromJwt(key: string): string | null {
  try {
    const payload = key.split(".")[1];
    if (!payload) return null;
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof json.ref === "string" ? json.ref : null;
  } catch {
    return null;
  }
}

export function getSupabaseProjectInfo(): SupabaseProjectInfo {
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";
  const projectRef =
    (import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined) ||
    (url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? "");
  const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ?? "";
  const keyRef = key ? refFromJwt(key) : null;

  return {
    projectRef,
    url,
    dashboardUrl: projectRef
      ? `https://supabase.com/dashboard/project/${projectRef}`
      : "https://supabase.com/dashboard",
    apiHost: url ? new URL(url).host : "",
    hasPublishableKey: !!key,
    publishableKeyRef: keyRef,
  };
}

export function isProjectConfigConsistent(info: SupabaseProjectInfo): boolean {
  if (!info.projectRef || !info.url) return false;
  if (!info.url.includes(info.projectRef)) return false;
  if (info.publishableKeyRef && info.publishableKeyRef !== info.projectRef) return false;
  return true;
}
