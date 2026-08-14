import * as React from "react";
import { cn } from "@/lib/utils";
import "./wandering-eyes.css";

type WanderingEyesProps = React.ComponentProps<"span"> & {
  eyeScale?: number;
  gapScale?: number;
  pupilScale?: number;
  blinkScale?: number;
  travelScale?: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function WanderingEyes({
  className,
  style,
  eyeScale = 0.62,
  gapScale = 0.09,
  pupilScale = 0.32,
  blinkScale = 0.375,
  travelScale = 0.3125,
  ...props
}: WanderingEyesProps) {
  const safeEyeScale = clamp(eyeScale, 0.28, 0.7);
  const safeGapScale = clamp(gapScale, 0.04, 0.3);
  const safePupilScale = clamp(pupilScale, 0.12, 0.45);
  const safeBlinkScale = clamp(blinkScale, 0.15, 1);
  const safeTravelScale = clamp(travelScale, 0.08, 0.5);
  const { "aria-label": ariaLabel, ...rest } = props;
  const eyesStyle = {
    ...style,
    "--loading-ui-wandering-eyes-eye": `${(safeEyeScale * 100).toFixed(2)}cqmin`,
    "--loading-ui-wandering-eyes-gap": `${(safeGapScale * 100).toFixed(2)}cqmin`,
    "--loading-ui-wandering-eyes-pupil-scale": `${safePupilScale}`,
    "--loading-ui-wandering-eyes-blink": `${safeBlinkScale}`,
    "--loading-ui-wandering-eyes-travel-scale": `${safeTravelScale}`,
  } as React.CSSProperties;

  return (
    <span
      role="status"
      className={cn(
        "wandering-eyes relative inline-flex aspect-[9/4] items-center justify-center align-middle",
        className,
      )}
      style={eyesStyle}
      aria-label={ariaLabel}
      {...rest}
    >
      <span aria-hidden="true" className="wandering-eyes__pair">
        {Array.from({ length: 2 }, (_, index) => (
          <span key={index} className="wandering-eyes__eye">
            <span className="wandering-eyes__pupil" />
          </span>
        ))}
      </span>
      {ariaLabel ? null : <span className="sr-only">กำลังโหลด</span>}
    </span>
  );
}

export { WanderingEyes };
export type { WanderingEyesProps };
