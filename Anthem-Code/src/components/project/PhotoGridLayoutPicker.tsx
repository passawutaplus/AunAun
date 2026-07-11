import { cn } from "@/lib/utils";
import type { PhotoGridLayout } from "@/lib/photoGridLayouts";
import { PHOTO_GRID_LAYOUTS } from "@/lib/photoGridLayouts";

type Props = {
  value: PhotoGridLayout;
  onChange: (layout: PhotoGridLayout) => void;
  disabled?: boolean;
};

export function PhotoGridLayoutWireframe({ layout, active }: { layout: PhotoGridLayout; active: boolean }) {
  const cell = cn("bg-foreground/20", active && "bg-primary/50");

  if (layout === "two_stack") {
    return (
      <div className="grid h-9 w-9 grid-cols-1 grid-rows-2 gap-0.5">
        <div className={cell} />
        <div className={cell} />
      </div>
    );
  }
  if (layout === "two_side") {
    return (
      <div className="grid h-9 w-9 grid-cols-2 grid-rows-1 gap-0.5">
        <div className={cell} />
        <div className={cell} />
      </div>
    );
  }
  if (layout === "three_split") {
    return (
      <div className="grid h-9 w-9 grid-cols-2 grid-rows-2 gap-0.5">
        <div className={cn(cell, "row-span-2")} />
        <div className={cell} />
        <div className={cell} />
      </div>
    );
  }
  if (layout === "three_split_rev") {
    return (
      <div className="grid h-9 w-9 grid-cols-2 grid-rows-2 gap-0.5">
        <div className={cell} />
        <div className={cn(cell, "row-span-2")} />
        <div className={cell} />
      </div>
    );
  }
  return (
    <div className="grid h-9 w-9 grid-cols-2 grid-rows-2 gap-0.5">
      <div className={cell} />
      <div className={cell} />
      <div className={cell} />
      <div className={cell} />
    </div>
  );
}

export function PhotoGridLayoutPicker({ value, onChange, disabled }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {PHOTO_GRID_LAYOUTS.map((layout) => {
        const active = value === layout.id;
        return (
          <button
            key={layout.id}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            onClick={() => onChange(layout.id)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-none border p-3 text-center transition-colors",
              active
                ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                : "border-border bg-card/50 hover:border-primary/40 hover:bg-muted/30",
              disabled && "opacity-50 pointer-events-none",
            )}
          >
            <PhotoGridLayoutWireframe layout={layout.id} active={active} />
            <p className="text-xs font-medium text-foreground leading-tight">{layout.label}</p>
          </button>
        );
      })}
    </div>
  );
}
