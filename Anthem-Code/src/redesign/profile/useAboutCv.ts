import { useMemo } from "react";
import { useProfile } from "@/hooks/useProfile";
import type { AboutCvModelInput, AboutCvProfile } from "@/lib/aboutCvModel";
import { parseSocialLinks } from "@/lib/parseSocialLinks";
import { profilePublicUrl } from "@/lib/profileRoutes";
import { normalizeExperienceItem, type ExperienceItem } from "@/lib/validators";

/** The profile columns the CV reads (profiles_public for visitors, profiles for the owner). */
export type CvProfileRow = AboutCvProfile & {
  user_id: string;
  experience?: unknown;
  skills?: unknown;
  social_links?: unknown;
  email?: string | null;
  phone?: string | null;
};

const parseExperience = (raw: unknown): ExperienceItem[] =>
  Array.isArray(raw) ? raw.map(normalizeExperienceItem).filter((x): x is ExperienceItem => !!x) : [];

const parseSkills = (raw: unknown): string[] => (Array.isArray(raw) ? raw.filter((s): s is string => typeof s === "string") : []);

/** Same inputs the old About tab gave the CV sheet, the text PDF and print. */
export function cvInputOf(row: CvProfileRow): AboutCvModelInput {
  return {
    profile: {
      display_name: row.display_name ?? null,
      username: row.username ?? null,
      avatar_url: row.avatar_url ?? null,
      cv_photo_url: row.cv_photo_url ?? null,
      cv: row.cv,
      role: row.role ?? null,
      location: row.location ?? null,
      profile_address: row.profile_address,
      bio: row.bio ?? null,
      website: row.website ?? null,
      line_id: row.line_id ?? null,
      facebook: row.facebook ?? null,
      instagram: row.instagram ?? null,
    },
    experience: parseExperience(row.experience),
    skills: parseSkills(row.skills),
    socialLinks: parseSocialLinks(row.social_links),
    profileUrl: profilePublicUrl({ user_id: row.user_id, username: row.username ?? null }),
  };
}

/**
 * CV data of one person. Only fetched when the About tab is open; the owner reads their own row
 * (same cache key the old CV editor saves into, so a save shows up right away).
 */
export function useAboutCv(userId: string | undefined) {
  const q = useProfile(userId);
  const row = (q.data as CvProfileRow | null | undefined) ?? null;
  const input = useMemo(() => (row ? cvInputOf(row) : null), [row]);
  return { row, input, pending: q.isPending, error: q.isError, retry: () => void q.refetch() };
}
