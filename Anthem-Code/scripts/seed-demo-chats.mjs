#!/usr/bin/env node
/**
 * Seed 8 demo chat conversations for phatsawut + chatchai personas
 * — mix of hire (จ้าง) and collab (คอลแลป) badges.
 * Collab mockups (#2, #4, #7) include brief + project card + multi-turn dialogue.
 *
 * Run: npm run seed:demo-chats
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
  join(root, ".env.local"),
];

for (const p of envPaths) {
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const m = trimmed.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
  }
}

const url =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  process.env.ANTHEM_SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.ANTHEM_SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  console.error("Tried:", envPaths.join("\n  "));
  console.error("url=", !!url, "key=", !!key);
  process.exit(1);
}

const opts = { auth: { autoRefreshToken: false, persistSession: false } };
const shared = createClient(url, key, { ...opts, db: { schema: "shared" } });
const anthem = createClient(url, key, { ...opts, db: { schema: "anthem" } });
const admin = createClient(url, key, opts);

const DEMO_PASSWORD = process.env.DEMO_SEED_PASSWORD || "pixel100-demo-seed";
if (!process.env.DEMO_SEED_PASSWORD) {
  console.warn("DEMO_SEED_PASSWORD unset — using default demo password");
}

const uid = (i) => {
  const hex = i.toString(16).padStart(2, "0");
  return `00000000-0000-0000-0000-00000000a0${hex}`;
};
/** Local showcase URL: /chat/00000000-0000-0000-000c-000000000099 */
const SHOWCASE_COLLAB_CONV_ID = "00000000-0000-0000-000c-000000000099";
const convId = (n) =>
  n === 2 ? SHOWCASE_COLLAB_CONV_ID : `00000000-0000-0000-000c-00000000000${n.toString(16)}`;
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

