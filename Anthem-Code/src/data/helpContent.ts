import { FORUM_PATH } from "@/lib/brandConfig";
import type { LucideIcon } from "lucide-react";
import {
  Compass,
  FolderKanban,
  MessageSquare,
  Search,
  Shield,
  UserRound,
} from "lucide-react";

export type HelpArticle = {
  slug: string;
  title: string;
  summary: string;
  /** Plain paragraphs; keep short and actionable */
  body: string[];
  steps?: string[];
  /** In-app deep links shown as CTAs */
  links?: { label: string; to: string; auth?: boolean }[];
  related?: string[];
  popular?: boolean;
  keywords?: string[];
};

export type HelpCategory = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  /** When set, hub card goes here instead of `/help/:id` (e.g. full Legal). */
  hubTo?: string;
  /** Footer label on hub card when hubTo is set */
  hubMeta?: string;
  articles: HelpArticle[];
};

export const HELP_CATEGORIES: HelpCategory[] = [
  {
    id: "account",
    title: "เริ่มต้นและบัญชี",
    description: "สมัคร ล็อกอิน โปรไฟล์ และการตั้งค่า",
    icon: UserRound,
    articles: [
      {
        slug: "signup-login",
        title: "สมัครและเข้าสู่ระบบยังไง",
        summary: "สร้างบัญชีแล้วเริ่มสำรวจหรือลงผลงานได้ทันที",
        body: [
          "กดเข้าสู่ระบบจากเมนูด้านบนหรือเมื่อระบบขอให้ล็อกอินก่อนทำแอ็กชัน เช่น ลงผลงาน แชท หรือบันทึกงาน",
          "ใช้วิธีที่ระบบรองรับบนหน้า Auth แล้วกลับไปหน้าที่คุณค้างไว้ได้",
        ],
        steps: [
          "เปิดหน้าเข้าสู่ระบบ",
          "สมัครหรือล็อกอินด้วยวิธีที่สะดวก",
          "กลับไป Explore หรือไปตั้งโปรไฟล์ต่อ",
        ],
        links: [
          { label: "เข้าสู่ระบบ", to: "/auth" },
          { label: "ตั้งค่าโปรไฟล์", to: "/settings", auth: true },
        ],
        related: ["edit-profile", "notifications"],
        popular: true,
        keywords: ["สมัคร", "ล็อกอิน", "login", "บัญชี"],
      },
      {
        slug: "edit-profile",
        title: "ตั้งโปรไฟล์และรูปโปรไฟล์",
        summary: "ทำให้คนเห็นสไตล์และสถานะรับโอกาสของคุณชัดขึ้น",
        body: [
          "โปรไฟล์คือหน้าบ้านของคุณบน Aplus1 — ชื่อ รูป และสถานะรับโอกาสช่วยให้คนที่สนใจงานรู้ว่าจะทักเรื่องอะไร",
          "อัปเดตรูปและข้อมูลสั้นๆ ให้ตรงกับงานที่คุณโชว์",
        ],
        steps: [
          "ไปที่ตั้งค่าหรือหน้าโปรไฟล์ของคุณ",
          "ใส่ชื่อที่ใช้อ้างอิงได้ และอัปโหลดรูปที่เห็นใบหน้าหรือสไตล์ชัด",
          "บันทึกแล้วเปิดดูโปรไฟล์สาธารณะอีกครั้ง",
        ],
        links: [
          { label: "ตั้งค่า", to: "/settings", auth: true },
          { label: "พอร์ตโฟลิโอของฉัน", to: "/portfolio", auth: true },
        ],
        related: ["opportunity-status", "signup-login"],
        keywords: ["โปรไฟล์", "รูป", "ชื่อ"],
      },
      {
        slug: "notifications",
        title: "การแจ้งเตือน",
        summary: "ดูคำขอ แชท และอัปเดตสำคัญในที่เดียว",
        body: [
          "การแจ้งเตือนรวมเรื่องที่เกี่ยวกับคุณ เช่น คนสนใจผลงาน คำขอคุย หรือข้อความใหม่",
          "เปิดหน้าแจ้งเตือนเป็นประจำเมื่อคุณเปิดรับโอกาส เพื่อไม่พลาดการคุยจากผลงาน",
        ],
        links: [
          { label: "เปิดการแจ้งเตือน", to: "/notifications", auth: true },
          { label: "ตั้งค่า", to: "/settings", auth: true },
        ],
        related: ["chat-from-project", "hire-vs-collab"],
        keywords: ["แจ้งเตือน", "notification"],
      },
      {
        slug: "password-security",
        title: "เปลี่ยนรหัสผ่านและความปลอดภัยบัญชี",
        summary: "รีเซ็ตรหัสผ่านเมื่อเข้าไม่ได้ และดูแลบัญชีให้ปลอดภัย",
        body: [
          "ถ้าลืมรหัสผ่าน ใช้ลิงก์ลืมรหัสผ่านบนหน้า Auth แล้วทำตามอีเมลที่ระบบส่งให้",
          "อย่าแชร์รหัสผ่านหรือลิงก์รีเซ็ตกับผู้อื่น",
        ],
        links: [
          { label: "ลืมรหัสผ่าน", to: "/auth/forgot" },
          { label: "ตั้งค่า", to: "/settings", auth: true },
        ],
        related: ["signup-login", "data-rights"],
        keywords: ["รหัสผ่าน", "password", "ลืม"],
      },
      {
        slug: "data-rights",
        title: "สิทธิข้อมูลและลบบัญชี",
        summary: "ดูสิทธิเจ้าของข้อมูลตาม PDPA และช่องทางติดต่อ",
        body: [
          "คุณมีสิทธิ์เข้าถึง แก้ไข หรือขอลบข้อมูลส่วนบุคคลตามที่ระบุในนโยบายความเป็นส่วนตัว",
          "ขั้นตอนและช่องทางติดต่ออยู่ที่หน้าสิทธิเจ้าของข้อมูล",
        ],
        links: [
          { label: "สิทธิเจ้าของข้อมูล", to: "/legal/rights" },
          { label: "นโยบายความเป็นส่วนตัว", to: "/legal/privacy" },
        ],
        related: ["community-rules", "password-security"],
        keywords: ["ลบบัญชี", "PDPA", "ข้อมูล"],
      },
    ],
  },
  {
    id: "portfolio",
    title: "ลงผลงานและพอร์ตโฟลิโอ",
    description: "อัปโหลดงานจริง ใส่บริบท และจัดการการมองเห็น",
    icon: FolderKanban,
    articles: [
      {
        slug: "first-project",
        title: "ลงผลงานชิ้นแรกยังไง",
        summary: "เริ่มจาก 1–3 ชิ้นที่มีบริบทชัด ดีกว่ารายการยาวที่ว่างเปล่า",
        body: [
          "Aplus1 โฟกัสผลงานจริงพร้อมบริบท — คนดูจะเข้าใจศักยภาพจากงาน ไม่ใช่แค่ภาพสวย",
          "เริ่มจากชิ้นที่คุณภูมิใจและอธิบายบทบาทได้ชัด แล้วค่อยเติมทีหลัง",
        ],
        steps: [
          "เตรียมรูปปกที่อ่านงานได้ชัด",
          "ตั้งชื่อสั้น ตรงประเภทงาน",
          "เลือกหมวดที่ถูกต้อง",
          "ใส่บทบาทของคุณในชิ้นงาน",
          "เผยแพร่เมื่อพร้อมให้คนเห็นและคุยต่อได้",
        ],
        links: [
          { label: "ลงผลงาน", to: "/portfolio/new", auth: true },
          { label: "จัดการผลงาน", to: "/portfolio", auth: true },
        ],
        related: ["project-context", "visibility", "categories-tags"],
        popular: true,
        keywords: ["ลงผลงาน", "ชิ้นแรก", "พอร์ตโฟลิโอ", "publish"],
      },
      {
        slug: "project-context",
        title: "ใส่บทบาท กระบวนการ และผลลัพธ์",
        summary: "บริบทช่วยให้คนจ้างเข้าใจศักยภาพเร็วขึ้น",
        body: [
          "บอกบทบาทของคุณ เครื่องมือ/กระบวนการ และผลลัพธ์หรือสิ่งที่ได้เรียนรู้",
          "ข้อความสั้นๆ ที่จริงก็พอ — ไม่ต้องเขียนยาวแบบรีซูเม่",
        ],
        links: [
          { label: "ลงผลงาน", to: "/portfolio/new", auth: true },
        ],
        related: ["first-project", "catalog"],
        keywords: ["บริบท", "บทบาท", "ผลลัพธ์", "context"],
      },
      {
        slug: "categories-tags",
        title: "หมวดงานและแท็ก",
        summary: "เลือกหมวดให้ตรง เพื่อให้คนค้นพบงานได้ถูกทาง",
        body: [
          "หมวดงานช่วยให้ Explore และตัวกรองพาคนที่สนใจสไตล์แบบคุณมาเจองาน",
          "ถ้างานข้ามหลายประเภท เลือกหมวดหลักที่คนจะค้นหางานชิ้นนี้มากที่สุด",
        ],
        related: ["explore-basics", "first-project"],
        keywords: ["หมวด", "แท็ก", "category"],
      },
      {
        slug: "catalog",
        title: "จัด Catalog / Series บนโปรไฟล์",
        summary: "จัดกลุ่มผลงานที่เกี่ยวข้องให้อยู่ด้วยกัน",
        body: [
          "Catalog หรือ Series ช่วยให้โปรไฟล์ดูเป็นระบบ เช่น งานแบรนด์ชุดหนึ่ง หรืองาน UI ชุดหนึ่ง",
          "จัดกลุ่มเมื่องานเริ่มมีหลายชิ้น — ไม่จำเป็นต้องทำตั้งแต่ชิ้นแรก",
        ],
        links: [
          { label: "จัดการผลงาน", to: "/portfolio", auth: true },
        ],
        related: ["first-project", "visibility"],
        keywords: ["catalog", "series", "จัดกลุ่ม"],
      },
      {
        slug: "visibility",
        title: "สาธารณะ ซ่อน หรือลบผลงาน",
        summary: "ควบคุมว่าใครเห็นงานชิ้นไหนได้",
        body: [
          "จัดการการมองเห็นจากหน้าจัดการผลงาน — ซ่อนเมื่อยังไม่พร้อมโชว์ หรือลบเมื่อไม่ต้องการแล้ว",
          "งานสาธารณะเท่านั้นที่คนอื่นค้นพบและคุยต่อจากผลงานนั้นได้",
        ],
        links: [
          { label: "จัดการผลงาน", to: "/portfolio", auth: true },
        ],
        related: ["first-project", "why-not-on-explore"],
        popular: true,
        keywords: ["ซ่อน", "ลบ", "สาธารณะ", "visibility"],
      },
      {
        slug: "edit-after-publish",
        title: "แก้ผลงานหลังเผยแพร่",
        summary: "อัปเดตรูป คำอธิบาย หรือบริบทได้ทีหลัง",
        body: [
          "เปิดงานจากหน้าจัดการผลงานแล้วแก้ไข — บันทึกเมื่อข้อมูลใหม่พร้อม",
          "ถ้าเปลี่ยนหมวดหรือปก อาจใช้เวลาสักครู่กว่าการค้นพบจะสะท้อนตาม",
        ],
        links: [
          { label: "จัดการผลงาน", to: "/portfolio", auth: true },
        ],
        related: ["visibility", "project-context"],
        keywords: ["แก้", "แก้ไข", "edit"],
      },
    ],
  },
  {
    id: "explore",
    title: "Explore และค้นพบ",
    description: "เลื่อนดูผลงาน กรองสไตล์ และบันทึกงานที่ชอบ",
    icon: Compass,
    articles: [
      {
        slug: "explore-basics",
        title: "Explore ผลงานกับค้นหาดีไซเนอร์",
        summary: "เริ่มจากสไตล์งานจริง แล้วค่อยเปิดโปรไฟล์คน",
        body: [
          "โหมดผลงานให้คุณเลื่อนดูงานจริงก่อน ส่วนโหมดดีไซเนอร์เน้นคนและโปรไฟล์",
          "เลือกตามเป้าหมาย — หาสไตล์ใกล้โจทย์ หรือหาคนที่เปิดรับโอกาส",
        ],
        links: [{ label: "ไป Explore", to: "/" }],
        related: ["filter-style", "collections"],
        popular: true,
        keywords: ["explore", "ค้นหา", "ดีไซเนอร์", "ฟีด"],
      },
      {
        slug: "filter-style",
        title: "กรองหมวดและสไตล์",
        summary: "เจองานที่ใกล้โจทย์เร็วขึ้นด้วยตัวกรอง",
        body: [
          "ใช้หมวดและตัวกรองบน Explore เพื่อแคบลงตามประเภทงานหรือเครื่องมือ",
          "ถ้าผลลัพธ์น้อย ลองขยายหมวดหรือเลื่อนดูแบบกว้างก่อนแล้วค่อยกรอง",
        ],
        links: [{ label: "ไป Explore", to: "/" }],
        related: ["explore-basics", "why-not-on-explore"],
        keywords: ["กรอง", "หมวด", "filter"],
      },
      {
        slug: "collections",
        title: "บันทึกงานและคอลเลกชัน",
        summary: "เก็บ shortlist ก่อนทักหรือเปรียบเทียบสไตล์",
        body: [
          "บันทึกงานที่ชอบไว้ในคอลเลกชัน เพื่อกลับมาดูหรือเปรียบเทียบก่อนคุย",
          "ต้องล็อกอินก่อนบันทึก — งานที่บันทึกอยู่ที่หน้าคอลเลกชันของคุณ",
        ],
        links: [
          { label: "คอลเลกชันของฉัน", to: "/collections", auth: true },
        ],
        related: ["hirer-shortlist", "chat-from-project"],
        popular: true,
        keywords: ["บันทึก", "คอลเลกชัน", "save", "collection"],
      },
      {
        slug: "inspire",
        title: "Inspire คืออะไร",
        summary: "บอร์ดอ้างอิงและแรงบันดาลใจสำหรับงานต่อไป",
        body: [
          "Inspire ใช้เก็บไอเดียและภาพอ้างอิง ไม่ใช่พอร์ตโฟลิโอหลักที่คนจ้างค้นพบ",
          "ใช้คู่กับผลงานจริงบนโปรไฟล์เมื่อพร้อมรับโอกาส",
        ],
        links: [
          { label: "เปิด Inspire", to: "/portfolio?tab=inspire", auth: true },
        ],
        related: ["collections", "first-project"],
        keywords: ["inspire", "แรงบันดาลใจ"],
      },
      {
        slug: "why-not-on-explore",
        title: "ทำไมยังไม่เห็นงานของฉันบน Explore",
        summary: "เช็คการมองเห็น หมวด และสถานะเผยแพร่",
        body: [
          "งานต้องเผยแพร่และมองเห็นสาธารณะจึงจะถูกค้นพบได้",
          "ตรวจหมวด การมองเห็น และลองรีเฟรช Explore — ถ้ายังไม่ขึ้น ให้ถามใน Forum หรือติดต่อซัพพอร์ต",
        ],
        steps: [
          "เปิดจัดการผลงาน ตรวจว่าเผยแพร่แล้วและเป็นสาธารณะ",
          "ตรวจหมวดงาน",
          "รอสักครู่แล้วค้นหาจากโปรไฟล์ตัวเองอีกครั้ง",
        ],
        links: [
          { label: "จัดการผลงาน", to: "/portfolio", auth: true },
          { label: "Forum", to: FORUM_PATH },
        ],
        related: ["visibility", "categories-tags"],
        keywords: ["ไม่ขึ้น", "ไม่เจอ", "explore"],
      },
    ],
  },
  {
    id: "opportunity",
    title: "โอกาส แชท และการคุยจากผลงาน",
    description: "สถานะรับโอกาส แชทจากงานจริง และคำขอจ้าง/คอลแลป",
    icon: MessageSquare,
    articles: [
      {
        slug: "opportunity-status",
        title: "ตั้งสถานะรับโอกาส",
        summary: "บอกว่างานแบบไหนที่คุณเปิดรับอยู่",
        body: [
          "สถานะรับโอกาสช่วยให้คนที่ใช่รู้ว่าจะทักเรื่องจ้างงาน คอลแลป หรือแค่คุยต่อได้",
          "อัปเดตเมื่อตารางเปลี่ยน — ไม่ต้องเปิดรับทุกอย่างตลอดเวลา",
        ],
        links: [
          { label: "ตั้งค่าโปรไฟล์", to: "/settings", auth: true },
        ],
        related: ["hire-vs-collab", "chat-from-project"],
        keywords: ["สถานะ", "รับโอกาส", "เปิดรับ"],
      },
      {
        slug: "chat-from-project",
        title: "คุยต่อจากผลงานนี้คืออะไร",
        summary: "เริ่มแชทโดยอ้างอิงชิ้นงานที่เห็นร่วมกัน",
        body: [
          "เมื่อมีคนกดคุยจากผลงาน แชทจะผูกกับบริบทงานชิ้นนั้น — ไม่ต้องเล่าพอร์ตทั้งก้อนใหม่",
          "ฝั่งครีเอเตอร์จะรู้ทันทีว่างานไหนที่เขาสนใจ",
        ],
        links: [
          { label: "เปิดแชท", to: "/chat", auth: true },
          { label: "ไป Explore", to: "/" },
        ],
        related: ["hire-vs-collab", "chat-offers"],
        popular: true,
        keywords: ["คุยต่อ", "แชท", "จากผลงาน", "hire", "inquiry"],
      },
      {
        slug: "hire-vs-collab",
        title: "จ้างงานกับคอลแลปต่างกันยังไง",
        summary: "เลือกคำให้ตรงเจตนาตอนทัก",
        body: [
          "จ้างงาน = มีโจทย์ ขอบเขต และงบชัดเจน",
          "คอลแลป = ร่วมงานหรือแลกสกิล ไม่จำเป็นต้องเป็นจ้างเต็มรูปแบบ",
          "ใช้คำให้ตรง จะได้เริ่มคุยได้เร็วและไม่เข้าใจผิด",
        ],
        related: ["chat-from-project", "opportunity-status", "hirer-brief"],
        popular: true,
        keywords: ["จ้าง", "คอลแลป", "hire", "collab"],
      },
      {
        slug: "start-chat",
        title: "เริ่มแชทและดูบริบทงานในแชท",
        summary: "คุยรายละเอียดต่อจากงานที่อ้างอิง",
        body: [
          "เปิดแชทจากรายการของคุณ ดูข้อความและบริบทงานที่ผูกไว้",
          "สรุปโจทย์ ไทม์ไลน์ และขอบเขตสั้นๆ ในข้อความแรกจะช่วยให้คุยต่อได้เร็ว",
        ],
        links: [
          { label: "เปิดแชท", to: "/chat", auth: true },
          { label: "แดชบอร์ดคำขอ", to: "/dashboard", auth: true },
        ],
        related: ["chat-from-project", "chat-offers"],
        keywords: ["แชท", "ข้อความ", "chat"],
      },
      {
        slug: "chat-offers",
        title: "ใบเสนอราคาในแชท",
        summary: "สรุปขอบเขตและราคาในบทสนทนาเมื่อพร้อม",
        body: [
          "เมื่อคุยรายละเอียดงานพอแล้ว ใช้ใบเสนอราคาในแชทเพื่อสรุปขอบเขตและราคาให้อ่านชัด",
          "ยังคุยรายละเอียดงานในแชทได้ตามปกติก่อนส่งใบเสนอราคา",
        ],
        links: [
          { label: "เปิดแชท", to: "/chat", auth: true },
        ],
        related: ["start-chat", "hire-vs-collab"],
        keywords: ["ใบเสนอราคา", "offer", "quotation"],
      },
      {
        slug: "hire-collab-requests",
        title: "ดูคำขอจ้างและคอลแลป",
        summary: "ติดตามคำขอที่เข้ามาจากแดชบอร์ด",
        body: [
          "คำขอที่เกี่ยวข้องกับการจ้างหรือคอลแลปอยู่ในแดชบอร์ด — เปิดดูแล้วตอบกลับในแชท",
          "ตั้งสถานะรับโอกาสให้ตรง เพื่อให้คำขอที่เข้ามาตรงกับที่คุณพร้อมรับ",
        ],
        links: [
          { label: "แดชบอร์ดจ้างงาน", to: "/dashboard", auth: true },
          { label: "แดชบอร์ดคอลแลป", to: "/dashboard/collab", auth: true },
        ],
        related: ["opportunity-status", "notifications"],
        keywords: ["คำขอ", "hire request", "collab"],
      },
    ],
  },
  {
    id: "hirers",
    title: "คนจ้าง / ให้โอกาส",
    description: "หาคนจากผลงานจริง แล้วทักด้วยโจทย์สั้นๆ",
    icon: Search,
    articles: [
      {
        slug: "find-from-work",
        title: "หาครีเอเตอร์จากผลงานยังไง",
        summary: "ดูสไตล์ก่อน แล้วค่อยเปิดโปรไฟล์",
        body: [
          "เริ่มจาก Explore เลื่อนดูงานที่ใกล้โจทย์ เปิดชิ้นที่ชอบ แล้วดูโปรไฟล์และผลงานอื่นของคนนั้น",
          "Aplus1 ไม่ได้เริ่มจากแพ็กเกจราคา — โฟกัสคุณภาพงานและบริบท",
        ],
        links: [{ label: "ไป Explore", to: "/" }],
        related: ["hirer-brief", "hirer-shortlist"],
        popular: true,
        keywords: ["หาคน", "จ้าง", "ครีเอเตอร์", "hirer"],
      },
      {
        slug: "hirer-brief",
        title: "สรุปโจทย์สั้นๆ ก่อนทัก",
        summary: "1–3 ประโยค งบคร่าวๆ และไทม์ไลน์ช่วยให้คุยต่อได้เร็ว",
        body: [
          "บอกโจทย์สั้นๆ สิ่งที่ชอบในผลงานชิ้นที่อ้างอิง และช่วงเวลาที่คาดหวัง",
          "ถ้ามีงบคร่าวๆ ใส่ได้ — ไม่ต้องละเอียดตั้งแต่วันแรก",
        ],
        steps: [
          "สรุปโจทย์ 1–3 ประโยค",
          "อ้างอิงผลงานบน Aplus1 ที่ชอบ",
          "บอกไทม์ไลน์หรืองบคร่าวๆ (ถ้ามี)",
          "กดคุยต่อจากผลงานนั้น",
        ],
        related: ["chat-from-project", "find-from-work"],
        keywords: ["โจทย์", "brief", "ทัก"],
      },
      {
        slug: "hirer-shortlist",
        title: "บันทึกคอลเลกชันเพื่อเปรียบเทียบ",
        summary: "เก็บหลายชิ้นไว้ shortlist ก่อนตัดสินใจทัก",
        body: [
          "บันทึกงานที่ใกล้เคียงหลายชิ้น เปรียบเทียบสไตล์ แล้วค่อยทักคนที่ฟิตที่สุด",
          "ช่วยลดการทักรัวๆ โดยยังไม่มีโจทย์ชัด",
        ],
        links: [
          { label: "คอลเลกชัน", to: "/collections", auth: true },
        ],
        related: ["collections", "hirer-brief"],
        keywords: ["shortlist", "เปรียบเทียบ", "บันทึก"],
      },
      {
        slug: "not-job-board",
        title: "Aplus1 ไม่ใช่จ็อบบอร์ดแบบประกาศก่อน",
        summary: "โฟกัสผลงานจริงเป็นประตูสู่โอกาส",
        body: [
          "ลูปหลักคือดูงาน → เข้าใจสไตล์ → คุยจากชิ้นนั้น ไม่ใช่เริ่มจากประกาศงานยาวหรือแพ็กเกจราคา",
          "ถ้าอยากเข้าใจแนวคิดเต็มๆ อ่านหน้า Learn more ได้",
        ],
        links: [
          { label: "Learn more", to: "/learn" },
          { label: "ลูปโอกาส", to: "/learn#opportunity-loop" },
        ],
        related: ["find-from-work", "chat-from-project"],
        keywords: ["จ็อบบอร์ด", "marketplace", "ต่างจาก"],
      },
      {
        slug: "is-it-free",
        title: "ใช้ฟรีไหม",
        summary: "สำรวจ ลงผลงาน และคุยโอกาสได้จากบัญชีทั่วไป",
        body: [
          "เริ่มสำรวจ ลงผลงาน และคุยโอกาสได้จากบัญชีทั่วไป",
          "ถ้ามีฟีเจอร์พรีเมียมในภายหลัง ระบบจะบอกชัดในหน้าที่เกี่ยวข้อง",
        ],
        related: ["signup-login", "first-project"],
        popular: true,
        keywords: ["ฟรี", "ราคา", "free"],
      },
    ],
  },
  {
    id: "safety",
    title: "ความปลอดภัยและนโยบาย",
    description: "กฎชุมชน รายงานปัญหา และเอกสารกฎหมาย",
    icon: Shield,
    hubTo: "/legal",
    hubMeta: "เอกสารกฎหมายทั้งหมด",
    articles: [
      {
        slug: "community-rules",
        title: "กฎชุมชน",
        summary: "สิ่งที่ทำได้และไม่ได้บน Aplus1",
        body: [
          "อ่านกฎชุมชนก่อนโพสต์หรือโต้ตอบ เพื่อให้พื้นที่ปลอดภัยสำหรับทุกคน",
          "การละเมิดอาจถูกจำกัดการใช้งานตามที่ระบุในกฎ",
        ],
        links: [{ label: "กฎชุมชน", to: "/legal/community" }],
        related: ["report-content", "copyright"],
        keywords: ["กฎ", "community", "guideline"],
      },
      {
        slug: "report-content",
        title: "รายงานผู้ใช้หรือเนื้อหา",
        summary: "แจ้งเนื้อหาไม่เหมาะสมหรือพฤติกรรมที่ละเมิดกฎ",
        body: [
          "ใช้ปุ่มรายงานบนโพสต์ โปรไฟล์ หรือบริบทที่เกี่ยวข้องเมื่อเจอสิ่งที่ไม่ปลอดภัยหรือผิดกฎ",
          "รายงานที่คุณส่งช่วยให้ทีมตรวจสอบ — ไม่แชร์รายละเอียดละเอียดอ่อนในที่สาธารณะ",
        ],
        links: [
          { label: "กฎชุมชน", to: "/legal/community" },
          { label: "Forum", to: FORUM_PATH },
        ],
        related: ["community-rules", "copyright"],
        keywords: ["รายงาน", "report", "abuse"],
      },
      {
        slug: "copyright",
        title: "แจ้งละเมิดลิขสิทธิ์",
        summary: "ช่องทางแจ้งเมื่อผลงานถูกใช้โดยไม่ได้รับอนุญาต",
        body: [
          "ถ้าพบการละเมิดลิขสิทธิ์บนแพลตฟอร์ม ใช้หน้าแจ้งละเมิดและกรอกข้อมูลตามขั้นตอน",
          "อ่านหน้าทรัพย์สินทางปัญญาเพื่อเข้าใจความรับผิดชอบตอนลงผลงาน",
        ],
        links: [
          { label: "แจ้งละเมิด", to: "/legal/copyright-report" },
          { label: "ทรัพย์สินทางปัญญา", to: "/legal/ip" },
        ],
        related: ["community-rules", "report-content"],
        keywords: ["ลิขสิทธิ์", "copyright", "ละเมิด"],
      },
      {
        slug: "privacy-terms",
        title: "ความเป็นส่วนตัว ข้อกำหนด และคุกกี้",
        summary: "เอกสารกฎหมายหลักของบริการ",
        body: [
          "นโยบายความเป็นส่วนตัว อธิบายข้อมูลที่เก็บและวิธีใช้",
          "ข้อกำหนดการใช้ เป็นเงื่อนไขการใช้บริการ",
          "นโยบายคุกกี้ อธิบายคุกกี้และการตั้งค่าความยินยอม",
        ],
        links: [
          { label: "ดัชนีกฎหมาย", to: "/legal" },
          { label: "ความเป็นส่วนตัว", to: "/legal/privacy" },
          { label: "ข้อกำหนด", to: "/legal/terms" },
          { label: "คุกกี้", to: "/legal/cookies" },
        ],
        related: ["data-rights", "community-rules"],
        keywords: ["privacy", "terms", "คุกกี้", "PDPA"],
      },
      {
        slug: "contact-support",
        title: "ถามใน Forum หรือติดต่อซัพพอร์ต",
        summary: "เมื่อหาคำตอบใน Help ไม่เจอ",
        body: [
          "ถามใน Forum ได้ถ้าเป็นคำถามทั่วไปหรืออยากได้ความเห็นจากชุมชน",
          "เรื่องบัญชี ความปลอดภัย หรือข้อมูลส่วนบุคคล ใช้อีเมลซัพพอร์ตจะเหมาะกว่า",
        ],
        links: [
          { label: "Forum", to: FORUM_PATH },
        ],
        related: ["report-content", "data-rights"],
        keywords: ["ซัพพอร์ต", "ติดต่อ", "forum", "help", "support"],
      },
    ],
  },
];

