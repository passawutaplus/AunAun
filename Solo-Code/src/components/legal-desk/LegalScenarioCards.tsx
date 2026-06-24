import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lightbulb, ExternalLink } from "lucide-react";
import type { LegalScenario } from "@/data/legalScenarios";

export function LegalScenarioCards({
  scenarios,
  onNavigate,
}: {
  scenarios: LegalScenario[];
  onNavigate?: (section: string, sub?: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {scenarios.map((s) => (
        <Card key={s.id} className="border-border/70">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight">{s.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{s.summary}</p>
              </div>
            </div>
            <p className="text-xs text-foreground/90 leading-relaxed">{s.advice}</p>
            {s.linkTab && onNavigate && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[11px] gap-1"
                onClick={() => onNavigate(s.linkTab!.section, s.linkTab!.sub)}
              >
                <ExternalLink className="h-3 w-3" />
                {s.linkTab.label}
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
