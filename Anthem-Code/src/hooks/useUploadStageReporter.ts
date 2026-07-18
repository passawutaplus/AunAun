import { useCallback, useRef, useState } from "react";
import type { UploadStageReporter } from "@/lib/uploadProgress";

export type UploadStageState = { label: string; percent: number | null } | null;

/**
 * Stable reporter + React state for showing "what's happening now" during
 * upload/compression. Pass `reporter` into upload* calls, read `stage` in the
 * UI (progress bar + label), and call `resetStage()` in the `finally` block.
 */
export function useUploadStageReporter() {
  const [stage, setStage] = useState<UploadStageState>(null);

  const reporter = useRef<UploadStageReporter>({
    onStage: (label) => setStage({ label, percent: null }),
    onPercent: (pct) =>
      setStage((prev) => ({ label: prev?.label ?? "กำลังประมวลผล...", percent: pct })),
  }).current;

  const resetStage = useCallback(() => setStage(null), []);

  return { stage, reporter, resetStage };
}
