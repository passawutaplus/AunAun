import { ReactNode } from "react";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  empty?: string;
  loading?: boolean;
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
}

export default function DataTable<T>({ columns, rows, empty = "ไม่มีข้อมูล", loading, rowKey, onRowClick }: Props<T>) {
  return (
    <div className="border border-admin-border rounded-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-admin-surface border-b border-admin-border">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={`text-left font-mono text-[10px] uppercase tracking-[0.18em] text-admin-muted px-4 py-3 ${c.className ?? ""}`}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-admin-muted text-sm">กำลังโหลด...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-admin-muted text-sm">{empty}</td></tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={() => onRowClick?.(row)}
                  className={`border-b border-admin-border last:border-0 hover:bg-admin-hover transition-colors ${onRowClick ? "cursor-pointer" : ""}`}
                >
                  {columns.map((c) => (
                    <td key={c.key} className={`px-4 py-3 align-middle text-admin-fg ${c.className ?? ""}`}>
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
