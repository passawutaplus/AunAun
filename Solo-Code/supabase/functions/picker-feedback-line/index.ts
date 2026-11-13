// picker-feedback-line: Picker alerts to the SAMECOR admin LINE group.
// Feedback (public.pc_feedback): woken by pg_net from an AFTER INSERT trigger and a 10-minute sweep (instant).
// Summary ({"summary":true}, pg_cron every 3 h): web visits (pc_visits) + new Wishlist joins in one message; never includes emails.
// Color Portal ({"portal":true}, AFTER INSERT on pc_portal_events): client approved / asked for changes / wrote a message,
//   only for portals owned by a Picker admin (pc_portal_line_claim filters by pc_admins).
// Feedback is anonymous: no user, email or IP is read or sent.
// Secrets reused from line-admin-notify: LINE_SAMECOR_ADMIN_ACCESS_TOKEN, LINE_SAMECOR_ADMIN_GROUP_ID.
import { createClient } from "npm:@supabase/supabase-js@2";

type Row = {
  id: string;
  created_at: string;
  kind: string;
  rating: number | null;
  message: string;
  page: string | null;
  mode: string | null;
  device: string | null;
  app_ver: string | null;
};

const INBOX = "https://picker.samecor.com/?fb=inbox";
const PORTAL = "https://picker.samecor.com/p?t=";
const INK = "#111111",
  MUTED = "#8A8A8A",
  RULE = "#E6E4DE",
  BRAND = "#EE3D29";
