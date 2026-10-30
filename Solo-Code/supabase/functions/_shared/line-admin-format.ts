// Pure formatting for the LINE admin-group alerts (no Deno / network imports, so it is unit-testable).
// Text messages on purpose: plain, reliable, readable in the LINE notification preview.

export const ADMIN_SITE = "https://samecor.com";

/** Accounts we never alert on (automated tests, the shared tester login, our own mailbox). */
export function isIgnoredEmail(email: string | null | undefined, extraIgnore: string[] = []): boolean {
  const e = (email ?? "").trim().toLowerCase();
  if (!e) return false;
  if (/@example\.(com|test)$/.test(e)) return true;
  if (e === "tester@samecor.com") return true;
  return extraIgnore.map((x) => x.trim().toLowerCase()).filter(Boolean).includes(e);
}

export type MemberInfo = {
  id: string;
  email: string | null;
  provider: string | null;
  joined_at: string;
  username: string | null;
  display_name: string | null;
  works: number;
};

export type FeedbackInfo = {
  ticket_number: string | null;
  kind: string | null;
  rating: number | null;
  message: string | null;
  route: string | null;
  created_at: string;
  username: string | null;
  from_app: boolean;
};

export type ReportInfo = {
  target_type: string | null;
  target_id: string | null;
  reason: string | null;
  details: string | null;
  created_at: string;
  reporter: string | null;
  target_owner: string | null;
};

export type DigestInfo = {
  total_members: number;
  new_members: number;
  new_works: number;
  new_works_list: { title: string; owner: string | null }[];
  feedback_24h: number;
  feedback_open: number;
  reports_open: number;
  sessions_24h: number;
  android_sessions_24h: number;
  sessions_prev?: number;
  views_24h?: number;
  views_prev?: number;
  devices?: Record<string, number>;
  top_works?: { title: string; owner: string | null; views: number }[];
  sources?: { label: string; n: number }[];
};

const KIND_LABEL: Record<string, string> = {
  bug: "แจ้งบั๊ก",
  idea: "ไอเดีย",
  praise: "ชม",
  question: "คำถาม",
  complaint: "ติติง",
  other: "อื่นๆ",
};

const REASON_LABEL: Record<string, string> = {
  spam: "สแปม",
  harassment: "คุกคาม/ก่อกวน",
  nsfw: "เนื้อหาไม่เหมาะสม (NSFW)",
  copyright: "ละเมิดลิขสิทธิ์",
  scam: "หลอกลวง",
  impersonation: "ปลอมตัว",
  other: "อื่นๆ",
  job_spam: "สแปมประกาศงาน",
};

const TARGET_LABEL: Record<string, string> = {
  user: "ผู้ใช้",
  project: "ผลงาน",
  comment: "คอมเมนต์",
  studio: "สตูดิโอ",
  message: "ข้อความแชต",
  job: "ประกาศงาน",
  community_post: "โพสต์ชุมชน",
  community_comment: "คอมเมนต์ชุมชน",
  forum_topic: "กระทู้",
  forum_reply: "ตอบกระทู้",
  work_review: "รีวิวผลงาน",
};

