export type HttpErrorKind = "404" | "500" | "503" | "generic" | "article" | "token";

export type HttpErrorCopy = {
  code: number;
  titleTh: string;
  titleEn: string;
  descTh: string;
  descEn: string;
  taglineTh: string;
  taglineEn: string;
  hintTh?: string;
  hintEn?: string;
};

export const HTTP_ERROR_COPY: Record<HttpErrorKind, HttpErrorCopy> = {
  "404": {
    code: 404,
    titleTh: "หาไม่เจอหน้านี้",
    titleEn: "Page not found",
    descTh: "ลิงก์อาจผิดหรือหน้าถูกย้าย — ลองกลับหน้าแรก",
    descEn: "The link may be wrong or the page moved.",
    taglineTh: "",
    taglineEn: "",
    hintTh: "มั่นใจว่าหน้านี้ควรมีอยู่? แจ้งทีมงานได้",
    hintEn: "Think this page should exist? Contact support.",
  },
  "500": {
    code: 500,
    titleTh: "มีบางอย่างขัดข้อง",
    titleEn: "Something went wrong",
    descTh: "ทีมงานได้รับแจ้งแล้ว — ลองรีเฟรชหรือกลับมาใหม่",
    descEn: "Our team has been notified. Try refreshing.",
    taglineTh: "",
    taglineEn: "",
    hintTh: "ยังไม่หาย? ติดต่อทีมงานได้",
    hintEn: "Still stuck? Contact support.",
  },
  "503": {
    code: 503,
    titleTh: "กำลังปรับปรุงระบบ",
    titleEn: "Under maintenance",
    descTh: "อัปเดตเพื่อให้ So1o ลื่นขึ้น — กลับมาใหม่ในอีกสักครู่",
    descEn: "We're updating So1o. Back shortly.",
    taglineTh: "",
    taglineEn: "",
  },
  generic: {
    code: 0,
    titleTh: "โหลดหน้าไม่สำเร็จ",
    titleEn: "Page didn't load",
    descTh: "อาจเป็นเน็ตชั่วคราว — ลองกดลองใหม่",
    descEn: "Could be a connection issue. Try again.",
    taglineTh: "",
    taglineEn: "",
    hintTh: "ยังไม่ได้? ติดต่อทีมงานได้",
    hintEn: "Still stuck? Contact support.",
  },
  article: {
    code: 404,
    titleTh: "ไม่พบบทความนี้",
    titleEn: "Article not found",
    descTh: "อาจถูกลบ ยังไม่เผยแพร่ หรือลิงก์หมดอายุ — กลับหน้ารวมบทความ",
    descEn: "Removed, unpublished, or expired.",
    taglineTh: "",
    taglineEn: "",
  },
  token: {
    code: 404,
    titleTh: "ลิงก์ใช้ไม่ได้แล้ว",
    titleEn: "Invalid link",
    descTh: "หมดอายุหรือพิมพ์ไม่ครบ — ขอลิงก์ใหม่จากผู้ส่ง",
    descEn: "Expired or incomplete. Ask for a new link.",
    taglineTh: "",
    taglineEn: "",
    hintTh: "ยังมีปัญหา? แจ้งทีมงานได้",
    hintEn: "Still having trouble? Contact support.",
  },
};

export function resolveErrorKind(code?: number, kind?: HttpErrorKind): HttpErrorKind {
  if (kind) return kind;
  if (code === 404) return "404";
  if (code === 503) return "503";
  if (code && code >= 500) return "500";
  return "generic";
}
