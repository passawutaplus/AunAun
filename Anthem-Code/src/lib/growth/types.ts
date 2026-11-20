/**
 * SAMECOR Growth Engine: shared types for the pure engine, the mock data and the /admin/growth UI.
 * Mirrors the draft `growth` schema (Solo-Code/supabase/migrations/20261120100000_growth_engine_schema.sql).
 * Nothing here calls an API: Phase 1 runs on mock data only.
 */

export type GeMode = "mock" | "test" | "live";

export type Platform = "instagram" | "facebook" | "threads" | "pinterest" | "blog";
export const PLATFORMS: readonly Platform[] = ["instagram", "facebook", "threads", "pinterest", "blog"];

/** Campaign workflow (spec §2). Main path first, then the side states. */
export type CampaignStatus =
  | "SIGNAL_FOUND"
  | "VERIFIED"
  | "PROPOSED"
  | "BRIEF_APPROVED"
  | "DRAFTING"
  | "VISUAL_READY"
  | "ADAPTED"
  | "QC_PASSED"
  | "AWAITING_APPROVAL"
  | "APPROVED"
  | "SCHEDULED"
  | "PUBLISHING"
  | "PUBLISHED"
  | "MONITORING"
  | "LEARNED"
  | "NEEDS_VERIFY"
  | "CHANGES_REQUESTED"
  | "REGENERATING"
  | "REJECTED"
  | "PAUSED"
  | "PUBLISH_FAILED"
  | "EXPORTED_FOR_MANUAL_POST"
  | "ARCHIVED";

export type ComponentKind = "frame" | "copy" | "pin" | "seo_meta" | "seo_section" | "feed";
export type Tone = "ink" | "grey" | "white" | "red" | "image";
export type Recipe = "R01" | "R02" | "R03" | "R04" | "R05" | "R06";

export interface FrameContent {
  headline: string;
  lines: string[];
  recipe: Recipe;
  tone: Tone;
  /** Stand-in for the Magnific visual (no image is generated in Phase 1). */
  visualNote: string;
}
export interface CopyContent {
  text: string;
  hashtags: string[];
  cta: string;
}
export interface PinContent {
  title: string;
  items: string[];
}
export interface SeoMetaContent {
  title: string;
  metaDescription: string;
  slug: string;
}
export interface SeoSectionContent {
  heading: string;
  body: string;
  bullets: string[];
}
export interface FeedTile {
  id: string;
  label: string;
  recipe: Recipe;
  tone: Tone;
  textHeavy: boolean;
  /** true = the tile belongs to this campaign. */
  own?: boolean;
}
export interface FeedContent {
  tiles: FeedTile[];
}

interface ComponentBase<K extends ComponentKind, C> {
  id: string;
  kind: K;
  label: string;
  content: C;
  /** Components this one is rendered from (for example, the Pinterest pin from frames 3–5). */
  derivedFrom?: string[];
}
export type ArtifactComponent =
  | ComponentBase<"frame", FrameContent>
  | ComponentBase<"copy", CopyContent>
  | ComponentBase<"pin", PinContent>
  | ComponentBase<"seo_meta", SeoMetaContent>
  | ComponentBase<"seo_section", SeoSectionContent>
  | ComponentBase<"feed", FeedContent>;

export interface PlatformVariantDef {
  platform: Platform;
  label: string;
  /** Canvas preset, e.g. "1080×1350 (4:5)". */
  canvas: string;
  componentIds: string[];
  /** UTC ISO minute. Part of the approved hash: moving the slot needs a new approval. */
  scheduledAt: string;
}

export type VersionAuthor = "ai-mock" | "owner" | "system";

export interface ComponentChange {
  componentId: string;
  label: string;
  before: ArtifactComponent;
  after: ArtifactComponent;
  note: string;
}
export interface ChangeSummary {
  fromVersion: number;
  toVersion: number;
  commentId: string;
  modified: ComponentChange[];
  /** Components the comment pointed at but that were locked, so they stayed byte-for-byte the same. */
  keptLocked: string[];
  affectedPlatforms: Platform[];
  text: string;
}

/** Immutable once created (append-only, like growth.ge_campaign_versions). */
export interface CampaignVersion {
  version: number;
  createdAt: string;
  createdBy: VersionAuthor;
  components: Record<string, ArtifactComponent>;
  componentHashes: Record<string, string>;
  variants: PlatformVariantDef[];
  /** Hash per platform over its component hashes + schedule slot. Approvals bind to these. */
  variantHashes: Record<Platform, string>;
  contentHash: string;
  changeSummary?: ChangeSummary;
  qc: QcReport;
}

