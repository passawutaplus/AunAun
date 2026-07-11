/** Shared Supabase column lists — avoids select("*") and heavy columns (e.g. embedding). */

export const PROJECT_LICENSE_EXTRA_SELECT =
  "license_note, has_third_party_assets, third_party_note, copyright_holder, rights_attested_at, rights_attestation_version, ai_assisted, ai_disclosure_note, client_permission_confirmed";

export const PROJECT_LICENSE_SELECT = `license_type, ${PROJECT_LICENSE_EXTRA_SELECT}`;

/** Project context template (บริบทผลงาน) — must match save payload in ProjectEditorPage. */
export const PROJECT_CONTEXT_SELECT =
  "brief, creator_role, process_note, deliverables, duration_label, outcome_note, opportunity_types, opportunity_note";

export const PROJECT_EXTERNAL_LINKS_SELECT = "external_links";

export const PROJECT_ASSETS_SELECT = "project_assets";

export const PROJECT_CONTENT_SELECT = "content_blocks, gallery_display_mode, grid_layout";

export const PROJECT_FEED_SELECT =
  `id, title, cover_url, gallery_urls, category, owner_id, likes, views, status, created_at, tools, tags, allow_hire, allow_collab, license_type, sort_order, is_pinned`;

export const PROJECT_DETAIL_SELECT =
  `${PROJECT_FEED_SELECT}, description, price_thb, subtitle, studio_id, credited_user_ids, linked_community_post_ids, collab_user_ids, video_urls, updated_at, ${PROJECT_LICENSE_EXTRA_SELECT}, ${PROJECT_CONTEXT_SELECT}, ${PROJECT_EXTERNAL_LINKS_SELECT}, ${PROJECT_ASSETS_SELECT}, ${PROJECT_CONTENT_SELECT}`;

export const PROJECT_MANAGE_SELECT = PROJECT_DETAIL_SELECT;

/** Public profile card — unified DB uses user_id (= auth uid). */
export const PUBLIC_PROFILE_SELECT =
  "user_id, display_name, username, avatar_url, bio, role, skills, experience, website, instagram, facebook, line_id, cover_url, is_verified, location, opportunity_status, opportunity_types, opportunity_note, open_for_work, open_for_work_badge";

/** Designer directory list. */
export const PROFILE_DESIGNER_SELECT =
  "user_id, display_name, username, avatar_url, bio, role, skills, created_at, updated_at";
