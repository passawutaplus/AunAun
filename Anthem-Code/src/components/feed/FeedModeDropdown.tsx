import { ChevronDown, Check, Compass, UserCheck, Clock, Layers3, Trophy, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

import {

  DropdownMenu,

  DropdownMenuTrigger,

  DropdownMenuContent,

  DropdownMenuItem,

} from "@/components/ui/dropdown-menu";

import type { FeedFilter, SpecialFilter } from "@/data/projectTypes";
import { FEED_MODE_LABELS, FEED_MODE_ORDER, type FeedModeOption } from "@/lib/feedModeLabels";



const ICONS: Record<FeedModeOption, LucideIcon> = {

  Explore: Compass,

  Following: UserCheck,

  Newest: Clock,

  "Top 1": Trophy,

  Collections: Layers3,

};



interface Props {

  value: FeedFilter;

  onChange: (m: FeedModeOption) => void;

}



const FeedModeDropdown = ({ value, onChange }: Props) => {

  const current: FeedModeOption = (FEED_MODE_ORDER as string[]).includes(value as string)
    ? (value as FeedModeOption)
    : "Explore";
  const Icon = ICONS[current];
  const label = FEED_MODE_LABELS[current];

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

        {FEED_MODE_ORDER.map((opt) => {
          const O = ICONS[opt];
          const active = opt === current;
          return (
            <DropdownMenuItem
              key={opt}
              onClick={() => onChange(opt)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <O className="w-4 h-4 opacity-70" />
              <span className="flex-1 text-sm">{FEED_MODE_LABELS[opt]}</span>

              {active && <Check className="w-4 h-4 text-primary" />}

            </DropdownMenuItem>

          );

        })}

      </DropdownMenuContent>

    </DropdownMenu>

  );

};



export default FeedModeDropdown;

