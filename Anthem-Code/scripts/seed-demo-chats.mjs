#!/usr/bin/env node
/**
 * Seed 5 demo chat conversations for phatsawut@demo.pixel100.com
 * — mix of hire (จ้าง) and collab (คอลแลป) badges with 5 different partners.
 *
 * Run: node scripts/seed-demo-chats.mjs
 * Env: scripts/ecosystem/.env.seed.local or ../Solo-Code/.env (service role)
 */
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPaths = [
  join(root, "scripts/ecosystem/.env.seed.local"),
  join(root, "../Solo-Code/.env"),
  join(root, ".env"),
];

for (const p of envPaths) {
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
  }
}

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const opts = { auth: { autoRefreshToken: false, persistSession: false } };
const shared = createClient(url, key, { ...opts, db: { schema: "shared" } });
const anthem = createClient(url, key, { ...opts, db: { schema: "anthem" } });
const admin = createClient(url, key, opts);

const DEMO_PASSWORD = process.env.DEMO_SEED_PASSWORD;
if (!DEMO_PASSWORD) {
  console.error("Missing DEMO_SEED_PASSWORD");
  process.exit(1);
}

const uid = (i) => {
  const hex = i.toString(16).padStart(2, "0");
  return `00000000-0000-0000-0000-00000000a0${hex}`;
};
const convId = (n) => `00000000-0000-0000-000c-00000000000${n.toString(16)}`;
const hireReqId = (n) => `00000000-0000-0000-0006-00000000000${n.toString(16)}`;
const collabReqId = (n) => `00000000-0000-0000-0005-00000000000${n.toString(16)}`;
const msgId = (chatN, msgIdx) => {
  const num = chatN * 100 + msgIdx;
  const hex = num.toString(16).padStart(12, "0");
  return `00000000-0000-0000-000d-${hex}`;
};
const projectId = (i) => {
  const hex = i.toString(16).padStart(2, "0");
  return `00000000-0000-0000-0002-0000000000${hex}`;
};

const PHAT = uid(0);

const names = [
  "นภัสรา ทองดี",
  "พิมพ์ชนก ใจดี",
  "วรรณกร พันธ์ทอง",
  "ธัญญา รัตนพร",
  "ฉัตรชัย วรกุล",
];
const emails = [
  "napatsara@demo.pixel100.com",
  "pimchanok@demo.pixel100.com",
  "wannakorn@demo.pixel100.com",
  "thanya@demo.pixel100.com",
  "chatchai@demo.pixel100.com",
];

const CHATS = [
  {
    n: 1,
    kind: "hire",
    partnerIdx: 1,
    projectIdx: 1,
    title: "Rebrand แบรนด์คาเฟ่",
    hire: {
      client_name: "คุณมินท์ (ลูกค้า demo)",
      budget_amount: 25000,
      budget: "5k-20k",
      message: "สนใจจ้างออกแบบโลโก้และ UI แอป",
      deadline: "2026-07-15",
    },
    messages: [
      { fromPartner: true, content: "สวัสดีครับ สนใจจ้างออกแบบโลโก้และ UI ครับ งบประมาณประมาณ 25k", read: true },
      { fromPartner: false, content: "สวัสดีครับ ขอบคุณที่ติดต่อมา ขอรายละเอียด brief เพิ่มได้เลยครับ", read: true },
      { fromPartner: true, content: "ส่ง mood board ให้แล้วในไดรฟ์ ช่วยดูให้หน่อยนะครับ", read: false },
    ],
  },
  {
    n: 2,
    kind: "collab",
    partnerIdx: 2,
    projectIdx: 2,
    title: "Motion + Illustration Collab",
    collab: {
      collab_types: ["joint-project", "content"],
      timeline: "6 สัปดาห์",
      message: "อยากชวนร่วมทำ motion สั้นๆ ผสม illustration สไตล์ pop",
    },
    messages: [
      { fromPartner: true, content: "Hey! ชอบสไตล์ motion ของคุณมาก อยาก collab งานสั้นๆ ได้ไหม", read: true },
      { fromPartner: false, content: "ได้เลยครับ ส่ง mood board มาได้เลย", read: true },
      { fromPartner: true, content: "โอเค เดี๋ยวส่ง reference ให้พรุ่งนี้เช้า", read: false },
    ],
  },
  {
    n: 3,
    kind: "hire",
    partnerIdx: 3,
    projectIdx: 3,
    title: "แพ็กเกจจิ้งขนมไทย Premium",
    hire: {
      client_name: names[2],
      budget_amount: 18000,
      budget: "5k-20k",
      message: "ต้องการดีไซน์กล่องและถุงสำหรับขนมไทยส่งออก",
      deadline: "2026-08-01",
    },
    messages: [
      { fromPartner: true, content: "สวัสดีครับ มีงาน packaging อยากให้ช่วย quote ครับ", read: false },
    ],
  },
  {
    n: 4,
    kind: "collab",
    partnerIdx: 4,
    projectIdx: 4,
    title: "Lookbook แฟชั่นผ้าทอ",
    collab: {
      collab_types: ["skill-swap", "experiment"],
      timeline: "2 เดือน",
      message: "แลกเปลี่ยนสกิล photography + styling ทำ lookbook ร่วมกัน",
    },
    messages: [
      { fromPartner: true, content: "สวัสดีค่ะ สนใจ collab lookbook ผ้าทอไหมคะ", read: true },
      { fromPartner: false, content: "สนใจมากค่ะ นัดคุยไอเดียสัปดาห์หน้าได้ไหม", read: true },
    ],
  },
  {
    n: 5,
    kind: "hire",
    partnerIdx: 5,
    projectIdx: 5,
    title: "UI App จองคิวสปา",
    hire: {
      client_name: names[4],
      budget_amount: 42000,
      budget: "5k-20k",
      message: "หา designer ทำ UI แอปจองสปา 14 หน้าจอ",
      deadline: "2026-09-30",
    },
    messages: [
      { fromPartner: true, content: "สวัสดีครับ มีงาน UI แอป wellness สนใจไหมครับ", read: false },
      { fromPartner: true, content: "งบประมาณประมาณ 42k ครับ ส่ง brief ให้ได้เลย", read: false },
    ],
  },
];

