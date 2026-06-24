import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { FeatureSection } from "@/data/uxResearchGuide";

type Props = {
  sections: FeatureSection[];
};

const ResearchChecklistSection = ({ sections }: Props) => (
  <Accordion type="multiple" className="rounded-xl border border-border px-4">
    {sections.map((section) => (
      <AccordionItem key={section.id} value={section.id}>
        <AccordionTrigger className="text-sm hover:no-underline">
          <span className="flex items-center gap-2 text-left">
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary w-6 shrink-0">
              {section.id}
            </span>
            <span className="font-medium">{section.title}</span>
            <span className="text-xs text-muted-foreground font-normal hidden sm:inline">
              ({section.items.length} รายการ)
            </span>
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-3 text-sm">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Paths:</span> {section.paths}
          </p>
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">บัญชี:</span> {section.account}
          </p>
          <ul className="space-y-1.5">
            {section.items.map((item) => (
              <li key={item.id} className="flex items-start gap-2">
                <span
                  className="mt-0.5 inline-flex h-4 w-4 shrink-0 rounded border border-border bg-muted/50"
                  aria-hidden
                />
                <span className="text-foreground/85">{item.text}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-foreground/70 pt-1 border-t border-border/50">
            <span className="font-medium text-foreground">สำเร็จเมื่อ:</span> {section.success}
          </p>
        </AccordionContent>
      </AccordionItem>
    ))}
  </Accordion>
);

export default ResearchChecklistSection;
