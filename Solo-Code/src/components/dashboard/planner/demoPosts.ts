import { Post } from "./contentMeta";

// คำนวณวันที่อิงเดือนปัจจุบัน เพื่อให้ตัวอย่างขึ้นในปฏิทินที่ผู้ใช้กำลังดู
function dayInThisMonth(day: number, time: string) {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), day);
  return {
    date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    time,
  };
}

export const DEMO_CLIENT_ID = "__demo_client__";
export const DEMO_CLIENT_NAME = "ตัวอย่าง: Café Bloom";

export const DEMO_POSTS: Post[] = [
  {
    id: "demo-1",
    clientId: DEMO_CLIENT_ID,
    title: "เปิดตัวเมนูใหม่ ฤดูใบไม้ผลิ ☕",
    ...dayInThisMonth(5, "09:00"),
    platforms: ["instagram", "facebook"],
    status: "published",
  },
  {
    id: "demo-2",
    clientId: DEMO_CLIENT_ID,
    title: "Reels รีวิวลูกค้าประจำ",
    ...dayInThisMonth(12, "18:30"),
    platforms: ["tiktok", "instagram"],
    status: "approved",
  },
  {
    id: "demo-3",
    clientId: DEMO_CLIENT_ID,
    title: "โปรโมชั่นวันธรรมดา 1 แถม 1",
    ...dayInThisMonth(18, "11:00"),
    platforms: ["facebook"],
    status: "in_review",
  },
  {
    id: "demo-4",
    clientId: DEMO_CLIENT_ID,
    title: "วิดีโอแนะนำพนักงานใหม่",
    ...dayInThisMonth(22, "20:00"),
    platforms: ["youtube"],
    status: "draft",
  },
  {
    id: "demo-5",
    clientId: DEMO_CLIENT_ID,
    title: "Live ตอบคำถามแฟนๆ",
    ...dayInThisMonth(28, "19:00"),
    platforms: ["facebook", "instagram"],
    status: "draft",
  },
];