async function upsertHire(chat) {
  const partner = uid(chat.partnerIdx);
  const row = {
    id: hireReqId(chat.n),
    freelancer_id: PHAT,
    client_id: partner,
    project_id: projectId(chat.projectIdx),
    project_title: chat.title,
    client_name: chat.hire.client_name,
    email: emails[chat.partnerIdx - 1],
    phone: "0891234567",
    budget: chat.hire.budget,
    budget_amount: chat.hire.budget_amount,
    deadline: chat.hire.deadline,
    message: chat.hire.message,
    status: "ตอบรับ",
  };
  const { error } = await anthem.from("hiring_requests").upsert(row, { onConflict: "id" });
  if (error) throw new Error(`hiring_requests ${chat.n}: ${error.message}`);
  return row.id;
}

async function upsertCollab(chat) {
  const partner = uid(chat.partnerIdx);
  const row = {
    id: collabReqId(chat.n),
    sender_id: partner,
    recipient_id: PHAT,
    project_id: projectId(chat.projectIdx),
    collab_types: chat.collab.collab_types,
    timeline: chat.collab.timeline,
    message: chat.collab.message,
    attached_project_ids: [projectId(chat.projectIdx)],
    status: "accepted",
  };
  const { error } = await anthem.from("collab_requests").upsert(row, { onConflict: "id" });
  if (error) throw new Error(`collab_requests ${chat.n}: ${error.message}`);
  return row.id;
}

async function upsertConversation(chat, requestId) {
  const partner = uid(chat.partnerIdx);
  const lastAt = new Date(Date.now() - (5 - chat.n) * 3600_000).toISOString();

  const row = {
    id: convId(chat.n),
    kind: chat.kind,
    request_id: requestId,
    client_id: partner,
    freelancer_id: PHAT,
    project_id: projectId(chat.projectIdx),
    project_title: chat.title,
    last_message_at: lastAt,
  };
  const { error } = await shared.from("conversations").upsert(row, { onConflict: "id" });
  if (error) throw new Error(`conversations ${chat.n}: ${error.message}`);
}

async function upsertMessages(chat) {
  const partner = uid(chat.partnerIdx);
  const base = Date.now() - chat.messages.length * 600_000;

  await shared.from("messages").delete().eq("conversation_id", convId(chat.n));

  const rows = chat.messages.map((m, i) => ({
    id: msgId(chat.n, i),
    conversation_id: convId(chat.n),
    sender_id: m.fromPartner ? partner : PHAT,
    content: m.content,
    attachment_url: null,
    read_at: m.read ? new Date(base + i * 600_000).toISOString() : null,
    created_at: new Date(base + i * 600_000).toISOString(),
  }));

  const { error } = await shared.from("messages").upsert(rows, { onConflict: "id" });
  if (error) throw new Error(`messages ${chat.n}: ${error.message}`);
}

async function main() {
  console.log("Seeding 5 demo chats for", PHAT);

  const { error: pwErr } = await admin.auth.admin.updateUserById(PHAT, {
    password: DEMO_PASSWORD,
  });
  if (pwErr) console.warn("  password reset:", pwErr.message);
  else console.log("  ✓ reset demo password for phatsawut@demo.pixel100.com");

  for (const chat of CHATS) {
    const requestId =
      chat.kind === "hire" ? await upsertHire(chat) : await upsertCollab(chat);
    await upsertConversation(chat, requestId);
    await upsertMessages(chat);
    console.log(
      `  ✓ ${chat.kind === "hire" ? "จ้าง" : "คอลแลป"} — ${names[chat.partnerIdx - 1]} (${chat.title})`,
    );
  }

  const keepIds = CHATS.map((c) => convId(c.n));
  const { data: all } = await shared
    .from("conversations")
    .select("id")
    .or(`client_id.eq.${PHAT},freelancer_id.eq.${PHAT}`);

  const extra = (all ?? []).filter((c) => !keepIds.includes(c.id));
  if (extra.length) {
    for (const { id } of extra) {
      await shared.from("messages").delete().eq("conversation_id", id);
      await shared.from("conversations").delete().eq("id", id);
    }
    console.log(`  cleaned ${extra.length} extra conversation(s) for phatsawut`);
  }

  console.log("\nDone. Demo password was loaded from DEMO_SEED_PASSWORD.");
  console.log("Open: /chat");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
