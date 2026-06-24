import { supabase } from "@/integrations/supabase/client";

export type DrillRerollStatus = {
  used: number;
  limit: number;
  remaining: number;
  day_key: string;
};

export type DrillRerollResult = {
  salt: string;
  paid: boolean;
  creditsUsed: number;
  remainingFree: number;
};

async function invokeDrillReroll(body: { action?: string }): Promise<DrillRerollResult | DrillRerollStatus> {
  const { data, error } = await supabase.functions.invoke("design-drill-reroll", { body });
  if (error) throw new Error(error.message);
  if (data && typeof data === "object" && "error" in data) {
    throw new Error(String((data as { error: string }).error));
  }
  return data as DrillRerollResult | DrillRerollStatus;
}

export async function fetchDrillRerollStatus(): Promise<DrillRerollStatus> {
  return invokeDrillReroll({ action: "status" }) as Promise<DrillRerollStatus>;
}

export async function requestDrillReroll(): Promise<DrillRerollResult> {
  return invokeDrillReroll({ action: "reroll" }) as Promise<DrillRerollResult>;
}

export function saltToRollSeed(salt: string): number {
  let h = 0;
  for (let i = 0; i < salt.length; i++) {
    h = Math.imul(31, h) + salt.charCodeAt(i);
  }
  return Math.abs(h);
}
