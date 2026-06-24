import { ONBOARDING_TASKS, WELCOME_PX_CAP } from "@/lib/onboardingTasks";

export { WELCOME_PX_CAP };

/** ผู้ติดตามขั้นต่ำก่อนถอนเงินสด */
export const MIN_FOLLOWERS_FOR_CASHOUT = 15;

/** ผลงานเผยแพร่ขั้นต่ำก่อนเปิดรับของขวัญ */
export const MIN_PUBLISHED_FOR_RECEIVE = 1;

export type CreatorEligibilityTier = "locked" | "receive" | "cashout";

export type CreatorEligibilitySnapshot = {
  welcomeComplete: boolean;
  welcomeClaimedPx: number;
  welcomeTargetPx: number;
  publishedCount: number;
  followerCount: number;
  isVerified: boolean;
  canReceiveGifts: boolean;
  canStartKyc: boolean;
  canCashout: boolean;
  tier: CreatorEligibilityTier;
};

export function computeCreatorEligibility(input: {
  welcomeClaimedPx: number;
  publishedCount: number;
  followerCount: number;
  isVerified: boolean;
}): CreatorEligibilitySnapshot {
  const welcomeComplete = input.welcomeClaimedPx >= WELCOME_PX_CAP;
  const hasPublished = input.publishedCount >= MIN_PUBLISHED_FOR_RECEIVE;
  const hasFollowers = input.followerCount >= MIN_FOLLOWERS_FOR_CASHOUT;

  const canReceiveGifts = welcomeComplete && hasPublished;
  const canStartKyc = canReceiveGifts;
  const canCashout = canReceiveGifts && hasFollowers && input.isVerified;

  let tier: CreatorEligibilityTier = "locked";
  if (canCashout) tier = "cashout";
  else if (canReceiveGifts) tier = "receive";

  return {
    welcomeComplete,
    welcomeClaimedPx: input.welcomeClaimedPx,
    welcomeTargetPx: WELCOME_PX_CAP,
    publishedCount: input.publishedCount,
    followerCount: input.followerCount,
    isVerified: input.isVerified,
    canReceiveGifts,
    canStartKyc,
    canCashout,
    tier,
  };
}

export const WELCOME_MISSION_COUNT = ONBOARDING_TASKS.length;
