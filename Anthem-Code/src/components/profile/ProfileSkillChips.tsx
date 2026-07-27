import type { ReactNode } from "react";
import ToolIcon from "@/components/ToolIcon";
import { cn } from "@/lib/utils";
import { hasCatalogToolIcon } from "@/lib/toolIcons";

type Props = {
  skills: string[];
  className?: string;
  /** Optional highlight wrapper for search matches (public profile). */
  renderLabel?: (skill: string) => ReactNode;
};

/** Skills row: catalog tools show logo; unknown skills show the name chip. */
export default function ProfileSkillChips({ skills, className, renderLabel }: Props) {
  const items = skills.map((s) => s.trim()).filter(Boolean);
  if (!items.length) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {items.map((skill) =>
        hasCatalogToolIcon(skill) ? (
          <span
            key={skill}
            title={skill}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-secondary/80 ring-1 ring-border/50"
          >
            <ToolIcon name={skill} size="sm" />
          </span>
        ) : (
          <span
            key={skill}
            className="inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-xs font-normal text-foreground border border-border/60"
          >
            {renderLabel ? renderLabel(skill) : skill}
          </span>
        ),
      )}
    </div>
  );
}
