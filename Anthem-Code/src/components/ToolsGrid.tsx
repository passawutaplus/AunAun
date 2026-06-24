import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavigate } from "react-router-dom";
import ToolIcon from "@/components/ToolIcon";
import { getToolDescription } from "@/lib/toolIcons";
import { exploreProjectsUrl } from "@/lib/exploreRoutes";

interface Props {
  tools: string[];
  compact?: boolean;
  linkable?: boolean;
}

const ToolsGrid = ({ tools, compact, linkable = true }: Props) => {
  const navigate = useNavigate();

  return (
    <div className={compact ? "flex flex-wrap gap-2" : "grid grid-cols-3 md:grid-cols-4 gap-3"}>
      {tools.map((name) => {
        const chip = (
          <div
            className={
              compact
                ? "flex items-center gap-2 rounded-full glass-panel px-3 py-1.5 hover:border-primary/40 transition-colors"
                : "rounded-xl glass-panel p-4 flex flex-col items-center gap-2 hover:border-primary/40 hover:shadow-sm transition-all"
            }
          >
            <ToolIcon name={name} />
            <p className={compact ? "text-xs font-medium text-foreground" : "text-xs font-medium text-foreground text-center"}>
              {name}
            </p>
          </div>
        );

        return (
          <Tooltip key={name}>
            <TooltipTrigger asChild>
              {linkable ? (
                <button
                  type="button"
                  onClick={() => navigate(exploreProjectsUrl("tool", name))}
                  className="text-left cursor-pointer"
                  aria-label={`ดูผลงานที่ใช้ ${name}`}
                >
                  {chip}
                </button>
              ) : (
                chip
              )}
            </TooltipTrigger>
            <TooltipContent>
              {linkable ? `ดูผลงานที่ใช้ ${name}` : (getToolDescription(name) ?? name)}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
};

export default ToolsGrid;
