import { Link } from "@tanstack/react-router";
import { ArrowRight, ExternalLink, FileText } from "lucide-react";
import { FREE_QUOTATION_URL } from "@/lib/productLinks";
import { FINAL_CTA } from "@/data/landingContent";
import { FadeUp } from "@/components/motion/FadeUp";

type Props = {
  user: boolean;
  remaining: number;
};

export function LandingFinalCta({ user, remaining }: Props) {
  return (
    <section className="mx-auto max-w-4xl px-4 py-16 sm:py-24">
      <FadeUp>
        <div className="rounded-3xl bg-gradient-primary p-8 sm:p-12 text-center shadow-elevated">
          <h3 className="text-2xl sm:text-3xl font-bold text-primary-foreground tracking-tight">
            {FINAL_CTA.title(remaining)}
          </h3>
          <p className="mt-3 text-sm sm:text-base text-primary-foreground/85">
            {FINAL_CTA.subtitle}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              to={user ? "/dashboard" : "/apply"}
              className="inline-flex items-center gap-2 rounded-full bg-card text-foreground px-6 py-3 text-sm font-semibold shadow-elevated hover:bg-card/90 transition-colors"
            >
              {user ? "ทดลองระบบเต็มก่อนใคร" : "สมัครเข้ากลุ่มบุกเบิก"}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href={FREE_QUOTATION_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur text-primary-foreground border border-white/30 px-6 py-3 text-sm font-semibold hover:bg-white/25 transition-colors"
            >
              <FileText className="h-4 w-4" />
              ลองทำใบเสนอราคาฟรี
              <ExternalLink className="h-3.5 w-3.5 opacity-80" />
            </a>
          </div>
        </div>
      </FadeUp>
    </section>
  );
}
