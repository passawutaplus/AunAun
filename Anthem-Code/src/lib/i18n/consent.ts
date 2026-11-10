/** Cookie banner (first thing a new visitor sees, so it follows the reader's language). */
import type { Dict } from "./index";

export const CONSENT = {
  region: { th: "แบนเนอร์ความยินยอมคุกกี้", en: "Cookie consent", zh: "Cookie 同意" },
  title: {
    th: "เราใช้คุกกี้ตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA)",
    en: "We use cookies in line with Thailand's PDPA",
    zh: "我们依照泰国《个人数据保护法》(PDPA) 使用 Cookie",
  },
  acceptAll: { th: "ยอมรับทั้งหมด", en: "Accept all", zh: "全部接受" },
  essentialOnly: { th: "ปฏิเสธที่ไม่จำเป็น", en: "Essential only", zh: "仅必要" },
  closeEssential: { th: "ปิดและใช้คุกกี้จำเป็นเท่านั้น", en: "Close and use essential cookies only", zh: "关闭并仅使用必要 Cookie" },
  cookiePolicy: { th: "นโยบายคุกกี้", en: "Cookie policy", zh: "Cookie 政策" },
  privacy: { th: "ความเป็นส่วนตัว", en: "Privacy", zh: "隐私" },
  terms: { th: "ข้อกำหนด", en: "Terms", zh: "条款" },
} satisfies Dict;
