import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import type { HelpJourney } from "@/data/helpCenter";

export function HelpJourneyCards({ journeys }: { journeys: HelpJourney[] }) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {journeys.map((journey) => {
        const Icon = journey.icon;
        return (
          <Card key={journey.id} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="p-4 border-b border-border/40 bg-muted/20">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-primary/10 p-2 shrink-0">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">{journey.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {journey.description}
                    </p>
                  </div>
                </div>
              </div>
              <ol className="p-3 space-y-1">
                {journey.steps.map((step, i) => (
                  <li key={`${step.to}-${step.hash ?? ""}-${step.label}`}>
                    <Link
                      to={step.to}
                      hash={step.hash}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-muted/50 transition-colors group"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                        {i + 1}
                      </span>
                      <span className="font-medium group-hover:text-primary transition-colors">
                        {step.label}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
