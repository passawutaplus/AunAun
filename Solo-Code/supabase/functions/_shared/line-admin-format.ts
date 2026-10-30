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
