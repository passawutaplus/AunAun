export type MarketingLanguage = "th" | "en" | "both";

export type MarketingLeadStatus =
  | "new"
  | "reviewed"
  | "qualified"
  | "contacted"
  | "follow_up"
  | "converted"
  | "not_relevant"
  | "archived";

export type MarketingPlatform =
  | "Facebook"
  | "TikTok"
  | "Instagram"
  | "YouTube"
  | "Google"
  | "Pantip"
  | "LinkedIn"
  | "Website"
  | "X";

export type MarketingInsightType =
  | "customer"
  | "competitor"
  | "content"
  | "ads"
  | "campaign"
  | "outreach"
  | "daily_report";

export type MarketingAiTask =
  | "analyze_lead_intent"
  | "analyze_pain_point"
  | "score_lead_quality"
  | "summarize_competitor"
  | "detect_content_pattern"
  | "generate_marketing_insight"
  | "generate_ads_plan"
  | "generate_offer"
  | "generate_content_calendar"
  | "generate_outreach_message"
  | "generate_daily_report";

export type MarketingAiOutput = {
  summary: string;
  keyFindings: string[];
  recommendedAction: string;
  confidenceScore: number;
  riskComplianceNote: string;
};

export type MarketingBusiness = {
  id: string;
  owner_id: string;
  business_name: string;
  category: string;
  product_service: string | null;
  target_customer: string | null;
  location: string | null;
  language: MarketingLanguage;
  main_keyword: string | null;
  pain_points: string[] | null;
  goals: string[] | null;
  preferred_platforms: string[] | null;
  created_at: string;
  updated_at: string;
};

export type MarketingKeyword = {
  id: string;
  business_id: string;
  keyword: string;
  keyword_type: string;
  intent: string | null;
  platform: string | null;
  created_at: string;
};

export type MarketingLead = {
  id: string;
  business_id: string;
  platform: string;
  source_url: string;
  lead_name: string;
  matched_keyword: string | null;
  intent: string | null;
  pain_point: string | null;
  post_summary: string | null;
  engagement: number;
  lead_score: number | null;
  urgency_level: string | null;
  buying_signal: string | null;
  suggested_offer: string | null;
  outreach_message: string | null;
  status: MarketingLeadStatus;
  tags: string[] | null;
  lead_origin?: "internal" | "external" | string | null;
  created_at: string;
};

export type MarketingCompetitor = {
  id: string;
  business_id: string;
  competitor_name: string;
  platform: string;
  profile_url: string;
  category: string | null;
  followers: number | null;
  engagement: number | null;
  posting_frequency: string | null;
  top_content_angle: string | null;
  main_offer: string | null;
  price_signal: string | null;
  strength: string | null;
  weakness: string | null;
  opportunity_gap: string | null;
  threat_level: string | null;
  recommended_action: string | null;
  created_at: string;
};

export type MarketingContentItem = {
  id: string;
  business_id: string;
  competitor_id: string | null;
  platform: string;
  content_url: string;
  content_type: string | null;
  title: string | null;
  caption: string | null;
  hook: string | null;
  cta: string | null;
  engagement: number | null;
  hashtags: string[] | null;
  sentiment: string | null;
  ai_summary: string | null;
  why_it_worked: string | null;
  suggested_adaptation: string | null;
  created_at: string;
};

export type MarketingInsight = {
  id: string;
  business_id: string;
  insight_type: MarketingInsightType;
  title: string;
  summary: string;
  key_findings: string[];
  recommendation: string | null;
  confidence_score: number | null;
  compliance_note: string | null;
  created_at: string;
};

export type MarketingReport = {
  id: string;
  business_id: string;
  report_type: string;
  language: string;
  file_url: string | null;
  export_format: string;
  compliance_confirmed: boolean;
  created_at: string;
};

export type MarketingSettings = {
  id: string;
  business_id: string | null;
  owner_id: string;
  default_language: MarketingLanguage;
  timezone: string;
  data_retention_days: number;
  export_default_format: string;
  ai_mock_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type LeadScoreInput = {
  keywordMatch: number;
  painPointMatch: number;
  engagementScore: number;
  recentActivity: number;
  buyingSignal: number;
  platformRelevance: number;
  locationMatch: number;
};

export const MARKETING_LEAD_STATUSES: MarketingLeadStatus[] = [
  "new",
  "reviewed",
  "qualified",
  "contacted",
  "follow_up",
  "converted",
  "not_relevant",
  "archived",
];

export const MARKETING_PLATFORMS: MarketingPlatform[] = [
  "Facebook",
  "TikTok",
  "Instagram",
  "YouTube",
  "Google",
  "Pantip",
  "LinkedIn",
  "Website",
  "X",
];

export const MARKETING_BUSINESS_PRESETS = [
  "Aplus1 Platform Growth",
  "Creator Acquisition",
  "Brand / Hiring Lead Gen",
  "Studio & Collab Growth",
  "Community & Feed Engagement",
  "Jobs Marketplace",
  "Referral & PX Campaign",
] as const;
