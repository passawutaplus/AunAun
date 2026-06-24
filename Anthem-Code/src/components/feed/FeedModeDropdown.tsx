import { ChevronDown, Check, Compass, UserCheck, Clock, Layers3, Trophy, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

import {

  DropdownMenu,

  DropdownMenuTrigger,

  DropdownMenuContent,

  DropdownMenuItem,

} from "@/components/ui/dropdown-menu";

import type { FeedFilter, SpecialFilter } from "@/data/projectTypes";



type ModeOption = "Explore" | SpecialFilter;



const ORDER: ModeOption[] = ["Explore", "Following", "Newest", "Top 1", "Collections"];



const ICONS: Record<ModeOption, LucideIcon> = {

  Explore: Compass,

  Following: UserCheck,

  Newest: Clock,

  "Top 1": Trophy,

  Collections: Layers3,

};



interface Props {

  value: FeedFilter;

  onChange: (m: ModeOption) => void;

}



const FeedModeDropdown = ({ value, onChange }: Props) => {

  const current: ModeOption = (ORDER as string[]).includes(value as string) ? (value as ModeOption) : "Explore";

  const Icon = ICONS[current];

  return (

    <DropdownMenu>

      <DropdownMenuTrigger asChild>

        <Button

          variant="outline"

          className="h-9 rounded-full px-3.5 gap-1.5 bg-background/80 backdrop-blur-md border-border/60 thai-display"

        >

          <Icon className="w-3.5 h-3.5" />

          <span className="text-sm font-medium">{current}</span>

          <ChevronDown className="w-3.5 h-3.5 opacity-60" />

        </Button>

      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-48 rounded-xl">

        {ORDER.map((opt) => {

          const O = ICONS[opt];

          const active = opt === current;

          return (

            <DropdownMenuItem

              key={opt}

              onClick={() => onChange(opt)}

              className="flex items-center gap-2 cursor-pointer"

            >

              <O className="w-4 h-4 opacity-70" />

              <span className="flex-1 text-sm">{opt}</span>

              {active && <Check className="w-4 h-4 text-primary" />}

            </DropdownMenuItem>

          );

        })}

      </DropdownMenuContent>

    </DropdownMenu>

  );

};



export default FeedModeDropdown;

