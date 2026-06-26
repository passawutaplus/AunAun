import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ClipboardList,
  CreditCard,
  LayoutGrid,
  LogIn,
  Map,
  MessageSquareWarning,
  Palette,
  Route as RouteIcon,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResearchChecklistSection } from "@/components/research/ResearchChecklistSection";
import { DEMO_WARNING_BULLETS } from "@/lib/copyConstants";
import { isDemoMode } from "@/lib/demoMode";
import { SITE_NAME, canonicalUrl } from "@/lib/siteUrl";
import {
  ADMIN_APPENDIX,
  DESIGN_CHECKLIST,
  FEATURE_SECTIONS,
  FEEDBACK_TEMPLATE,
  MODERATED_TASKS,
  NEW_USER_JOURNEY,
  OUT_OF_SCOPE,
  PAGE_MAP,
  RESEARCH_INTRO,
  RESEARCH_PERSONAS,
  STRIPE_SANDBOX_HINT,
} from "@/data/uxResearchGuide";

export const Route = createFileRoute("/research")({
  head: () => ({
    meta: [
      { title: `คู่มือ UX Research | ${SITE_NAME}` },
      {
        name: "description",
        content: `คู่มือทดสอบ ${SITE_NAME} สำหรับ UX researcher — เช็คลิสครบ A–T, journey ผู้ใช้ใหม่, moderated tasks`,
      },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:title", content: "คู่มือ UX Research — So1o" },
      {
        property: "og:description",
        content: "คู่มือทดลองใช้งานหลังบ้านฟรีแลนซ์ — เช็คลิส A–T สำหรับ UX review",
      },
      { property: "og:url", content: canonicalUrl("/research") },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/research") }],
  }),
  component: ResearchPage,
});

function parseDashboardSearch(path: string): { tab?: string; sub?: string } | null {
  const q = path.split("?")[1];
  if (!q) return null;
  const params = new URLSearchParams(q);
  const tab = params.get("tab");
  if (!tab) return null;
  const sub = params.get("sub");
  return sub ? { tab, sub } : { tab };
}

function PageMapLink({ path }: { path: string }) {
  if (path.startsWith("http")) {
    return (
      <a
        href={path}
        className="text-primary text-xs hover:underline shrink-0"
        target="_blank"
        rel="noopener noreferrer"
      >
        {path.replace(/^https?:\/\//, "")}
      </a>
    );
  }
  if (path.includes(":")) {
    return <code className="text-xs text-muted-foreground shrink-0">{path}</code>;
  }
  const dashSearch = parseDashboardSearch(path);
  if (dashSearch) {
    return (
      <Link
        to="/dashboard"
        search={dashSearch}
        className="text-primary text-xs hover:underline shrink-0"
      >
        {path}
      </Link>
    );
  }
  return (
    <Link to={path} className="text-primary text-xs hover:underline shrink-0">
      {path}
    </Link>
  );
}

function ResearchPage() {
  const demo = isDemoMode();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" /> กลับหน้าแรก
          </Link>
          <span className="text-xs font-medium text-primary uppercase tracking-wider">
            UX Research
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-10 pb-24">
        <section className="space-y-3">
          <p className="text-xs font-medium text-primary tracking-wide uppercase">Research brief</p>
          <h1 className="text-3xl font-semibold tracking-tight">{SITE_NAME} — คู่มือทดสอบ UX/UI</h1>
          <p className="text-muted-foreground leading-relaxed">
            หลังบ้านฟรีแลนซ์ครบวงจร — รับบรีฟ → ใบเสนอราคา → ติดตามงาน → เก็บเงิน → ภาษี
          </p>
          <p className="text-sm text-muted-foreground">
            Quick {RESEARCH_INTRO.quickMinutes} นาที · Full {RESEARCH_INTRO.fullHours} ชม. ·
            Viewports: {RESEARCH_INTRO.viewports.join(", ")}
          </p>
        </section>

        <section className="rounded-2xl border border-amber-500/30 bg-amber-500/8 p-4 space-y-2">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-amber-600" />
            ข้อมูลบันทึกจริง — อ่านก่อนเริ่ม
          </h2>
          <ul className="text-sm text-foreground/85 space-y-1.5 list-disc pl-5">
            {DEMO_WARNING_BULLETS.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
            <li>
              <strong>สมัครบัญชีของตัวเอง</strong> (Google หรืออีเมล) — ไม่ใช่บัญชี demo ร่วมแบบ
              Aplus1
            </li>
            <li>อย่าใส่ข้อมูลลูกค้าจริง — ใช้ชื่องานและอีเมลทดสอบ</li>
            {demo && (
              <li className="text-primary font-medium">โหมดทดสอบเปิดอยู่ — แถบด้านบนจะแสดงตลอด</li>
            )}
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <LogIn className="w-4 h-4 text-primary" />
            Persona & วิธีเตรียมบัญชี
          </h2>
          <p className="text-sm text-muted-foreground">
            แต่ละ researcher ใช้บัญชีแยก — แนะนำ Google Login เพื่อเข้าได้ทันที
          </p>
          <div className="grid gap-3">
            {RESEARCH_PERSONAS.map((persona) => (
              <div key={persona.id} className="rounded-xl border border-border p-4 space-y-1">
                <p className="font-medium text-sm">{persona.label}</p>
                <p className="text-xs text-primary">{persona.setup}</p>
                <p className="text-xs text-muted-foreground">{persona.note}</p>
              </div>
            ))}
          </div>
          <Button asChild className="rounded-full">
            <Link to="/auth" search={{ redirect: undefined }}>
              ไปหน้าเข้าสู่ระบบ
            </Link>
          </Button>
        </section>

        <section className="rounded-xl border border-border/60 p-4 space-y-2 text-sm">
          <h2 className="font-semibold flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            Stripe sandbox (Pro / checkout)
          </h2>
          <p className="text-muted-foreground">{STRIPE_SANDBOX_HINT}</p>
        </section>

        <section className="space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <RouteIcon className="w-4 h-4 text-primary" />
            Journey ผู้ใช้ใหม่
          </h2>
          <p className="text-sm text-muted-foreground">ตอบโจทย์: คนใหม่รู้ว่าต้องทำอะไรต่อไหม?</p>
          <ol className="space-y-3">
            {NEW_USER_JOURNEY.map((step) => (
              <li key={step.step} className="rounded-xl border border-border p-4 space-y-1">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  ขั้น {step.step}
                </p>
                <p className="font-medium text-sm">{step.title}</p>
                <p className="text-xs text-primary">{step.where}</p>
                <p className="text-xs text-muted-foreground">{step.criteria}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Moderated tasks (T1–T8)
          </h2>
          <div className="space-y-4">
            {MODERATED_TASKS.map((task) => (
              <article key={task.id} className="rounded-xl border border-border p-4 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    {task.id}
                  </p>
                  <span className="text-xs text-muted-foreground">· {task.persona}</span>
                </div>
                <h3 className="font-medium">{task.title}</h3>
                <ol className="text-sm text-muted-foreground list-decimal pl-5 space-y-1">
                  {task.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                <p className="text-xs text-foreground/70">
                  <span className="font-medium text-foreground">สำเร็จเมื่อ:</span> {task.success}
                </p>
                {task.interviewQuestions.length > 0 && (
                  <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-0.5">
                    {task.interviewQuestions.map((q) => (
                      <li key={q}>
                        <span className="font-medium text-foreground/80">ถาม:</span> {q}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Palette className="w-4 h-4 text-primary" />
            Design & UI foundation
          </h2>
          <ul className="space-y-2 text-sm">
            {DESIGN_CHECKLIST.map((item) => (
              <li
                key={item.id}
                className="flex items-start gap-2 rounded-lg border border-border/60 px-3 py-2"
              >
                <span
                  className="mt-0.5 inline-flex h-4 w-4 shrink-0 rounded border border-border bg-muted/50"
                  aria-hidden
                />
                <span className="text-foreground/85">{item.text}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-primary" />
            Feature checklist (A–T)
          </h2>
          <p className="text-sm text-muted-foreground">Tick เองขณะทดสอบ — ไม่บันทึกในระบบ</p>
          <ResearchChecklistSection sections={FEATURE_SECTIONS} />
        </section>

        <section className="space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Map className="w-4 h-4 text-primary" />
            แผนที่หน้า
          </h2>
          <div className="space-y-5">
            {PAGE_MAP.map((group) => (
              <div key={group.group}>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  {group.group}
                </p>
                <ul className="text-sm space-y-2">
                  {group.pages.map((p) => (
                    <li
                      key={`${group.group}-${p.path}`}
                      className="flex items-center justify-between gap-3 border-b border-border/50 pb-2"
                    >
                      <span>
                        {p.label}
                        {p.auth && (
                          <span className="ml-1.5 text-[10px] text-muted-foreground">(login)</span>
                        )}
                      </span>
                      <PageMapLink path={p.path} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border/60 bg-card/50 p-4 space-y-3 text-sm">
          <h2 className="font-semibold flex items-center gap-2">
            <MessageSquareWarning className="w-4 h-4 text-primary" />
            Feedback template
          </h2>
          <p className="text-muted-foreground text-xs">
            บันทึก: {FEEDBACK_TEMPLATE.fields.join(" · ")}
          </p>
          <ul className="text-muted-foreground space-y-1 list-disc pl-5">
            {FEEDBACK_TEMPLATE.prompts.map((prompt) => (
              <li key={prompt}>{prompt}</li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground pt-1">
            ส่ง feedback ผ่าน FeedbackFab ในแอป หรือ Support Hub ใน Dashboard
          </p>
        </section>

        <section className="rounded-xl border border-border/60 p-4 space-y-2 text-sm">
          <h2 className="font-semibold text-muted-foreground">Out of scope</h2>
          <ul className="text-muted-foreground space-y-1 list-disc pl-5">
            {OUT_OF_SCOPE.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-dashed border-border p-4 space-y-2 text-sm text-muted-foreground">
          <h2 className="font-semibold text-foreground">ภาคผนวก — Admin (staff only)</h2>
          <p className="text-xs">{ADMIN_APPENDIX.note}</p>
          <ul className="space-y-1 list-disc pl-5">
            {ADMIN_APPENDIX.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
