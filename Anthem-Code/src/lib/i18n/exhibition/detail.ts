/** Event detail page: page body, actions (interest / share), gallery, summary panel, sponsor dialog. */
import type { Dict } from "@/lib/i18n";

export const DETAIL = {
  // ExhibitionDetailPage
  loadFailed: { th: "โหลดงานนี้ไม่สำเร็จ", en: "Couldn't load this event", zh: "无法加载此活动" },
  notFound: { th: "ไม่พบงานนี้", en: "Event not found", zh: "找不到此活动" },
  notFoundHint: {
    th: "งานอาจถูกถอน หรือยังไม่ผ่านการตรวจ",
    en: "It may have been withdrawn or not yet reviewed.",
    zh: "该活动可能已撤下，或尚未通过审核。",
  },
  seeAllExhibition: { th: "ดู Exhibition ทั้งหมด", en: "See all Exhibition", zh: "查看全部展览" },
  organizerWebsite: { th: "เว็บไซต์ผู้จัด", en: "Organizer's website", zh: "主办方网站" },
  organizerFallback: { th: "ผู้จัดงาน", en: "Organizer", zh: "主办方" },
  viewProfile: { th: "View Profile", en: "View Profile", zh: "查看主页" },
  message: { th: "Message", en: "Message", zh: "发消息" },
  sponsorLogo: { th: "โลโก้ {name}", en: "{name} logo", zh: "{name} 标志" },
  openForSponsorship: { th: "Open for Sponsorship", en: "Open for Sponsorship", zh: "招募赞助中" },
  sponsorMoreWanted: { th: "ยังรับผู้สนับสนุนเพิ่ม", en: "More sponsors welcome", zh: "仍在招募更多赞助" },
  sponsorWanted: { th: "งานนี้กำลังหาผู้สนับสนุน", en: "This event is looking for sponsors", zh: "此活动正在寻找赞助" },
  talkToOrganizer: { th: "คุยกับผู้จัดได้โดยตรง", en: "talk to the organizer directly", zh: "可直接联系主办方" },
  offerSponsorship: { th: "เสนอเป็นผู้สนับสนุน", en: "Offer to sponsor", zh: "申请赞助" },
  reportEvent: { th: "รายงานงานนี้", en: "Report this event", zh: "举报此活动" },
  draftNotice: {
    th: "หน้านี้มีแค่คุณและทีมงานที่เห็นจนกว่าจะเผยแพร่",
    en: "Only you and the team can see this page until it's published.",
    zh: "发布前只有你和团队能看到此页面。",
  },
  venueOf: { th: "สถานที่หนึ่งของ {title}", en: "A venue of {title}", zh: "{title} 的场地之一" },
  timeLabel: { th: "เวลา: {time}", en: "Time: {time}", zh: "时间：{time}" },
  addToGoogleCalendar: { th: "เพิ่มลง Google Calendar", en: "Add to Google Calendar", zh: "添加到 Google 日历" },
  eventEnded: { th: "งานนี้จบแล้ว", en: "This event has ended", zh: "此活动已结束" },
  docsAndLinks: { th: "เอกสารและลิงก์", en: "Documents and links", zh: "文件和链接" },
  contactDescription: {
    th: "ถามรายละเอียดงาน การเข้าร่วม หรือชวนคุยกับผู้จัดได้เลย — การ์ดงานนี้จะแนบไปกับข้อความ",
    en: "Ask about the event, how to join, or just say hi to the organizer — this event's card is attached to your message.",
    zh: "可询问活动详情、参与方式，或直接与主办方交流——此活动卡片会附在消息中。",
  },

  // EventActions
  viewCount: { th: "จำนวนครั้งที่เปิดดู", en: "Number of views", zh: "浏览次数" },
  viewsSr: { th: "ครั้งที่เปิดดู", en: "views", zh: "次浏览" },
  uninterestAria: { th: "เลิกสนใจงานนี้", en: "Remove interest in this event", zh: "取消关注此活动" },
  interestAria: {
    th: "สนใจงานนี้ (เตือนก่อนงานเริ่ม)",
    en: "Interested in this event (reminder before it starts)",
    zh: "关注此活动（开始前提醒）",
  },
  interested: { th: "สนใจแล้ว", en: "Interested", zh: "已关注" },
  interest: { th: "สนใจ", en: "I'm interested", zh: "关注" },
  interestedTip: {
    th: "สนใจแล้ว — เราจะเตือนก่อนงานเริ่ม 3 วันและ 1 วัน (กดอีกครั้งเพื่อยกเลิก)",
    en: "Interested — we'll remind you 3 days and 1 day before it starts (tap again to cancel)",
    zh: "已关注——我们会在活动开始前 3 天和 1 天提醒你（再点一次取消）",
  },
  interestTip: {
    th: "สนใจงานนี้ — เราจะเตือนก่อนงานเริ่ม 3 วันและ 1 วัน",
    en: "Interested — we'll remind you 3 days and 1 day before it starts",
    zh: "关注此活动——我们会在开始前 3 天和 1 天提醒你",
  },
  shareEvent: { th: "แชร์งานนี้", en: "Share this event", zh: "分享此活动" },
  share: { th: "แชร์", en: "Share", zh: "分享" },
  // useToggleEventInterest toasts
  interestSaved: {
    th: "บันทึกแล้ว — จะเตือนก่อนงานเริ่ม 3 วันและ 1 วัน",
    en: "Saved — we'll remind you 3 days and 1 day before it starts",
    zh: "已保存——将在活动开始前 3 天和 1 天提醒你",
  },

  // EventParts
  sourcedFrom: { th: "Event information sourced from", en: "Event information sourced from", zh: "活动信息来源：" },
  lastChecked: { th: "Last checked {date}", en: "Last checked {date}", zh: "最后核对于 {date}" },
  viewOriginal: { th: "View original", en: "View original", zh: "查看原文" },
  noImageYet: { th: "ยังไม่มีรูปจากผู้จัด", en: "No images from the organizer yet", zh: "主办方尚未提供图片" },
  imageOf: { th: "{title} — รูปที่ {i} จาก {n}", en: "{title} — image {i} of {n}", zh: "{title} — 第 {i} 张，共 {n} 张" },
  prevImage: { th: "รูปก่อนหน้า", en: "Previous image", zh: "上一张" },
  nextImage: { th: "รูปถัดไป", en: "Next image", zh: "下一张" },
  viewEvent: { th: "View Event", en: "View Event", zh: "查看活动" },

  // EventInsights (public panel)
  summaryBy: { th: "สรุปโดย SAMECOR", en: "Summary by SAMECOR", zh: "SAMECOR 摘要" },
  readFullDetails: {
    th: "อ่านรายละเอียดเต็มได้ที่เว็บไซต์ผู้จัด",
    en: "Read the full details on the organizer's website",
    zh: "完整详情请见主办方网站",
  },
  blockSteps: { th: "ขั้นตอน", en: "Steps", zh: "步骤" },
  blockEligibility: { th: "ใครสมัครได้", en: "Who can apply", zh: "申请资格" },
  blockBenefits: { th: "รางวัล / สิ่งที่ได้", en: "Prizes / what you get", zh: "奖励 / 收获" },
  blockBring: { th: "สิ่งที่ต้องเตรียม", en: "What to bring", zh: "需准备的物品" },
  blockSpeakers: { th: "วิทยากร", en: "Speakers", zh: "讲者" },
  blockSchedule: { th: "กำหนดการ", en: "Schedule", zh: "日程" },
  blockHighlights: { th: "ไฮไลต์", en: "Highlights", zh: "亮点" },
  blockWhoFor: { th: "เหมาะกับใคร", en: "Who it's for", zh: "适合人群" },
  blockTakeaways: { th: "จะได้อะไรกลับไป", en: "What you'll take away", zh: "你将收获什么" },
  blockKnowBefore: { th: "ก่อนไปควรรู้", en: "Good to know", zh: "出发前须知" },
  stepsApply: { th: "ขั้นตอนการสมัคร", en: "How to apply", zh: "申请步骤" },
  stepsBook: { th: "ขั้นตอนการจอง", en: "How to book", zh: "预约步骤" },
  stepsRegister: { th: "ขั้นตอนการลงทะเบียน", en: "How to register", zh: "报名步骤" },
  scheduleTickets: { th: "รอบ / บัตร", en: "Sessions / tickets", zh: "场次 / 门票" },
  stepsTickets: { th: "ขั้นตอนการซื้อบัตร", en: "How to buy tickets", zh: "购票步骤" },

  // SponsorOfferDialog (UI only; the message body stays Thai)
  sponsorIntro: {
    th: "แนะนำตัวสั้น ๆ ให้ {name} รู้ว่าคุณคือใครและช่วยอะไรได้ — ข้อความจะส่งเข้าแชทพร้อมการ์ดงานนี้",
    en: "Briefly tell {name} who you are and how you can help — your message goes to chat with this event's card.",
    zh: "简单向 {name} 介绍你是谁、能提供什么帮助——消息会连同此活动卡片发送到聊天。",
  },
  whoAreYou: { th: "คุณคือใคร", en: "Who are you", zh: "你是谁" },
  whoPlaceholder: { th: "ชื่อแบรนด์ / บริษัท / ตัวคุณ", en: "Brand / company / your name", zh: "品牌 / 公司 / 你的名字" },
  supportWhat: { th: "สนับสนุนเรื่องอะไร", en: "What can you support", zh: "可赞助什么" },
  supportFunding: { th: "เงินทุน", en: "Funding", zh: "资金" },
  supportVenue: { th: "สถานที่", en: "Venue", zh: "场地" },
  supportGoods: { th: "สินค้า / อุปกรณ์", en: "Products / equipment", zh: "产品 / 设备" },
  supportMedia: { th: "สื่อ / ประชาสัมพันธ์", en: "Media / PR", zh: "媒体 / 宣传" },
  supportFood: { th: "อาหาร / เครื่องดื่ม", en: "Food / drinks", zh: "餐饮" },
  supportOther: { th: "อื่น ๆ", en: "Other", zh: "其他" },
  roughDetails: { th: "รายละเอียดคร่าว ๆ", en: "Brief details", zh: "简要说明" },
  detailsPlaceholder: {
    th: "เช่น ให้ใช้พื้นที่ร้านจัดเวิร์กช็อปฟรี 1 วัน / สนับสนุนกระดาษพิมพ์ 500 แผ่น…",
    en: "e.g. free use of our shop for a one-day workshop / 500 sheets of printing paper…",
    zh: "例如：免费提供店铺场地举办一天工作坊 / 赞助 500 张打印纸……",
  },
  sendOffer: { th: "ส่งข้อเสนอ", en: "Send offer", zh: "发送申请" },
  sendOfferFailed: { th: "ส่งข้อเสนอไม่สำเร็จ", en: "Couldn't send the offer", zh: "申请发送失败" },
} satisfies Dict;
