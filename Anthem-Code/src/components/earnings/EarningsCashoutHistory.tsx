import { Banknote } from "lucide-react";
import { formatThaiDate } from "@/lib/format";
import { cashoutStatusLabel } from "@/hooks/useCashout";

type CashoutRow = {
  id: string;
  net_px: number;
  gross_px: number;
  fee_px: number;
  status: string;
  created_at: string;
  bank_info?: { bank?: string; account_number?: string } | null;
};

type Props = {
  items: CashoutRow[];
};

export function EarningsCashoutHistory({ items }: Props) {
  return (
    <section className="rounded-2xl glass-panel p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Banknote className="w-5 h-5 text-primary" />
        <h2 className="font-medium text-foreground">ประวัติการถอน</h2>
        {items.length > 0 && (
          <span className="text-xs text-muted-foreground">({items.length})</span>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">ยังไม่เคยถอน</p>
      ) : (
        <ul className="space-y-2">
          {items.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/60 bg-background/40"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium tabular-nums">
                  ฿ {c.net_px.toLocaleString()}
                  <span className="text-xs text-muted-foreground font-normal ml-2">
                    จาก {c.gross_px.toLocaleString()} px
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {c.bank_info?.bank ?? "—"}
                  {c.bank_info?.account_number ? ` · ${c.bank_info.account_number}` : ""}
                </p>
              </div>
              <div className="text-right shrink-0">
                <StatusPill status={c.status} />
                <p className="text-[10px] text-muted-foreground mt-1">{formatThaiDate(c.created_at)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === "mock_paid" || status === "paid"
      ? "bg-primary/10 text-primary"
      : status === "rejected" || status === "failed"
        ? "bg-destructive/10 text-destructive"
        : status === "processing"
          ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
          : "bg-muted text-muted-foreground";

  return (
    <span className={`text-[11px] px-2 py-0.5 rounded-full ${cls}`}>
      {cashoutStatusLabel(status)}
    </span>
  );
}
