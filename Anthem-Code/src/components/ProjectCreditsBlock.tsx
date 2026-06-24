import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Building2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  studioId?: string | null;
  creditedUserIds?: string[];
  ownerId?: string;
}

const ProjectCreditsBlock = ({ studioId, creditedUserIds = [], ownerId }: Props) => {
  const ids = Array.from(new Set([...(creditedUserIds ?? []), ownerId].filter(Boolean) as string[]));

  const { data: studio } = useQuery({
    queryKey: ["project-credit-studio", studioId],
    enabled: !!studioId,
    queryFn: async () => {
      const { data } = await supabase
        .from("studios")
        .select("id, slug, name, avatar_url, verified")
        .eq("id", studioId!)
        .maybeSingle();
      return data;
    },
  });

  const { data: credits = [] } = useQuery({
    queryKey: ["project-credit-people", ids.sort().join(",")],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, username, role")
        .in("id", ids);
      return data ?? [];
    },
  });

  if (!studioId && (creditedUserIds?.length ?? 0) === 0) return null;

  return (
    <div className="rounded-2xl glass-panel p-4 space-y-3">
      {studio && (
        <Link
          to={`/s/${studio.slug}`}
          className="flex items-center gap-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-brand grid place-items-center overflow-hidden shrink-0">
            {studio.avatar_url ? (
              <img src={studio.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <Building2 className="w-4 h-4 text-white" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">ผลงานในนาม Studio</p>
            <p className="text-sm font-semibold group-hover:text-primary transition-colors truncate">
              {studio.name}
            </p>
          </div>
        </Link>
      )}

      {credits.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1 mb-2">
            <Users className="w-3 h-3" /> เครดิตทีมงาน
          </p>
          <div className="flex flex-wrap gap-2">
            {credits.map((c: any) => (
              <Link
                key={c.id}
                to={`/u/${c.id}`}
                className="flex items-center gap-1.5 rounded-full bg-muted/60 hover:bg-muted px-1 pr-2.5 py-0.5 transition"
              >
                <span className="w-6 h-6 rounded-full overflow-hidden bg-muted shrink-0">
                  {c.avatar_url ? (
                    <img src={c.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="w-full h-full bg-gradient-brand block" />
                  )}
                </span>
                <span className="text-xs font-medium truncate max-w-[140px]">{c.display_name}</span>
                {c.role && (
                  <span className="text-[10px] text-muted-foreground hidden sm:inline">· {c.role}</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectCreditsBlock;
