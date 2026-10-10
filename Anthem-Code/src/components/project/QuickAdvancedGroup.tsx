import type { ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { CollapsibleEditorCard } from "@/components/project/CollapsibleEditorCard";

/** Quick drop folds the deeper settings into one collapsed "Advanced" section; Studio shows them as-is. */
export function QuickAdvancedGroup({ quick, children }: { quick: boolean; children: ReactNode }) {
  if (!quick) return <>{children}</>;
  return (
    <CollapsibleEditorCard title="Advanced" icon={SlidersHorizontal} defaultOpen={false}>
      <div className="space-y-4">{children}</div>
    </CollapsibleEditorCard>
  );
}
