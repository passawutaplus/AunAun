/**
 * Phase 2 — Shared Squad (Ad-hoc freelance teams).
 * Types and pricing gates for future implementation.
 */

export type SquadPricingModel = "pay_per_project" | "monthly_squad";

export const SQUAD_PRICING = {
  payPerProject: { min: 199, max: 249, maxCollaborators: 3 },
  monthlySquad: { price: 599, maxCollaborators: 5 },
} as const;

export interface SharedProjectStub {
  id: string;
  hostUserId: string;
  title: string;
  pricingModel: SquadPricingModel;
  collaboratorCount: number;
  status: "draft" | "active" | "closed";
}

/** Feature flag — use In-House workspace (replaces Shared Squad stub). */
export function isSharedSquadEnabled(): boolean {
  return false;
}

export { isInhouseWorkspaceEnabled } from "@/lib/inhouseAccess";

export function canAddCollaborator(model: SquadPricingModel, currentCount: number): boolean {
  const limit =
    model === "monthly_squad"
      ? SQUAD_PRICING.monthlySquad.maxCollaborators
      : SQUAD_PRICING.payPerProject.maxCollaborators;
  return currentCount < limit;
}

export function squadPricingLabel(model: SquadPricingModel): string {
  if (model === "monthly_squad") {
    return `So1o Squad ฿${SQUAD_PRICING.monthlySquad.price}/เดือน`;
  }
  return `฿${SQUAD_PRICING.payPerProject.min}–${SQUAD_PRICING.payPerProject.max}/โปรเจกต์`;
}
