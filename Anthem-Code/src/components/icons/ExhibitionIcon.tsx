import { forwardRef, type SVGProps } from "react";
import type { LucideIcon } from "lucide-react";

/**
 * SAMECOR Exhibition mark — three hung frames, tall one in the middle
 * (brand file samecor_icon_exhibition_{white,black}.svg). Drop-in LucideIcon; draws in `currentColor`.
 */
const ExhibitionIconBase = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(
  ({ className, strokeWidth: _strokeWidth, stroke: _stroke, fill: _fill, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      // Cropped from the brand file's 0 0 48 48 so the mark fills the box like the Lucide icons beside it.
      viewBox="4 4 40 40"
      className={className}
      {...props}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <rect x="6" y="14" width="10" height="20" rx="2" />
      <rect x="19" y="9" width="10" height="30" rx="2" />
      <rect x="32" y="14" width="10" height="20" rx="2" />
    </svg>
  ),
);
ExhibitionIconBase.displayName = "ExhibitionIcon";

const ExhibitionIcon = ExhibitionIconBase as unknown as LucideIcon;
export default ExhibitionIcon;
