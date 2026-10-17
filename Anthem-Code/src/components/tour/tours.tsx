/**
 * Page tour scripts (Brand Book voice: short English label, plain Thai body, no hype).
 * Targets are `data-tour` attributes on the page; optional steps drop out when their target is not on screen.
 */
import type { GuideTourStep } from "@/components/tour/GuideTour";
import {
  ActionQueueScene,
  CollabPlanScene,
  CommandSearchScene,
  RequestStatusScene,
  SaveToCollectionScene,
  SwitchModeScene,
} from "@/components/tour/TourScenes";

export const HOME_TOUR: GuideTourStep[] = [
  {
    id: "welcome",
    title: "Welcome",
    body: "SAMECOR คือพื้นที่ให้ผลงานพาคุณไปเจอคนที่ใช่ พาดูหน้าแรกสั้น ๆ ดูอย่างเดียว ไม่ต้องกดอะไรจริง",
  },
  {
    id: "mode",
    title: "Projects or Designers",
    body: "ชี้หรือแตะที่คำนี้เพื่อสลับว่าจะดูผลงาน หรือดูครีเอเตอร์ ฟีดด้านล่างจะเปลี่ยนตาม",
    target: "home-mode",
    optional: true,
    scene: <SwitchModeScene />,
  },
  {
    id: "search",
    title: "Search",
    body: "พิมพ์สิ่งที่มองหา เช่น โลโก้ร้านกาแฟ หรือภาพประกอบสไตล์มินิมอล ระบบค้นจากผลงานจริง",
    target: "home-search",
    optional: true,
  },
  {
    id: "filters",
    title: "Filters",
    body: "กรองฟีดตามหมวด สไตล์ หรือสีของผลงาน ล้างตัวกรองได้ทุกเมื่อ",
    target: "home-toolbar",
    optional: true,
  },
  {
    id: "feed",
    title: "Save what you like",
    body: "เปิดผลงานเพื่อดูรายละเอียดและทักครีเอเตอร์ หรือกดบันทึกที่มุมภาพ ผลงานจะไปอยู่ใน Collections บนโปรไฟล์ของคุณ",
    target: "home-feed",
    optional: true,
    scene: <SaveToCollectionScene />,
  },
  {
    id: "create",
    title: "Show your work",
    body: "ปุ่มนี้ใช้ลงผลงาน เริ่มจาก 1–3 ชิ้นที่บอกตัวตนได้ดีที่สุด ใส่บริบทสั้น ๆ ว่าคุณทำส่วนไหน",
    target: "create",
    optional: true,
  },
  {
    id: "final",
    title: "You're set",
    body: "ดูทัวร์นี้อีกครั้งได้จากปุ่ม ? มุมซ้ายล่าง หรือในตั้งค่า → ข้อมูลและความช่วยเหลือ",
  },
];

export const STUDIO_TOUR: GuideTourStep[] = [
  {
    id: "welcome",
    title: "My Studio",
    body: "หลังบ้านของคุณ ที่รวมคำขอจ้าง คอลแลป ผลงาน และสิ่งที่ต้องทำวันนี้ไว้ในที่เดียว",
  },
  {
    id: "nav",
    title: "Menu",
    body: "เมนูแบ่งเป็นกลุ่ม ตัวเลขสีแดงคือเรื่องใหม่ที่ยังไม่ได้ตอบ ย่อเมนูได้จากปุ่มด้านบน",
    target: "studio-nav",
    optional: true,
  },
  {
    id: "search",
    title: "Search anything",
    body: "กด Ctrl K (Mac: ⌘K) หรือกดช่องนี้ เพื่อค้นหาผลงาน คำขอ หรือการตั้งค่า แล้วกระโดดไปที่นั่นทันที",
    target: "studio-search",
    optional: true,
    scene: <CommandSearchScene />,
  },
  {
    id: "queue",
    title: "Today",
    body: "คำขอจ้าง คำชวนคอลแลป และงานใกล้กำหนดส่งที่รอคุณ กดปุ่มที่แถวเพื่อเปิดคำขอนั้นตรง ๆ",
    target: "studio-queue",
    optional: true,
    scene: <ActionQueueScene />,
  },
  {
    id: "stats",
    title: "At a glance",
    body: "ตัวเลขสรุป: เรื่องที่รอตอบ งานจ้างทั้งหมด คนเข้าชม 7 วัน และผลงานที่เผยแพร่",
    target: "studio-stats",
    optional: true,
  },
  {
    id: "inbox",
    title: "Hire & Collab",
    body: "ในหน้างานจ้างและคอลแลป คำขอแบ่งตามสถานะ ติดต่อใหม่ → ตอบรับ → ปิดแล้ว ใช้ชิปด้านบนกรองได้",
    target: "studio-nav",
    optional: true,
    scene: <RequestStatusScene />,
  },
  {
    id: "final",
    title: "That's it",
    body: "ดูทัวร์นี้อีกครั้งได้จากปุ่ม ? ข้างหัวข้อหน้า หรือในตั้งค่า → ข้อมูลและความช่วยเหลือ",
  },
];

export const CHAT_TOUR: GuideTourStep[] = [
  {
    id: "welcome",
    title: "Chat",
    body: "ทุกการคุยเรื่องงานอยู่ที่นี่ ทั้งคำขอจ้าง คอลแลป และข้อความทั่วไป",
  },
  {
    id: "list",
    title: "Conversations",
    body: "รายการแชททั้งหมด เรียงตามข้อความล่าสุด แชทที่ยังไม่ได้อ่านจะเด่นขึ้นมา",
    target: "chat-list",
    optional: true,
  },
  {
    id: "thread",
    title: "Cards in chat",
    body: "คำขอ แผนงาน และสถานะต่าง ๆ จะขึ้นเป็นการ์ดในแชท กดปุ่มบนการ์ดเพื่อตอบรับหรือดูรายละเอียด",
    target: "chat-thread",
    optional: true,
  },
  {
    id: "plan",
    title: "Plan & Tasks",
    body: "แชทคอลแลปมีแผงด้านข้าง ตกลงแผน แบ่งงาน และติ๊กงานที่เสร็จไปด้วยกัน ทุกคนเห็นความคืบหน้าเหมือนกัน",
    target: "chat-side",
    optional: true,
    scene: <CollabPlanScene />,
  },
  {
    id: "composer",
    title: "Reply",
    body: "พิมพ์ตอบหรือแนบไฟล์ได้ที่นี่ ถ้าคอลแลปเงียบเกิน 7 วันและยังมีงานค้าง ระบบจะเตือนทุกคนในทีม",
    target: "chat-composer",
    optional: true,
  },
  {
    id: "final",
    title: "That's it",
    body: "ดูทัวร์นี้อีกครั้งได้จากปุ่ม ? ในหัวแชท หรือในตั้งค่า → ข้อมูลและความช่วยเหลือ",
  },
];
