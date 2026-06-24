import { useState } from "react";
import { cn } from "@/lib/utils";
import { resolveToolIconSlug, toolIconSources } from "@/lib/toolIcons";

interface Props {
  name: string;
  size?: "xs" | "sm" | "md";
  className?: string;
}

const SIZE_CLASS = {
  xs: "w-4 h-4 text-[9px]",
  sm: "w-5 h-5 text-[10px]",
  md: "w-7 h-7 text-[11px]",
} as const;

const ToolIcon = ({ name, size = "md", className }: Props) => {
  const slug = resolveToolIconSlug(name);
  const sources = slug ? toolIconSources(slug) : [];
  const [sourceIndex, setSourceIndex] = useState(0);
  const sizeClass = SIZE_CLASS[size];
  const src = sources[sourceIndex];

  if (!slug || !src || sourceIndex >= sources.length) {
    return (
      <div
        className={cn(
          "rounded-md bg-primary/10 flex items-center justify-center font-medium text-primary shrink-0",
          sizeClass,
          className,
        )}
      >
        {name[0]?.toUpperCase()}
      </div>
    );
  }

  const isAppIcon = src.startsWith("/tool-icons/");

  return (
    <img
      src={src}
      alt=""
      aria-hidden
      className={cn(
        "object-contain shrink-0",
        isAppIcon && "rounded-[22%] ring-1 ring-border/25 shadow-sm",
        sizeClass,
        className,
      )}
      loading="lazy"
      key={src}
      onError={() => setSourceIndex((i) => i + 1)}
    />
  );
};

export default ToolIcon;
