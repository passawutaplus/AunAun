import * as React from "react";
import { ArrowUpRight, Globe } from "lucide-react";
import { getFaviconUrl } from "@/lib/favicon";
import { safeHref } from "@/lib/security";
import { CATEGORIES, type CategoryMeta, type InspireResource } from "./resources";

export function CategoryDivider({ cat, count }: { cat: CategoryMeta; count: number }) {
  const Icon = cat.icon;
  return (
    <div className="flex items-center gap-3">
      <div className="inline-flex items-center gap-2 rounded-full bg-card border border-border px-3 py-1.5 shadow-soft">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="text-sm font-bold tracking-tight">{cat.label}</span>
        <span className="text-[10px] font-bold text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">
          {count}
        </span>
      </div>
      <div className="flex-1 h-px bg-gradient-to-r from-border via-border/60 to-transparent" />
    </div>
  );
}

export function InspireResourceCard({ resource }: { resource: InspireResource }) {
  const href = safeHref(resource.url) ?? "#";
  const categoryMeta = CATEGORIES.find((c) => c.id === resource.category);
  const CatIcon = categoryMeta?.icon;
  const favicon = getFaviconUrl(resource.domain, 32);
  const [faviconBroken, setFaviconBroken] = React.useState(false);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block rounded-2xl p-[1.5px] bg-border hover:bg-gradient-to-br hover:from-[#FF5F05] hover:to-[#FF9F67] transition-all duration-300 hover:shadow-[0_18px_40px_-18px_rgba(255,95,5,0.45)] hover:-translate-y-1"
    >
      <div className="relative rounded-[14px] bg-card h-full flex flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 shrink-0 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                {favicon && !faviconBroken ? (
                  <img
                    src={favicon}
                    alt=""
                    className="h-5 w-5"
                    onError={() => setFaviconBroken(true)}
                  />
                ) : (
                  <Globe className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <h3 className="text-base font-bold tracking-tight group-hover:text-[#FF5F05] transition-colors truncate">
                {resource.name}
              </h3>
            </div>
            {categoryMeta && CatIcon && (
              <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <CatIcon className="h-3.5 w-3.5 shrink-0" />
                {categoryMeta.label}
              </span>
            )}
          </div>
          <span className="shrink-0 h-7 w-7 rounded-full bg-muted group-hover:bg-gradient-to-br group-hover:from-[#FF5F05] group-hover:to-[#FF9F67] group-hover:text-white flex items-center justify-center transition-all">
            <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        </div>

        <p className="mt-3 text-sm text-muted-foreground leading-relaxed line-clamp-3 flex-1">
          {resource.description}
        </p>

        <div className="mt-4 pt-3 border-t border-border/70 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground font-medium truncate">
            {resource.domain}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground group-hover:text-[#FF5F05] transition-colors">
            เปิดเว็บ
            <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>
      </div>
    </a>
  );
}
