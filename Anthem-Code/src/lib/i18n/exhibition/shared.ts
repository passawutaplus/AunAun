import type { Dict } from "@/lib/i18n";

/** Shared Exhibition strings used by lib helpers (exhibitionEvents.ts, eventVenues.ts) and the featured banner. */
export const EXHIBITION_SHARED = {
  // Categories (public pill). Thai UI shows the English names today.
  catExhibition: { th: "Exhibition", en: "Exhibition", zh: "展览" },
  catWorkshop: { th: "Workshop", en: "Workshop", zh: "工作坊" },
  catArtFair: { th: "Art Fair", en: "Art Fair", zh: "艺术博览会" },
  catTalkForum: { th: "Talk & Forum", en: "Talk & Forum", zh: "讲座与论坛" },
  catOpenCall: { th: "Open Call", en: "Open Call", zh: "公开征集" },
  catOther: { th: "Other", en: "Other", zh: "其他" },
  catEvent: { th: "Event", en: "Event", zh: "活动" },

  // Origin tags
  originOriginal: { th: "Organized by SAMECOR", en: "Organized by SAMECOR", zh: "SAMECOR 主办" },
  originCommunity: { th: "Submitted by Community", en: "Submitted by Community", zh: "社区投稿" },
  originCurated: { th: "Curated by SAMECOR", en: "Curated by SAMECOR", zh: "SAMECOR 精选" },

  // Main action button
  ctaTickets: { th: "ซื้อบัตร / Get Tickets", en: "Get Tickets", zh: "购票" },
  ctaApply: { th: "Apply Now", en: "Apply Now", zh: "立即申请" },
  ctaWorkshop: { th: "ลงทะเบียน Workshop", en: "Register for Workshop", zh: "报名工作坊" },
  ctaRegister: { th: "ลงทะเบียนเข้าร่วม", en: "Register", zh: "报名参加" },

  // Fees
  feeFree: { th: "เข้าชมฟรี", en: "Free admission", zh: "免费入场" },
  feePaid: { th: "มีค่าใช้จ่าย", en: "Paid", zh: "收费" },
  feePaidNote: { th: "มีค่าใช้จ่าย · {note}", en: "Paid · {note}", zh: "收费 · {note}" },
  feeUnspecified: { th: "ค่าเข้าชม: {ns}", en: "Admission: {ns}", zh: "门票：{ns}" },

  // Insight link kinds (button aria-label / title prefix)
  linkDownload: { th: "ดาวน์โหลด", en: "Download", zh: "下载" },
  linkForm: { th: "แบบฟอร์มสมัคร", en: "Application form", zh: "申请表" },
  linkRules: { th: "กติกา", en: "Rules", zh: "规则" },
  linkRegister: { th: "ลงทะเบียน", en: "Register", zh: "报名" },
  linkTickets: { th: "ซื้อบัตร / จอง", en: "Tickets / Booking", zh: "购票 / 预订" },
  linkInfo: { th: "รายละเอียด", en: "Details", zh: "详情" },
  linkText: { th: "{kind}: {label}", en: "{kind}: {label}", zh: "{kind}：{label}" },

  // Deadline countdown
  deadlineClosed: { th: "ปิดรับแล้ว", en: "Closed", zh: "已截止" },
  deadlineToday: { th: "ปิดรับวันนี้", en: "Closes today", zh: "今天截止" },
  deadlineTomorrow: { th: "ปิดรับพรุ่งนี้", en: "Closes tomorrow", zh: "明天截止" },
  deadlineInDays: { th: "ปิดรับใน {n} วัน", en: "Closes in {n} days", zh: "{n} 天后截止" },

  // Venue open state
  venueEnded: { th: "จบแล้ว", en: "Ended", zh: "已结束" },
  venueNotStarted: { th: "ยังไม่เริ่ม", en: "Not started yet", zh: "尚未开始" },
  venueDateTba: { th: "รอประกาศวันเปิด", en: "Opening date TBA", zh: "开放日期待公布" },
  venueClosedToday: { th: "ปิดวันนี้", en: "Closed today", zh: "今日闭馆" },
  venueOpenUntil: { th: "เปิดอยู่ · ถึง {time}", en: "Open · until {time}", zh: "开放中 · 至 {time}" },
  venueOpensAt: { th: "เปิด {time}", en: "Opens {time}", zh: "{time} 开放" },
  venueClosedNow: { th: "ปิดแล้ววันนี้", en: "Closed for today", zh: "今日已关闭" },

  // Featured countdown
  cdStartsTomorrow: { th: "เริ่มพรุ่งนี้", en: "Starts tomorrow", zh: "明天开始" },
  cdStartsIn: { th: "เริ่มใน {n} วัน", en: "Starts in {n} days", zh: "{n} 天后开始" },
  cdOnNow: { th: "กำลังจัด", en: "On now", zh: "进行中" },
  cdLastDay: { th: "กำลังจัด · วันสุดท้าย", en: "On now · Last day", zh: "进行中 · 最后一天" },
  cdLeftOne: { th: "กำลังจัด · เหลือ 1 วัน", en: "On now · 1 day left", zh: "进行中 · 剩 1 天" },
  cdLeft: { th: "กำลังจัด · เหลือ {n} วัน", en: "On now · {n} days left", zh: "进行中 · 剩 {n} 天" },

  // Distance / duration
  distKm: { th: "{n} กม.", en: "{n} km", zh: "{n} 公里" },
  distM: { th: "{n} ม.", en: "{n} m", zh: "{n} 米" },
  durHours: { th: "{n} ชม.", en: "{n} hr", zh: "{n} 小时" },
  durMinutes: { th: "{n} นาที", en: "{n} min", zh: "{n} 分钟" },
  routeWalk: { th: "{km} · เดิน ~{time}", en: "{km} · ~{time} walk", zh: "{km} · 步行约 {time}" },
  routeAny: { th: "{km} · ~{time}", en: "{km} · ~{time}", zh: "{km} · 约 {time}" },

  // Featured banner
  badgeLeft: { th: "เหลืออีก", en: "Ends in", zh: "还剩" },
  badgeStartsIn: { th: "เริ่มใน", en: "Starts in", zh: "距开始" },
  badgeDays: { th: "วัน", en: "days", zh: "天" },
  badgeDay: { th: "วัน", en: "day", zh: "天" },
  venueCountOne: { th: "1 สถานที่", en: "1 venue", zh: "1 个地点" },
  venueCount: { th: "{n} สถานที่", en: "{n} venues", zh: "{n} 个地点" },
  viewRoute: { th: "ดูเส้นทาง", en: "View route", zh: "查看路线" },
} satisfies Dict;
