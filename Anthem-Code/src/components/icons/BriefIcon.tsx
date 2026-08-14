import { forwardRef, type SVGProps } from "react";
import type { LucideIcon } from "lucide-react";

/**
 * Dedicated Brief mark — folded document (hire brief, not Lucide FileText / Briefcase).
 * Drop-in LucideIcon; color with `text-primary` / `currentColor`.
 */
const BriefIconBase = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(
  ({ className, strokeWidth: _strokeWidth, stroke: _stroke, fill: _fill, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      className={className}
      {...props}
      fill="currentColor"
      fillRule="evenodd"
      clipRule="evenodd"
    >
      <g transform="translate(-146 -20)">
        <path d="m172.5 25c0-.663-.263-1.299-.732-1.768s-1.105-.732-1.768-.732c-3.832 0-12.168 0-16 0-.663 0-1.299.263-1.768.732s-.732 1.105-.732 1.768v22c0 1.381 1.119 2.5 2.5 2.5h11c.133 0 .26-.053.354-.146l7-7c.093-.094.146-.221.146-.354zm-1 16.5v-16.5c0-.398-.158-.779-.439-1.061-.282-.281-.663-.439-1.061-.439-3.832 0-12.168 0-16 0-.398 0-.779.158-1.061.439-.281.282-.439.663-.439 1.061v22c0 .828.672 1.5 1.5 1.5h10.5v-4.5c0-1.381 1.119-2.5 2.5-2.5zm-.707 1h-3.793c-.828 0-1.5.672-1.5 1.5v3.793zm-8.293-2c0-.828-.672-1.5-1.5-1.5-1.11 0-2.89 0-4 0-.828 0-1.5.672-1.5 1.5v1c0 .828.672 1.5 1.5 1.5h4c.828 0 1.5-.672 1.5-1.5zm-1 0c0-.276-.224-.5-.5-.5-1.11 0-2.89 0-4 0-.276 0-.5.224-.5.5v1c0 .276.224.5.5.5h4c.276 0 .5-.224.5-.5zm-5.5-4h12c.276 0 .5-.224.5-.5s-.224-.5-.5-.5h-12c-.276 0-.5.224-.5.5s.224.5.5.5zm0-3h12c.276 0 .5-.224.5-.5s-.224-.5-.5-.5h-12c-.276 0-.5.224-.5.5s.224.5.5.5zm12.5-5.5c0-.828-.672-1.5-1.5-1.5-2.26 0-7.74 0-10 0-.828 0-1.5.672-1.5 1.5v1c0 .828.672 1.5 1.5 1.5h10c.828 0 1.5-.672 1.5-1.5zm-1 0c0-.276-.224-.5-.5-.5-2.26 0-7.74 0-10 0-.276 0-.5.224-.5.5v1c0 .276.224.5.5.5h10c.276 0 .5-.224.5-.5z" />
      </g>
    </svg>
  ),
);
BriefIconBase.displayName = "BriefIcon";

const BriefIcon = BriefIconBase as unknown as LucideIcon;
export default BriefIcon;
