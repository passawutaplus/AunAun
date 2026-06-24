import type { LucideIcon } from "lucide-react";

interface StatsCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  accent?: boolean;
}

const StatsCard = ({ label, value, icon: Icon, accent = false }: StatsCardProps) => {
  return (
    <div className="rounded-xl glass-panel p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</span>
        <Icon className={`w-4 h-4 ${accent ? "text-primary" : "text-muted-foreground"}`} />
      </div>
      <span className={`text-2xl font-medium ${accent ? "text-primary" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
};

export default StatsCard;
