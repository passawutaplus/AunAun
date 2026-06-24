/** Conservative Gemini API cost estimate per ecosystem credit debited (THB). */
export const EST_THB_PER_CREDIT = 0.08;

export function estimateThbFromCredits(credits: number): number {
  return Math.round(credits * EST_THB_PER_CREDIT * 100) / 100;
}

export const GEMINI_CONSOLE_LINKS = {
  aiStudio: "https://aistudio.google.com/apikey",
  pricing: "https://ai.google.dev/gemini-api/docs/pricing",
  cloudBilling: "https://console.cloud.google.com/billing",
} as const;

/** Where GEMINI_API_KEY is consumed (for admin docs). */
export const GEMINI_KEY_SURFACES = [
  {
    surface: "Supabase Edge Functions",
    env: "GEMINI_API_KEY",
    features: "Mentor, LINE AI, Brief, Anthem FAB, Planner, Color, Contract, Similar images",
  },
  {
    surface: "So1o SSR Server (VPS/Vercel)",
    env: "GEMINI_API_KEY",
    features: "Assistant stream, Brief extract/images, WHT scan, HQ agents, Daily trends",
  },
] as const;
