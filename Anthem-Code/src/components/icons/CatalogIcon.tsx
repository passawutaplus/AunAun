import { forwardRef, type SVGProps } from "react";
import type { LucideIcon } from "lucide-react";

/**
 * Catalog system icon — folder with vertical catalog bars (matches product mark).
 * Drop-in LucideIcon; color with `text-primary` / `currentColor`.
 */
const CatalogIconBase = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(
  ({ className, strokeWidth = 2, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Folder body + tab */}
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H9l1.8 2H18.5A2.5 2.5 0 0 1 21 9.5v8A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-10Z" />
      {/* Catalog bars */}
      <path d="M9 11.5v5" />
      <path d="M12 11.5v5" />
      <path d="M15 11.5v5" />
    </svg>
  ),
);
CatalogIconBase.displayName = "CatalogIcon";

const CatalogIcon = CatalogIconBase as unknown as LucideIcon;
export default CatalogIcon;
