import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChatAboutPackage } from "@/hooks/useChatAboutPackage";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatServicePrice } from "@/hooks/useCreatorServices";
import type { PackageFeedCard } from "@/hooks/usePackageFeed";
import type { PackageFeedListingStats } from "@/hooks/usePackageFeedStats";
import { thumbFeedCoverUrl } from "@/lib/feedProjectCover";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cards: PackageFeedCard[];
  stats: Record<string, PackageFeedListingStats | undefined>;
  /** Signed-in user; their own packages get no chat button. */
  viewerId?: string;
};

const dash = <span className="text-muted-foreground">–</span>;

function price(card: PackageFeedCard): ReactNode {
  const min = Number(card.service.price_min_thb) || 0;
  const max = Number(card.service.price_thb) || 0;
  const start = min > 0 ? min : max;
  if (start <= 0) return "คุยรายละเอียดราคา";
  return max > min && min > 0 ? `${formatServicePrice(min)} – ${formatServicePrice(max)}` : formatServicePrice(start);
}

function text(value: string | null | undefined): ReactNode {
  return value?.trim() ? value : dash;
}

/** Side-by-side look at 2–3 saved packages: price, time, what is included. */
export default function SavedPackagesCompareDialog({ open, onOpenChange, cards, stats, viewerId }: Props) {
  const { start, busyId } = useChatAboutPackage();
  const rows: { label: string; render: (c: PackageFeedCard) => ReactNode }[] = [
    { label: "ครีเอเตอร์", render: (c) => c.profile.display_name || c.profile.username || dash },
    { label: "ราคา", render: (c) => <span className="font-semibold tabular-nums">{price(c)}</span> },
    {
      label: "ระยะเวลา",
      render: (c) => (c.service.duration_label?.trim() ? `${c.service.duration_label} วัน` : dash),
    },
    { label: "แบบร่าง", render: (c) => text(c.service.concepts_label) },
    { label: "แก้ไขได้", render: (c) => text(c.service.revisions_label) },
    {
      label: "ได้รับ",
      render: (c) =>
        c.service.deliverables?.length ? (
          <ul className="list-disc space-y-0.5 pl-4">
            {c.service.deliverables.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        ) : (
          dash
        ),
    },
    { label: "ไม่รวม", render: (c) => text(c.service.exclusions_note) },
    {
      label: "คะแนน",
      render: (c) => {
        const s = stats[c.service.id];
        return s?.ratingAvg != null ? `${s.ratingAvg.toFixed(1)} (${s.reviewCount} รีวิว)` : dash;
      },
    },
    {
      label: "ถูกจ้าง",
      render: (c) => {
        const n = stats[c.service.id]?.hireCount ?? 0;
        return n > 0 ? `${n} ครั้ง` : dash;
      },
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>เปรียบเทียบแพ็กเกจ</DialogTitle>
        </DialogHeader>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-sm">
            <thead>
              <tr>
                <th className="w-24 p-2" />
                {cards.map((c) => {
                  const cover = c.images[0] ? thumbFeedCoverUrl(c.images[0]) : "";
                  return (
                    <th key={c.service.id} className="p-2 text-left align-top font-normal">
                      <Link to={`/service/${c.service.id}`} className="block space-y-1.5 hover:underline">
                        <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
                          {cover ? <img src={cover} alt="" className="h-full w-full object-cover" /> : null}
                        </div>
                        <span className="line-clamp-2 font-semibold text-foreground">{c.service.title}</span>
                      </Link>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-t border-border/60 align-top">
                  <th scope="row" className="p-2 text-left text-xs font-normal text-muted-foreground">
                    {row.label}
                  </th>
                  {cards.map((c) => (
                    <td key={c.service.id} className="p-2 text-foreground">
                      {row.render(c)}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-t border-border/60">
                <td />
                {cards.map((c) => (
                  <td key={c.service.id} className="p-2">
                    {c.service.owner_id === viewerId ? null : (
                      <Button
                        type="button"
                        size="sm"
                        className="w-full rounded-full"
                        disabled={busyId === c.service.id}
                        onClick={() => void start(c.service, c.profile.display_name || c.profile.username)}
                      >
                        <MessageCircle className="mr-1.5 h-4 w-4" aria-hidden />
                        {busyId === c.service.id ? "กำลังเปิดแชท..." : "ทักแชท"}
                      </Button>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
