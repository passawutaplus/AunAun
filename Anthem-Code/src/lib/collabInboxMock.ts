import { demoAvatarUrl, demoImageUrl } from "@/lib/demoImages";
import { isDemoMode } from "@/lib/demoMode";
import {
  catalogIndexFromUserId,
  catalogProjectId,
  catalogUserId,
} from "@/lib/communityCatalogIds";

export const COLLAB_INBOX_MOCK_PREFIX = "mock-collab-";

export function isCollabInboxMockId(id: string | null | undefined): boolean {
  return !!id?.startsWith(COLLAB_INBOX_MOCK_PREFIX);
}

export function canUseCollabInboxMocks(): boolean {
  return import.meta.env.DEV || isDemoMode();
}

export type CollabInboxMockSender = {
  name: string;
  avatar: string;
  role: string;
  username: string | null;
};

export type CollabInboxMockProject = {
  id: string;
  title: string;
  cover: string;
};

/** Demo catalog creators with full seeded profiles + published work. */
const CATALOG_SENDERS: Record<
  number,
  { username: string; name: string; role: string }
> = {
  1: { username: "napatsara", name: "นภัสรา ทองดี", role: "Packaging Designer" },
  2: { username: "pimchanok", name: "พิมพ์ชนก ใจดี", role: "Children's Illustrator" },
  3: { username: "wannakorn", name: "วรรณกร พันธ์ทอง", role: "Textile Designer" },
  4: { username: "thanya", name: "ธัญญา รัตนพร", role: "Ceramic Artist" },
  6: { username: "atittaya", name: "อาทิตยา จันทร์เพ็ญ", role: "UX/UI Designer" },
  7: { username: "ploypailin", name: "พลอยไพลิน ขจร", role: "Content Designer" },
  8: { username: "thanakorn", name: "ธนกร แสงทอง", role: "Product Photographer" },
  9: { username: "anucha", name: "อนุชา ภูมิดี", role: "Wedding Photographer" },
};

const CATALOG_PROJECTS: Record<number, { title: string }> = {
  0: { title: "Doi Brew — identity ร้านกาแฟดอย" },
  1: { title: "แม่ละมุน — กล่องขนมไทยพรีเมียม" },
  2: { title: "ช้างน้อยกับตลาดเช้า" },
  3: { title: "ลายบัวเรขา — ผ้าขาวม้าโมเดิร์น" },
  4: { title: "ชุดโต๊ะ Earth — เซรามิก 8 ชิ้น" },
  6: { title: "Arogya — แอปจองสปา 14 หน้าจอ" },
  7: { title: "ฮ่อมคำ — กริดอาหารเหนือ 9 ช่อง" },
  8: { title: "ชุดภาพผ้าทอโคราช — สตูดิโอ + ไลฟ์สไตล์" },
  9: { title: "พรีเวดดิ้งเชียงราย — โทนฟิล์มอบอุ่น" },
};

type MockDef = {
  id: string;
  senderIndex: number;
  status: string;
  priority: "ปกติ" | "รอได้" | "ด่วน";
  types: string[];
  timeline: string;
  message: string;
  attachIndexes: number[];
  drive?: string;
  site?: string;
  attachCoverIndex?: number;
  daysAgo: number;
};

