import { useId } from "react";
import { cn } from "@/lib/utils";

/*
 * SAMECOR "Spotlight M10" loader: the symbol sits as a pale ghost while a soft spotlight
 * travels round it, then zooms to reveal it fully. Same paths/timing as
 * public/brand/loader-mono-{light,dark}.svg (used by the pre-React boot screen in index.html).
 * Brand Book: don't recolour, retime or add effects.
 */
const P1 =
  "M681.55,226.15h-65.63c-13.91-.98-25.04-12.11-26.02-26.02v-58.22c0-15.01-11.75-27.27-26.54-28.11-.53-.03-1.06-.05-1.6-.05s-1.07.01-1.6.05H140.56c-15.52,0-28.11,12.58-28.11,28.11v175.87c0,7.64-9.24,11.47-14.64,6.06L11.63,237.53c-3.27-3.27-5.97-7.12-7.93-11.38-2.3-5-3.6-10.57-3.6-16.45v-41.71c1.06-30.12,25.8-54.19,56.17-54.19h.08c30.01,0,54.51-23.53,56.1-53.13.02-.37.03-.74.05-1.11.02-.64.03-1.28.03-1.93s-.01-1.29-.03-1.93c.99-29.58,24.83-53.35,54.42-54.24h281.51c19.4,0,36.98,7.86,49.68,20.59l91.78,91.77,97.71,97.71c5.4,5.4,1.58,14.64-6.06,14.64Z";
const P2 =
  "M20.8,478.73h65.63c13.91.98,25.04,12.11,26.02,26.02v58.22c0,15.01,11.75,27.27,26.54,28.11.53.03,1.06.05,1.6.05s1.07-.01,1.6-.05h419.6c15.52,0,28.11-12.58,28.11-28.11v-175.87c0-7.64,9.24-11.47,14.64-6.06l86.18,86.32c3.27,3.27,5.97,7.12,7.93,11.38,2.3,5,3.6,10.57,3.6,16.45v41.71c-1.06,30.12-25.8,54.19-56.17,54.19h-.08c-30.01,0-54.51,23.53-56.1,53.13-.02.37-.03.74-.05,1.11-.02.64-.03,1.28-.03,1.93s.01,1.29.03,1.93c-.99,29.58-24.83,53.35-54.42,54.24H253.91c-19.4,0-36.98-7.86-49.68-20.59l-91.78-91.77L14.74,493.37c-5.4-5.4-1.58-14.64,6.06-14.64Z";

type Props = {
  /** Rendered width/height in px. Inline 20–32, full screen 76–120. */
  size?: number;
  className?: string;
  "aria-label"?: string;
};

export function BrandLoader({ size = 48, className, "aria-label": ariaLabel = "กำลังโหลด" }: Props) {
  // Several loaders can be on screen at once (lists, buttons) — keep mask/gradient ids unique.
  const id = useId().replace(/:/g, "");
  const p1 = `bl-p1-${id}`;
  const p2 = `bl-p2-${id}`;
  return (
    <svg
      viewBox="-120 -120 943 945"
      width={size}
      height={size}
      role="img"
      aria-label={ariaLabel}
      className={cn("brand-loader shrink-0", className)}
    >
      <defs>
        <path id={p1} d={P1} />
        <path id={p2} d={P2} />
        <radialGradient id={`bl-g-${id}`}>
          <stop offset="0" stopColor="#fff" />
          <stop offset=".55" stopColor="#fff" />
          <stop offset="1" stopColor="#000" />
        </radialGradient>
        <mask id={`bl-m-${id}`} maskUnits="userSpaceOnUse" x="-400" y="-400" width="1503" height="1505">
          <circle className="brand-loader-spot" cx="351" cy="352" r="200" fill={`url(#bl-g-${id})`} />
        </mask>
      </defs>
      <g className="brand-loader-ghost">
        <use href={`#${p1}`} />
        <use href={`#${p2}`} />
      </g>
      <g className="brand-loader-reveal" mask={`url(#bl-m-${id})`}>
        <use href={`#${p1}`} />
        <use href={`#${p2}`} />
      </g>
    </svg>
  );
}
