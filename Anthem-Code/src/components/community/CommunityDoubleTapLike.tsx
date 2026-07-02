import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useDoubleTapLike } from "@/hooks/useDoubleTapLike";
import { PlusOneBurst } from "@/components/brand/PlusOneBurst";

type Props = {
  onLike: () => void;
  isLiked: boolean;
  isPending?: boolean;
  className?: string;
  children: React.ReactNode;
};

type Burst = { x: number; y: number; id: number };

export function CommunityDoubleTapLike({
  onLike,
  isLiked,
  isPending = false,
  className,
  children,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isLikedRef = useRef(false);
  const isPendingRef = useRef(false);
  const [burst, setBurst] = useState<Burst | null>(null);

  isLikedRef.current = isLiked;
  isPendingRef.current = isPending;

  const onDoubleTap = useCallback((point: { x: number; y: number }) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setBurst({
      x: point.x - rect.left,
      y: point.y - rect.top,
      id: Date.now(),
    });
    if (!isLikedRef.current && !isPendingRef.current) onLike();
  }, [onLike]);

  const { onTouchEndCapture, onClickCapture, onDoubleClickCapture } = useDoubleTapLike(onDoubleTap);

  useEffect(() => {
    if (!burst) return;
    const t = window.setTimeout(() => setBurst(null), 750);
    return () => window.clearTimeout(t);
  }, [burst]);

  return (
    <div
      ref={containerRef}
      className={cn("relative touch-manipulation select-none", className)}
      onTouchEndCapture={onTouchEndCapture}
      onClickCapture={onClickCapture}
      onDoubleClickCapture={onDoubleClickCapture}
    >
      {children}
      {burst && <PlusOneBurst key={burst.id} x={burst.x} y={burst.y} />}
    </div>
  );
}
