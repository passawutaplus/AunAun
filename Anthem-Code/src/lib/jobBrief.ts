const DUTY_HEADING = /^(หน้าที่หลัก|หน้าที่ความรับผิดชอบ|responsibilities)\s*$/i;

export function linesOf(raw: string): string[] {
  return raw.split("\n").map((s) => s.trim()).filter(Boolean);
}

export function stripBullet(line: string): string {
  return line.replace(/^[-•*]\s*/, "").trim();
}

/** Split a legacy brief that embedded duties under “หน้าที่หลัก”. */
export function parseEmbeddedResponsibilities(raw: string): {
  intro: string;
  responsibilities: string[];
  after: string;
} {
  const lines = (raw ?? "").replace(/\r\n/g, "\n").split("\n");
  const headingAt = lines.findIndex((line) => DUTY_HEADING.test(line.trim()));
  if (headingAt < 0) {
    return { intro: (raw ?? "").trim(), responsibilities: [], after: "" };
  }
  const intro = lines.slice(0, headingAt).join("\n").trim();
  const rest = lines.slice(headingAt + 1);
  const responsibilities: string[] = [];
  let cursor = 0;
  while (cursor < rest.length) {
    const line = rest[cursor]?.trim() ?? "";
    if (!line) {
      if (responsibilities.length) break;
      cursor += 1;
      continue;
    }
    if (DUTY_HEADING.test(line)) {
      cursor += 1;
      continue;
    }
    if (!/^[-•*]/.test(line)) break;
    const text = stripBullet(line);
    if (text) responsibilities.push(text);
    cursor += 1;
  }
  const after = rest.slice(cursor).join("\n").trim();
  return { intro, responsibilities, after };
}

export function composeWorkplace(parts: {
  venue?: string;
  address?: string;
  landmark?: string;
}): string {
  return [parts.venue, parts.address, parts.landmark].map((s) => (s ?? "").trim()).filter(Boolean).join(" · ");
}

export function jobResponsibilities(job: {
  description?: string | null;
  deliverables?: string[] | null;
  perks?: string[] | null;
}): string[] {
  const duties = (job.deliverables ?? []).map((s) => s.trim()).filter(Boolean);
  const perks = (job.perks ?? []).map((s) => s.trim()).filter(Boolean);
  const sameAsPerks =
    duties.length > 0 &&
    duties.length === perks.length &&
    duties.every((d, i) => d === perks[i]);
  if (duties.length && !sameAsPerks) return duties;
  return parseEmbeddedResponsibilities(job.description ?? "").responsibilities;
}

export function jobDescriptionParts(job: {
  description?: string | null;
  deliverables?: string[] | null;
  perks?: string[] | null;
}): { intro: string; after: string } {
  const duties = jobResponsibilities(job);
  const parsed = parseEmbeddedResponsibilities(job.description ?? "");
  if (duties.length && parsed.responsibilities.length) {
    return { intro: parsed.intro, after: parsed.after };
  }
  return { intro: (job.description ?? "").trim(), after: "" };
}

export type JobApplyMethod = "portfolio" | "resume" | "rate" | "per_piece";

export function normalizeApplyMethods(raw: string[] | null | undefined): JobApplyMethod[] {
  const allowed = new Set<JobApplyMethod>(["portfolio", "resume", "rate", "per_piece"]);
  const next = (raw ?? []).filter((s): s is JobApplyMethod => allowed.has(s as JobApplyMethod));
  if (!next.includes("portfolio")) next.unshift("portfolio");
  return next;
}
