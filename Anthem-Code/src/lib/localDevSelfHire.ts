/** Local Vite only — allowlisted usernames may open hire UI on own profile for UX work. */

const LOCAL_SELF_HIRE_USERNAMES = new Set(["passawut.a.plus"]);

/** True only in `import.meta.env.DEV` for allowlisted creator usernames. */
export function isLocalDevSelfHirePreview(username?: string | null): boolean {
  if (!import.meta.env.DEV) return false;
  const u = username?.trim().toLowerCase();
  return !!u && LOCAL_SELF_HIRE_USERNAMES.has(u);
}
