import { Link } from "@tanstack/react-router";
import { HelpCircle, ArrowRight } from "lucide-react";
import { HELP_FAQ } from "@/data/helpCenter";
import { LANDING_FAQ_IDS } from "@/data/landingContent";
import { HelpFaqAccordion } from "@/components/help/HelpFaqAccordion";
import { FadeUp } from "@/components/motion/FadeUp";

const faqItems = HELP_FAQ.filter((f) => (LANDING_FAQ_IDS as readonly string[]).includes(f.id));

export function LandingFaq() {
  return (
    <section id="faq" className="mx-auto max-w-3xl px-4 py-14 sm:py-16">
      <FadeUp className="text-center mb-8">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1 text-[11px] font-medium text-muted-foreground mb-3">
          <HelpCircle className="h-3 w-3 text-primary" />
          FAQ
        </div>
        <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">คำถามที่พบบ่อย</h3>
      </FadeUp>

      <FadeUp delay={0.06}>
        <HelpFaqAccordion items={faqItems} />
      </FadeUp>

      <FadeUp delay={0.1} className="mt-6 text-center">
        <Link
          to="/help"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          ดูศูนย์ช่วยเหลือทั้งหมด
          <ArrowRight className="h-4 w-4" />
        </Link>
      </FadeUp>
    </section>
  );
}
