import { forwardRef, type SVGProps } from "react";
import type { LucideIcon } from "lucide-react";

/**
 * Custom briefcase icon for hiring-related UI.
 * Typed as `LucideIcon` so it's a drop-in replacement anywhere a lucide
 * icon is expected. Uses `currentColor` — wrap in `text-primary` to color it.
 */
const BriefcaseIconBase = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(
  ({ className, strokeWidth = 30, ...props }, ref) => {
    // Lucide passes ~2; scale to this icon's 512 viewBox so stroke matches other nav icons.
    const sw =
      typeof strokeWidth === "number" && strokeWidth <= 3
        ? strokeWidth * (512 / 24)
        : strokeWidth;

    return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M140,122V77.472C140,59.75,154.5,45.25,172.222,45.25h167.556c17.723,0,32.222,14.5,32.222,32.222V122" />
      <path d="M477,266v170.75c0,16.497-13.503,30-30,30H65c-16.497,0-30-13.5-30-30V267" />
      <path d="M216,316.5c-105.789-6.049-201-36.3-201-90.753V154.75c0-16.523,13.476-30,30-30h422c16.523,0,30,13.478,30,30v70.997c0,54.794-96.414,85.082-203,90.864" />
      <path d="M219,286.75h74v34.5c0,18.975-15.525,34.5-34.5,34.5h-5c-18.975,0-34.5-15.525-34.5-34.5V286.75z" />
    </svg>
    );
  },
);
BriefcaseIconBase.displayName = "BriefcaseIcon";

const BriefcaseIcon = BriefcaseIconBase as unknown as LucideIcon;
export default BriefcaseIcon;
