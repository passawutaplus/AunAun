import { useEffect, useRef } from "react";
import { ArrowRight, Check } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import SeoHead from "@/components/SeoHead";
import WorkWallMarquee from "@/components/feed/WorkWallMarquee";
import { LearnAuthLink, LearnPrimaryCtas } from "@/components/learn/LearnCtas";
import { EnterView, HoverLift } from "@/components/learn/LearnMotion";
import { LearnProductFrame } from "@/components/learn/LearnProductFrame";
import { LearnLoopRail } from "@/components/learn/LearnProductMocks";
import {
  LearnAssembleProject,
  LearnChatBridge,
  LearnCtaStill,
  LearnFirstVisitPlay,
  LearnMagnetSave,
  LearnMarqueeStage,
  LearnPinPair,
  LearnPinnedWho,
  useHeroScroll,
} from "@/components/learn/LearnScenes";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  LEARN_CREATOR_CHECKLIST,
  LEARN_CREATOR_JOURNEY,
  LEARN_FAQ,
  LEARN_FEATURES,
  LEARN_FIRST_VISIT,
  LEARN_GLOSSARY,
  LEARN_HIRER_JOURNEY,
  LEARN_HIRER_TIPS,
  LEARN_ROLES,
  LEARN_STEPS,
  LEARN_TRUST_LINKS,
} from "@/data/learnContent";
import {
  BRAND_DESCRIPTION,
  BRAND_NAME,
  BRAND_SUPPORT_EMAIL,
  BRAND_TAGLINE,
} from "@/lib/brandConfig";
import { smoothEase, staggerDelay } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { isAplus1PxEnabled } from "@/lib/aplus1Launch";

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
    <EnterView>
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{eyebrow}</p>
      <h2 className="thai-display mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">{body}</p>
    </EnterView>
  );
}

