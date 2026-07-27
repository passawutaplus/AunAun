import { useEffect } from "react";
import { ArrowRight, Check } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import SeoHead from "@/components/SeoHead";
import { FadeUp } from "@/components/motion/FadeUp";
import WorkWallMarquee from "@/components/feed/WorkWallMarquee";
import { LearnAuthLink, LearnPrimaryCtas } from "@/components/learn/LearnCtas";
import { LearnProductFrame } from "@/components/learn/LearnProductFrame";
import {
  LearnChatMock,
  LearnExploreMock,
  LearnLoopRail,
  LearnProfileMock,
} from "@/components/learn/LearnProductMocks";
import { Button } from "@/components/ui/button";
import {
  LEARN_CREATOR_CHECKLIST,
  LEARN_CREATOR_SECTIONS,
  LEARN_FEATURES,
  LEARN_HIRER_SECTIONS,
  LEARN_HIRER_TIPS,
  LEARN_STEPS,
  LEARN_TRUST_LINKS,
} from "@/data/learnContent";
import {
  BRAND_CONCEPT,
  BRAND_DESCRIPTION,
  BRAND_NAME,
  BRAND_SUPPORT_EMAIL,
  BRAND_TAGLINE,
} from "@/lib/brandConfig";
import { smoothEase, staggerDelay } from "@/lib/motion";
import { cn } from "@/lib/utils";

const LOOP = ["เห็นผลงาน", "เข้าใจบริบท", "เชื่อศักยภาพ", "เก็บไว้ / คุยต่อ", "เกิดโอกาส"] as const;

