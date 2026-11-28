import { useId, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { HELP_CATEGORIES } from "@/data/helpContent";
import { SC_LINKS } from "../routes";
import { usePageSeo } from "../lib/usePageSeo";
import "../styles/help.css";

const TOPICS = ["All", "Account", "Posting", "Explore", "Collections", "Pricing"] as const;
type Topic = (typeof TOPICS)[number];

/** Questions and answers as written in the mock (pages/Help.dc.html). */
const FAQ: ReadonlyArray<{ topic: Exclude<Topic, "All">; q: string; a: string }> = [
  { topic: "Account", q: "สมัครและเข้าสู่ระบบ", a: "สมัครด้วย Google, LINE หรืออีเมล ระบบจะกำหนด ID ให้อัตโนมัติ เปลี่ยนเป็น handle ของตัวเองได้ที่ Settings → Account (เปลี่ยนได้ทุก 30 วัน)" },
  { topic: "Posting", q: "ลงผลงานชิ้นแรก", a: "กดปุ่ม + ที่หน้าแรก หรือ \"ลงงานใหม่\" ใน My Studio ใส่รูป ตั้งชื่อ เลือกหมวด (CATEGORY) แล้วกด Publish" },
  { topic: "Posting", q: "โชว์ ซ่อน หรือลบผลงาน", a: "เลือกโชว์หรือซ่อนทีละชิ้นได้ที่ My Profile (ไอคอนลูกโลก = คนอื่นเห็น · แม่กุญแจ = เห็นแค่คุณ) แก้ไขหรือลบผลงานได้ที่ My Studio › Works" },
  { topic: "Explore", q: "Showcase กับ Creators ต่างกันยังไง", a: "Showcase ให้เลื่อนดูผลงานจริงก่อน ส่วน Creators เน้นคนและโปรไฟล์" },
  { topic: "Collections", q: "บันทึกงานและคอลเลคชั่น", a: "กดปุ่มบันทึกบนผลงาน แล้วเลือกคอลเลคชั่น งานที่บันทึกไว้อยู่ที่ My Profile › Saved" },
  { topic: "Pricing", q: "ใช้งานฟรีหรือไม่", a: "ฟรีเลย ดูผลงาน ลงผลงาน แชท และตั้ง handle ได้หมดโดยไม่ต้องจ่าย" },
];

/**
 * The old site's help articles stay on their pages (/help/<topic>/<article>, old look) and are linked from here
 * (owner 2026-11-28, Beam 24). Hiring and job topics are hidden features, so they are not linked.
 */
const GUIDES = HELP_CATEGORIES.filter((c) => c.id !== "opportunity" && c.id !== "hirers").map((c) => ({ title: c.title, to: c.hubTo ?? `/help/${c.id}` }));

const topicOf = (raw: string | null): Topic => TOPICS.find((t) => t.toLowerCase() === raw) ?? "All";

/** Help Center (mock: pages/Help.dc.html). Topic and search text live in the URL: ?topic=posting&q=… */
export default function Help() {
  usePageSeo({ title: "Help Center", description: "คำถามที่พบบ่อยและวิธีใช้ SAMECOR ตั้งแต่ลงงาน จัดโปรไฟล์ ไปจนถึงอีเว้นท์", path: SC_LINKS.help });
  const [params, setParams] = useSearchParams();
  const topic = topicOf(params.get("topic"));
  // Typed text is local state so the field never waits for a router transition; the URL follows it.
  const [q, setQ] = useState(() => params.get("q") ?? "");
  const needle = q.trim().toLowerCase();
  // The mock opens the first question on arrival.
  const [open, setOpen] = useState(0);
  const uid = useId();

  const setParam = (key: "topic" | "q", value: string) => {
    // From the address bar, not the last render: two quick changes must not undo each other.
    const next = new URLSearchParams(window.location.search);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const list = FAQ.map((f, i) => ({ ...f, i })).filter(
    (f) => (topic === "All" || f.topic === topic) && (!needle || (f.q + f.a).toLowerCase().includes(needle)),
  );

  return (
    <main className="sc-main hp-main">
      <div className="hp-card">
        <h1 lang="en">Help Center</h1>
        <div className="hp-search">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8A8A87" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input type="text" aria-label="Search help" value={q} onChange={(e) => { setQ(e.target.value); setParam("q", e.target.value); }} placeholder="Search" />
        </div>
        <div role="group" aria-label="Topics" className="hp-topics">
          {TOPICS.map((t) => (
            <button key={t} type="button" aria-pressed={topic === t} onClick={() => setParam("topic", t === "All" ? "" : t.toLowerCase())}>
              {t}
            </button>
          ))}
        </div>
        <div>
          {list.map((f) => {
            const isOpen = open === f.i;
            const answerId = `${uid}-a${f.i}`;
            return (
              <div key={f.q} className="hp-item">
                <button type="button" aria-expanded={isOpen} aria-controls={isOpen ? answerId : undefined} onClick={() => setOpen(isOpen ? -1 : f.i)}>
                  {f.q}
                  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666666" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9.5l6 6 6-6" />
                  </svg>
                </button>
                {isOpen ? <p id={answerId}>{f.a}</p> : null}
              </div>
            );
          })}
          {list.length ? null : <p className="hp-none">No results.</p>}
        </div>
        <nav aria-label="คู่มือฉบับเต็ม" className="hp-guides">
          <span lang="en">Guides</span>
          <div>
            {GUIDES.map((g) => (
              <Link key={g.to} to={g.to}>
                {g.title}
              </Link>
            ))}
          </div>
        </nav>
        <div className="hp-more">
          <span lang="en">Still need help?</span>
          <div>
            <a href="mailto:support@samecor.com" className="hp-mail">support@samecor.com</a>
            <Link to={SC_LINKS.feedback} className="hp-fb">Feedback</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
