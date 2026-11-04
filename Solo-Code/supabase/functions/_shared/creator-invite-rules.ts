/** Pure submit rules for creator invitations (no Deno/npm imports, unit-tested under Vitest). */
export type SubmitShape = {
  about: { name: string; email: string; discipline: string; avatar?: string | null };
  projects: { title: string; media: string[]; rights: boolean }[];
  quick: { portfolio_url: string };
};

export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Server-side rules for a final submit; returns field keys that fail. */
export function validateForSubmit(
  mode: "full" | "quick",
  s: SubmitShape,
  cleanMedia: Set<string>,
): string[] {
  const errs: string[] = [];
  if (!s.about.name) errs.push("about.name");
  if (!EMAIL_RE.test(s.about.email)) errs.push("about.email");
  if (mode === "quick") {
    if (!s.quick.portfolio_url) errs.push("quick.portfolio_url");
    return errs;
  }
  if (!s.about.discipline) errs.push("about.discipline");
  if (!s.about.avatar || !cleanMedia.has(s.about.avatar)) errs.push("about.avatar");
  if (s.projects.length < 1) errs.push("projects");
  s.projects.forEach((p, i) => {
    if (!p.title) errs.push(`projects.${i}.title`);
    if (!p.media.some((m) => cleanMedia.has(m))) errs.push(`projects.${i}.media`);
    if (!p.rights) errs.push(`projects.${i}.rights`);
  });
  return errs;
}
