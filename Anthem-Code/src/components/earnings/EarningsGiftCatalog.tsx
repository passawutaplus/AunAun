import { Link } from "react-router-dom";
import { ArrowRight, Gift as GiftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Gift } from "@/hooks/useGifting";
import { giftIcon } from "@/components/earnings/giftIcons";

type Props = {
  gifts: Gift[];
};

const EarningsGiftCatalog = ({ gifts }: Props) => {
  if (gifts.length === 0) return null;

  return (
    <section id="gift-catalog" className="rounded-2xl glass-panel p-5 space-y-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <GiftIcon className="w-5 h-5 text-primary shrink-0" />
          <h2 className="font-medium text-foreground">ของขวัญที่ส่งได้</h2>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          ดูรายการและราคา — ส่งได้จากปุ่ม「สนับสนุน」บนผลงานหรือโปรไฟล์ครีเอเตอร์เท่านั้น
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {gifts.map((g) => {
          const Icon = giftIcon(g.icon);
          return (
            <div
              key={g.id}
              className="rounded-2xl border border-border/60 bg-muted/15 p-3 text-center"
              aria-label={`${g.name_th} ${g.price_px.toLocaleString("th-TH")} px`}
            >
              <div className="w-10 h-10 mx-auto rounded-full bg-muted text-foreground/70 flex items-center justify-center">
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-xs font-medium mt-2 text-foreground line-clamp-1">{g.name_th}</p>
              <p className="text-[11px] mt-0.5 tabular-nums text-primary">
                {g.price_px.toLocaleString("th-TH")} px
              </p>
            </div>
          );
        })}
      </div>

      <Button variant="outline" className="w-full rounded-full" asChild>
        <Link to="/">
          ไปสำรวจผลงานเพื่อสนับสนุน
          <ArrowRight className="w-4 h-4 ml-1.5" />
        </Link>
      </Button>
    </section>
  );
};

export default EarningsGiftCatalog;
