import { Info } from "lucide-react";
import {
  DISCLAIMER_ESIGN_CLIENT,
  DISCLAIMER_ESIGN_FREELANCER,
  DISCLAIMER_ESIGN_TOOL,
} from "@/lib/copyConstants";
import { cn } from "@/lib/utils";

type Variant = "tool" | "freelancer" | "client";

const COPY: Record<Variant, string> = {
  tool: DISCLAIMER_ESIGN_TOOL,
  freelancer: DISCLAIMER_ESIGN_FREELANCER,
  client: DISCLAIMER_ESIGN_CLIENT,
};

interface Props {
  variant: Variant;
  className?: string;
}

export function EsignDisclaimer({ variant, className }: Props) {
  return (
    <div
      className={cn(
        "flex gap-2 rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-[11px] leading-relaxed text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100",
        className,
      )}
    >
      <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 opacity-70" aria-hidden />
      <p>{COPY[variant]}</p>
    </div>
  );
}
