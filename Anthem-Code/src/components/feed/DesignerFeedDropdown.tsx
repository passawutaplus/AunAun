import { ChevronDown, Check, Compass, UserCheck, Clock, Bookmark, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export type DesignerFeedSource = "all" | "newest" | "following" | "saved";

export const DESIGNER_FEED_ORDER: DesignerFeedSource[] = ["all", "newest", "following"];
export const PACKAGE_FEED_ORDER: DesignerFeedSource[] = ["all", "newest", "following", "saved"];

export const DESIGNER_FEED_LABELS: Record<DesignerFeedSource, string> = {
  all: "Discovery",
  newest: "หน้าใหม่",
  following: "ติดตาม",
  saved: "ที่บันทึก",
};

const ICONS: Record<DesignerFeedSource, LucideIcon> = {
  all: Compass,
  newest: Clock,
  following: UserCheck,
  saved: Bookmark,
};

type Props = {
  value: DesignerFeedSource;
  onChange: (source: DesignerFeedSource) => void;
  sources?: DesignerFeedSource[];
};

/** Same pill dropdown pattern as Projects Explore — for Designers / Packages feed source. */
const DesignerFeedDropdown = ({ value, onChange, sources = DESIGNER_FEED_ORDER }: Props) => {
  const order = sources.length ? sources : DESIGNER_FEED_ORDER;
  const current: DesignerFeedSource = order.includes(value) ? value : "all";
  const Icon = ICONS[current];
  const label = DESIGNER_FEED_LABELS[current];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="h-9 rounded-full px-3.5 gap-1.5 bg-background/80 backdrop-blur-md border-border/60 thai-display"
        >
          <Icon className="w-3.5 h-3.5" />
          <span className="text-sm font-medium">{label}</span>
          <ChevronDown className="w-3.5 h-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48 rounded-xl">
        {order.map((opt) => {
          const O = ICONS[opt];
          const active = opt === current;
          return (
            <DropdownMenuItem
              key={opt}
              onClick={() => onChange(opt)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <O className="w-4 h-4 opacity-70" />
              <span className="flex-1 text-sm">{DESIGNER_FEED_LABELS[opt]}</span>
              {active && <Check className="w-4 h-4 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default DesignerFeedDropdown;
