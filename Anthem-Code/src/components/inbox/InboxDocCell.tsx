import { FileText } from "lucide-react";

type Props = {
  hasDocs: boolean;
  onOpen?: () => void;
  /** Tooltip / aria when the cell is a button (hire = ดูเอกสาร, collab = ดูแผนงาน). */
  openLabel?: string;
};

export function InboxDocCell({ hasDocs, onOpen, openLabel = "ดูเอกสาร" }: Props) {
  if (!hasDocs) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  const icon = <FileText className="h-4 w-4" />;
  if (!onOpen) {
    return (
      <span className="inline-flex h-8 w-8 items-center justify-center text-destructive" title={openLabel}>
        {icon}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      title={openLabel}
      aria-label={openLabel}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-destructive hover:bg-destructive/10"
    >
      {icon}
    </button>
  );
}
