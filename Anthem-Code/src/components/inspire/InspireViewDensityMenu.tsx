import { LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNarrowViewport } from "@/hooks/useNarrowViewport";
import type { InspireGridDensity } from "@/lib/inspireGridDensity";
import { cn } from "@/lib/utils";

type DensityIcon = "one" | "grid" | "list";

const OPTIONS: { value: InspireGridDensity; label: string; icon: DensityIcon }[] = [
  { value: "small", label: "Small", icon: "grid" },
  { value: "medium", label: "Medium", icon: "grid" },
  { value: "large", label: "Extra large", icon: "grid" },
  { value: "list", label: "Details", icon: "list" },
];

/** Mobile profile: 1 column / 2 columns / Details only. */
const MOBILE_PROFILE_OPTIONS: { value: InspireGridDensity; label: string; icon: DensityIcon }[] = [
  { value: "large", label: "1 Column", icon: "one" },
  { value: "medium", label: "2 Columns", icon: "grid" },
  { value: "list", label: "Details", icon: "list" },
];

type Props = {
  value: InspireGridDensity;
  onChange: (value: InspireGridDensity) => void;
  className?: string;
  /** Profile page: 3 options on mobile, Small / Medium / Extra large / Details on PC. */
  preset?: "default" | "profile";
};

function OneColGlyph({ className }: { className?: string }) {
  return <span className={cn("inline-block h-3.5 w-3.5 rounded-[1px] bg-current", className)} aria-hidden />;
}

function GridGlyph({ className }: { className?: string }) {
  return (
    <span className={cn("inline-grid grid-cols-2 gap-0.5", className)} aria-hidden>
      <span className="h-1.5 w-1.5 rounded-[1px] bg-current" />
      <span className="h-1.5 w-1.5 rounded-[1px] bg-current" />
      <span className="h-1.5 w-1.5 rounded-[1px] bg-current" />
      <span className="h-1.5 w-1.5 rounded-[1px] bg-current" />
    </span>
  );
}

function DensityIconMark({ icon }: { icon: DensityIcon }) {
  if (icon === "list") return <List className="h-4 w-4 shrink-0" />;
  if (icon === "one") return <OneColGlyph />;
  return <GridGlyph />;
}

/** Vault-style circular grid view menu. */
export function InspireViewDensityMenu({
  value,
  onChange,
  className,
  preset = "default",
}: Props) {
  const narrow = useNarrowViewport();
  const useMobileProfile = preset === "profile" && narrow;
  const options = useMobileProfile ? MOBILE_PROFILE_OPTIONS : OPTIONS;
  const resolvedValue = useMobileProfile && value === "small" ? "medium" : value;
  const active = options.find((o) => o.value === resolvedValue) ?? options[0]!;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`Grid: ${active.label}`}
          title={active.label}
          className={cn(
            "h-9 w-9 shrink-0 rounded-full border-border/50 bg-transparent",
            className,
          )}
        >
          {resolvedValue === "list" ? (
            <List className="h-4 w-4" />
          ) : resolvedValue === "large" && useMobileProfile ? (
            <OneColGlyph />
          ) : (
            <LayoutGrid className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[11rem] rounded-xl p-1.5">
        {options.map((opt) => {
          const selected = opt.value === resolvedValue;
          return (
            <DropdownMenuItem
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className={cn(
                "cursor-pointer gap-2.5 rounded-lg px-3 py-2 text-sm",
                selected && "bg-primary/15 text-primary focus:bg-primary/20 focus:text-primary",
              )}
            >
              <DensityIconMark icon={opt.icon} />
              <span>{opt.label}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
