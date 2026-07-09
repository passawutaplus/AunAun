import { Link } from "@tanstack/react-router";
import { ArrowRight, Clock } from "lucide-react";
import {
  LABS_CATEGORIES,
  getToolsByCategory,
  formatToolDuration,
  findToolById,
} from "@/data/labsTools";
import { Badge } from "@/components/ui/badge";
import { loadRecentFiles } from "@/lib/labs/recentFiles";
import { cn } from "@/lib/utils";

export function LabsHub() {
  const recent = loadRecentFiles().slice(0, 3);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="space-y-1">
        <h2 className="text-base font-bold tracking-tight">Solo Labs</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          เครื่องมือเสริมสำหรับฟรีแลนซ์ — งานหลักอยู่ที่ Dashboard
        </p>
        <Link to="/help/labs" className="text-xs text-primary font-medium hover:underline">
          อ่านคู่มือ Labs
        </Link>
      </div>

      {recent.length > 0 && (
        <section className="rounded-lg border border-border overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 border-b border-border">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <h3 className="text-xs font-semibold">ใช้ล่าสุด</h3>
          </div>
          <ul className="divide-y divide-border/60">
            {recent.map((r) => {
              const tool = findToolById(r.toolId);
              if (!tool) return null;
              const Icon = tool.icon;
              return (
                <li key={r.id}>
                  <Link
                    to={tool.route}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30 transition-colors"
                  >
                    <Icon className="h-4 w-4 text-primary shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{tool.title}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{r.name}</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="space-y-5">
        {LABS_CATEGORIES.map((cat) => {
          const tools = getToolsByCategory(cat.id);
          const CatIcon = cat.icon;
          return (
            <section key={cat.id} className="border border-border rounded-lg overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 border-b border-border">
                <CatIcon className="h-4 w-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-xs font-semibold">{cat.title}</h3>
                  <p className="text-[10px] text-muted-foreground">{cat.description}</p>
                </div>
              </div>
              <ul className="divide-y divide-border/60">
                {tools.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <li key={tool.id}>
                      <Link
                        to={tool.route}
                        className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30 transition-colors group"
                      >
                        <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-medium">{tool.title}</span>
                            {tool.status !== "live" && (
                              <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                                {tool.status === "beta" ? "เบต้า" : "พรีวิว"}
                              </Badge>
                            )}
                            <span className="text-[10px] text-muted-foreground">
                              {formatToolDuration(tool.durationMin)}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                            {tool.description}
                          </p>
                        </div>
                        <ArrowRight
                          className={cn(
                            "h-3.5 w-3.5 text-muted-foreground shrink-0",
                            "group-hover:text-primary group-hover:translate-x-0.5 transition-all",
                          )}
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
