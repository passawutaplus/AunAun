import type { Dict } from "@/lib/i18n";

/** Report dialog (ReportDialog) + evidence files (EvidenceUploader). */
export const REPORT = {
  triggerAria: { th: "รายงาน", en: "Report", zh: "举报" },
  title: { th: "รายงานเนื้อหานี้", en: "Report this content", zh: "举报此内容" },
  description: {
    th: "ทีมงานจะตรวจสอบและดำเนินการตามนโยบายชุมชน รายงานของคุณเป็นความลับ",
    en: "Our team will review it under the community guidelines. Your report is confidential.",
    zh: "团队将依据社区准则进行审核处理。你的举报将严格保密。",
  },
  verifyAction: { th: "ส่งรายงานเนื้อหา / การละเมิด", en: "Send a content / violation report", zh: "提交内容 / 违规举报" },

  // Reasons
  reason: { th: "เหตุผล", en: "Reason", zh: "原因" },
  spam: { th: "สแปม / โฆษณา", en: "Spam / advertising", zh: "垃圾信息 / 广告" },
  job_spam: { th: "ลงหางาน / ประกาศจ้างในฟอรัม", en: "Job ad posted in the forum", zh: "在论坛发布求职 / 招聘信息" },
  harassment: { th: "คุกคาม / Hate speech", en: "Harassment / hate speech", zh: "骚扰 / 仇恨言论" },
  nsfw: { th: "เนื้อหา 18+ / ไม่เหมาะสม", en: "18+ / inappropriate content", zh: "18+ / 不当内容" },
  copyright: { th: "ละเมิดลิขสิทธิ์", en: "Copyright infringement", zh: "侵犯版权" },
  ai_undisclosed: {
    th: "ไม่เปิดเผยการใช้ AI / เลือกระดับไม่ตรงงาน",
    en: "AI use not disclosed / wrong level chosen",
    zh: "未披露 AI 使用 / 所选级别与作品不符",
  },
  scam: { th: "หลอกลวง / Scam", en: "Scam / fraud", zh: "诈骗" },
  impersonation: { th: "ปลอมเป็นผู้อื่น", en: "Impersonation", zh: "冒充他人" },
  other: { th: "อื่นๆ", en: "Other", zh: "其他" },

  // Fields
  details: { th: "รายละเอียดเพิ่มเติม", en: "More details", zh: "补充说明" },
  detailsPlaceholder: {
    th: "อธิบายสถานการณ์ให้ทีมงานเข้าใจ (ไม่บังคับ)",
    en: "Tell our team what happened (optional)",
    zh: "向团队说明情况（选填）",
  },
  evidenceLinks: { th: "ลิงก์หลักฐาน (ไม่บังคับ)", en: "Evidence links (optional)", zh: "证据链接（选填）" },
  evidencePlaceholder: {
    th: "วาง URL คั่นด้วยช่องว่าง สูงสุด 3 ลิงก์",
    en: "Paste URLs separated by spaces, up to 3 links",
    zh: "粘贴网址，用空格分隔，最多 3 个",
  },
  attachments: { th: "ไฟล์แนบ", en: "Attachments", zh: "附件" },

  // Block
  blockAsk: { th: "จะบล็อกด้วยไหม?", en: "Block this user too?", zh: "同时屏蔽该用户吗？" },
  alreadyBlocked: { th: "คุณบล็อกผู้ใช้นี้อยู่แล้ว", en: "You have already blocked this user", zh: "你已屏蔽该用户" },
  blockToo: {
    th: "บล็อกผู้ใช้นี้ด้วย — จะส่งคำขอจ้างงานหรือคอลแลปหาคุณไม่ได้อีก จนกว่าคุณจะปลดบล็อกทีหลัง",
    en: "Block this user too — they can't send you hire or collab requests until you unblock them",
    zh: "同时屏蔽该用户 — 在你解除屏蔽之前，对方无法再向你发送雇佣或合作请求",
  },
  blockConfirmTitle: { th: "บล็อก {name}?", en: "Block {name}?", zh: "屏蔽 {name}？" },
  blockConfirmBody: {
    th: "คุณจะไม่เห็นผลงานและโพสต์ของกันและกัน และติดต่อกันไม่ได้ ปลดบล็อกได้ภายหลังที่หน้าโปรไฟล์ของผู้ใช้นี้",
    en: "You won't see each other's works and posts, and you won't be able to contact each other. You can unblock later from this user's profile.",
    zh: "你们将看不到彼此的作品和帖子，也无法互相联系。之后可在该用户的主页解除屏蔽。",
  },
  blockConfirm: { th: "บล็อก", en: "Block", zh: "屏蔽" },
  blocking: { th: "กำลังบล็อก...", en: "Blocking...", zh: "正在屏蔽..." },
  blockFailed: { th: "บล็อกไม่สำเร็จ", en: "Couldn't block", zh: "屏蔽失败" },
  thisUser: { th: "ผู้ใช้นี้", en: "this user", zh: "该用户" },
  chatBlockedByMe: {
    th: "คุณบล็อกผู้ใช้นี้อยู่ จึงส่งข้อความไม่ได้ ปลดบล็อกได้ที่หน้าโปรไฟล์ของผู้ใช้นี้",
    en: "You blocked this user, so you can't send messages. Unblock from this user's profile.",
    zh: "你已屏蔽该用户，无法发送消息。可在该用户的主页解除屏蔽。",
  },
  chatBlocked: {
    th: "ส่งข้อความถึงผู้ใช้นี้ไม่ได้ในขณะนี้",
    en: "You can't message this user right now.",
    zh: "目前无法向该用户发送消息。",
  },
  send: { th: "ส่งรายงาน", en: "Send report", zh: "提交举报" },
  sendAndBlock: { th: "ส่งรายงานและบล็อก", en: "Send report and block", zh: "提交举报并屏蔽" },

  // Evidence files
  maxFiles: { th: "แนบได้สูงสุด {n} ไฟล์", en: "You can attach up to {n} files", zh: "最多可添加 {n} 个文件" },
  tooLarge: { th: "{name} เกิน 10MB", en: "{name} is over 10MB", zh: "{name} 超过 10MB" },
  notMedia: { th: "{name} ไม่ใช่รูปหรือวิดีโอ", en: "{name} is not an image or a video", zh: "{name} 不是图片或视频" },
  uploadFailed: { th: "อัปโหลด {name} ไม่สำเร็จ", en: "Couldn't upload {name}", zh: "{name} 上传失败" },
  attachEvidence: { th: "แนบไฟล์หลักฐาน ({count}/{max})", en: "Attach evidence ({count}/{max})", zh: "添加证据文件（{count}/{max}）" },
  removeFile: { th: "ลบไฟล์", en: "Remove file", zh: "删除文件" },
  fileHint: {
    th: "รองรับรูปและวิดีโอ ≤10MB/ไฟล์ สูงสุด {n} ไฟล์",
    en: "Images and videos, up to 10MB each, {n} files max",
    zh: "支持图片和视频，每个不超过 10MB，最多 {n} 个",
  },
} satisfies Dict;
