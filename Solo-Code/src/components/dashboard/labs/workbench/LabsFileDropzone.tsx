import { FileDropzone, type FileDropzoneProps } from "@/components/doc/FileDropzone";
import { cn } from "@/lib/utils";

/** Dropzone แบบบางสำหรับ Labs workbench */
export function LabsFileDropzone({ className, ...props }: FileDropzoneProps) {
  return (
    <FileDropzone
      {...props}
      className={cn(
        "rounded-lg border border-dashed p-3 sm:p-4 gap-3",
        "!bg-muted/30 hover:!bg-muted/50",
        "!border-border/80 hover:!border-primary/50",
        "[&>div:first-child]:rounded-md [&>div:first-child]:p-2 [&>div:first-child]:bg-primary/10",
        "[&_svg]:h-5 [&_svg]:w-5",
        className,
      )}
    />
  );
}