export default function LearnHubPage() {
  const { hash } = useLocation();
  const heroRef = useRef<HTMLElement>(null);
  const { reduced, rotate, y, secondY } = useHeroScroll(heroRef);
  const reducePref = useReducedMotion();
  const pxOn = isAplus1PxEnabled();
  const glossary = pxOn ? LEARN_GLOSSARY : LEARN_GLOSSARY.filter((item) => item.term !== "สนับสนุน");
  const faq = pxOn ? LEARN_FAQ : LEARN_FAQ.filter((item) => item.id !== "px-money");

  useEffect(() => {
    if (hash) scrollToHash(hash);
  }, [hash]);

  return (
    <>
      <SeoHead path="/learn" title={`เรียนรู้ ${BRAND_NAME}`} description={BRAND_DESCRIPTION} />

      <section ref={heroRef} className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-brand-radial opacity-50" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 pb-10 pt-10 sm:px-6 sm:pb-14 sm:pt-14 lg:pt-16">
          <div className="mx-auto max-w-3xl text-center">
            <EnterView>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {BRAND_NAME}
              </p>
              <h1 className="thai-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-[3.5rem] lg:leading-[1.08]">
                <span className="block">ผลงานจริง</span>
                <motion.span
                  style={reduced ? undefined : { y: secondY }}
                  className="mt-1 block"
                >
                  พาไปเจอโอกาสใหม่
                </motion.span>
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground thai-body sm:text-lg">
                {BRAND_TAGLINE} — พื้นที่ให้ครีเอเตอร์ไทยโชว์งานจริง คนจ้างเห็นสไตล์ก่อน แล้วคุยต่อจากชิ้นที่ชอบ
              </p>
              <div className="mt-8">
                <LearnPrimaryCtas />
              </div>
              <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm">
                <a href="#who" className="text-primary hover:underline underline-offset-2">
                  เราคือใคร
                </a>
                <span className="text-border">·</span>
                <a href="#creators" className="text-primary hover:underline underline-offset-2">
                  ฝั่งลงผลงาน
                </a>
                <span className="text-border">·</span>
                <a href="#hirers" className="text-primary hover:underline underline-offset-2">
                  ฝั่งจ้างงาน
                </a>
              </div>
            </EnterView>
          </div>

          <EnterView delay={0.1} className="mt-10 sm:mt-12">
            <LearnMarqueeStage rotate={rotate} y={y} reduced={reduced}>
              <LearnProductFrame title={`${BRAND_NAME.toLowerCase()}.app · Explore`} className="mx-auto max-w-5xl">
                <div className="relative h-[13rem] overflow-hidden sm:h-[18rem] md:h-[22rem]">
                  <WorkWallMarquee />
                  <div
                    className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-24 bg-gradient-to-t from-background via-background/70 to-transparent"
                    aria-hidden
                  />
                  <motion.div
                    aria-hidden
                    animate={reducePref ? undefined : { y: [0, -8, 0] }}
                    transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute bottom-4 left-4 z-[3] hidden rounded-xl border border-white/10 bg-background/85 px-3 py-2 text-xs shadow-lg backdrop-blur sm:block"
                  >
                    ผลงานจริงจากชุมชน · เลื่อนดูแล้วคุยต่อได้เลย
                  </motion.div>
                </div>
              </LearnProductFrame>
            </LearnMarqueeStage>
          </EnterView>
        </div>
      </section>

      <section id="who" className="scroll-mt-28 border-t border-border/40">
        <div className="mx-auto max-w-6xl px-4 pt-14 sm:px-6 lg:pt-20">
          <SectionIntro
            eyebrow="เกี่ยวกับเรา"
            title="เราคือใคร"
            body="Aplus1 ให้ผลงานจริงพาไปเจอโอกาสใหม่ — งานจ้าง คอลแลป ฝึกงาน หรือการถูกค้นพบ ไม่เริ่มจากแพ็กเกจราคาหรือใบสมัครยาว"
          />
        </div>
        <div className="px-4 pb-14 sm:px-6 lg:pb-20">
          <LearnPinnedWho />
        </div>
      </section>

      <section id="start" className="scroll-mt-28 border-t border-border/40 bg-background/35">
        <div className="mx-auto max-w-6xl px-4 pt-14 sm:px-6 lg:pt-20">
          <SectionIntro
            eyebrow="เริ่มใช้"
            title="เปิดเว็บแล้วนั่งทำอะไรก่อน"
            body="ยังไม่ต้องสมัครก็สำรวจได้ — ล็อกอินเมื่อจะบันทึก ทัก หรือลงผลงาน"
          />
          <ul className="mt-10 grid gap-3 sm:grid-cols-2">
            {LEARN_ROLES.map((role, i) => (
              <EnterView key={role.id} delay={staggerDelay(i, { dense: true })}>
                <HoverLift>
                  <a
                    href={`#${role.id}`}
                    className="group flex h-full flex-col justify-between rounded-2xl border border-border/60 bg-card/40 p-5 transition-colors hover:border-primary/40 hover:bg-accent/30"
                  >
                    <span>
                      <span className="block text-base font-semibold text-foreground">{role.title}</span>
                      <span className="mt-2 block text-sm leading-relaxed text-muted-foreground">{role.body}</span>
                    </span>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                      {role.cta}
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </a>
                </HoverLift>
              </EnterView>
            ))}
          </ul>
        </div>
        <div className="px-4 pb-14 pt-10 sm:px-6 lg:pb-20">
          <LearnPinPair
            steps={LEARN_FIRST_VISIT}
            count={LEARN_FIRST_VISIT.length}
            film={(stage, reduced) => (
              <LearnFirstVisitPlay steps={LEARN_FIRST_VISIT} stage={stage} reduced={reduced} />
            )}
          />
        </div>
      </section>

      <section id="creators" className="scroll-mt-28 border-t border-border/40">
        <div className="mx-auto max-w-6xl px-4 pt-14 sm:px-6 lg:pt-20">
          <SectionIntro
            eyebrow="ลงผลงาน"
            title="ให้ผลงานพาไปเจอโอกาส"
            body="ไม่ต้องขายตัวเองจากศูนย์ทุกครั้ง — ลงงานจริงให้คนเห็นสไตล์ แล้วคุยต่อจากชิ้นนั้น"
          />
          <div className="mt-8">
            <LearnPrimaryCtas align="start" />
          </div>
        </div>
        <div className="px-4 pb-8 pt-10 sm:px-6">
          <LearnPinPair
            steps={LEARN_CREATOR_JOURNEY}
            count={LEARN_CREATOR_JOURNEY.length}
            film={(stage) => <LearnAssembleProject checklist={LEARN_CREATOR_CHECKLIST} stage={stage} />}
          />
        </div>
        <p className="mx-auto max-w-6xl px-4 pb-14 text-sm text-muted-foreground sm:px-6 lg:pb-20">
          รายละเอียดทีละคลิกอยู่ที่{" "}
          <Link to="/help/portfolio/first-project" className="text-primary hover:underline">
            Help · ลงผลงานชิ้นแรก
          </Link>
        </p>
      </section>

      <section id="hirers" className="scroll-mt-28 border-t border-border/40 bg-background/35">
        <div className="mx-auto max-w-6xl px-4 pt-14 sm:px-6 lg:pt-20">
          <SectionIntro
            eyebrow="จ้างงาน"
            title="เห็นของจริงก่อนคุย"
            body="เริ่มจากสไตล์และบริบทงาน — ไม่เริ่มจากเรซูเม่ยาวหรือแพ็กเกจราคา"
          />
          <div className="mt-8">
            <Button asChild className="rounded-full bg-gradient-brand px-6 text-white hover:opacity-90">
              <Link to="/">สำรวจผลงาน</Link>
            </Button>
          </div>
        </div>
        <div className="px-4 pb-8 pt-10 sm:px-6">
          <LearnPinPair
            steps={LEARN_HIRER_JOURNEY}
            count={LEARN_HIRER_JOURNEY.length}
            flip
            film={(stage) => <LearnMagnetSave stage={stage} />}
          />
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-14 sm:px-6 lg:pb-20">
          <ul className="space-y-2">
            {LEARN_HIRER_TIPS.map((tip) => (
              <EnterView key={tip}>
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  {tip}
                </li>
              </EnterView>
            ))}
          </ul>
          <p className="mt-6 text-sm text-muted-foreground">
            <Link to="/help/hirers/find-from-work" className="text-primary hover:underline">
              Help · หาครีเอเตอร์จากผลงาน
            </Link>
            <span className="text-border"> · </span>
            <Link to="/help/opportunity/hire-vs-collab" className="text-primary hover:underline">
              จ้างกับคอลแลปต่างกันยังไง
            </Link>
          </p>
        </div>
      </section>

      <section id="opportunity-loop" className="scroll-mt-28 border-t border-border/40">
        <div className="mx-auto max-w-6xl px-4 pt-14 sm:px-6 lg:pt-20">
          <SectionIntro
            eyebrow="ลูปโอกาส"
            title="ผลงานจริง → โอกาส"
            body={`หัวใจของ ${BRAND_NAME} — ไม่ใช่แค่โชว์งาน แต่ทำให้ความสนใจกลายเป็นบทสนทนาจากชิ้นงานนั้น`}
          />
          <div className="mt-10">
            <LearnLoopRail steps={LOOP} />
          </div>
        </div>
        <div className="px-4 pb-14 pt-10 sm:px-6 lg:pb-20">
          <LearnPinPair
            steps={LEARN_STEPS}
            count={LEARN_STEPS.length}
            film={(stage) => <LearnChatBridge stage={stage} />}
          />
        </div>
      </section>

      <section id="features" className="scroll-mt-28 border-t border-border/40 bg-background/35">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
          <SectionIntro
            eyebrow="จุดใช้งาน"
            title="ฟังก์ชันที่เกี่ยวกับลูป"
            body="แต่ละข้อลิงก์เข้าจุดใช้งานจริง — โฟกัสโอกาสจากผลงาน"
          />
          <ul className="mt-10 grid gap-3 sm:grid-cols-2">
            {LEARN_FEATURES.map((feature, i) => {
              const linkClass = cn(
                "group flex h-full flex-col justify-between rounded-2xl border border-border/60 bg-card/40 p-5 text-left transition-colors",
                "hover:border-primary/40 hover:bg-accent/30",
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
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.35 }}
                  transition={{ delay: staggerDelay(i % 4, { dense: true }), duration: 0.45, ease: smoothEase }}
                >
                  <HoverLift>
                    {"auth" in feature && feature.auth ? (
                      <LearnAuthLink to={feature.to} className={linkClass}>
                        {body}
                      </LearnAuthLink>
                    ) : (
                      <Link to={feature.to} className={linkClass}>
                        {body}
                      </Link>
                    )}
                  </HoverLift>
                </motion.li>
              );
            })}
          </ul>
        </div>
      </section>

      <section id="trust" className="scroll-mt-28 border-t border-border/40">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
          <SectionIntro
            eyebrow="น่าเชื่อถือ"
            title="เล่นในชุมชนอย่างปลอดภัย"
            body={
              pxOn
                ? "โอกาสเกิดจากผลงานและการคุยจริง — PX ไม่ใช่เงินฝาก และไม่การันตีรายได้"
                : "โอกาสเกิดจากผลงานและการคุยจริง — ไม่การันตีรายได้"
            }
          />
          <dl className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {glossary.map((item, i) => (
              <EnterView key={item.term} delay={staggerDelay(i, { dense: true })}>
                <div className="rounded-2xl border border-border/60 bg-card/30 px-5 py-4">
                  <dt className="text-sm font-semibold text-foreground">{item.term}</dt>
                  <dd className="mt-1 text-sm text-muted-foreground">{item.meaning}</dd>
                </div>
              </EnterView>
            ))}
          </dl>
          <Accordion type="single" collapsible className="mt-12">
            {faq.map((item) => (
              <AccordionItem key={item.id} value={item.id}>
                <AccordionTrigger className="text-left text-base">{item.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <ul className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {LEARN_TRUST_LINKS.map((item, i) => (
              <motion.li
                key={item.to}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ delay: staggerDelay(i, { dense: true }), duration: 0.4, ease: smoothEase }}
              >
                <HoverLift>
                  <Link
                    to={item.to}
                    className="block h-full rounded-2xl border border-border/60 bg-card/30 px-5 py-4 transition-colors hover:border-primary/35 hover:bg-accent/25"
                  >
                    <span className="block text-base font-semibold text-foreground">{item.label}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">{item.body}</span>
                  </Link>
                </HoverLift>
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
        <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-16">
          <LearnCtaStill>
            <EnterView>
              <h2 className="thai-display text-center text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                พร้อมให้ผลงานพาไปต่อ?
              </h2>
              <p className="mx-auto mt-3 max-w-md text-center text-white/80">
                เริ่มจาก Explore หรืออ่าน Help ถ้าอยากรู้ทีละขั้นตอน
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button asChild className="rounded-full bg-white px-6 text-foreground hover:bg-white/90">
                  <Link to="/">สำรวจผลงาน</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="rounded-full border-white/40 bg-transparent px-6 text-white hover:bg-white/10"
                >
                  <Link to="/help">Help Center</Link>
                </Button>
              </div>
            </EnterView>
          </LearnCtaStill>
        </div>
      </section>
    </>
  );
}
