/** Shared Supabase column lists — avoids select("*") and heavy columns (e.g. embedding). */

export const PROJECT_LICENSE_SELECT =
  "license_type, license_note, has_third_party_assets, third_party_note, copyright_holder, rights_attested_at, rights_attestation_version";

export const PROJECT_FEED_SELECT =
  `id, title, cover_url, gallery_urls, category, owner_id, likes, views, status, created_at, tools, tags, allow_hire, allow_collab, license_type, sort_order, is_pinned`;

export const PROJECT_DETAIL_SELECT =
  `${PROJECT_FEED_SELECT}, description, price_thb, subtitle, studio_id, credited_user_ids, linked_community_post_ids, collab_user_ids, video_urls, updated_at, license_note, has_third_party_assets, third_party_note, copyright_holder, rights_attested_at, rights_attestation_version`;

export const PROJECT_MANAGE_SELECT = PROJECT_DETAIL_SELECT;

/** Public profile card — unified DB uses user_id (= auth uid). */
export const PUBLIC_PROFILE_SELECT =
  "user_id, display_name, username, avatar_url, bio, role, skills, website, instagram, facebook, line_id, cover_url, is_verified, location, profile_faq";

/** Designer directory list. */
export const PROFILE_DESIGNER_SELECT =
  "user_id, display_name, username, avatar_url, bio, role, skills, updated_at";
