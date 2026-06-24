import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Clock,
  FileText,
  HelpCircle,
  LifeBuoy,
  Mail,
  MessageCircle,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { HelpFaqAccordion } from "@/components/help/HelpFaqAccordion";
import { HelpJourneyCards } from "@/components/help/HelpJourneyCards";
import { HelpSettingsTable } from "@/components/help/HelpSettingsTable";
import {
  HELP_CATEGORIES,
  HELP_CONTACT,
  HELP_FAQ,
  HELP_GLOSSARY,
  HELP_GUIDES,
  HELP_JOURNEYS,
  HELP_POLICY_LINKS,
  HELP_QUICK_TOPICS,
  HELP_SETTINGS_MAP,
  type HelpLink,
} from "@/data/helpCenter";
import { helpIndexHead } from "@/lib/helpSeo";

export const Route = createFileRoute("/help")({
  head: () => helpIndexHead(),
  component: HelpIndexPage,
});

function normalize(s: string) {
  return s.toLowerCase();
}

function matchesLink(link: HelpLink, q: string) {
  if (!q) return true;
  return normalize(`${link.label} ${link.description ?? ""}`).includes(q);
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
      {children}
    </h2>
  );
}

function TopicLink({ link }: { link: HelpLink }) {
  return (
    <Link
      to={link.to}
      hash={link.hash}
      className="group flex items-start gap-2 rounded-lg border border-transparent px-2 py-1.5 -mx-2 hover:border-border/60 hover:bg-muted/40 transition-colors"
    >
      <ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5 opacity-70 group-hover:opacity-100" />
      <span className="min-w-0">
        <span className="text-sm font-medium group-hover:text-primary transition-colors block">
          {link.label}
        </span>
        {link.description ? (
          <span className="text-xs text-muted-foreground block mt-0.5 leading-relaxed">
            {link.description}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

function HelpIndexPage() {
  const [query, setQuery] = useState("");
  const q = normalize(query.trim());

  const filteredQuick = useMemo(() => HELP_QUICK_TOPICS.filter((t) => matchesLink(t, q)), [q]);

  const filteredFaqs = useMemo(() => {
    if (!q) return HELP_FAQ;
    return HELP_FAQ.filter(
      (f) =>
        normalize(`${f.question} ${f.answer}`).includes(q) || normalize(f.category).includes(q),
    );
  }, [q]);

  const filteredGlossary = useMemo(() => {
    if (!q) return HELP_GLOSSARY;
    return HELP_GLOSSARY.filter((g) => normalize(`${g.term} ${g.definition}`).includes(q));
  }, [q]);

  const filteredCategories = useMemo(
    () =>
      HELP_CATEGORIES.map((cat) => ({
        ...cat,
        topics: cat.topics.filter((t) => matchesLink(t, q)),
      })).filter(
        (cat) => cat.topics.length > 0 || normalize(`${cat.title} ${cat.description}`).includes(q),
      ),
    [q],
  );

  const filteredGuides = useMemo(
    () =>
      HELP_GUIDES.filter(
        (g) => !q || normalize(`${g.title} ${g.description} ${g.tag}`).includes(q),
      ),
    [q],
  );

  const filteredJourneys = useMemo(() => {
    if (!q) return HELP_JOURNEYS;
    return HELP_JOURNEYS.filter(
      (j) =>
        normalize(`${j.title} ${j.description}`).includes(q) ||
        j.steps.some((s) => matchesLink(s, q)),
    );
  }, [q]);

  const showSettings =
    !q || HELP_SETTINGS_MAP.some((r) => normalize(`${r.task} ${r.settingsPath}`).includes(q));

  const hasResults =
    filteredQuick.length > 0 ||
    filteredFaqs.length > 0 ||
    filteredGlossary.length > 0 ||
    filteredCategories.length > 0 ||
    filteredGuides.length > 0 ||
    filteredJourneys.length > 0 ||
    showSettings;

  const guideCount = HELP_GUIDES.length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/60 bg-card/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="gap-1.5 shrink-0">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" /> หน้าแรก
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-semibold truncate">ศูนย์ช่วยเหลือ</h1>
            <p className="text-[11px] text-muted-foreground">
              {guideCount} คู่มือ · FAQ · เส้นทางแนะนำ
            </p>
          </div>
          <Button variant="outline" size="sm" asChild className="hidden sm:inline-flex shrink-0">
            <Link to="/dashboard">My Desk</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 w-full">
        {/* Hero */}
        <div
          className="border-b border-border/40"
          style={{
            background: "linear-gradient(135deg, hsl(var(--primary) / 0.08) 0%, transparent 60%)",
          }}
        >
          <div className="max-w-5xl mx-auto px-4 py-8 sm:py-10 space-y-5">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-primary/10 p-3 shrink-0 hidden sm:flex">
                <BookOpen className="h-7 w-7 text-primary" />
              </div>
              <div className="space-y-2 min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wider text-primary">
                  So1o Help Center
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  มีอะไรให้เราช่วยไหม?
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                  คู่มือภาษาไทยสำหรับฟรีแลนซ์ — ตั้งแต่สมัครครั้งแรก ส่งใบเสนอราคา รับเงิน ทำภาษี
                  ไปจนถึง white-label และ Pixel100 ทุกหัวข้อกดแล้วไปบทความที่เกี่ยวข้อง
                </p>
              </div>
            </div>

            <div className="relative max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหา เช่น QR, Track, Pro, 50ทวิ, Stripe…"
                className="pl-9 h-11 bg-background/80"
                aria-label="ค้นหาคู่มือ"
              />
            </div>

            <div className="flex flex-wrap gap-2 text-[11px]">
              {["QR", "ใบเสนอราคา", "Track", "ภาษี", "Pro", "LINE"].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setQuery(tag)}
                  className="rounded-full border border-border/60 bg-background/60 px-2.5 py-1 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
          {!hasResults ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              ไม่พบหัวข้อที่ตรงกับ «{query}» — ลองคำอื่น หรือ{" "}
              <a href={`mailto:${HELP_CONTACT.email}`} className="text-primary hover:underline">
                ติดต่อทีมงาน
              </a>
            </p>
          ) : (
            <>
              {filteredJourneys.length > 0 && (
                <section className="space-y-4">
                  <SectionHeading>เส้นทางแนะนำ — ทำตามลำดับ</SectionHeading>
                  <HelpJourneyCards journeys={filteredJourneys} />
                </section>
              )}

              {filteredQuick.length > 0 && (
                <section className="space-y-3">
                  <SectionHeading>ต้องการความช่วยเหลือเรื่องอะไร?</SectionHeading>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {filteredQuick.map((topic) => (
                      <Link
                        key={`${topic.to}-${topic.hash ?? ""}-${topic.label}`}
                        to={topic.to}
                        hash={topic.hash}
                        className="rounded-xl border border-border/60 bg-card/50 px-3 py-2.5 text-left hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm transition-all"
                      >
                        <span className="text-sm font-medium block">{topic.label}</span>
                        {topic.description ? (
                          <span className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 block">
                            {topic.description}
                          </span>
                        ) : null}
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {filteredFaqs.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <SectionHeading>
                      <HelpCircle className="h-3.5 w-3.5" /> คำถามที่พบบ่อย (FAQ)
                    </SectionHeading>
                    {!q && (
                      <span className="text-[10px] text-muted-foreground">
                        {HELP_FAQ.length} คำถาม
                      </span>
                    )}
                  </div>
                  <HelpFaqAccordion items={filteredFaqs} />
                </section>
              )}

              {showSettings && !q && (
                <section className="space-y-3">
                  <SectionHeading>ไป Settings ตรงไหน?</SectionHeading>
                  <p className="text-xs text-muted-foreground">สรุปทางลัดใน My Desk → Settings</p>
                  <HelpSettingsTable rows={HELP_SETTINGS_MAP} />
                </section>
              )}

              {filteredCategories.length > 0 && (
                <section className="space-y-4">
                  <SectionHeading>หมวดหมู่ทั้งหมด</SectionHeading>
                  <div className="grid md:grid-cols-2 gap-4">
                    {filteredCategories.map((cat) => {
                      const Icon = cat.icon;
                      return (
                        <Card key={cat.id} className="h-full">
                          <CardContent className="p-4 space-y-3 h-full flex flex-col">
                            <div className="flex items-start gap-3">
                              <div className="rounded-xl bg-primary/10 p-2 shrink-0">
                                <Icon className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <h3 className="text-sm font-semibold">{cat.title}</h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {cat.description}
                                </p>
                              </div>
                            </div>
                            <div className="space-y-0.5 pl-1 border-l-2 border-primary/20 ml-1 flex-1">
                              {cat.topics.map((topic) => (
                                <TopicLink
                                  key={`${topic.to}-${topic.hash ?? ""}-${topic.label}`}
                                  link={topic}
                                />
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </section>
              )}

              {filteredGlossary.length > 0 && (
                <section className="space-y-3">
                  <SectionHeading>คำศัพท์ที่ใช้ใน So1o</SectionHeading>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {filteredGlossary.map((item) => (
                      <div
                        key={item.term}
                        className="rounded-xl border border-border/60 bg-card/30 px-3 py-2.5"
                      >
                        <p className="text-sm font-semibold text-primary">{item.term}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                          {item.definition}
                        </p>
                        {item.link ? (
                          <Link
                            to={item.link.to}
                            hash={item.link.hash}
                            className="text-[11px] text-primary hover:underline mt-1 inline-block"
                          >
                            {item.link.label} →
                          </Link>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {filteredGuides.length > 0 && (
                <section className="space-y-3">
                  <SectionHeading>คู่มือฉบับเต็ม</SectionHeading>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {filteredGuides.map((g) => {
                      const Icon = g.icon;
                      return (
                        <Link
                          key={`${g.to}-${g.hash ?? ""}`}
                          to={g.to}
                          hash={g.hash}
                          className="block group h-full"
                        >
                          <Card className="h-full transition-all group-hover:border-primary/40 group-hover:shadow-sm">
                            <CardContent className="p-4 flex items-start gap-3 h-full">
                              <div className="rounded-xl bg-primary/10 p-2.5 shrink-0">
                                <Icon className="h-5 w-5 text-primary" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="text-sm font-semibold">{g.title}</h3>
                                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                    {g.tag}
                                  </span>
                                  {g.minutes ? (
                                    <span className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5">
                                      <Clock className="h-3 w-3" /> ~{g.minutes} นาที
                                    </span>
                                  ) : null}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                  {g.description}
                                </p>
                              </div>
                              <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </CardContent>
                          </Card>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              )}
            </>
          )}

          {/* Support */}
          <section className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-5 sm:p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-primary/10 p-2.5 shrink-0">
                <LifeBuoy className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-semibold">ยังไม่เจอคำตอบ?</h2>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  ใน Dashboard กด <strong>Support Hub</strong> มุมขวาล่าง — แจ้งปัญหา (TKT-xxxx)
                  แชททีม หรือดู FAQ ในแอป · {HELP_CONTACT.supportResponse}
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button asChild className="flex-1">
                <Link to="/dashboard">เปิด My Desk + Support Hub</Link>
              </Button>
              <Button asChild variant="outline" className="flex-1 gap-2">
                <a href={`mailto:${HELP_CONTACT.email}`}>
                  <Mail className="h-4 w-4" /> {HELP_CONTACT.email}
                </a>
              </Button>
              <Button asChild variant="outline" className="flex-1 gap-2">
                <a href={HELP_CONTACT.lineUrl} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4" /> LINE {HELP_CONTACT.lineHandle}
                </a>
              </Button>
            </div>
          </section>

          <section className="space-y-3 pt-2 border-t border-border/60">
            <SectionHeading>นโยบาย & ราคา</SectionHeading>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
              {HELP_POLICY_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
