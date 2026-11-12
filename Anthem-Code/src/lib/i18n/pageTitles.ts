import type { Dict } from "@/lib/i18n";

/**
 * Browser-tab titles (and a few descriptions) for pages whose title used to be Thai only.
 * Pass an entry straight to <SeoHead title={TITLES.notifications} />; it follows the UI language.
 * Titles that are already English for everyone ("Exhibition & Events") stay as plain strings.
 */
export const TITLES = {
  changelog: { th: "อัปเดตล่าสุด", en: "What's new", zh: "最新更新" },
  editExhibition: { th: "แก้ไข Exhibition", en: "Edit Exhibition", zh: "编辑 Exhibition" },
  notFound: { th: "ไม่พบหน้า", en: "Page not found", zh: "找不到页面" },
  notifications: { th: "การแจ้งเตือน", en: "Notifications", zh: "通知" },
  settings: { th: "ตั้งค่า", en: "Settings", zh: "设置" },
  chat: { th: "แชท", en: "Chat", zh: "聊天" },
  followers: { th: "ผู้ติดตาม", en: "Followers", zh: "粉丝" },
  setPassword: { th: "ตั้งรหัสผ่าน", en: "Set your password", zh: "设置密码" },
  jobsSeeking: { th: "โพสต์หางาน", en: "Looking for work", zh: "求职帖" },
  referral: { th: "ชวนเพื่อนรับ Pixel", en: "Invite friends, earn Pixel", zh: "邀请好友得 Pixel" },
  research: { th: "คู่มือ UX Research", en: "UX Research guide", zh: "UX Research 指南" },
  uxFeedback: { th: "ส่งผลการทดสอบ UX", en: "Submit UX test results", zh: "提交 UX 测试结果" },

  searchWorks: { th: "ค้นหาผลงาน", en: "Search works", zh: "搜索作品" },
  searchWorksDesc: { th: "ผลการค้นหาบน SAMECOR", en: "Search results on SAMECOR", zh: "SAMECOR 上的搜索结果" },
  savedPosts: { th: "โพสต์ที่บันทึก", en: "Saved posts", zh: "已保存的帖子" },
  savedPostsDesc: {
    th: "โพสต์ชุมชนที่คุณบันทึกไว้บน SAMECOR",
    en: "Community posts you saved on SAMECOR",
    zh: "你在 SAMECOR 保存的社区帖子",
  },

  profileNotFound: { th: "ไม่พบโปรไฟล์", en: "Profile not found", zh: "找不到个人主页" },
  profileUnavailable: { th: "โปรไฟล์ไม่พร้อมใช้งาน", en: "Profile unavailable", zh: "个人主页暂不可用" },
  packageNotFound: { th: "ไม่พบแพ็กเกจ", en: "Package not found", zh: "找不到服务套餐" },
  packageNotFoundDesc: {
    th: "แพ็กเกจนี้อาจถูกลบ หรือยังไม่เผยแพร่",
    en: "This package may have been removed or isn't published yet",
    zh: "该套餐可能已删除或尚未发布",
  },

  // My Studio
  studioBilling: { th: "My Studio — เอกสารและรายรับ", en: "My Studio — Documents & income", zh: "My Studio — 单据与收入" },
  studioDocuments: { th: "My Studio — เอกสาร / ภาษี", en: "My Studio — Documents / Tax", zh: "My Studio — 单据 / 税务" },
  studioInsights: { th: "My Studio — สถิติ", en: "My Studio — Insights", zh: "My Studio — 数据统计" },
  studioHire: { th: "My Studio — จ้างงาน", en: "My Studio — Hiring", zh: "My Studio — 雇佣" },
  studioCollab: { th: "My Studio — คอลแลป", en: "My Studio — Collab", zh: "My Studio — 合作" },
  studioPayout: { th: "My Studio — บัญชีรับเงิน", en: "My Studio — Payout account", zh: "My Studio — 收款账户" },
  studioReviews: { th: "My Studio — รีวิว", en: "My Studio — Reviews", zh: "My Studio — 评价" },
  studioTransactions: { th: "My Studio — ธุรกรรม", en: "My Studio — Transactions", zh: "My Studio — 交易记录" },
  studioWithdraw: { th: "My Studio — ถอนเงิน", en: "My Studio — Withdraw", zh: "My Studio — 提现" },
} satisfies Dict;
