import type { Dict } from "@/lib/i18n";

/** Exhibition list page (ExhibitionPage) + This Week / Full Calendar (ExhibitionCalendar). */
export const LIST = {
  // Page: search, filters, empty states
  searchPlaceholder: { th: "ค้นหางาน สถานที่ ผู้จัด", en: "Search events, venues, organizers", zh: "搜索活动、场地、主办方" },
  timing: { th: "ช่วงเวลา", en: "When", zh: "时间" },
  now: { th: "Now", en: "Now", zh: "进行中" },
  done: { th: "Done", en: "Done", zh: "已结束" },
  all: { th: "All", en: "All", zh: "全部" },
  seoDescription: {
    th: "นิทรรศการ เวิร์กช็อป และอีเวนต์สร้างสรรค์จากครีเอเตอร์บน SAMECOR — ทีมงานตรวจทุกงานก่อนเผยแพร่",
    en: "Exhibitions, workshops and creative events from creators on SAMECOR — every event is reviewed by our team before it goes live",
    zh: "来自 SAMECOR 创作者的展览、工作坊和创意活动 — 每个活动发布前均经团队审核",
  },
  filterTitle: { th: "ตัวกรอง Exhibition", en: "Exhibition filters", zh: "Exhibition 筛选" },
  eventType: { th: "ประเภทงาน", en: "Event type", zh: "活动类型" },
  showN: { th: "ดู {n} งาน", en: "Show {n} events", zh: "查看 {n} 个活动" },
  loadFailed: { th: "โหลด Exhibition ไม่สำเร็จ", en: "Couldn't load Exhibition", zh: "Exhibition 加载失败" },
  emptyDone: { th: "ยังไม่มีงานที่จบแล้วในหมวดนี้", en: "No past events in this category yet", zh: "此类别暂无已结束的活动" },
  emptyNow: {
    th: "ยังไม่มีงานที่กำลังจัดหรือกำลังจะมาในหมวดนี้",
    en: "No current or upcoming events in this category yet",
    zh: "此类别暂无进行中或即将举行的活动",
  },
  emptyHint: {
    th: "ลงงานของคุณได้จากปุ่ม + บนหน้าโปรไฟล์ — ทีมงานตรวจภายใน 1–3 วันทำการ",
    en: "Post your event with the + button on your profile — our team reviews it within 1–3 business days",
    zh: "在个人主页点击 + 按钮发布你的活动 — 团队将在 1–3 个工作日内审核",
  },

  // Calendar
  showRangeOf: { th: "แสดงช่วงวันบนปฏิทิน: {title}", en: "Show dates on calendar: {title}", zh: "在日历上显示日期：{title}" },
  hideRangeOf: { th: "เอาออกจากช่วงวันบนปฏิทิน: {title}", en: "Remove dates from calendar: {title}", zh: "从日历中移除日期：{title}" },
  openEvent: { th: "เปิด {title}", en: "Open {title}", zh: "打开 {title}" },
  addToGoogleCalendar: { th: "Add to Google Calendar", en: "Add to Google Calendar", zh: "添加到 Google 日历" },
  maxTracked: { th: "เลือกดูได้สูงสุด {n} รายการ", en: "You can pick up to {n} events", zh: "最多可选择 {n} 个活动" },
  nEventsAria: { th: "{n} งาน", en: "{n} events", zh: "{n} 个活动" },
  fullCalendar: { th: "Full Calendar", en: "Full Calendar", zh: "完整日历" },
  exploreUpcoming: { th: "Explore upcoming creative events", en: "Explore upcoming creative events", zh: "探索即将举行的创意活动" },
  prevMonth: { th: "เดือนก่อน", en: "Previous month", zh: "上个月" },
  nextMonth: { th: "เดือนถัดไป", en: "Next month", zh: "下个月" },
  nEvents: { th: "{n} Events", en: "{n} Events", zh: "{n} 个活动" },
  rangeOff: { th: "ปิดการดูช่วงวัน", en: "Turn off date ranges", zh: "关闭日期范围" },
  rangeOnAria: { th: "ดูช่วงวันของงานบนปฏิทิน", en: "Show event date ranges on the calendar", zh: "在日历上显示活动日期范围" },
  rangeOnTitle: { th: "ดูช่วงวัน (เลือกได้ {n} งาน)", en: "Show date ranges (pick up to {n})", zh: "显示日期范围（最多 {n} 个）" },
  today: { th: "Today", en: "Today", zh: "今天" },
  noEventsThisDay: { th: "ไม่มีงานในวันนี้", en: "No events on this day", zh: "这一天没有活动" },
  viewAllEvents: { th: "View All Events", en: "View All Events", zh: "查看全部活动" },
  sortBy: { th: "เรียงตาม", en: "Sort by", zh: "排序" },
  sortEnding: { th: "ใกล้จบก่อน", en: "Ending soon", zh: "即将结束" },
  sortNewest: { th: "เพิ่งเปิด", en: "Just opened", zh: "最新开幕" },
  sortPopular: { th: "ยอดนิยม", en: "Most popular", zh: "最受欢迎" },
  sortCategory: { th: "ตามหมวด", en: "By category", zh: "按类别" },
} satisfies Dict;
