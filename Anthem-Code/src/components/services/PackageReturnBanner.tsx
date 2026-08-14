import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import PackagesIcon from "@/components/icons/PackagesIcon";
import {
  asCreatorServiceRow,
  fromCreatorServices,
} from "@/lib/creatorServicesDb";
import { cn } from "@/lib/utils";

type Props = {
  serviceId: string;
  className?: string;
};

/** Shown on project detail when opened from a package sample link. */
export default function PackageReturnBanner({ serviceId, className }: Props) {
  const { data: pkg } = useQuery({
    queryKey: ["package-return-banner", serviceId],
    enabled: !!serviceId,
    queryFn: async () => {
      const { data, error } = await fromCreatorServices()
        .select("id, title, status")
        .eq("id", serviceId)
        .maybeSingle();
      if (error) throw error;
      return asCreatorServiceRow(data);
    },
  });

  const title = pkg?.title?.trim() || "แพ็กเกจ";

  return (
    <div className={cn("bg-primary/[0.06]", className)}>
      <div className="mx-auto flex max-w-[1920px] items-center gap-3 px-3 py-2.5 sm:px-[calc(1rem+25px)] lg:px-[calc(1.5rem+25px)] 2xl:px-[calc(2.5rem+25px)]">
        <Link
          to={`/service/${encodeURIComponent(serviceId)}`}
          className={cn(
            "group inline-flex min-w-0 max-w-full items-center gap-2.5 rounded-lg",
            "px-2 py-1.5 text-sm transition-colors",
            "hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          )}
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-background/80 text-primary shadow-sm ring-1 ring-border/60">
            <PackagesIcon className="h-4 w-4" />
          </span>
          <span className="min-w-0 text-left">
            <span className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-primary/80">
              <ArrowLeft className="h-3 w-3" />
              กลับไปแพ็กเกจ
            </span>
            <span className="block truncate font-semibold text-foreground group-hover:text-primary">
              {title}
            </span>
          </span>
        </Link>
      </div>
    </div>
  );
}
