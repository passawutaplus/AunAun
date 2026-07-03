import { useState } from "react";
import { Copy, Gift, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { useMarketingBusinesses } from "@/hooks/admin/useMarketingBusinesses";
import { useMarketingInsights } from "@/hooks/admin/useMarketingInsights";
import { MarketingCard } from "./MarketingShell";

const REFERRAL_COPY = {
  th: {
    headline: "แคมเปญ Referral — ชวนเพื่อนมา Aplus1",
    bullets: [
      "ลิงก์: https://aplus1.app/?ref=YOUR_CODE",
      "เพื่อนใหม่สมัครผ่านลิงก์: +20px welcome",
      "เพื่อน publish/post งานแรก: +100px welcome",
      "ผู้ชวนได้ +50px earned เมื่อเพื่อนทำ first meaningful action",
      "welcome px ไม่ถอน — earned px ถอนได้ตามกติกา cashout",
    ],
    cta: "แชร์ใน IG Story / LINE / อีเมล — ไม่แก้ reward logic แค่ marketing copy",
  },
  en: {
    headline: "Referral campaign — invite friends to Aplus1",
    bullets: [
      "Link: https://aplus1.app/?ref=YOUR_CODE",
      "New signup via link: +20px welcome",
      "First publish/post: +100px welcome",
      "Referrer: +50px earned on friend's first meaningful action",
      "Welcome px non-withdrawable; earned px per cashout rules",
    ],
    cta: "Share on social/email — UI copy only, reward logic unchanged",
  },
};

export default function MarketingOfferBuilder() {
  const { activeBusiness, activeBusinessId } = useMarketingBusinesses();
  const { runInsight, isRunning } = useMarketingInsights(activeBusinessId);
  const [offer, setOffer] = useState("สมัคร Aplus1 ฟรี + โปรไฟล์พร้อม publish 3 ผลงาน");
  const [lang, setLang] = useState<"th" | "en">("th");

  const referral = REFERRAL_COPY[lang];

  const generate = async () => {
    try {
      const row = await runInsight({
        insightType: "campaign",
        title: "Offer Builder",
        context: { business: activeBusiness?.business_name ?? "", offer },
      });
      setOffer(row.recommendation ?? offer);
      toast.success("Offer insight saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const copyReferral = () => {
    const text = [referral.headline, "", ...referral.bullets.map((b) => `• ${b}`), "", referral.cta].join("\n");
    void navigator.clipboard.writeText(text);
    toast.success("Copied referral pack");
  };

  return (
    <div className="space-y-4">
      <MarketingCard className="p-5">
        <h2 className="text-lg font-semibold text-admin-fg">Offer Builder</h2>
        <textarea
          className="mt-3 h-32 w-full rounded-lg border border-admin-border p-3 text-sm"
          value={offer}
          onChange={(e) => setOffer(e.target.value)}
        />
        <button
          type="button"
          disabled={isRunning}
          onClick={() => void generate()}
          className="marketing-btn-primary mt-3 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm"
        >
          <Wand2 className="h-4 w-4" />
          Generate with AI
        </button>
      </MarketingCard>

      <MarketingCard className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="inline-flex items-center gap-2 font-semibold text-admin-fg">
            <Gift className="h-4 w-4 text-admin-accent" />
            Referral campaign copy
          </h3>
          <select
            className="h-8 rounded-lg border border-admin-border px-2 text-sm"
            value={lang}
            onChange={(e) => setLang(e.target.value as "th" | "en")}
          >
            <option value="th">ไทย</option>
            <option value="en">EN</option>
          </select>
        </div>
        <p className="mt-2 font-medium text-admin-fg">{referral.headline}</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-admin-muted">
          {referral.bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-admin-muted">{referral.cta}</p>
        <button
          type="button"
          onClick={copyReferral}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-admin-border px-4 py-2 text-sm"
        >
          <Copy className="h-4 w-4" />
          Copy referral pack
        </button>
      </MarketingCard>
    </div>
  );
}