const CHATCHAI = uid(5);

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
    title: "[ทดสอบ] แชทคอลแลป — Motion + Illustration",
    collab: {
      collab_types: ["joint-project", "content"],
      timeline: "6 สัปดาห์ · เริ่มสัปดาห์หน้า",
      message:
        "อยากชวนร่วมทำ motion สั้นๆ ผสม illustration สไตล์ pop สำหรับแคมเปญโซเชียล — แบ่งงานชัดเจน แล้วโพสต์เครดิตคู่กันได้",
    },
    messages: [
      {
        fromPartner: true,
        content:
          "🤝 คำชวนคอลแลป\nอ้างอิง: Motion + Illustration Collab\nประเภท: ร่วมโปรเจกต์ · คอนเทนต์\nช่วงเวลา: 6 สัปดาห์ · เริ่มสัปดาห์หน้า\n\nอยากชวนร่วมทำ motion สั้นๆ ผสม illustration สไตล์ pop สำหรับแคมเปญโซเชียล — แบ่งงานชัดเจน แล้วโพสต์เครดิตคู่กันได้",
        read: true,
      },
      {
        fromPartner: true,
        content: "Motion + Illustration Collab",
        message_type: "project",
        projectIdx: 2,
        read: true,
      },
      {
        fromPartner: false,
        content: "สนใจมากครับ สไตล์ pop ที่ว่าใกล้เคียงงานล่าสุดของผมไหม หรืออยากไปทางใหม่กว่านี้",
        read: true,
      },
      {
        fromPartner: true,
        content:
          "ใกล้เคียงงานล่าสุดเลยค่ะ อยากได้จังหวะตัดต่อเร็ว + ตัวละครน่ารัก\nเดี๋ยวส่ง mood board + reference 3 คลิปให้พรุ่งนี้เช้า",
        read: true,
      },
      {
        fromPartner: false,
        content:
          "โอเคครับ ผมรับฝั่ง illustration + character sheet\nคุณรับ motion / edit ได้ไหม แล้วมานัด sync สัปดาห์ละครั้ง",
        read: true,
      },
      {
        fromPartner: true,
        content:
          "ได้เลยค่ะ ผม/ฉันรับ motion\nสัปดาห์ 1: mood + character\nสัปดาห์ 2–3: draft loop 15 วิ\nสัปดาห์ 4–6: polish + เวอร์ชันโพสต์\nโอเคไหม",
        read: true,
      },
      {
        fromPartner: false,
        content: "โอเคตามนี้ครับ ส่งโฟลเดอร์ไดรฟ์มาได้เลย เดี๋ยวผมอัปโหลด sketch ชุดแรกให้",
        read: false,
      },
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
    title: "[ทดสอบ] แชทคอลแลป — Lookbook ผ้าทอ",
    collab: {
      collab_types: ["skill-swap", "experiment"],
      timeline: "2 เดือน · ยิงรูป 2 วัน",
      message: "แลกเปลี่ยนสกิล photography + styling ทำ lookbook ผ้าทอร่วมกัน แล้วแชร์ผลงานทั้งสองฝ่าย",
    },
    messages: [
      {
        fromPartner: true,
        content:
          "🤝 คำชวนคอลแลป\nอ้างอิง: Lookbook แฟชั่นผ้าทอ\nประเภท: แลกเปลี่ยนสกิล · งานทดลอง\nช่วงเวลา: 2 เดือน · ยิงรูป 2 วัน\n\nแลกเปลี่ยนสกิล photography + styling ทำ lookbook ผ้าทอร่วมกัน แล้วแชร์ผลงานทั้งสองฝ่าย",
        read: true,
      },
      {
        fromPartner: true,
        content: "Lookbook แฟชั่นผ้าทอ",
        message_type: "project",
        projectIdx: 4,
        read: true,
      },
      {
        fromPartner: false,
        content: "สนใจมากค่ะ อยากรู้ว่ามีโลเคชัน / นางแบบแล้วหรือยัง",
        read: true,
      },
      {
        fromPartner: true,
        content: "โลเคชันมี 2 ที่ในเชียงใหม่ค่ะ นางแบบจองแล้ว 1 คน — อยากให้ช่วยสไตล์ลุค 4 ชุด",
        read: true,
      },
      {
        fromPartner: false,
        content: "โอเค เดี๋ยวส่ง mood board สี + อ้างอิงโพสท่าให้ก่อนนัดยิงรูปได้ไหมคะ",
        read: false,
      },
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
  {
    n: 6,
    kind: "hire",
    partnerIdx: 1,
    projectIdx: 1,
    freelancerId: uid(1),
    clientId: CHATCHAI,
    title: "จ้าง napatsara ทำแบรนด์ขนมไทย",
    hire: {
      client_name: "ฉัตรชัย วรกุล",
      budget_amount: 32000,
      budget: "5k-20k",
      message: "สนใจจ้างออกแบบแบรนด์ขนมไทย premium",
      deadline: "2026-08-15",
    },
    messages: [
      { fromPartner: false, content: "สวัสดีครับ สนใจจ้างออกแบบแบรนด์ขนมไทย งบประมาณประมาณ 32k", read: true },
      { fromPartner: true, content: "ได้เลยค่ะ ขอรายละเอียด brief เพิ่มหน่อยนะคะ", read: true },
      { fromPartner: false, content: "ส่ง mood board ให้แล้วครับ รบกวนดูให้หน่อย", read: false },
    ],
  },
  {
    n: 7,
    kind: "collab",
    partnerIdx: 6,
    projectIdx: 6,
    freelancerId: uid(6),
    clientId: CHATCHAI,
    title: "[ทดสอบ] แชทคอลแลป — UI Wellness + Motion",
    collab: {
      collab_types: ["joint-project"],
      timeline: "8 สัปดาห์",
      message: "chatchai ชวน atittaya collab แอป wellness — UI หลัก + motion micro-interaction",
    },
    messages: [
      {
        fromPartner: false,
        content:
          "🤝 คำชวนคอลแลป\nอ้างอิง: UI Wellness + Motion\nประเภท: ร่วมโปรเจกต์\nช่วงเวลา: 8 สัปดาห์\n\nมีโปรเจกต์ wellness อยากชวนร่วม UI + motion micro-interaction ให้ฟีลสงบแต่ทันสมัย",
        read: true,
      },
      {
        fromPartner: false,
        content: "UI Wellness + Motion",
        message_type: "project",
        projectIdx: 6,
        read: true,
      },
      {
        fromPartner: true,
        content: "สนใจค่ะ ส่ง wireframe / timeline มาได้เลย จะดูว่างรับฝั่งไหนได้บ้าง",
        read: true,
      },
      {
        fromPartner: false,
        content: "โอเคครับ ส่ง Figma + รายการหน้าจอ 14 จอให้เย็นนี้ — อยากให้ช่วย motion ตอน onboarding เป็นพิเศษ",
        read: false,
      },
    ],
  },
  {
    n: 8,
    kind: "hire",
    partnerIdx: 0,
    projectIdx: 0,
    freelancerId: PHAT,
    clientId: CHATCHAI,
    title: "โลโก้สตาร์ทอัป EdTech",
    hire: {
      client_name: "ฉัตรชัย วรกุล",
      budget_amount: 28000,
      budget: "5k-20k",
      message: "หา designer ทำโลโก้ EdTech",
      deadline: "2026-07-30",
    },
    messages: [
      { fromPartner: false, content: "สวัสดีครับ มีงานโลโก้ EdTech สนใจไหม", read: true },
      { fromPartner: true, content: "สนใจครับ ขอดู brief เพิ่มได้เลย", read: true },
    ],
  },
];

function chatParties(chat) {
  const freelancer = chat.freelancerId ?? PHAT;
  const client = chat.clientId ?? uid(chat.partnerIdx);
  return { freelancer, client };
}

async function upsertHire(chat) {
  const { freelancer, client } = chatParties(chat);
  const row = {
    id: hireReqId(chat.n),
    freelancer_id: freelancer,
    client_id: client,
    project_id: projectId(chat.projectIdx),
    project_title: chat.title,
    client_name: chat.hire.client_name,
    email: chat.clientId ? "chatchai@demo.pixel100.com" : emails[chat.partnerIdx - 1],
    phone: "0891234567",
    budget: chat.hire.budget,
    budget_amount: chat.hire.budget_amount,
    deadline: chat.hire.deadline,
    message: chat.hire.message,
    status: "ตอบรับ",
  };
  await anthem.from("hiring_requests").delete().eq("id", row.id);
  const { error } = await anthem.from("hiring_requests").insert(row);
  if (error) throw new Error(`hiring_requests ${chat.n}: ${error.message}`);
  return row.id;
}

async function upsertCollab(chat) {
  const partner = uid(chat.partnerIdx);
  const sender = chat.clientId ?? partner;
  const recipient = chat.freelancerId ?? PHAT;
  const row = {
    id: collabReqId(chat.n),
    sender_id: sender,
    recipient_id: recipient,
    project_id: projectId(chat.projectIdx),
    collab_types: chat.collab.collab_types,
    message: chat.collab.timeline
      ? `${chat.collab.message}\n\nช่วงเวลา: ${chat.collab.timeline}`
      : chat.collab.message,
    attached_project_ids: [projectId(chat.projectIdx)],
    status: "accepted",
  };
  await anthem.from("collab_requests").delete().eq("id", row.id);
  const { error } = await anthem.from("collab_requests").insert(row);
  if (error) throw new Error(`collab_requests ${chat.n}: ${error.message}`);
  return row.id;
}

async function upsertConversation(chat, requestId) {
  const { freelancer, client } = chatParties(chat);
  const lastAt = new Date(Date.now() - (9 - chat.n) * 3600_000).toISOString();
  const id = convId(chat.n);

  const row = {
    id,
    kind: chat.kind,
    request_id: requestId,
    client_id: client,
    freelancer_id: freelancer,
    project_id: projectId(chat.projectIdx),
    project_title: chat.title,
    last_message_at: lastAt,
  };

  await shared.from("messages").delete().eq("conversation_id", id);
  await shared.from("conversations").delete().eq("id", id);
  const { error } = await shared.from("conversations").insert(row);
  if (error) throw new Error(`conversations ${chat.n}: ${error.message}`);
}

function messageSender(chat, m) {
  const { freelancer, client } = chatParties(chat);
  if (chat.kind === "hire") {
    return m.fromPartner ? client : freelancer;
  }
  if (chat.clientId) {
    return m.fromPartner ? freelancer : client;
  }
  const partner = uid(chat.partnerIdx);
  return m.fromPartner ? partner : PHAT;
}

async function upsertMessages(chat) {
  const base = Date.now() - chat.messages.length * 600_000;

  await shared.from("messages").delete().eq("conversation_id", convId(chat.n));

  const rows = chat.messages.map((m, i) => {
    const isProject = m.message_type === "project";
    const pid =
      isProject && m.projectIdx != null ? projectId(m.projectIdx) : isProject ? projectId(chat.projectIdx) : null;
    return {
      id: msgId(chat.n, i),
      conversation_id: convId(chat.n),
      sender_id: messageSender(chat, m),
      content: m.content,
      attachment_url: null,
      message_type: m.message_type || "text",
      project_id: pid,
      read_at: m.read ? new Date(base + i * 600_000).toISOString() : null,
      created_at: new Date(base + i * 600_000).toISOString(),
    };
  });

  const { error } = await shared.from("messages").insert(rows);
  if (error) throw new Error(`messages ${chat.n}: ${error.message}`);
}

async function main() {
  console.log("Seeding 8 demo chats (phatsawut + chatchai personas)");

  for (const userId of [PHAT, CHATCHAI]) {
    const { error: pwErr } = await admin.auth.admin.updateUserById(userId, {
      password: DEMO_PASSWORD,
    });
    if (pwErr) console.warn("  password reset:", userId, pwErr.message);
  }
  console.log("  ✓ demo passwords synced");

  for (const chat of CHATS) {
    const requestId =
      chat.kind === "hire" ? await upsertHire(chat) : await upsertCollab(chat);
    await upsertConversation(chat, requestId);
    await upsertMessages(chat);
    console.log(
      `  ✓ ${chat.kind === "hire" ? "จ้าง" : "คอลแลป"} — ${names[Math.max(0, chat.partnerIdx - 1)] ?? "chatchai"} (${chat.title})`,
    );
  }

  const keepIds = CHATS.map((c) => convId(c.n));
  const { data: all } = await shared
    .from("conversations")
    .select("id")
    .or(`client_id.eq.${PHAT},freelancer_id.eq.${PHAT},client_id.eq.${CHATCHAI},freelancer_id.eq.${CHATCHAI}`);

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
  console.log(`Collab mockup: /chat/${SHOWCASE_COLLAB_CONV_ID}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
