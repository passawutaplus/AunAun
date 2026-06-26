import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ArrowRight, MapPin, Sparkles } from "lucide-react";
import type { OpenForWorkProfile } from "@/hooks/useJobs";
import { cn } from "@/lib/utils";
import { availabilityLabel, roleCategoryGradient } from "./jobCardUtils";

interface Props {
  creator: OpenForWorkProfile;
  compact?: boolean;
}

const CreatorCard = ({ creator, compact }: Props) => {
  const badge = creator.open_for_work_badge || "Open for Work";
  const href = creator.username ? `/u/${creator.username}` : `/u/${creator.user_id}`;

  return (
    <Link
      to={href}
      className={cn(
        "group block rounded-2xl overflow-hidden border border-border/40 bg-card shadow-md hover:shadow-lg transition-shadow h-full",
        compact && "shadow-sm",
      )}
    >
      <div className={cn("relative p-4 min-h-[160px] bg-gradient-to-br", roleCategoryGradient(creator.role ?? "Design"))}>
        <div className="relative z-10 flex flex-col gap-2 h-full">
          <div className="flex items-start justify-between gap-2">
            <Badge className="bg-primary/20 text-primary border-0 text-[10px] h-5">
              <Sparkles className="w-3 h-3 mr-0.5" /> {badge}
            </Badge>
            <ArrowRight className="w-4 h-4 opacity-60 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </div>
          <h3 className="font-semibold thai-display line-clamp-2 group-hover:text-primary transition-colors">
            {creator.role || creator.display_name}
          </h3>
          {creator.project_rate_note && (
            <p className="text-[11px] text-zinc-700 dark:text-zinc-200 line-clamp-2 thai-body">
              {creator.project_rate_note}
            </p>
          )}
          {creator.availability_status && (
            <p className="text-xs text-zinc-700 dark:text-zinc-200">
              {availabilityLabel[creator.availability_status] ?? creator.availability_status}
            </p>
          )}
          <div className="flex flex-wrap gap-1 mt-auto">
            {creator.skills.slice(0, 3).map((s) => (
              <Badge key={s} variant="secondary" className="text-[10px] h-5 font-normal">{s}</Badge>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/40 border-t border-border/50">
        <Avatar className="w-8 h-8 rounded-lg">
          <AvatarImage src={creator.avatar_url ?? undefined} />
          <AvatarFallback className="rounded-lg bg-gradient-brand text-white text-xs">
            {creator.display_name?.[0]}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium truncate">{creator.display_name}</p>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1 truncate">
            {creator.location && <><MapPin className="w-3 h-3 shrink-0" />{creator.location}</>}
            {creator.hourly_rate_min && ` · ฿${creator.hourly_rate_min}/ชม.`}
          </p>
        </div>
      </div>
    </Link>
  );
};

export default CreatorCard;
