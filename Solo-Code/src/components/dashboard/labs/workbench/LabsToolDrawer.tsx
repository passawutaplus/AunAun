import { Link } from "@tanstack/react-router";
import { LABS_CATEGORIES, LABS_TOOLS, getToolsByCategory } from "@/data/labsTools";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function LabsToolDrawerContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="space-y-4 py-1" aria-label="รายการเครื่องมือ">
      {LABS_CATEGORIES.map((cat) => {
        const tools = getToolsByCategory(cat.id);
        const CatIcon = cat.icon;
        return (
          <div key={cat.id}>
            <div className="flex items-center gap-1.5 px-1 mb-1.5">
              <CatIcon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                {cat.title}
              </span>
            </div>
            <ul className="space-y-0.5">
              {tools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <li key={tool.id}>
                    <Link
                      to={tool.route}
                      onClick={onNavigate}
                      className="flex items-center gap-2.5 rounded-md px-2 py-2 hover:bg-muted/60 transition-colors"
                    >
                      <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium truncate">{tool.title}</span>
                          {tool.status !== "live" && (
                            <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                              {tool.status === "beta" ? "เบต้า" : "พรีวิว"}
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">{tool.description}</p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

export function LabsToolSearchResults({
  query,
  onNavigate,
}: {
  query: string;
  onNavigate?: () => void;
}) {
  const q = query.trim().toLowerCase();
  const results = q
    ? LABS_TOOLS.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.keywords?.some((k) => k.includes(q)),
      )
    : [];

  if (!q) return null;
  if (results.length === 0) {
    return <p className="text-xs text-muted-foreground px-2 py-3">ไม่พบเครื่องมือ</p>;
  }

  return (
    <div className="space-y-0.5">
      {results.map((tool) => (
        <Link
          key={tool.id}
          to={tool.route}
          onClick={onNavigate}
          className={cn(
            "block rounded-md px-2 py-2 text-xs hover:bg-muted/60",
          )}
        >
          <span className="font-medium">{tool.title}</span>
          <span className="text-muted-foreground ml-1.5">— {tool.description}</span>
        </Link>
      ))}
    </div>
  );
}