const KIND: Record<string, string> = {
  like: "ชอบ",
  bug: "เจอปัญหา",
  idea: "อยากได้ฟีเจอร์",
  other: "อื่นๆ",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

function clip(t: string | null | undefined, max: number) {
  // deno-lint-ignore no-control-regex
  const f = (t ?? "")
    // eslint-disable-next-line no-control-regex -- strip control chars on purpose
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return f.length > max ? `${f.slice(0, max - 1)}…` : f;
}
function bkk(iso: string) {
  const p = new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `${g("day")} ${g("month")} ${g("hour")}:${g("minute")}`;
}
const T = (t: string, o: Record<string, unknown> = {}) => ({
  type: "text",
  text: t || " ",
  color: INK,
  wrap: true,
  ...o,
});
const head = (r: Row) =>
  `${KIND[r.kind] ?? r.kind}${r.rating ? " " + "★".repeat(Math.max(0, Math.min(5, r.rating))) : ""}`;
const meta = (r: Row) =>
  [
    r.mode === "demo" ? "เดโม" : "แอป",
    r.page ? `หน้า ${clip(r.page, 30)}` : "",
    clip(r.device, 30),
    bkk(r.created_at),
  ]
    .filter(Boolean)
    .join(" · ");

function message(rows: Row[]) {
  const shown = rows.slice(0, 5);
  const blocks: Record<string, unknown>[] = [];
  shown.forEach((r, i) => {
    if (i > 0) blocks.push({ type: "separator", margin: "md", color: RULE });
    blocks.push({
      type: "box",
      layout: "vertical",
      margin: i ? "md" : "lg",
      contents: [
        T(head(r), { size: "md", weight: "bold" }),
        T(`"${clip(r.message, 160)}"`, { size: "sm", color: "#333333", margin: "xs" }),
        T(meta(r), { size: "xs", color: MUTED, margin: "xs" }),
      ],
    });
  });
  if (rows.length > 5)
    blocks.push(T(`…และอีก ${rows.length - 5} รายการ`, { size: "xs", color: MUTED, margin: "md" }));
  const alt = [
    `Picker ฟีดแบ็กใหม่ ${rows.length} รายการ`,
    ...shown.map((r) => `• ${head(r)}: ${clip(r.message, 60)}`),
  ].join("\n");
  return {
    type: "flex",
    altText: clip(alt, 400),
    contents: {
      type: "bubble",
      size: "kilo",
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "20px",
        contents: [
          T("PICKER", { size: "xs", color: BRAND, weight: "bold" }),
          T(rows.length > 1 ? `ฟีดแบ็กใหม่ ${rows.length} รายการ` : "ฟีดแบ็กใหม่", {
            size: "lg",
            weight: "bold",
            margin: "xs",
          }),
          T("ไม่ระบุชื่อผู้ส่ง", { size: "xs", color: MUTED, margin: "xs" }),
          { type: "separator", margin: "lg", color: RULE },
          ...blocks,
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        paddingAll: "12px",
        contents: [
          {
            type: "button",
            style: "link",
            height: "sm",
            color: INK,
            action: { type: "uri", label: "เปิด Feedback inbox", uri: INBOX },
          },
        ],
      },
    },
  };
}

type PRow = {
  kind: string;
  name: string | null;
  ver: number | null;
  reasons: string[] | null;
  body: string | null;
  color: string | null;
  nmedia: number | null;
  created_at: string;
  title: string;
  client: string | null;
  token: string;
};
const PKIND: Record<string, string> = {
  approved: "อนุมัติ",
  changes: "ขอแก้ไข",
  comment: "ข้อความใหม่",
};
const PCOL: Record<string, string> = { approved: "#2F7D4F", changes: "#A5620A", comment: INK };
const RS: Record<string, string> = {
  dark: "เข้มไป",
  light: "อ่อนไป",
  vivid: "สดไป",
  dull: "หม่นไป",
  hue: "โทนไม่ตรง",
  sample: "ไม่ตรงตัวอย่างจริง",
  material: "ไม่เข้ากับวัสดุ",
  other: "อื่นๆ",
};
const phead = (r: PRow) =>
  `${PKIND[r.kind] ?? r.kind}${r.ver && r.kind !== "comment" ? ` v${r.ver}` : ""}`;

function portalMessage(rows: PRow[]) {
  const shown = rows.slice(0, 5),
    first = rows[rows.length - 1];
  const blocks: Record<string, unknown>[] = [];
  shown.forEach((r, i) => {
    if (i > 0) blocks.push({ type: "separator", margin: "md", color: RULE });
    const extra = [
      (r.reasons ?? []).map((k) => RS[k] ?? k).join(", "),
      r.color ? `เรื่องสี ${r.color}` : "",
      r.nmedia ? `แนบ ${r.nmedia} ไฟล์` : "",
    ]
      .filter(Boolean)
      .join(" · ");
    blocks.push({
      type: "box",
      layout: "vertical",
      margin: i ? "md" : "lg",
      contents: [
        T(`${phead(r)} · ${clip(r.title, 40)}`, {
          size: "md",
          weight: "bold",
          color: PCOL[r.kind] ?? INK,
        }),
        ...(extra ? [T(extra, { size: "xs", color: "#444444", margin: "xs" })] : []),
        ...(r.body
          ? [T(`"${clip(r.body, 160)}"`, { size: "sm", color: "#333333", margin: "xs" })]
          : []),
        T(
          [clip(r.name, 40), r.client ? clip(r.client, 40) : "", bkk(r.created_at)]
            .filter(Boolean)
            .join(" · "),
          { size: "xs", color: MUTED, margin: "xs" },
        ),
      ],
    });
  });
  if (rows.length > 5)
    blocks.push(T(`…และอีก ${rows.length - 5} รายการ`, { size: "xs", color: MUTED, margin: "md" }));
  const alt = shown
    .map((r) => `${phead(r)} · ${clip(r.title, 30)} (${clip(r.name, 20)})`)
    .join("\n");
  return {
    type: "flex",
    altText: clip(`Color Portal: ${alt}`, 400),
    contents: {
      type: "bubble",
      size: "kilo",
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "20px",
        contents: [
          T("PICKER · COLOR PORTAL", { size: "xs", color: BRAND, weight: "bold" }),
          T(rows.length > 1 ? `ลูกค้าตอบกลับ ${rows.length} รายการ` : "ลูกค้าตอบกลับ", {
            size: "lg",
            weight: "bold",
            margin: "xs",
          }),
          { type: "separator", margin: "lg", color: RULE },
          ...blocks,
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        paddingAll: "12px",
        contents: [
          {
            type: "button",
            style: "link",
            height: "sm",
            color: INK,
            action: {
              type: "uri",
              label: "เปิด Portal",
              uri: PORTAL + encodeURIComponent(first.token),
            },
          },
        ],
      },
    },
  };
}

type Summary = {
  since: string;
  until: string;
  visits: number;
  demo: number;
  app: number;
  web: number;
  mobile: number;
  fb: number;
  today: number;
  wl_new: number;
  wl_mail: number;
  wl_total: number;
  ids: string[];
};

const hm = (iso: string) =>
  new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
const kv = (k: string, v: string) => ({
  type: "box",
  layout: "horizontal",
  margin: "sm",
  contents: [
    T(k, { size: "sm", color: "#444444", flex: 5 }),
    T(v, { size: "sm", weight: "bold", align: "end", flex: 3 }),
  ],
});

function summaryMessage(d: Summary) {
  const rows = [
    kv("คนเข้าเว็บ", `${d.visits}`),
    kv("· เปิดเดโม", `${d.demo}`),
    kv("· เปิดแอป", `${d.app}`),
    ...(d.web ? [kv("· หน้าเว็บอื่น", `${d.web}`)] : []),
    kv("มาจาก Facebook", `${d.fb}`),
    kv("ใช้มือถือ", `${d.mobile}`),
    { type: "separator", margin: "md", color: RULE },
    kv("Wishlist ใหม่", `+${d.wl_new}${d.wl_mail ? ` (อีเมล ${d.wl_mail})` : ""}`),
    kv("Wishlist ทั้งหมด", `${d.wl_total}`),
  ];
  const range = `${hm(d.since)}–${hm(d.until)} น.`;
  return {
    type: "flex",
    altText: `Picker ${range}: คนเข้าเว็บ ${d.visits} · Wishlist +${d.wl_new} (รวม ${d.wl_total})`,
    contents: {
      type: "bubble",
      size: "kilo",
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "20px",
        contents: [
          T("PICKER", { size: "xs", color: BRAND, weight: "bold" }),
          T("สรุป 3 ชม.", { size: "lg", weight: "bold", margin: "xs" }),
          T(`${range} · วันนี้รวม ${d.today} คน`, { size: "xs", color: MUTED, margin: "xs" }),
          { type: "separator", margin: "lg", color: RULE },
          { type: "box", layout: "vertical", margin: "md", contents: rows },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        paddingAll: "12px",
        contents: [
          {
            type: "button",
            style: "link",
            height: "sm",
            color: INK,
            action: { type: "uri", label: "ดูรายชื่อ Wishlist", uri: INBOX },
          },
        ],
      },
    },
  };
}

async function push(token: string, groupId: string, messages: unknown[]) {
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ to: groupId, messages }),
  });
  if (res.ok) return null;
  let detail = res.statusText;
  try {
    detail = (await res.text()).slice(0, 300);
  } catch {
    /* ignore */
  }
  return `${res.status} ${detail}`;
}