export function getHelpCategory(id: string): HelpCategory | undefined {
  return HELP_CATEGORIES.find((c) => c.id === id);
}

export function getHelpArticle(
  categoryId: string,
  slug: string,
): { category: HelpCategory; article: HelpArticle } | undefined {
  const category = getHelpCategory(categoryId);
  if (!category) return undefined;
  const article = category.articles.find((a) => a.slug === slug);
  if (!article) return undefined;
  return { category, article };
}

export function findHelpArticleBySlug(
  slug: string,
): { category: HelpCategory; article: HelpArticle } | undefined {
  for (const category of HELP_CATEGORIES) {
    const article = category.articles.find((a) => a.slug === slug);
    if (article) return { category, article };
  }
  return undefined;
}

export function getPopularHelpArticles(): { category: HelpCategory; article: HelpArticle }[] {
  const out: { category: HelpCategory; article: HelpArticle }[] = [];
  for (const category of HELP_CATEGORIES) {
    for (const article of category.articles) {
      if (article.popular) out.push({ category, article });
    }
  }
  return out;
}

export function searchHelpArticles(query: string): { category: HelpCategory; article: HelpArticle }[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const tokens = q.split(/\s+/).filter(Boolean);
  const scored: { category: HelpCategory; article: HelpArticle; score: number }[] = [];

  for (const category of HELP_CATEGORIES) {
    for (const article of category.articles) {
      const hay = [
        article.title,
        article.summary,
        category.title,
        ...(article.keywords ?? []),
        ...article.body,
      ]
        .join(" ")
        .toLowerCase();
      let score = 0;
      for (const t of tokens) {
        if (article.title.toLowerCase().includes(t)) score += 4;
        if (article.summary.toLowerCase().includes(t)) score += 2;
        if ((article.keywords ?? []).some((k) => k.toLowerCase().includes(t))) score += 3;
        if (hay.includes(t)) score += 1;
      }
      if (score > 0) scored.push({ category, article, score });
    }
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .map(({ category, article }) => ({ category, article }));
}

export const HELP_HOT_KEYWORDS = [
  "ลงผลงาน",
  "แชท",
  "คอลเลกชัน",
  "บัญชี",
  "จ้างงาน",
  "ซ่อนงาน",
] as const;

export function articleCountLabel(n: number): string {
  return `${n} บทความ`;
}
