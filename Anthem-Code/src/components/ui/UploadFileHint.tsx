import { cn } from "@/lib/utils";

type Props = {
  /** e.g. "JPG, PNG, WebP" */
  formats: string;
  maxMb: number;
  className?: string;
};

/** Show accept + size limit before the user picks a file. */
export function UploadFileHint({ formats, maxMb, className }: Props) {
  return (
    <p className={cn("text-[11px] text-muted-foreground thai-body", className)}>
      {formats} · สูงสุด {maxMb} MB
    </p>
  );
}

export default UploadFileHint;