function scrollToHash(hash: string) {
  const id = hash.replace(/^#/, "");
  if (!id) return;
  requestAnimationFrame(() => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function SectionIntro({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <FadeUp>
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{eyebrow}</p>
      <h2 className="thai-display mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">{body}</p>
    </FadeUp>
  );
}

/** Single Learn landing — Framer-like motion + product visuals. */
export default function LearnHubPage() {
  const { hash } = useLocation();
  const reduced = useReducedMotion();

  useEffect(() => {
    if (hash) scrollToHash(hash);
  }, [hash]);

  return (
    <>
      <SeoHead path="/learn" title={`เรียนรู้ ${BRAND_NAME}`} description={BRAND_DESCRIPTION} />

      {/* Hero — brand + live work wall */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-brand-radial opacity-50" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 pb-10 pt-10 sm:px-6 sm:pb-14 sm:pt-14 lg:pt-16">
          <div className="mx-auto max-w-3xl text-center">
            <FadeUp>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {BRAND_NAME}
              </p>
              <h1 className="thai-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-[3.5rem] lg:leading-[1.08]">
                {BRAND_CONCEPT}
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground thai-body sm:text-lg">
                {BRAND_TAGLINE} — โชว์ผลงานจริง แล้วเปลี่ยนการถูกค้นพบให้กลายเป็นโอกาส
              </p>
              <div className="mt-8">
                <LearnPrimaryCtas />
              </div>
              <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm">
                <a href="#creators" className="text-primary hover:underline underline-offset-2">
                  สำหรับครีเอเตอร์
                </a>
                <span className="text-border">·</span>
                <a href="#hirers" className="text-primary hover:underline underline-offset-2">
                  สำหรับคนจ้าง
                </a>
                <span className="text-border">·</span>
                <a href="#opportunity-loop" className="text-primary hover:underline underline-offset-2">
                  ดูลูปโอกาส
                </a>
              </div>
            </FadeUp>
          </div>

          <FadeUp delay={0.12} className="mt-10 sm:mt-12">
            <LearnProductFrame title={`${BRAND_NAME.toLowerCase()}.app · Explore`} className="mx-auto max-w-5xl">
              <div className="relative h-[13rem] overflow-hidden sm:h-[18rem] md:h-[22rem]">
                <WorkWallMarquee />
                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-24 bg-gradient-to-t from-background via-background/70 to-transparent"
                  aria-hidden
                />
                <motion.div
                  aria-hidden
                  animate={reduced ? undefined : { y: [0, -6, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute bottom-4 left-4 z-[3] hidden rounded-xl border border-white/10 bg-background/85 px-3 py-2 text-xs shadow-lg backdrop-blur sm:block"
                >
                  ผลงานจริงจากชุมชน · เลื่อนดูแล้วคุยต่อได้เลย
                </motion.div>
              </div>
            </LearnProductFrame>
          </FadeUp>
        </div>
      </section>

      {/* Creators */}
      <section id="creators" className="scroll-mt-28 border-t border-border/40">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:py-20">
          <div>
            <SectionIntro
              eyebrow="Creators"
              title="ให้ผลงานพาไปเจอโอกาส"
              body="ไม่ต้องขายตัวเองจากศูนย์ทุกครั้ง — ลงงานจริงให้คนเห็นสไตล์ แล้วคุยต่อจากชิ้นนั้น"
            />
            <div className="mt-8">
              <LearnPrimaryCtas />
            </div>
            <ol className="mt-10 space-y-5">
              {LEARN_CREATOR_SECTIONS.slice(0, 4).map((section, i) => (
                <FadeUp key={section.title} delay={staggerDelay(i, { dense: true })}>
                  <li className="flex gap-3">
                    <span className="mt-0.5 text-xs font-semibold tracking-widest text-primary">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">{section.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{section.body}</p>
                    </div>
                  </li>
                </FadeUp>
              ))}
            </ol>
          </div>
          <FadeUp delay={0.08}>
            <LearnProductFrame title="โปรไฟล์ครีเอเตอร์">
              <LearnProfileMock />
            </LearnProductFrame>
            <ul className="mt-5 space-y-2.5 rounded-2xl border border-border/50 bg-muted/20 px-4 py-4">
              {LEARN_CREATOR_CHECKLIST.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </FadeUp>
        </div>
      </section>

      {/* Hirers */}
      <section id="hirers" className="scroll-mt-28 border-t border-border/40 bg-background/35">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:py-20">
          <FadeUp className="order-2 lg:order-1">
            <LearnProductFrame title="Explore · ค้นหาจากสไตล์">
              <LearnExploreMock />
            </LearnProductFrame>
          </FadeUp>
          <div className="order-1 lg:order-2">
            <SectionIntro
              eyebrow="Hirers"
              title="เห็นของจริงก่อนคุย"
              body="เริ่มจากสไตล์และบริบทงาน — ไม่เริ่มจากเรซูเม่ยาวหรือแพ็กเกจราคา"
            />
            <div className="mt-8">
              <Button asChild className="rounded-full bg-gradient-brand px-6 text-white hover:opacity-90">
                <Link to="/">สำรวจผลงาน</Link>
              </Button>
            </div>
            <ol className="mt-10 space-y-5">
              {LEARN_HIRER_SECTIONS.slice(0, 4).map((section, i) => (
                <FadeUp key={section.title} delay={staggerDelay(i, { dense: true })}>
                  <li className="flex gap-3">
                    <span className="mt-0.5 text-xs font-semibold tracking-widest text-primary">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">{section.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{section.body}</p>
                    </div>
                  </li>
                </FadeUp>
              ))}
            </ol>
            <ul className="mt-8 space-y-2">
              {LEARN_HIRER_TIPS.map((tip) => (
                <li key={tip} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Opportunity loop */}
      <section id="opportunity-loop" className="scroll-mt-28 border-t border-border/40">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
          <SectionIntro
            eyebrow="Opportunity loop"
            title="ผลงานจริง → โอกาส"
            body={`หัวใจของ ${BRAND_NAME} — ไม่ใช่แค่โชว์งาน แต่ทำให้ความสนใจกลายเป็นบทสนทนาจากชิ้นงานนั้น`}
          />
          <div className="mt-10">
            <LearnLoopRail steps={LOOP} />
          </div>
          <div className="mt-12 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:gap-12">
            <div className="space-y-7">
              {LEARN_STEPS.map((step, i) => (
                <FadeUp key={step.step} delay={staggerDelay(i)}>
                  <p className="text-xs font-semibold tracking-widest text-primary">{step.step}</p>
                  <h3 className="mt-2 text-lg font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                </FadeUp>
              ))}
            </div>
            <FadeUp delay={0.1}>
              <LearnProductFrame title="แชทจากชิ้นงาน">
                <LearnChatMock />
              </LearnProductFrame>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-28 border-t border-border/40 bg-background/35">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
          <SectionIntro
            eyebrow="Features"
            title="ฟังก์ชันหลักบนเว็บ"
            body="แต่ละข้อลิงก์เข้าจุดใช้งานจริง — โฟกัสโอกาสจากผลงาน"
          />
          <ul className="mt-10 grid gap-3 sm:grid-cols-2">
            {LEARN_FEATURES.map((feature, i) => {
              const linkClass = cn(
                "group flex h-full flex-col justify-between rounded-2xl border border-border/60 bg-card/40 p-5 text-left transition-all duration-300",
                "hover:-translate-y-1 hover:border-primary/40 hover:bg-accent/30 hover:shadow-[0_20px_50px_-28px_rgba(0,0,0,0.55)]",
              );
              const body = (
                <>
                  <span>
                    <span className="block text-base font-semibold text-foreground">{feature.title}</span>
                    <span className="mt-2 block text-sm leading-relaxed text-muted-foreground">
                      {feature.body}
                    </span>
                  </span>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                    {feature.cta}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </>
              );

              return (
                <motion.li
                  key={feature.title}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-20px" }}
                  transition={{ delay: staggerDelay(i % 4, { dense: true }), duration: 0.4, ease: smoothEase }}
                >
                  {"auth" in feature && feature.auth ? (
                    <LearnAuthLink to={feature.to} className={linkClass}>
                      {body}
                    </LearnAuthLink>
                  ) : (
                    <Link to={feature.to} className={linkClass}>
                      {body}
                    </Link>
                  )}
                </motion.li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Trust */}
      <section id="trust" className="scroll-mt-28 border-t border-border/40">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
          <SectionIntro
            eyebrow="Trust"
            title="เล่นในชุมชนอย่างปลอดภัย"
            body="รายละเอียดกฎหมายและกฎชุมชนอยู่ที่หน้าเหล่านี้"
          />
          <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {LEARN_TRUST_LINKS.map((item, i) => (
              <motion.li
                key={item.to}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-20px" }}
                transition={{ delay: staggerDelay(i, { dense: true }), duration: 0.4, ease: smoothEase }}
              >
                <Link
                  to={item.to}
                  className="block h-full rounded-2xl border border-border/60 bg-card/30 px-5 py-4 transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:bg-accent/25"
                >
                  <span className="block text-base font-semibold text-foreground">{item.label}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{item.body}</span>
                </Link>
              </motion.li>
            ))}
          </ul>
          <p className="mt-10 text-sm text-muted-foreground">
            แจ้งทีมงานได้ที่{" "}
            <a href={`mailto:${BRAND_SUPPORT_EMAIL}`} className="text-primary hover:underline">
              {BRAND_SUPPORT_EMAIL}
            </a>
          </p>
        </div>
      </section>

      <section className="border-t border-border/40">
        <div className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6 sm:py-16">
          <FadeUp>
            <h2 className="thai-display text-3xl font-semibold tracking-tight sm:text-4xl">
              พร้อมให้ผลงานพาไปต่อ?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-muted-foreground">
              เริ่มจาก Explore หรือเข้า Forum ถ้าอยากคุยกับชุมชน
            </p>
            <div className="mt-8">
              <LearnPrimaryCtas secondaryToForum />
            </div>
          </FadeUp>
        </div>
      </section>
    </>
  );
}
