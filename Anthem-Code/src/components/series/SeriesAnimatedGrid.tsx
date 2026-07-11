import type { ReactNode } from "react";
import { AnimatedDensityGrid } from "@/components/ui/AnimatedDensityGrid";
import type { SeriesWorksDensity } from "@/lib/seriesGridDensity";
import { seriesDensityGridClass } from "@/lib/seriesGridDensity";

type Props = {
  density: SeriesWorksDensity;
  className?: string;
  children: ReactNode;
  layoutGroupId?: string;
};

/** Smooth layout reflow when series grid density changes. */
export function SeriesAnimatedGrid({
  density,
  className,
  children,
  layoutGroupId = "series-works-grid",
}: Props) {
  return (
    <AnimatedDensityGrid
      density={density}
      gridClassName={seriesDensityGridClass(density)}
      className={className}
      layoutGroupId={layoutGroupId}
    >
      {children}
    </AnimatedDensityGrid>
  );
}
