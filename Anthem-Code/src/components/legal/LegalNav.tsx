import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LEGAL_CATEGORIES, findLegalCategory } from "@/lib/legalCatalog";

/** แถบเอกสารในหมวดเดียวกัน — ใช้บนมือถือด้านบนบทความ */
export function LegalSiblingNav() {
  const { pathname } = useLocation();
  const category = findLegalCategory(pathname);
  if (!category || category.docs.length < 2) return null;

  return (
    <div className="mb-6 lg:hidden">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        ในหมวด{category.title}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {category.docs.map((doc) => {
          const active = pathname === doc.to;
          return (
            <Link
              key={doc.to}
              to={doc.to}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-md border px-2.5 py-1.5 text-xs transition-colors",
                active
                  ? "border-primary/40 bg-primary/10 font-medium text-primary"
                  : "border-border/70 text-muted-foreground hover:border-border hover:text-foreground",
              )}
            >
              {doc.shortLabel}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

type LegalNavProps = {
  className?: string;
};

const LegalNav = ({ className }: LegalNavProps) => {
  const { pathname } = useLocation();

  return (
    <nav
      className={cn(
        "lg:sticky lg:top-16 lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto",
        className,
      )}
      aria-label="เอกสารกฎหมายตามหมวด"
    >
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          หมวดเอกสาร
        </p>
        <Link
          to="/legal"
          className={cn(
            "text-xs text-primary underline-offset-2 hover:underline",
            pathname === "/legal" && "font-medium",
          )}
        >
          ดัชนีทั้งหมด
        </Link>
      </div>

      <div className="space-y-4">
        {LEGAL_CATEGORIES.map((category) => {
          const inCategory = category.docs.some((d) => d.to === pathname);
          return (
            <div key={category.id}>
              <p
                className={cn(
                  "mb-1.5 text-xs font-semibold",
                  inCategory ? "text-foreground" : "text-foreground/80",
                )}
              >
                {category.title}
              </p>
              <ul className="space-y-0.5 border-l border-border/70 pl-2.5">
                {category.docs.map((doc) => {
                  const active = pathname === doc.to;
                  return (
                    <li key={doc.to}>
                      <Link
                        to={doc.to}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "block rounded-md px-2 py-1.5 text-sm leading-snug transition-colors",
                          active
                            ? "bg-primary/10 font-medium text-primary"
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                        )}
                      >
                        {doc.shortLabel}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </nav>
  );
};

export default LegalNav;
