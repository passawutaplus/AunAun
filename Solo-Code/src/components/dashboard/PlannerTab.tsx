import * as React from "react";
import { BriefsTab } from "./briefs/BriefsTab";
import { MeetingsTab } from "./MeetingsTab";

export type PlannerSub = "briefs" | "meetings";

export function PlannerTab({ sub: rawSub = "briefs" }: { sub?: string }) {
  // Old links (content / projects / feedback were retired) fall back to briefs.
  const sub: PlannerSub = rawSub === "meetings" ? "meetings" : "briefs";
  return (
    <div className="animate-fade-in">
      {sub === "meetings" && <MeetingsTab />}
      {sub === "briefs" && <BriefsTab />}
    </div>
  );
}
