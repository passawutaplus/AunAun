import type { ComponentPropsWithoutRef, MouseEvent, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { isSoloEcosystemEnabled } from "@/lib/aplus1Launch";
import { notifySoloComingSoon } from "@/lib/soloEcosystemGate";

type SoloExternalLinkProps = Omit<ComponentPropsWithoutRef<"a">, "href"> & {
  href: string;
  children: ReactNode;
  disabledClassName?: string;
};

/**
 * External link to So1o — renders a non-navigating button with coming-soon toast when gated off.
 */
export function SoloExternalLink({
  href,
  className,
  disabledClassName,
  children,
  onClick,
  ...rest
}: SoloExternalLinkProps) {
  if (!isSoloEcosystemEnabled()) {
    return (
      <button
        type="button"
        className={cn(className, disabledClassName, "cursor-default opacity-90")}
        onClick={(e) => {
          notifySoloComingSoon();
          onClick?.(e as unknown as MouseEvent<HTMLAnchorElement>);
        }}
      >
        {children}
      </button>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={onClick}
      {...rest}
    >
      {children}
    </a>
  );
}
