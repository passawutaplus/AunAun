import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Loader2, BookOpen, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

type Faq = {
  id: string;
  question: string;
  answer: string;
  category: string;
  sort_order: number;
};

const CATEGORY_LABEL: Record<string, string> = {
  general: "ทั่วไป",
  tax: "ภาษี",
  brief: "Smart Brief",
  sharing: "การแชร์งาน",
  account: "บัญชี",
};

export function SupportFaq() {
  const [faqs, setFaqs] = React.useState<Faq[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [q, setQ] = React.useState("");

  React.useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("faqs")
        .select("id, question, answer, category, sort_order")
        .eq("is_published", true)
        .order("sort_order", { ascending: true });
      setFaqs((data as Faq[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = React.useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return faqs;
    return faqs.filter(
      (f) => f.question.toLowerCase().includes(term) || f.answer.toLowerCase().includes(term),
    );
  }, [faqs, q]);

  const grouped = React.useMemo(() => {
    const m = new Map<string, Faq[]>();
    filtered.forEach((f) => {
      const arr = m.get(f.category) ?? [];
      arr.push(f);
      m.set(f.category, arr);
    });
    return Array.from(m.entries());
  }, [filtered]);

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหาคำถาม..."
            className="pl-9 text-sm h-9"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="text-center py-10 text-xs text-gray-400">
            <Loader2 className="h-5 w-5 mx-auto animate-spin mb-2" />
            กำลังโหลด...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-xs text-gray-500">
            <BookOpen className="h-6 w-6 mx-auto mb-2 text-gray-300" />
            ไม่พบคำถามที่ตรงกับการค้นหา
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map(([cat, items]) => (
              <div key={cat}>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#FF5F05] mb-2">
                  {CATEGORY_LABEL[cat] ?? cat}
                </div>
                <Accordion type="single" collapsible className="space-y-1.5">
                  {items.map((f) => (
                    <AccordionItem
                      key={f.id}
                      value={f.id}
                      className="border border-gray-200 rounded-lg px-3 bg-white"
                    >
                      <AccordionTrigger className="text-sm py-3 hover:no-underline text-left">
                        {f.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-gray-600 whitespace-pre-wrap pb-3">
                        {f.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
