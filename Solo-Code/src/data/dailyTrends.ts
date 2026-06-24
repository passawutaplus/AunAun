import type { TrendIconKey } from "@/lib/trendIcons";

export interface DailyTrend {
  category: string;
  title: string;
  body: string;
  iconKey: TrendIconKey;
}

export const DAILY_TRENDS: DailyTrend[] = [
  {
    category: "สีเทรนด์",
    title: "Mocha Mousse — สีน้ำตาลกาแฟอบอุ่น",
    body: "Pantone Color of the Year 2025 ยังแรงต่อเนื่อง เหมาะกับงานแบรนด์ไลฟ์สไตล์, คาเฟ่, สินค้า Eco",
    iconKey: "palette",
  },
  {
    category: "Typography",
    title: "Variable Fonts กลับมาบูม",
    body: "Inter, Geist, Satoshi ครองวงการ UI — เลือกใช้ weight 400/600 คู่กันให้ hierarchy ชัด อ่านง่ายบนมือถือ",
    iconKey: "type",
  },
  {
    category: "AI Tools",
    title: "Photoshop Generative Expand แม่นขึ้น",
    body: "Adobe ปล่อยอัปเดตขยายภาพแบบ context-aware — ลดงาน retouch ได้ครึ่งหนึ่งสำหรับงาน banner",
    iconKey: "bot",
  },
  {
    category: "Design Style",
    title: "Brutalist Web ยังครองใจ",
    body: "ฟอนต์ใหญ่ คอนทราสต์จัด ขอบเหลี่ยม — เหมาะกับแบรนด์ที่อยากดูกล้า ต่างจากตลาด minimal",
    iconKey: "layout",
  },
  {
    category: "Motion",
    title: "Micro-interactions = ราคาบวก",
    body: "ลูกค้ายอมจ่ายเพิ่ม 20-40% สำหรับงานที่มี hover/scroll animation นุ่ม ๆ ลองใช้ Framer Motion",
    iconKey: "sparkles",
  },
  {
    category: "Pricing Tip",
    title: "อย่าลืมหัก WHT 3%",
    body: "ราคาเสนอควรบวก 3% เผื่อภาษีหัก ณ ที่จ่าย ถ้าลูกค้าเป็นนิติบุคคล — ใช้ Fair Price Calculator ใน So1o ช่วยได้",
    iconKey: "coins",
  },
  {
    category: "Workflow",
    title: "Figma Sites เปิดสาธารณะแล้ว",
    body: "ออกแบบใน Figma แล้ว publish เป็นเว็บได้เลย — เหมาะกับ landing page งานเล็ก ลดเวลาส่งงาน 50%",
    iconKey: "rocket",
  },
  {
    category: "Client Talk",
    title: "บรีฟต้องมี 'Why' เสมอ",
    body: "ก่อนเริ่มงาน ถามลูกค้าว่า 'เป้าหมายของชิ้นนี้คืออะไร?' จะลด revision ได้ถึง 60%",
    iconKey: "lightbulb",
  },
];
