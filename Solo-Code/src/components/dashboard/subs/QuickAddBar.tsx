import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Zap } from "lucide-react";
import { toast } from "sonner";
import { useFinance } from "@/store/finance";
import { POPULAR_SUBS, formatTHB, type Subscription } from "@/data/mockData";

// เลือก 8 ตัวยอดนิยมที่คนไทย/ฟรีแลนซ์น่าจะใช้บ่อยสุด
const POPULAR_NAMES = [
  "Adobe Creative Cloud",
  "Canva Pro",
  "Figma Pro",
  "ChatGPT Plus",
  "Spotify Premium",
  "Netflix",
  "YouTube Premium",
  "Notion Plus",
];

export function QuickAddBar() {
  const { subs, setSubs, paymentMethods } = useFinance();
  const popular = POPULAR_SUBS.filter((p) => POPULAR_NAMES.includes(p.name));

  function quickAdd(item: (typeof POPULAR_SUBS)[number]) {
    if (subs.some((s) => s.name.toLowerCase() === item.name.toLowerCase())) {
      toast.info(`${item.name} มีอยู่ในรายการแล้ว`);
      return;
    }
    if (paymentMethods.length === 0) {
      toast.error("กรุณาเพิ่มช่องทางการตัดเงินก่อน");
      return;
    }
    const newSub: Subscription = {
      id: crypto.randomUUID(),
      name: item.name,
      category: item.category,
      amount: item.suggestedAmount,
      billingDay: 1,
      paymentMethodId: paymentMethods[0].id,
      icon: item.icon,
    };
    setSubs((arr) => [...arr, newSub]);
    toast.success(`เพิ่ม ${item.name} แล้ว`, {
      description: `฿${formatTHB(item.suggestedAmount)}/เดือน · แก้รายละเอียดได้ในรายการ`,
    });
  }

  return (
    <Card className="border-border bg-gradient-to-br from-primary/5 via-card to-card">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="rounded-lg bg-primary-soft p-1.5 text-primary">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight">เพิ่มเร็ว · Quick Sub</h3>
            <p className="text-[11px] text-muted-foreground">
              แตะเพื่อเพิ่มบริการยอดนิยมทันที (แก้ราคา/วันตัดบิลภายหลังได้)
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {popular.map((item) => {
            const Icon = item.icon;
            const exists = subs.some((s) => s.name.toLowerCase() === item.name.toLowerCase());
            return (
              <Button
                key={item.name}
                size="sm"
                variant={exists ? "secondary" : "outline"}
                disabled={exists}
                onClick={() => quickAdd(item)}
                className="gap-1.5 rounded-full h-8 text-xs"
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.name}</span>
                <span className="text-[10px] text-muted-foreground num">
                  ฿{formatTHB(item.suggestedAmount)}
                </span>
                {!exists && <Plus className="h-3 w-3 opacity-60" />}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
