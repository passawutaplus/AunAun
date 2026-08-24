import { cn } from "@/lib/utils";
import manageWorkIconUrl from "@/assets/icon-manage-work.png";

type Props = {
  className?: string;
};

/**
 * Custom manage-work mark (uploaded asset).
 * Monochrome via CSS mask — color with `text-primary` / `currentColor`.
 */
export default function ManageWorkIcon({ className }: Props) {
  return (
    <span
      aria-hidden
      className={cn("inline-block shrink-0 bg-current", className)}
      style={{
        WebkitMaskImage: `url(${manageWorkIconUrl})`,
        maskImage: `url(${manageWorkIconUrl})`,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    />
  );
}
