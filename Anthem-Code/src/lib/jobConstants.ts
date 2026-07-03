/** Canonical job role categories — shared by jobs board + notification prefs. */
export const JOB_ROLE_CATEGORIES = [
  "UI/UX",
  "Graphic",
  "Branding",
  "Illustration",
  "Motion",
  "Photography",
  "Video",
  "Audio",
  "Web/UI",
  "Content",
  "3D",
  "Copywriting",
  "Editorial",
  "Other",
] as const;

export type JobRoleCategory = (typeof JOB_ROLE_CATEGORIES)[number];

export const PREFERRED_EMPLOYMENT_OPTIONS = [
  { value: "project", label: "โปรเจกต์" },
  { value: "fulltime", label: "Full-time" },
  { value: "parttime", label: "Part-time" },
  { value: "internship", label: "ฝึกงาน" },
  { value: "freelance", label: "Freelance" },
] as const;

export type PreferredEmploymentType = (typeof PREFERRED_EMPLOYMENT_OPTIONS)[number]["value"];
