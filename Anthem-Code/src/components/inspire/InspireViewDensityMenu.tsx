import { LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { InspireGridDensity } from "@/lib/inspireGridDensity";
import { cn } from "@/lib/utils";

const OPTIONS: {
  value: InspireGridDensity;
  label: string;
  icon: "grid" | "list";
}[] = [
  { value: "small", label: "Small", icon: "grid" },
  { value: "medium", label: "Medium", icon: "grid" },
  { value: "large", label: "Extra large", icon: "grid" },
  { value: "list", label: "Details", icon: "list" },
];

type Props = {
  value: InspireGridDensity;
  onChange: (value: InspireGridDensity) => void;
  className?: string;
};

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

/** Vault-style circular grid view menu (Small / Medium / Extra large / Details). */
export function InspireViewDensityMenu({ value, onChange, className }: Props) {
  const active = OPTIONS.find((o) => o.value === value) ?? OPTIONS[1]!;

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
          {value === "list" ? (
            <List className="h-4 w-4" />
          ) : (
            <LayoutGrid className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[11rem] rounded-xl p-1.5">
        {OPTIONS.map((opt) => {
          const selected = opt.value === value;
          return (
            <DropdownMenuItem
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className={cn(
                "gap-2.5 rounded-lg px-3 py-2 text-sm cursor-pointer",
                selected && "bg-primary/15 text-primary focus:bg-primary/20 focus:text-primary",
              )}
            >
              {opt.icon === "list" ? (
                <List className="h-4 w-4 shrink-0" />
              ) : (
                <GridGlyph />
              )}
              <span>{opt.label}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