/** Single line, trimmed, with an ellipsis; strips control characters and collapses whitespace. */
export function clip(text: string | null | undefined, max: number): string {
  // eslint-disable-next-line no-control-regex
  const flat = (text ?? "").replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

/** Bangkok wall-clock, "30 ต.ค. 14:28". */
export function bkkTime(iso: string): string {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("day")} ${get("month")} ${get("hour")}:${get("minute")}`;
}

export function formatMember(m: MemberInfo): string {
  const name = m.display_name || m.username || "(ไม่มีชื่อ)";
  const handle = m.username ? ` (@${m.username})` : "";
  const via = m.provider === "google" ? "Google" : "อีเมล";
  const lines = [
    "🆕 สมาชิกใหม่",
    `${name}${handle}`,
    `อีเมล: ${m.email ?? "-"}`,
    `สมัครด้วย: ${via} · ${bkkTime(m.joined_at)}`,
  ];
  if (m.works > 0) lines.push(`ลงผลงานแล้ว ${m.works} ชิ้น`);
  if (m.username) lines.push(`${ADMIN_SITE}/${m.username}`);
  return lines.join("\n");
}

/** A burst of sign-ups becomes one message so a spike cannot flood the group or the LINE quota. */
export function formatMembersBurst(members: MemberInfo[]): string {
  const lines = [`🆕 สมาชิกใหม่ ${members.length} คน`];
  for (const m of members.slice(0, 10)) {
    lines.push(`• ${m.display_name || m.username || "(ไม่มีชื่อ)"} — ${m.email ?? "-"} (${m.provider === "google" ? "Google" : "อีเมล"})`);
  }
  if (members.length > 10) lines.push(`…และอีก ${members.length - 10} คน`);
  return lines.join("\n");
}

export function formatFeedback(f: FeedbackInfo): string {
  const kind = KIND_LABEL[f.kind ?? ""] ?? f.kind ?? "ฟีดแบ็ก";
  const stars = f.rating ? ` ${"★".repeat(Math.max(0, Math.min(5, f.rating)))}` : "";
  const lines = [
    `💬 ฟีดแบ็กใหม่ ${f.ticket_number ?? ""}`.trim(),
    `${kind}${stars}${f.from_app ? " · จากแอป" : ""}`,
  ];
  const msg = clip(f.message, 120);
  if (msg) lines.push(`"${msg}"`);
  const meta = [f.username ? `โดย @${f.username}` : "", f.route ? `หน้า ${f.route}` : "", bkkTime(f.created_at)]
    .filter(Boolean)
    .join(" · ");
  lines.push(meta);
  lines.push(`${ADMIN_SITE}/admin/feedback`);
  return lines.join("\n");
}

export function formatReport(r: ReportInfo): string {
  const target = TARGET_LABEL[r.target_type ?? ""] ?? r.target_type ?? "เนื้อหา";
  const reason = REASON_LABEL[r.reason ?? ""] ?? r.reason ?? "-";
  const lines = [`🚩 มีรายงานใหม่ — ${reason}`, `เป้าหมาย: ${target}${r.target_owner ? ` ของ @${r.target_owner}` : ""}`];
  const details = clip(r.details, 120);
  if (details) lines.push(`"${details}"`);
  lines.push([r.reporter ? `รายงานโดย @${r.reporter}` : "", bkkTime(r.created_at)].filter(Boolean).join(" · "));
  lines.push(`${ADMIN_SITE}/admin/reports`);
  return lines.join("\n");
}

export function formatDigest(d: DigestInfo, now: Date = new Date()): string {
  const date = new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "long" }).format(now);
  const lines = [
    `📊 สรุปประจำวัน ${date}`,
    `ผู้เข้าชม: ${d.sessions_24h} เซสชัน${d.views_24h !== undefined ? ` · ดู ${d.views_24h} หน้า` : ""}`,
    `สมาชิกใหม่: ${d.new_members} (รวม ${d.total_members})`,
    `ผลงานใหม่: ${d.new_works}`,
  ];
  for (const w of d.new_works_list.slice(0, 6)) {
    lines.push(`  • ${clip(w.title, 40)}${w.owner ? ` — @${w.owner}` : ""}`);
  }
  if (d.new_works > 6) lines.push(`  …และอีก ${d.new_works - 6} ชิ้น`);
  lines.push(`ฟีดแบ็กใหม่: ${d.feedback_24h} · ค้างตอบ ${d.feedback_open}`);
  lines.push(`รายงานค้าง: ${d.reports_open}`);
  lines.push(`เซสชัน 24 ชม.: ${d.sessions_24h} (จากแอป Android ${d.android_sessions_24h})`);
  lines.push(`${ADMIN_SITE}/admin`);
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Flex Message versions (what the group actually receives): flat black icons, one block per category.
// The plain-text formatters above stay as the notification preview (altText) and as a fallback.
// ---------------------------------------------------------------------------

export type LineMessage =
  | { type: "text"; text: string }
  | { type: "flex"; altText: string; contents: Record<string, unknown> };

const ICON_BASE = `${ADMIN_SITE}/line-icons`;
const INK = "#111111";
const MUTED = "#8A8A8A";
const RULE = "#E6E4DE";

type Box = Record<string, unknown>;

const text = (t: string, o: Box = {}): Box => ({ type: "text", text: t, color: INK, wrap: true, ...o });
const icon = (name: string): Box => ({ type: "icon", url: `${ICON_BASE}/${name}.png`, size: "md" });
const rule = (): Box => ({ type: "separator", margin: "lg", color: RULE });

/** One category block: icon + small label on top, the value big underneath, optional detail lines. */
function section(iconName: string, label: string, value: string, details: string[] = []): Box {
  const contents: Box[] = [
    {
      type: "box",
      layout: "baseline",
      spacing: "sm",
      contents: [icon(iconName), text(label, { size: "sm", color: MUTED, flex: 0 })],
    },
    text(value, { size: "xl", weight: "bold", margin: "xs" }),
  ];
  for (const d of details) contents.push(text(d, { size: "sm", color: "#444444", margin: "xs" }));
  return { type: "box", layout: "vertical", margin: "lg", contents };
}

function bubble(title: string, subtitle: string | null, blocks: Box[], link: { label: string; uri: string }): Box {
  const head: Box[] = [text(title, { size: "lg", weight: "bold" })];
  if (subtitle) head.push(text(subtitle, { size: "xs", color: MUTED, margin: "xs" }));
  return {
    type: "bubble",
    size: "kilo",
    body: {
      type: "box",
      layout: "vertical",
      paddingAll: "20px",
      contents: [...head, rule(), ...blocks],
    },
    footer: {
      type: "box",
      layout: "vertical",
      paddingAll: "12px",
      contents: [{ type: "button", style: "link", height: "sm", color: INK, action: { type: "uri", label: link.label, uri: link.uri } }],
    },
  };
}

const flex = (altText: string, contents: Box): LineMessage => ({ type: "flex", altText: clip(altText, 400), contents });

const BRAND = "#EE3D29";
const CREAM = "#F8F7F2";
const UP = "#1A7F4B";

const DEVICE_LABEL: [string, string][] = [
  ["mobile", "มือถือ (เว็บ)"],
  ["desktop", "คอมพิวเตอร์"],
  ["tablet", "แท็บเล็ต"],
  ["android", "แอป Android"],
  ["unknown", "ไม่ระบุ"],
];

/** "▲ 12%" / "▼ 8%" against the previous 24 h; null when there is nothing to compare with. */
export function deltaText(now: number, prev: number | undefined): { text: string; color: string } | null {
  if (prev === undefined || prev <= 0) return null;
  const pct = Math.round(((now - prev) / prev) * 100);
  if (pct === 0) return { text: "เท่าเมื่อวาน", color: MUTED };
  return pct > 0 ? { text: `▲ ${pct}%`, color: UP } : { text: `▼ ${Math.abs(pct)}%`, color: BRAND };
}

const tile = (label: string, value: string, delta: { text: string; color: string } | null, hint?: string): Box => ({
  type: "box",
  layout: "vertical",
  flex: 1,
  paddingAll: "12px",
  cornerRadius: "10px",
  backgroundColor: "#FFFFFF",
  contents: [
    text(label, { size: "xs", color: MUTED }),
    text(value, { size: "xxl", weight: "bold", margin: "xs" }),
    delta ? text(delta.text, { size: "xs", color: delta.color, weight: "bold" }) : text(hint ?? " ", { size: "xs", color: MUTED }),
  ],
});

/** Horizontal share bar: label + value on one line, a thin track with a brand-red fill under it. */
function bar(label: string, n: number, total: number): Box {
  const pct = total > 0 ? Math.max(3, Math.round((n / total) * 100)) : 0;
  return {
    type: "box",
    layout: "vertical",
    margin: "md",
    contents: [
      {
        type: "box",
        layout: "horizontal",
        contents: [
          text(label, { size: "sm", flex: 5 }),
          text(`${n} · ${total > 0 ? Math.round((n / total) * 100) : 0}%`, { size: "sm", color: MUTED, align: "end", flex: 3 }),
        ],
      },
      {
        type: "box",
        layout: "vertical",
        margin: "xs",
        height: "6px",
        cornerRadius: "3px",
        backgroundColor: RULE,
        contents: [{ type: "box", layout: "vertical", width: `${pct}%`, height: "6px", cornerRadius: "3px", backgroundColor: BRAND, contents: [{ type: "filler" }] }],
      },
    ],
  };
}

/** A white card on the cream body: icon + label header, then free content. */
function card(iconName: string, label: string, contents: Box[]): Box {
  return {
    type: "box",
    layout: "vertical",
    margin: "md",
    paddingAll: "14px",
    cornerRadius: "12px",
    backgroundColor: "#FFFFFF",
    contents: [
      { type: "box", layout: "baseline", spacing: "sm", contents: [icon(iconName), text(label, { size: "sm", weight: "bold", flex: 0 })] },
      ...contents,
    ],
  };
}

const kv = (label: string, value: string): Box => ({
  type: "box",
  layout: "horizontal",
  margin: "sm",
  contents: [text(label, { size: "sm", color: "#444444", flex: 5 }), text(value, { size: "sm", weight: "bold", align: "end", flex: 3 })],
});

export function flexDigest(d: DigestInfo, now: Date = new Date()): LineMessage {
  const date = new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "long", year: "numeric" }).format(now);
  const views = d.views_24h ?? 0;
  const devices = d.devices ?? {};
  const devTotal = Object.values(devices).reduce((a, b) => a + b, 0);
  const devRows = DEVICE_LABEL.filter(([k]) => (devices[k] ?? 0) > 0).map(([k, label]) => bar(label, devices[k], devTotal));
  const topWorks = (d.top_works ?? []).map((w, i) => kv(`${i + 1}. ${clip(w.title, 22)}${w.owner ? ` @${w.owner}` : ""}`, `${w.views} ครั้ง`));
  const sources = d.sources ?? [];
  const srcTotal = sources.reduce((a, b) => a + b.n, 0);
  const conv = d.sessions_24h > 0 ? Math.round((d.new_members / d.sessions_24h) * 100) : 0;
  const works = d.new_works_list.slice(0, 4).map((w) => kv(`• ${clip(w.title, 24)}`, w.owner ? `@${w.owner}` : ""));
  if (d.new_works > 4) works.push(text(`…และอีก ${d.new_works - 4} ชิ้น`, { size: "xs", color: MUTED, margin: "sm" }));

  const blocks: Box[] = [
    {
      type: "box",
      layout: "horizontal",
      spacing: "md",
      contents: [
        tile("ผู้เข้าชม (เซสชัน)", `${d.sessions_24h}`, deltaText(d.sessions_24h, d.sessions_prev)),
        tile("ยอดดูหน้า", `${views}`, deltaText(views, d.views_prev)),
      ],
    },
    card("users", "ผู้เข้าชมแยกตามอุปกรณ์", devRows.length > 0 ? devRows : [text("ยังไม่มีข้อมูล", { size: "sm", color: MUTED, margin: "sm" })]),
  ];
  if (sources.length > 0) blocks.push(card("chart", "คนเข้ามาจากไหน", sources.map((s) => bar(s.label, s.n, srcTotal))));
  if (topWorks.length > 0) blocks.push(card("image", "ผลงานที่คนดูมากสุด", topWorks));
  blocks.push(
    card("user-plus", "สมาชิกและผลงาน", [
      kv("สมาชิกใหม่", `${d.new_members} คน`),
      kv("สมาชิกทั้งหมด", `${d.total_members} คน`),
      kv("สมัครต่อผู้เข้าชม", `${conv}%`),
      kv("ผลงานใหม่", `${d.new_works} ชิ้น`),
      ...works,
    ]),
    card("message", "ฟีดแบ็กและรายงาน", [
      kv("ฟีดแบ็กใหม่", `${d.feedback_24h}`),
      kv("ฟีดแบ็กค้างตอบ", `${d.feedback_open}`),
      kv("รายงานที่ค้างอยู่", `${d.reports_open}`),
    ]),
  );

  return flex(formatDigest(d, now), {
    type: "bubble",
    size: "mega",
    header: {
      type: "box",
      layout: "vertical",
      paddingAll: "18px",
      backgroundColor: INK,
      contents: [
        text("SAMECOR", { size: "xs", color: BRAND, weight: "bold" }),
        text("สรุปประจำวัน", { size: "xl", weight: "bold", color: "#FFFFFF", margin: "xs" }),
        text(`${date} · 24 ชม.ที่ผ่านมา`, { size: "xs", color: "#BDBDBD", margin: "xs" }),
      ],
    },
    body: { type: "box", layout: "vertical", paddingAll: "14px", backgroundColor: CREAM, contents: blocks },
    footer: {
      type: "box",
      layout: "vertical",
      paddingAll: "12px",
      backgroundColor: CREAM,
      contents: [{ type: "button", style: "primary", height: "sm", color: INK, action: { type: "uri", label: "เปิดหน้าแอดมิน", uri: `${ADMIN_SITE}/admin` } }],
    },
  });
}

export function flexMember(m: MemberInfo): LineMessage {
  const name = m.display_name || m.username || "(ไม่มีชื่อ)";
  const via = m.provider === "google" ? "Google" : "อีเมล";
  const details = [`อีเมล: ${m.email ?? "-"}`, `สมัครด้วย ${via} · ${bkkTime(m.joined_at)}`];
  if (m.works > 0) details.push(`ลงผลงานแล้ว ${m.works} ชิ้น`);
  return flex(
    formatMember(m),
    bubble("สมาชิกใหม่", null, [section("user-plus", m.username ? `@${m.username}` : "สมาชิก", name, details)], {
      label: m.username ? "ดูโปรไฟล์" : "เปิดหน้าแอดมิน",
      uri: m.username ? `${ADMIN_SITE}/${m.username}` : `${ADMIN_SITE}/admin`,
    }),
  );
}

export function flexMembersBurst(members: MemberInfo[]): LineMessage {
  const lines = members.slice(0, 10).map((m) => `• ${m.display_name || m.username || "(ไม่มีชื่อ)"} — ${m.email ?? "-"}`);
  if (members.length > 10) lines.push(`…และอีก ${members.length - 10} คน`);
  return flex(
    formatMembersBurst(members),
    bubble("สมาชิกใหม่", null, [section("users", "สมัครพร้อมกัน", `${members.length} คน`, lines)], {
      label: "เปิดหน้าแอดมิน",
      uri: `${ADMIN_SITE}/admin`,
    }),
  );
}

export function flexFeedback(f: FeedbackInfo): LineMessage {
  const kind = KIND_LABEL[f.kind ?? ""] ?? f.kind ?? "ฟีดแบ็ก";
  const stars = f.rating ? ` ${"★".repeat(Math.max(0, Math.min(5, f.rating)))}` : "";
  const msg = clip(f.message, 120);
  const meta = [f.username ? `โดย @${f.username}` : "", f.route ? `หน้า ${f.route}` : "", bkkTime(f.created_at)].filter(Boolean).join(" · ");
  return flex(
    formatFeedback(f),
    bubble(
      "ฟีดแบ็กใหม่",
      f.ticket_number,
      [section("message", f.from_app ? "จากแอป" : "จากเว็บ", `${kind}${stars}`, [...(msg ? [`"${msg}"`] : []), meta])],
      { label: "เปิดหน้าฟีดแบ็ก", uri: `${ADMIN_SITE}/admin/feedback` },
    ),
  );
}

export function flexReport(r: ReportInfo): LineMessage {
  const target = TARGET_LABEL[r.target_type ?? ""] ?? r.target_type ?? "เนื้อหา";
  const reason = REASON_LABEL[r.reason ?? ""] ?? r.reason ?? "-";
  const details = clip(r.details, 120);
  const meta = [r.reporter ? `รายงานโดย @${r.reporter}` : "", bkkTime(r.created_at)].filter(Boolean).join(" · ");
  return flex(
    formatReport(r),
    bubble(
      "มีรายงานใหม่",
      null,
      [section("flag", `${target}${r.target_owner ? ` ของ @${r.target_owner}` : ""}`, reason, [...(details ? [`"${details}"`] : []), meta])],
      { label: "เปิดหน้ารายงาน", uri: `${ADMIN_SITE}/admin/reports` },
    ),
  );
}
