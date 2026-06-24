import * as React from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

export const CATEGORY_COLORS: Record<string, string> = {
  Design: "var(--color-chart-1)",
  Music: "var(--color-chart-5)",
  Dev: "var(--color-chart-3)",
  Internet: "var(--color-chart-4)",
  AI: "var(--color-chart-2)",
  Streaming: "var(--color-chart-5)",
  Cloud: "var(--color-chart-3)",
  Productivity: "var(--color-chart-1)",
  Housing: "var(--color-chart-4)",
  Utilities: "var(--color-chart-2)",
  Health: "var(--color-chart-2)",
  Beauty: "var(--color-chart-5)",
  Insurance: "var(--color-chart-3)",
  Investments: "var(--color-chart-4)",
  CardFees: "var(--color-chart-1)",
  Family: "var(--color-chart-2)",
  Donations: "var(--color-chart-5)",
  Pets: "var(--color-chart-4)",
  Learning: "var(--color-chart-1)",
  Operations: "var(--color-chart-3)",
};

export const CATEGORY_LABELS: Record<string, string> = {
  Design: "ดีไซน์",
  Music: "เพลง",
  Dev: "พัฒนา",
  Internet: "อินเทอร์เน็ต",
  AI: "AI",
  Streaming: "สตรีมมิ่ง",
  Cloud: "คลาวด์",
  Productivity: "Productivity",
  Housing: "ที่อยู่อาศัย",
  Utilities: "สาธารณูปโภค",
  Health: "สุขภาพ",
  Beauty: "ความงาม",
  Insurance: "ประกัน",
  Investments: "การลงทุน",
  CardFees: "ค่าบัตร",
  Family: "ครอบครัว",
  Donations: "บริจาค",
  Pets: "สัตว์เลี้ยง",
  Learning: "เรียนรู้",
  Operations: "ธุรกิจ",
};

export function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
  action,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  action?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <CollapsibleTrigger className="group flex flex-1 items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors">
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "" : "-rotate-90"}`}
          />
          <span>{title}</span>
        </CollapsibleTrigger>
        {action}
      </div>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  );
}
