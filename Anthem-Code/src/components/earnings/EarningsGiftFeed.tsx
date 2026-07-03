import { Link } from "react-router-dom";
import { Gift as GiftIcon, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatThaiDate } from "@/lib/format";
import { giftIcon } from "@/components/earnings/giftIcons";
import type { GiftTransaction } from "@/hooks/useGifting";

type GiftMeta = { id: string; name_th?: string; icon?: string };
type SenderMeta = { id: string; display_name?: string | null; avatar_url?: string | null };

type Props = {
  items: GiftTransaction[];
  giftById: Map<string, GiftMeta>;
  senderById: Map<string, SenderMeta>;
  onGoPortfolio?: () => void;
};

const PREVIEW = 8;

export function EarningsGiftFeed({ items, giftById, senderById, onGoPortfolio }: Props) {
  const preview = items.slice(0, PREVIEW);

  return (
    <section className="rounded-2xl glass-panel p-5 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <GiftIcon className="w-5 h-5 text-primary" />
          <h2 className="font-medium text-foreground">ของขวัญล่าสุด</h2>
          {items.length > 0 && (
            <span className="text-xs text-muted-foreground">({items.length})</span>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-8 space-y-3">
          <p className="text-sm text-muted-foreground">
            ยังไม่มีคนส่งของขวัญให้คุณ — ลงผลงานเจ๋ง ๆ ไว้รอเลย!
          </p>
          {onGoPortfolio && (
            <Button type="button" variant="outline" className="rounded-full" onClick={onGoPortfolio}>
              ไปลงผลงาน
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {preview.map((tx) => {
            const g = giftById.get(tx.gift_id);
            const Icon = giftIcon(g?.icon);
            const sender = senderById.get(tx.sender_id);
            return (
              <li
                key={tx.id}
                className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/40 p-3 hover:bg-muted/30 transition-colors"
              >
                <Link to={`/u/${tx.sender_id}`} className="shrink-0">
                  {sender?.avatar_url ? (
                    <img src={sender.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-medium">
                      {(sender?.display_name ?? "?")[0]}
                    </div>
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    <Link to={`/u/${tx.sender_id}`} className="hover:text-primary">
                      {sender?.display_name ?? "ผู้ใช้"}
                    </Link>
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5 truncate">
                    <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>{g?.name_th ?? "ของขวัญ"}</span>
                    {tx.message ? (
                      <span className="truncate" title={tx.message}>
                        · {tx.message}
                      </span>
                    ) : null}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    +{tx.price_px} px
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{formatThaiDate(tx.created_at)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {items.length > PREVIEW && (
        <p className="text-xs text-center text-muted-foreground">
          แสดง {PREVIEW} รายการล่าสุดจาก {items.length} รายการ
        </p>
      )}
    </section>
  );
}
