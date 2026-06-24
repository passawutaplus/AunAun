import { getFeatureCreditCost, type AiFeatureKey } from "@/lib/aiCreditWeights";

export type MeetingDurationTier = 15 | 30 | 45 | 60;

const TRANSCRIBE_FEATURES: Record<MeetingDurationTier, AiFeatureKey> = {
  15: "ai_meeting_transcribe_15",
  30: "ai_meeting_transcribe_30",
  45: "ai_meeting_transcribe_45",
  60: "ai_meeting_transcribe_60",
};

const REPORT_FEATURES: Record<MeetingDurationTier, AiFeatureKey> = {
  15: "ai_meeting_report_15",
  30: "ai_meeting_report_30",
  45: "ai_meeting_report_45",
  60: "ai_meeting_report_60",
};

const EXTRACT_FEATURES: Record<MeetingDurationTier, AiFeatureKey> = {
  15: "ai_meeting_brief_extract_15",
  30: "ai_meeting_brief_extract_30",
  45: "ai_meeting_brief_extract_45",
  60: "ai_meeting_brief_extract_60",
};

/** Map recording duration to billing tier (15-minute buckets, cap 60 min). */
export function meetingDurationTier(durationSec: number): MeetingDurationTier {
  const mins = Math.max(1, Math.ceil(durationSec / 60));
  if (mins <= 15) return 15;
  if (mins <= 30) return 30;
  if (mins <= 45) return 45;
  return 60;
}

export function meetingTranscribeFeature(durationSec: number): AiFeatureKey {
  return TRANSCRIBE_FEATURES[meetingDurationTier(durationSec)];
}

export function meetingReportFeature(durationSec: number): AiFeatureKey {
  return REPORT_FEATURES[meetingDurationTier(durationSec)];
}

export function meetingExtractFeature(durationSec: number): AiFeatureKey {
  return EXTRACT_FEATURES[meetingDurationTier(durationSec)];
}

export function meetingTranscribeCredits(durationSec: number): number {
  return getFeatureCreditCost(meetingTranscribeFeature(durationSec));
}

export function meetingReportCredits(durationSec: number): number {
  return getFeatureCreditCost(meetingReportFeature(durationSec));
}

export function meetingExtractCredits(durationSec: number): number {
  return getFeatureCreditCost(meetingExtractFeature(durationSec));
}

export function meetingTotalCredits(durationSec: number): number {
  return meetingTranscribeCredits(durationSec) + meetingReportCredits(durationSec);
}
