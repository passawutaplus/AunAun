/** Client-side job match scoring — mirrors job-match-dispatch edge function. */

export interface JobMatchInput {
  role_category: string;
  skills: string[];
  location_type: string;
  location: string;
  employment_type: string;
}

export interface CandidateMatchInput {
  skills: string[];
  role: string | null;
  location: string | null;
  preferred_categories: string[];
  preferred_employment_types: string[];
  project_categories: string[];
  project_tools: string[];
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9ก-๙]/gi, "");

const overlap = (a: string[], b: string[]) => {
  const A = new Set(a.map(norm).filter(Boolean));
  return b.map(norm).filter((x) => x && A.has(x));
};

export function scoreJobMatch(job: JobMatchInput, candidate: CandidateMatchInput) {
  const reasons: string[] = [];
  let score = 0;
  const cats = [...candidate.preferred_categories, ...candidate.project_categories, candidate.role ?? ""].filter(Boolean);
  if (job.role_category && cats.map(norm).includes(norm(job.role_category))) {
    score += 40;
    reasons.push(`หมวด ${job.role_category}`);
  }
  const userSkills = [...candidate.skills, ...candidate.project_tools];
  const skillHits = overlap(job.skills, userSkills);
  if (skillHits.length) {
    score += Math.min(skillHits.length * 10, 40);
    reasons.push(`สกิลตรง ${skillHits.length} อย่าง`);
  }
  if (job.location_type === "remote") {
    score += 10;
    reasons.push("Remote");
  } else if (candidate.location && job.location && norm(candidate.location).includes(norm(job.location))) {
    score += 10;
    reasons.push(`พื้นที่ ${job.location}`);
  }
  if (candidate.preferred_employment_types.includes(job.employment_type)) {
    score += 10;
    reasons.push("ตรงประเภทงาน");
  }
  return { score, reasons };
}
