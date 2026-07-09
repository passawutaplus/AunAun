import { Link, useRouterState } from "@tanstack/react-router";
import { LABS_CATEGORIES, LABS_TOOLS, getToolsByCategory } from "@/data/labsTools";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { LabsToolDef } from "@/lib/labs/types";

function ToolLink({ tool, active }: { tool: LabsToolDef; active: boolean }) {
  const Icon = tool.icon;
  return (
    <Link
      to={tool.route}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors min-w-0",
        active
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate flex-1">{tool.title}</span>
      {tool.status !== "live" && (
        <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 shrink-0">
          {tool.status === "beta" ? "เบต้า" : "พรีวิว"}
        </Badge>
      )}
    </Link>
  );
}

export function LabsToolSidebar({ searchFilter }: { searchFilter: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const q = searchFilter.trim().toLowerCase();
  const filteredTools = q
    ? LABS_TOOLS.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.keywords?.some((k) => k.includes(q)),
      )
    : null;

  return (
    <aside className="flex flex-col h-full border-r border-border bg-muted/20 w-full">
      <div className="px-3 py-2 border-b border-border/60">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          เครื่องมือ
        </p>
      </div>
      <nav className="flex-1 overflow-y-auto p-2 space-y-3" aria-label="หมวดเครื่องมือ Labs">
        {filteredTools ? (
          <div className="space-y-0.5">
            {filteredTools.map((tool) => (
              <ToolLink key={tool.id} tool={tool} active={pathname.startsWith(tool.route)} />
            ))}
            {filteredTools.length === 0 && (
              <p className="text-xs text-muted-foreground px-2 py-4">ไม่พบเครื่องมือ</p>
            )}
          </div>
        ) : (
          LABS_CATEGORIES.map((cat) => {
            const tools = getToolsByCategory(cat.id);
            const CatIcon = cat.icon;
            return (
              <div key={cat.id}>
                <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  <CatIcon className="h-3 w-3" />
                  {cat.title}
                </div>
                <div className="space-y-0.5">
                  {tools.map((tool) => (
                    <ToolLink
                      key={tool.id}
                      tool={tool}
                      active={
                        pathname === tool.route ||
                        pathname.startsWith(`${tool.route}/`) ||
                        (tool.route === "/labs/creative" && pathname.startsWith("/labs/creative")) ||
                        (tool.route === "/labs/doc" && pathname.startsWith("/labs/doc"))
                      }
                    />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </nav>
    </aside>
  );
}
