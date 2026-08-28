import type { LucideIcon } from "lucide-react";
import { useCountUp } from "@/hooks/useCountUp";

interface StatsCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  accent?: boolean;
}

const StatsCard = ({ label, value, icon: Icon, accent = false }: StatsCardProps) => {
  const shown = useCountUp(value);
  return (
    <div className="rounded-xl glass-panel p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</span>
        <Icon className={`w-4 h-4 ${accent ? "text-primary" : "text-muted-foreground"}`} />
      </div>
      <span
        className={`text-2xl font-medium tabular-nums ${accent ? "text-primary" : "text-foreground"}`}
        aria-live="polite"
      >
        {shown.toLocaleString("th-TH")}
      </span>
    </div>
  );
};

export default StatsCard;
