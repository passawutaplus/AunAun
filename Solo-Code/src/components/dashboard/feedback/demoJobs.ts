import { FeedbackJob } from "./types";

export const DEMO_CLIENT_ID = "__demo_client__";
export const DEMO_CLIENT_NAME = "ตัวอย่าง: Café Bloom";

const today = new Date();
const iso = (offsetDays: number) =>
  new Date(today.getTime() - offsetDays * 86_400_000).toISOString();

export const DEMO_JOBS: FeedbackJob[] = [
  {
    id: "demo-job-1",
    title: "ออกแบบโลโก้ร้านใหม่",
    clientId: DEMO_CLIENT_ID,
    createdAt: iso(7),
    closed: false,
    revisions: [
      {
        id: "demo-rev-1a",
        round: 1,
        notes:
          "ลูกค้าชอบทิศทางที่ 2 มากที่สุด อยากให้ลองปรับสีให้สดใสขึ้น และเพิ่มสัญลักษณ์ดอกไม้เล็กๆ ใต้ตัวอักษร",
        images: [],
        status: "completed",
        createdAt: iso(6),
      },
      {
        id: "demo-rev-1b",
        round: 2,
        notes: "ปรับสีตามที่คุยแล้ว เพิ่มดอกไม้ใต้ตัวอักษรเรียบร้อย รอลูกค้าเช็คอีกรอบ",
        images: [],
        status: "in_progress",
        createdAt: iso(2),
      },
    ],
  },
  {
    id: "demo-job-2",
    title: "โปสเตอร์โปรโมชั่นเมษายน",
    clientId: DEMO_CLIENT_ID,
    createdAt: iso(20),
    closed: true,
    revisions: [
      {
        id: "demo-rev-2a",
        round: 1,
        notes: "ส่งดราฟต์แรก รอฟีดแบค",
        images: [],
        status: "completed",
        createdAt: iso(19),
      },
      {
        id: "demo-rev-2b",
        round: 2,
        notes: "ปรับฟอนต์หัวเรื่องและขยับวันที่ให้เห็นชัดขึ้น",
        images: [],
        status: "final",
        createdAt: iso(15),
      },
    ],
  },
];