const DEFS: MockDef[] = [
  {
    id: `${COLLAB_INBOX_MOCK_PREFIX}pending-pim`,
    senderIndex: 2,
    status: "pending",
    priority: "ด่วน",
    types: ["joint-project", "content"],
    timeline: "2026-09-12",
    message:
      "เห็นงานบนพอร์ตแล้วชอบโทนมาก อยากชวนต่อยอดเป็นซีรีส์ภาพประกอบหนังสือเด็ก+โมชันสั้น 4 ชิ้น — แนบช้างน้อยกับตลาดเช้าให้ดูทิศทาง",
    attachIndexes: [2],
    drive: "https://drive.google.com/drive/folders/aplus1-collab-brief",
    attachCoverIndex: 2,
    daysAgo: 1,
  },
  {
    id: `${COLLAB_INBOX_MOCK_PREFIX}pending-thanya`,
    senderIndex: 4,
    status: "pending",
    priority: "ปกติ",
    types: ["chat"],
    timeline: "2 สัปดาห์",
    message:
      "อยากนัดคุยไอเดียจัดโต๊ะ+ถ่ายสไตล์เซรามิกโทนดิน ยังไม่ต้องลงมือ — แค่จูนทิศทางก่อน ดูชุดโต๊ะ Earth ได้ในพอร์ต",
    attachIndexes: [4],
    site: "https://aplus1.app/@thanya",
    daysAgo: 2,
  },
  {
    id: `${COLLAB_INBOX_MOCK_PREFIX}accepted-atittaya`,
    senderIndex: 6,
    status: "accepted",
    priority: "รอได้",
    types: ["skill-swap"],
    timeline: "2026-10-01",
    message:
      "แลกสกิลได้เลย — เราทำ UI แอปจองสปา Arogya คุณช่วย illustration ไอคอนชุดเล็กให้ระบบดูอบอุ่นขึ้น",
    attachIndexes: [6],
    daysAgo: 5,
  },
  {
    id: `${COLLAB_INBOX_MOCK_PREFIX}declined-anucha`,
    senderIndex: 9,
    status: "declined",
    priority: "ปกติ",
    types: ["experiment"],
    timeline: "1 เดือน",
    message:
      "ชวนลองเทคนิคพรีเวดดิ้งโทนฟิล์ม+ไลฟ์สไตล์สินค้า แต่เข้าใจถ้าช่วงนี้คิวเต็ม — งานเชียงรายอยู่ในพอร์ตแล้ว",
    attachIndexes: [9],
    daysAgo: 8,
  },
  {
    id: `${COLLAB_INBOX_MOCK_PREFIX}done-napatsara`,
    senderIndex: 1,
    status: "completed",
    priority: "ปกติ",
    types: ["joint-project"],
    timeline: "2026-07-30",
    message:
      "งานร่วมชุดกล่องแม่ละมุนจบแล้ว ขอบคุณที่ลงสีและคอมมิตตามรอบ — เปิดผลงานแพ็กเกจในพอร์ตได้เลย",
    attachIndexes: [1],
    daysAgo: 20,
  },
];

function catalogSender(index: number): CollabInboxMockSender {
  const row = CATALOG_SENDERS[index];
  return {
    name: row?.name ?? "ฟรีแลนซ์",
    username: row?.username ?? null,
    role: row?.role ?? "",
    avatar: demoAvatarUrl(index),
  };
}

function catalogProject(index: number): CollabInboxMockProject {
  return {
    id: catalogProjectId(index),
    title: CATALOG_PROJECTS[index]?.title ?? "ผลงาน",
    cover: demoImageUrl(index),
  };
}

export function collabInboxMockSenders(): Record<string, CollabInboxMockSender> {
  const map: Record<string, CollabInboxMockSender> = {};
  for (const index of Object.keys(CATALOG_SENDERS).map(Number)) {
    map[catalogUserId(index)] = catalogSender(index);
  }
  return map;
}

export function collabInboxMockProjects(): Record<string, CollabInboxMockProject> {
  const map: Record<string, CollabInboxMockProject> = {};
  for (const index of Object.keys(CATALOG_PROJECTS).map(Number)) {
    const project = catalogProject(index);
    map[project.id] = project;
  }
  return map;
}

function hostProjectIndex(recipientId: string): number {
  const recipientIndex = catalogIndexFromUserId(recipientId);
  return recipientIndex ?? 0;
}

export function buildCollabInboxMockRequests(recipientId: string) {
  const now = Date.now();
  const hostIndex = hostProjectIndex(recipientId);
  return DEFS.filter((def) => catalogUserId(def.senderIndex) !== recipientId).map((def) => {
    const referenceIndex = def.senderIndex === hostIndex ? (hostIndex + 1) % 20 : hostIndex;
    const attached = def.attachIndexes.map((index) => catalogProjectId(index));
    return {
      id: def.id,
      sender_id: catalogUserId(def.senderIndex),
      recipient_id: recipientId,
      project_id: catalogProjectId(referenceIndex),
      collab_types: def.types,
      message: def.message,
      attached_project_ids: attached,
      external_drive_url: def.drive ?? null,
      website_url: def.site ?? null,
      other_type_note: null,
      attachment_urls: def.attachCoverIndex != null ? [demoImageUrl(def.attachCoverIndex)] : [],
      timeline: def.timeline,
      status: def.status,
      inbox_priority: def.priority,
      created_at: new Date(now - def.daysAgo * 86_400_000).toISOString(),
      updated_at: new Date(now - def.daysAgo * 86_400_000).toISOString(),
      cancel_reason: null,
      reject_reason: def.status === "declined" ? "busy_now" : null,
      reject_note: null,
      keep_chat: null,
      linked_project_id: null,
    };
  });
}

export function mergeCollabInboxMocks<T extends { id: string }>(
  rows: T[],
  recipientId: string | undefined,
): T[] {
  if (!canUseCollabInboxMocks() || !recipientId) return rows;
  const mocks = buildCollabInboxMockRequests(recipientId) as T[];
  const existing = new Set(rows.map((row) => row.id));
  return [...mocks.filter((row) => !existing.has(row.id)), ...rows];
}
