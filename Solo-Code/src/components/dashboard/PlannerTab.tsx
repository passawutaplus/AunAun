import * as React from "react";
import { ContentPlannerTab } from "./ContentPlannerTab";
import { ProjectsTab } from "./ProjectsTab";
import { FeedbackTab } from "./FeedbackTab";
import { BriefsTab } from "./briefs/BriefsTab";
import { MeetingsTab } from "./MeetingsTab";

export type PlannerSub = "content" | "projects" | "briefs" | "meetings" | "feedback";

export function PlannerTab({ sub = "content" }: { sub?: PlannerSub }) {
  return (
    <div className="animate-fade-in">
      {sub === "content" && <ContentPlannerTab />}
      {sub === "projects" && <ProjectsTab />}
      {sub === "meetings" && <MeetingsTab />}
      {sub === "briefs" && <BriefsTab />}
      {sub === "feedback" && <FeedbackTab />}
    </div>
  );
}
