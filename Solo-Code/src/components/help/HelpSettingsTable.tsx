import { Link } from "@tanstack/react-router";
import type { HelpSettingsRow } from "@/data/helpCenter";

export function HelpSettingsTable({ rows }: { rows: HelpSettingsRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border/60">
      <table className="min-w-full text-sm">
        <thead className="bg-muted/40 text-left">
          <tr>
            <th className="px-3 py-2.5 font-medium text-xs">อยากทำอะไร</th>
            <th className="px-3 py-2.5 font-medium text-xs hidden sm:table-cell">ไปที่</th>
            <th className="px-3 py-2.5 font-medium text-xs w-24">คู่มือ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {rows.map((row) => (
            <tr key={row.task} className="hover:bg-muted/20">
              <td className="px-3 py-2.5 font-medium">{row.task}</td>
              <td className="px-3 py-2.5 text-muted-foreground text-xs hidden sm:table-cell">
                {row.settingsPath}
              </td>
              <td className="px-3 py-2.5">
                <Link
                  to={row.link.to}
                  hash={row.link.hash}
                  className="text-primary text-xs hover:underline whitespace-nowrap"
                >
                  ดูวิธี
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
