/**
 * Weekly summary e-mail: who gets one and what it says. Data from public.weekly_digest_members() and
 * public.weekly_digest_board() (migration 20261129120000). No network or env reads except the shared
 * layout's site URL, so the web app's tests render it with fixtures.
 */
import { brand, escapeHtml, FONT, FONT_HEADING, layout } from "../_shared/anthem-email-html.ts";
import { interestWords, scoreOpenCalls, type WorkSignal } from "./for-you.ts";

export type TopWork = {
  id: string;
  title: string | null;
  cover_url: string | null;
  cover_width: number | null;
  cover_height: number | null;
  views: number;
  likes: number;
};

export type DigestMember = {
  user_id: string;
  email: string;
  display_name: string | null;
  username: string | null;
  sc_categories: string[] | null;
  views: number;
  followers: number;
  likes: number;
  top_work: TopWork | null;
  works: WorkSignal[];
};

export type BoardCall = {
  id: string;
  slug: string | null;
  title: string;
  description: string | null;
  insights: unknown;
  location_name: string | null;
  starts_on: string | null;
  ends_on: string | null;
  /** insights.deadline, else the last day */
  closes_on: string;
};

export type BoardEvent = {
  id: string;
  slug: string | null;
  title: string;
  category: string;
  location_name: string | null;
  starts_on: string;
  ends_on: string | null;
  is_featured: boolean | null;
};

export type Board = { open_calls: BoardCall[]; events: BoardEvent[] };

/** `start`–`end` = the week summed up (Mon–Sun, Bangkok); `sendDay` = the Monday after it. */
export type Week = { start: string; end: string; sendDay: string };

const DAY = 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const dayMs = (isoDay: string) => Date.parse(`${isoDay}T00:00:00Z`);

/** The last full Mon–Sun week in Bangkok time (UTC+7, no daylight saving) before `now`. */
export function lastWeek(now: Date): Week {
  const bkk = now.getTime() + 7 * 3_600_000;
  const today = dayMs(iso(bkk));
  const monday = today - ((new Date(today).getUTCDay() + 6) % 7) * DAY;
  return weekStarting(iso(monday - 7 * DAY)) as Week;
}

/** The week that starts on `start` (must be a Monday); null for anything else. */
export function weekStarting(start: string): Week | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return null;
  const ms = dayMs(start);
  if (Number.isNaN(ms) || new Date(ms).getUTCDay() !== 1) return null;
  return { start, end: iso(ms + 6 * DAY), sendDay: iso(ms + 7 * DAY) };
}

const MONTHS = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];
const WEEKDAYS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

const dayOf = (isoDay: string) => new Date(dayMs(isoDay));
export const thaiDay = (isoDay: string) => {
  const d = dayOf(isoDay);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
};

/** "23–29 พ.ย." or "30 พ.ย. – 6 ธ.ค." */
export function rangeLabel(week: Week): string {
  const a = dayOf(week.start);
  const b = dayOf(week.end);
  return a.getUTCMonth() === b.getUTCMonth()
    ? `${a.getUTCDate()}–${b.getUTCDate()} ${MONTHS[b.getUTCMonth()]}`
    : `${thaiDay(week.start)} – ${thaiDay(week.end)}`;
}

const daysBetween = (from: string, to: string) => Math.round((dayMs(to) - dayMs(from)) / DAY);

const EVENT_TYPE: Record<string, string> = {
  exhibition: "Exhibition",
  workshop: "Workshop",
  talk_forum: "Talk",
  art_fair: "Art Fair",
  meetup: "Meetup",
};

export const MAX_CALLS = 3;
export const MAX_EVENTS = 4;

export type DigestPlan =
  | { send: false; reason: "nothing_to_report" }
  | {
      send: true;
      hasStats: boolean;
      calls: Array<{ call: BoardCall; score: number }>;
      events: BoardEvent[];
      eventsTotal: number;
    };

/**
 * Something to report = views, new followers or likes last week, or an open call that fits the person's kind
 * of work (FOR YOU score > 0). Events of the week alone never trigger an e-mail (same list for everyone).
 */
export function planDigest(m: DigestMember, board: Board): DigestPlan {
  const hasStats = m.views + m.followers + m.likes > 0;
  // Ties go to the open call closing first (its closing day, not its last day).
  const scored = scoreOpenCalls(
    board.open_calls.map((c) => ({ ...c, ends_on: c.closes_on })),
    interestWords(m.works, m.sc_categories),
  );
  if (!hasStats && !scored.some((s) => s.score > 0))
    return { send: false, reason: "nothing_to_report" };
  return {
    send: true,
    hasStats,
    calls: scored.slice(0, MAX_CALLS),
    events: board.events.slice(0, MAX_EVENTS),
    eventsTotal: board.events.length,
  };
}

