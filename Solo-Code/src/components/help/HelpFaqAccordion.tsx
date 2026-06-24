import { Link } from "@tanstack/react-router";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ChevronRight } from "lucide-react";
import type { HelpFaqItem } from "@/data/helpCenter";

const CATEGORY_LABEL: Record<string, string> = {
  general: "ทั่วไป",
  account: "บัญชี & แพ็กเกจ",
  client: "ลูกค้า & งาน",
  money: "การเงิน",
  tax: "ภาษี",
  brand: "เอกสาร & แบรนด์",
};

export function HelpFaqAccordion({ items }: { items: HelpFaqItem[] }) {
  const grouped = items.reduce<Map<string, HelpFaqItem[]>>((map, item) => {
    const arr = map.get(item.category) ?? [];
    arr.push(item);
    map.set(item.category, arr);
    return map;
  }, new Map());

  return (
    <div className="space-y-6">
      {[...grouped.entries()].map(([category, faqs]) => (
        <div key={category}>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            {CATEGORY_LABEL[category] ?? category}
          </h3>
          <Accordion type="multiple" className="rounded-xl border border-border/60 bg-card/30 px-3">
            {faqs.map((faq) => (
              <AccordionItem key={faq.id} value={faq.id} className="border-border/50">
                <AccordionTrigger className="text-sm text-left hover:no-underline py-3">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-3 space-y-2">
                  <p>{faq.answer}</p>
                  {faq.link ? (
                    <Link
                      to={faq.link.to}
                      hash={faq.link.hash}
                      className="inline-flex items-center gap-1 text-primary text-xs font-medium hover:underline"
                    >
                      อ่านคู่มือ: {faq.link.label}
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                  ) : null}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      ))}
    </div>
  );
}
