export type AiMonitorResponse = {
  generated_at: string;
  gemini: {
    configured: boolean;
    reachable: boolean;
    error?: string;
    modelFast: string;
    modelDefault: string;
    modelVision: string;
    modelsUpdatedAt: string;
    latestModelUpdate: {
      at: string;
      changes: Array<{ slot: string; from: string; to: string }>;
      source?: string;
    } | null;
    estThbPerCredit: number;
    consoleLinks: {
      aiStudio: string;
      pricing: string;
      cloudBilling: string;
    };
    keySurfaces: readonly {
      surface: string;
      env: string;
      features: string;
    }[];
    balanceNote: string;
  };
  summary: {
    creditsDebitedToday: number;
    creditsDebited7d: number;
    creditsDebited30d: number;
    estCostThbToday: number;
    estCostThb7d: number;
    estCostThb30d: number;
    ledgerEvents30d: number;
    activeUsers30d: number;
    purchasedBalanceRemaining: number;
    lifetimeCreditsPurchased: number;
    subscriptionIncludedUsed: number;
    activePeriodRows: number;
  };
  byFeature: Array<{
    feature: string;
    label: string;
    count: number;
    credits: number;
    estThb: number;
  }>;
  topUsers: Array<{
    user_id: string;
    display_name: string | null;
    email: string | null;
    tier: string;
    count: number;
    credits: number;
    estThb: number;
  }>;
  recentLedger: Array<{
    id: string;
    user_id: string;
    feature: string;
    cost: number;
    source: string | null;
    created_at: string;
    label: string;
    display_name: string | null;
    email: string | null;
  }>;
  legacyGuestChat: {
    messagesToday: number;
    messages7d: number;
    note: string;
  };
};
