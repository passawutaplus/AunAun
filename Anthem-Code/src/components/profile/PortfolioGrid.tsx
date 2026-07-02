import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye } from "lucide-react";
import { PlusOneControl } from "@/components/brand/PlusOneControl";
import { Badge } from "@/components/ui/badge";
import { DrillProjectBadge } from "@/components/drill/DrillProjectBadge";
import { smoothEase } from "@/lib/motion";
import type { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

type Project = Tables<"projects">;

type Props = {
  projects: Project[];
};

const PortfolioGrid = ({ projects }: Props) => {
  if (!projects.length) {
    return null;
  }
  return (
    <div
      className={cn(
        "columns-2 md:columns-3 gap-2 sm:gap-3 md:gap-4",
      )}
    >
      {projects.map((p) => (
        <motion.div
          key={p.id}
          className="break-inside-avoid mb-2 sm:mb-3"
          whileHover={{ y: -2 }}
          transition={{ duration: 0.25, ease: smoothEase }}
        >
          <Link
            to={`/project/${p.id}`}
            className="group block rounded-2xl overflow-hidden glass-panel hover:shadow-lg transition-shadow duration-300"
          >
            <div className="bg-muted overflow-hidden relative">
              {p.cover_url ? (
                <img
                  src={p.cover_url}
                  alt={p.title}
                  className="w-full h-auto block group-hover:scale-105 transition-transform duration-500 ease-out"
                  loading="lazy"
                />
              ) : (
                <div className="w-full aspect-square flex items-center justify-center text-muted-foreground text-xs">ไม่มีรูป</div>
              )}
              <div className="absolute top-2 right-2 z-10">
                <DrillProjectBadge tags={p.tags as string[] | null} />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{p.views}</span>
                <PlusOneControl active={false} count={p.likes} showCount className="text-white" ariaLabel="+1" />
              </div>
            </div>
            <div className="p-2 sm:p-3">
              <div className="flex flex-wrap items-center gap-1 mb-1">
                <Badge className="bg-primary/15 text-primary border-0 hover:bg-primary/15 text-[10px] sm:text-xs font-normal">
                  {p.category}
                </Badge>
                <DrillProjectBadge tags={p.tags as string[] | null} />
              </div>
              <h3 className="text-xs sm:text-sm font-medium text-foreground leading-snug line-clamp-2 thai-body">
                {p.title}
              </h3>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
};

export default PortfolioGrid;
