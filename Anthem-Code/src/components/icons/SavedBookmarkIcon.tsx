import { forwardRef, type SVGProps } from "react";
import type { LucideIcon } from "lucide-react";

/**
 * Outlined bookmark used for "saved" headings (Packages Saved).
 * Drop-in LucideIcon; it is a filled outline path, so `strokeWidth` is ignored. Color with `currentColor`.
 */
const SavedBookmarkIconBase = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(
  ({ className, strokeWidth: _strokeWidth, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      fill="currentColor"
      className={className}
      {...props}
    >
      <path d="m414.4 0h-316.8c-25.364 0-46 20.636-46 46v450c0 6.161 3.537 11.774 9.096 14.434 5.558 2.657 12.147 1.89 16.945-1.977l178.359-143.762 178.359 143.762c2.9 2.338 6.456 3.543 10.044 3.543 2.345 0 4.704-.516 6.901-1.566 5.559-2.659 9.096-8.272 9.096-14.434v-450c0-25.364-20.635-46-46-46zm14 462.554-162.359-130.866c-2.931-2.362-6.485-3.543-10.041-3.543s-7.11 1.181-10.041 3.543l-162.359 130.866v-416.554c0-7.72 6.28-14 14-14h316.8c7.72 0 14 6.28 14 14z" />
    </svg>
  ),
);
SavedBookmarkIconBase.displayName = "SavedBookmarkIcon";

const SavedBookmarkIcon = SavedBookmarkIconBase as unknown as LucideIcon;
export default SavedBookmarkIcon;
