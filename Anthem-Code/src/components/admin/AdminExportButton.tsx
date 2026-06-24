import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toCsv, downloadCsv } from "@/lib/csv";

interface Props<T extends Record<string, unknown>> {
  rows: T[];
  filename: string;
  columns?: (keyof T)[];
  label?: string;
}

export default function AdminExportButton<T extends Record<string, unknown>>({
  rows,
  filename,
  columns,
  label = "ส่งออก CSV",
}: Props<T>) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="rounded-sm border-admin-border text-admin-fg"
      disabled={rows.length === 0}
      onClick={() => downloadCsv(filename, toCsv(rows, columns))}
    >
      <Download className="w-3.5 h-3.5 mr-1.5" />
      {label}
    </Button>
  );
}
