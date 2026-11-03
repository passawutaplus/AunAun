import { Check } from "lucide-react";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { OfferSectionId } from "@/components/chat/offer/offerDialogHelpers";

/** Collapsible section wrapper and date formatter for the chat offer dialog. */
export function OfferSection({
  value,
  step,
  title,
  summary,
  done,
  optional,
  children,
}: {
  value: OfferSectionId;
  step: number;
  title: string;
  summary: string;
  done: boolean;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <AccordionItem value={value} className="rounded-2xl border border-border bg-card px-3.5 sm:px-4">
      <AccordionTrigger className="gap-3 py-3 text-left hover:no-underline">
        <span className="flex min-w-0 flex-1 items-center gap-3">
          <span
            aria-hidden
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
              done ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground",
            )}
          >
            {done ? <Check className="h-4 w-4" /> : step}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold">
              {title}
              {optional ? (
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">ไม่บังคับ</span>
              ) : null}
            </span>
            <span className="block truncate text-xs font-normal text-muted-foreground">{summary}</span>
          </span>
          {done || !optional ? (
            <span className="sr-only">{done ? "กรอกครบแล้ว" : "ยังกรอกไม่ครบ"}</span>
          ) : null}
        </span>
      </AccordionTrigger>
      <AccordionContent className="space-y-4 px-0.5 pb-4 pt-0.5">{children}</AccordionContent>
    </AccordionItem>
  );
}

export function formatOfferShortDate(ymd: string) {
  const d = new Date(`${ymd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
}
