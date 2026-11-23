import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";

import { proxiedImageUrl } from "@/lib/imageProxy";
import { cn } from "@/lib/utils";

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className)}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

/** Avatars render at 96 CSS px at most, so a 256 px copy is sharp on 2–3x screens. */
const AVATAR_PROXY_WIDTH = 256;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, src, onLoadingStatusChange, ...props }, ref) => {
  // Small resized copy instead of the full upload (some avatars are 1 MB); original if that fails.
  const proxied = React.useMemo(() => proxiedImageUrl(src, AVATAR_PROXY_WIDTH, 80), [src]);
  const [failedSrc, setFailedSrc] = React.useState<string | null>(null);
  const finalSrc = proxied && proxied !== src && failedSrc !== proxied ? proxied : src;
  return (
    <AvatarPrimitive.Image
      ref={ref}
      src={finalSrc}
      onLoadingStatusChange={(status) => {
        if (status === "error" && finalSrc && finalSrc !== src) {
          setFailedSrc(finalSrc);
          return;
        }
        onLoadingStatusChange?.(status);
      }}
      className={cn("aspect-square h-full w-full", className)}
      {...props}
    />
  );
});
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn("flex h-full w-full items-center justify-center bg-muted", className)}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

export { Avatar, AvatarImage, AvatarFallback };
