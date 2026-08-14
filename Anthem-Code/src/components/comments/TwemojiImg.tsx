import { useState } from "react";
import { cn } from "@/lib/utils";
import { twemojiSvgUrl } from "@/lib/twemoji";

type Props = {
  emoji: string;
  className?: string;
};

/** Renders Unicode as Twemoji SVG; falls back to the native glyph if the asset 404s. */
export function TwemojiImg({ emoji, className }: Props) {
  const [failed, setFailed] = useState(false);
  if (!emoji || failed) {
    return <span className={className}>{emoji}</span>;
  }
  return (
    <img
      src={twemojiSvgUrl(emoji)}
      alt={emoji}
      draggable={false}
      className={cn("inline-block h-[1.15em] w-[1.15em] align-[-0.2em]", className)}
      onError={() => setFailed(true)}
    />
  );
}