Deno.serve(async (req) => {
  if (req.method !== "POST" && req.method !== "GET")
    return json({ error: "method not allowed" }, 405);
  const token = Deno.env.get("LINE_SAMECOR_ADMIN_ACCESS_TOKEN");
  const groupId = Deno.env.get("LINE_SAMECOR_ADMIN_GROUP_ID");
  if (!token || !groupId) return json({ skipped: "not configured" });
  const url = Deno.env.get("SUPABASE_URL"),
    key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return json({ error: "server misconfiguration" }, 500);
  const admin = createClient(url, key);

  let body: { summary?: boolean; portal?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    /* empty */
  }
  if (body.portal) {
    // Color Portal: claim marks rows as sent first, so repeated calls cannot send the same reply twice.
    const { data: pd, error: pe } = await admin.rpc("pc_portal_line_claim");
    if (pe) {
      console.error("[picker-line] portal claim", pe.message);
      return json({ error: "claim failed" }, 500);
    }
    const rows = (pd ?? []) as PRow[];
    if (rows.length === 0) return json({ portal: 0 });
    const err = await push(token, groupId, [portalMessage(rows)]);
    if (!err) return json({ portal: rows.length, sent: 1 });
    console.error("[picker-line] portal push failed", err);
    return json({ error: "push failed" }, 502);
  }
  if (body.summary) {
    // 3-hour summary. pc_picker_summary() refuses if the last one was < ~3 h ago, so outside callers cannot spam the group.
    const { data: d, error: se } = await admin.rpc("pc_picker_summary");
    if (se) {
      console.error("[picker-line] summary", se.message);
      return json({ error: "summary failed" }, 500);
    }
    const s = d as Summary | null;
    if (!s) return json({ summary: "too soon" });
    if (s.visits === 0 && s.wl_new === 0) return json({ summary: "nothing new" });
    const err = await push(token, groupId, [summaryMessage(s)]);
    if (!err) return json({ summary: "sent", visits: s.visits, wishlist: s.wl_new });
    console.error("[picker-line] summary push failed", err);
    await admin.rpc("pc_picker_summary_undo", { _since: s.since, _ids: s.ids });
    return json({ error: "push failed" }, 502);
  }

  // Feedback: instant.
  const { data, error } = await admin.rpc("pc_feedback_line_claim");
  if (error) {
    console.error("[picker-line] claim", error.message);
    return json({ error: "claim failed" }, 500);
  }
  const rows = (data ?? []) as Row[];
  if (rows.length === 0) return json({ processed: 0 });
  const err = await push(token, groupId, [message(rows)]);
  if (!err) return json({ feedback: rows.length, sent: 1 });
  // Never log the token. Release rows so the sweep retries (claim stops after 5 attempts).
  console.error("[picker-line] push failed", err);
  await admin.rpc("pc_feedback_line_release", { _ids: rows.map((r) => r.id) });
  return json({ error: "push failed" }, 502);
});
