import type { ReactNode } from "react";
import { Link2, SlidersHorizontal } from "lucide-react";
import { CollapsibleEditorCard } from "@/components/project/CollapsibleEditorCard";

/** Quick drop folds the deeper settings into one collapsed "Advanced" section; Studio shows them as-is. */
export function QuickAdvancedGroup({ quick, children }: { quick: boolean; children: ReactNode }) {
  if (!quick) return <>{children}</>;
  return (
    <CollapsibleEditorCard title="Advanced" icon={SlidersHorizontal} defaultOpen={false} borderless>
      <div className="space-y-4">{children}</div>
    </CollapsibleEditorCard>
  );
}

/** People and works this piece connects to (credits, linked posts — products later). */
export function QuickConnectGroup({ children }: { children: ReactNode }) {
  return (
    <CollapsibleEditorCard title="Connect" icon={Link2} framed>
      <div className="space-y-4">{children}</div>
    </CollapsibleEditorCard>
  );
}