export type QcLevel = "pass" | "warn" | "fail";
export interface QcCheck {
  id: string;
  label: string;
  level: QcLevel;
  detail: string;
  componentId?: string;
}
export interface QcReport {
  level: QcLevel;
  checks: QcCheck[];
}

export type ActorKind = "owner" | "agent" | "system";
export interface Actor {
  kind: ActorKind;
  id: string;
  name: string;
}

export interface Approval {
  id: string;
  platform: Platform;
  version: number;
  approvedHash: string;
  approverId: string;
  decidedAt: string;
}

export type CommentScope = "CAMPAIGN" | "IMAGE_FRAME" | "COPY_CHANNEL" | "SEO_SECTION" | "FEED";
export type CommentStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED_BY_AI" | "NEEDS_OWNER_DECISION" | "REOPENED";
export interface OwnerComment {
  id: string;
  scope: CommentScope;
  /** Component id the comment points at (frame-2, copy:threads, seo:s3, feed:grid). Empty for CAMPAIGN. */
  targetId?: string;
  platform?: Platform;
  body: string;
  version: number;
  createdAt: string;
  status: CommentStatus;
  resolvedInVersion?: number;
  aiNote?: string;
}

export type PublishJobStatus =
  | "SCHEDULED"
  | "PUBLISHING"
  | "PUBLISHED"
  | "PUBLISH_FAILED"
  | "PUBLISH_STATUS_UNKNOWN"
  | "EXPORTED_FOR_MANUAL_POST"
  | "REVOKED"
  | "CANCELLED";

export interface PublishJob {
  id: string;
  campaignId: string;
  platform: Platform;
  version: number;
  variantHash: string;
  scheduledAt: string;
  idempotencyKey: string;
  status: PublishJobStatus;
  lastBlockReason?: DispatchBlockReason;
}

export interface Publication {
  idempotencyKey: string;
  jobId: string;
  platform: Platform;
  kind: "manual_export" | "api";
  /** true while growth.ge_settings.mode = 'mock': nothing left the system. */
  simulated: boolean;
  remoteId: string | null;
  createdAt: string;
}

export type DispatchBlockReason =
  | "PAUSED_ALL"
  | "CAMPAIGN_NOT_PUBLISHABLE"
  | "NOT_APPROVED"
  | "STALE_APPROVAL"
  | "DUPLICATE"
  | "NOT_DUE"
  | "NEEDS_RECONCILE"
  | "JOB_NOT_SCHEDULED";

export type AiCreditStatus = "UNKNOWN" | "AVAILABLE" | "LOW" | "EXHAUSTED";

export interface GeSettings {
  mode: GeMode;
  pauseAll: boolean;
  aiCredit: {
    status: AiCreditStatus;
    /** First day of the current monthly credit cycle (YYYY-MM-DD). */
    cycleStart: string | null;
    /** Where the number comes from. "unavailable" = no API key yet, nothing to read. */
    source: "unavailable" | "mock" | "estimate";
    /** Owner-set cap lives in the DB only (never in this public repo). null = not set. */
    capUsd: number | null;
    spentEstimateUsd: number;
    /** Cycle for which the one-off LINE "credit ran out" notice was already queued. */
    noticeSentForCycle: string | null;
  };
}

export type TaskStatus = "QUEUED" | "CLAIMED" | "RUNNING" | "DONE" | "FAILED" | "BLOCKED_BUDGET" | "CANCELLED";
export type AgentRole = "research" | "strategy" | "copy" | "seo" | "art_director" | "revision" | "qa" | "analytics" | "publisher";

export interface AgentTask {
  id: string;
  role: AgentRole;
  title: string;
  status: TaskStatus;
  usesAi: boolean;
  dependsOn: string[];
  idempotencyKey: string;
  claimedBy: string | null;
  leaseUntil: string | null;
  attempts: number;
  createdAt: string;
  blockedReason?: string;
}

export interface AuditEntry {
  id: string;
  at: string;
  actor: Actor;
  action: string;
  resource: string;
  fromVersion?: number;
  toVersion?: number;
  detail?: string;
}

export interface Campaign {
  id: string;
  name: string;
  pillar: string;
  goal: string;
  audience: string;
  status: CampaignStatus;
  /** Status to return to when un-pausing. */
  pausedFrom?: CampaignStatus;
  versions: CampaignVersion[];
  /** Owner locks: revisions never touch these components. */
  locks: string[];
  approvals: Approval[];
  comments: OwnerComment[];
  jobs: PublishJob[];
  publications: Publication[];
  audit: AuditEntry[];
  sources: { label: string; url: string; checkedAt: string }[];
  rights: { label: string; status: "OK" | "PENDING" | "NOT_NEEDED" }[];
}