const SUPABASE_PUBLIC =
  /^https:\/\/zkflkpbmbozrchqncpzi\.supabase\.co\/storage\/v1\/object\/public\/.+\.(jpe?g|png|webp|avif)$/i;

/** Work pictures go through the site's image resizer (Supabase egress), like the web app does. */
export function emailImageUrl(src: string, site: string): string {
  return SUPABASE_PUBLIC.test(src)
    ? `${site}/_vercel/image?url=${encodeURIComponent(src)}&w=1080&q=75`
    : src;
}

const num = (n: number) => n.toLocaleString("en-US");

function sectionLabel(text: string): string {
  return `<p style="margin:0 0 12px;font-family:${FONT_HEADING};font-size:13px;line-height:1.4;font-weight:600;color:${brand.ink}"><span style="display:inline-block;width:6px;height:6px;border-radius:3px;background-color:${brand.red};vertical-align:middle;margin-right:8px"></span>${escapeHtml(text)}</p>`;
}

function statsBlock(m: DigestMember): string {
  const cell = (value: number, label: string, last = false) =>
    `<td width="33%" align="left" valign="top" style="padding:16px 0 16px 20px;${last ? "" : `border-right:1px solid ${brand.border};`}font-family:${FONT}">
<p style="margin:0 0 2px;font-family:${FONT_HEADING};font-size:26px;line-height:1.2;font-weight:600;color:${brand.ink}">${num(value)}</p>
<p style="margin:0;font-size:12px;line-height:1.5;color:${brand.mute}">${label}</p></td>`;
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 28px"><tr><td bgcolor="${brand.surface}" style="background-color:${brand.surface};border-radius:12px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>${cell(m.views, "Views")}${cell(m.followers, "New followers")}${cell(m.likes, "Likes", true)}</tr></table>
</td></tr></table>`;
}

/** Fits the e-mail column without cropping: full width, or narrower when the picture is tall. */
function coverSize(w: number | null, h: number | null): { width: number; height: number | null } {
  const maxW = 478;
  const maxH = 560;
  if (!w || !h || w <= 0 || h <= 0) return { width: maxW, height: null };
  const ratio = h / w;
  if (maxW * ratio <= maxH) return { width: maxW, height: Math.round(maxW * ratio) };
  return { width: Math.round(maxH / ratio), height: maxH };
}

function topWorkBlock(t: TopWork, site: string): string {
  const href = escapeHtml(`${site}/showcase/${t.id}`);
  const title = escapeHtml(t.title?.trim() || "ผลงานของคุณ");
  const size = coverSize(t.cover_width, t.cover_height);
  const img = t.cover_url
    ? `<a href="${href}" target="_blank" style="text-decoration:none"><img src="${escapeHtml(emailImageUrl(t.cover_url, site))}" alt="${title}" width="${size.width}"${size.height ? ` height="${size.height}"` : ""} style="display:block;width:100%;max-width:${size.width}px;height:auto;border:0;border-radius:8px;margin:0 0 12px"/></a>`
    : "";
  return `${sectionLabel("Top work")}${img}
<p style="margin:0 0 2px;font-size:15px;line-height:1.5;font-weight:600"><a href="${href}" target="_blank" style="color:${brand.ink};text-decoration:none">${title}</a></p>
<p style="margin:0 0 28px;font-size:13px;line-height:1.5;color:${brand.mute}">Views ${num(t.views)} · Likes ${num(t.likes)}</p>`;
}

function listRow(href: string, title: string, meta: string, last: boolean): string {
  return `<tr><td style="padding:12px 0;${last ? "" : `border-bottom:1px solid ${brand.border};`}font-family:${FONT}">
<p style="margin:0 0 2px;font-size:15px;line-height:1.5"><a href="${escapeHtml(href)}" target="_blank" style="color:${brand.ink};text-decoration:none">${escapeHtml(title)}</a></p>
<p style="margin:0;font-size:13px;line-height:1.5;color:${brand.mute}">${escapeHtml(meta)}</p></td></tr>`;
}

const listTable = (rows: string, after = "") =>
  `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 ${after ? 8 : 28}px">${rows}</table>${after}`;

function callMeta(c: BoardCall, sendDay: string): string {
  const left = daysBetween(sendDay, c.closes_on);
  return `ปิดรับ ${thaiDay(c.closes_on)} · ${left <= 0 ? "ปิดรับวันนี้" : `เหลือ ${left} วัน`}`;
}

function eventMeta(e: BoardEvent): string {
  const d = dayOf(e.starts_on);
  return [
    `${WEEKDAYS[d.getUTCDay()]} ${thaiDay(e.starts_on)}`,
    EVENT_TYPE[e.category] ?? null,
    e.location_name?.trim() || null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export type RenderedDigest = { subject: string; preview: string; html: string; text: string };

export function renderDigest(
  m: DigestMember,
  plan: Extract<DigestPlan, { send: true }>,
  week: Week,
  links: { site: string; unsubscribeUrl: string },
): RenderedDigest {
  const site = links.site;
  const name = m.display_name?.trim() || m.username?.trim() || "ครีเอเตอร์";
  const range = rangeLabel(week);
  const lead = plan.hasStats
    ? `สวัสดี ${escapeHtml(name)} — สรุปผลงานของคุณบน SAMECOR ช่วง ${range}`
    : `สวัสดี ${escapeHtml(name)} — มี Open call ที่ตรงกับงานของคุณ ปิดรับภายใน 14 วันนี้`;

  const parts = [
    `<p style="font-size:15px;color:${brand.body};line-height:1.6;margin:0 0 20px">${lead}</p>`,
  ];
  if (plan.hasStats) parts.push(statsBlock(m));
  if (m.top_work) parts.push(topWorkBlock(m.top_work, site));
  if (plan.calls.length) {
    parts.push(sectionLabel("Open call for you"));
    parts.push(
      listTable(
        plan.calls
          .map((s, i) =>
            listRow(
              `${site}/exhibition/${s.call.id}`,
              s.call.title,
              callMeta(s.call, week.sendDay),
              i === plan.calls.length - 1,
            ),
          )
          .join(""),
      ),
    );
  }
  if (plan.events.length) {
    const more = plan.eventsTotal - plan.events.length;
    parts.push(sectionLabel("This week"));
    parts.push(
      listTable(
        plan.events
          .map((e, i) =>
            listRow(
              `${site}/exhibition/${e.id}`,
              e.title,
              eventMeta(e),
              i === plan.events.length - 1,
            ),
          )
          .join(""),
        more > 0
          ? `<p style="margin:0 0 28px;font-size:13px;line-height:1.5"><a href="${escapeHtml(`${site}/?tab=event`)}" target="_blank" style="color:${brand.ink};text-decoration:underline">ดู Event สัปดาห์นี้ทั้งหมด ${plan.eventsTotal} งาน</a></p>`
          : "",
      ),
    );
  }

  const preview = plan.hasStats
    ? `Views ${num(m.views)} · New followers ${num(m.followers)} · Likes ${num(m.likes)}`
    : `Open call ที่ตรงกับงานของคุณ ${plan.calls.filter((c) => c.score > 0).length} รายการ`;
  const { html, text: footerText } = layout({
    preview,
    badge: `Weekly · ${range}`,
    badgeTone: "brand",
    icon: "star",
    title: "สรุปประจำสัปดาห์",
    bodyHtml: parts.join("\n"),
    ctaLabel: plan.hasStats ? "ดู Insights" : "ดู Open call",
    ctaUrl: plan.hasStats ? `${site}/dashboard?tab=insights` : `${site}/?tab=event`,
    reason: "คุณได้รับอีเมลนี้เพราะเปิดรับอีเมลสรุปรายสัปดาห์ไว้ (ส่งทุกวันจันทร์)",
    settingsUrl: `${site}/settings?tab=Notifications`,
    unsubscribeUrl: links.unsubscribeUrl,
  });

  const lines: string[] = [];
  if (plan.hasStats)
    lines.push(`Views ${num(m.views)} · New followers ${num(m.followers)} · Likes ${num(m.likes)}`);
  if (m.top_work)
    lines.push(
      "",
      `Top work: ${m.top_work.title?.trim() || "ผลงานของคุณ"} (Views ${num(m.top_work.views)} · Likes ${num(m.top_work.likes)})`,
      `${site}/showcase/${m.top_work.id}`,
    );
  if (plan.calls.length) {
    lines.push("", "Open call for you");
    for (const s of plan.calls)
      lines.push(
        `- ${s.call.title} — ${callMeta(s.call, week.sendDay)}`,
        `  ${site}/exhibition/${s.call.id}`,
      );
  }
  if (plan.events.length) {
    lines.push("", "This week");
    for (const e of plan.events)
      lines.push(`- ${e.title} — ${eventMeta(e)}`, `  ${site}/exhibition/${e.id}`);
  }
  // The layout's text starts with the title and preview paragraphs; keep its button link and footer only.
  const tail = footerText.split("\n\n").slice(2).join("\n\n");
  const text = `สรุปประจำสัปดาห์ ${range}\n\nสวัสดี ${name}\n\n${lines.join("\n").trim()}\n\n${tail}`;

  return { subject: `[SAMECOR] สรุปประจำสัปดาห์ ${range}`, preview, html, text };
}
