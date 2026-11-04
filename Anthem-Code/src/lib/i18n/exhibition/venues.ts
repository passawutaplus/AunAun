/** Venues of a main event: map, venue list, "my route" and its start point (RouteStartPicker, lib/routeStart). */
import type { Dict } from "@/lib/i18n";

export const VENUES = {
  // Route start kinds (lib/routeStart startLabel)
  startHere: { th: "ตำแหน่งปัจจุบัน", en: "Current location", zh: "当前位置" },
  startHome: { th: "บ้าน", en: "Home", zh: "家" },
  startWork: { th: "ที่ทำงาน", en: "Work", zh: "公司" },
  startPlace: { th: "สถานที่", en: "Place", zh: "地点" },
  startMap: { th: "จุดบนแผนที่", en: "Point on the map", zh: "地图上的点" },
  unnamedPlace: { th: "ไม่มีชื่อ", en: "Unnamed", zh: "未命名" },
  geoUnsupported: {
    th: "อุปกรณ์นี้หาตำแหน่งไม่ได้ ลองค้นหาที่อยู่หรือแตะบนแผนที่แทน",
    en: "This device can't find your location. Search for an address or tap the map instead.",
    zh: "此设备无法定位，请改为搜索地址或在地图上点选。",
  },
  geoHttpsOnly: {
    th: "หาตำแหน่งได้เฉพาะหน้าเว็บ https ลองค้นหาที่อยู่หรือแตะบนแผนที่แทน",
    en: "Location only works on https pages. Search for an address or tap the map instead.",
    zh: "仅 https 网页可以定位，请改为搜索地址或在地图上点选。",
  },
  geoDenied: {
    th: "ไม่ได้รับอนุญาตให้ใช้ตำแหน่ง เปิดสิทธิ์ตำแหน่งให้ samecor.com ในการตั้งค่าเบราว์เซอร์/แอป หรือค้นหาที่อยู่แทน",
    en: "Location permission was denied. Allow location for samecor.com in your browser/app settings, or search for an address instead.",
    zh: "未获得位置权限。请在浏览器/应用设置中允许 samecor.com 使用位置，或改为搜索地址。",
  },
  geoFailed: { th: "หาตำแหน่งไม่สำเร็จ ลองอีกครั้ง", en: "Couldn't find your location. Please try again.", zh: "定位失败，请重试" },
  locateFailed: { th: "หาตำแหน่งไม่สำเร็จ", en: "Couldn't find your location", zh: "定位失败" },

  // RouteStartPicker
  startFrom: { th: "เริ่มจาก", en: "Start from", zh: "起点" },
  chooseStart: { th: "เลือกจุดเริ่มต้น", en: "Choose a start point", zh: "选择起点" },
  searchPlaceholder: { th: "ค้นหาที่อยู่ สถานที่ หรือสถานี", en: "Search an address, place or station", zh: "搜索地址、地点或车站" },
  searchStartAria: { th: "ค้นหาจุดเริ่มต้น", en: "Search for a start point", zh: "搜索起点" },
  savedAs: { th: "บันทึกเป็น{place}แล้ว · จำไว้แค่ในเครื่องนี้", en: "Saved as {place} · kept on this device only", zh: "已保存为{place} · 仅保存在本设备" },
  presetDeleted: { th: "ลบ{place}ที่บันทึกไว้แล้ว", en: "Removed saved {place}", zh: "已删除保存的{place}" },
  setUp: { th: "ตั้งค่า", en: "Set", zh: "设置" },
  pickOnMap: { th: "เลือกบนแผนที่", en: "Pick on the map", zh: "在地图上选择" },
  editPreset: { th: "แก้ไข{place}", en: "Edit {place}", zh: "编辑{place}" },
  searchPresetAddress: { th: "ค้นหาที่อยู่{place}", en: "Search address for {place}", zh: "搜索{place}地址" },
  useCurrentLocation: { th: "ใช้ตำแหน่งปัจจุบัน", en: "Use current location", zh: "使用当前位置" },
  deletePreset: { th: "ลบ{place}", en: "Delete {place}", zh: "删除{place}" },
  saveAs: { th: "บันทึกเป็น", en: "Save as", zh: "保存为" },
  noStart: { th: "ไม่ใช้จุดเริ่มต้น", en: "Don't use a start point", zh: "不使用起点" },
  privacyNote: {
    th: "SAMECOR ไม่เก็บที่อยู่ของคุณ จำไว้แค่ในมือถือหรือคอมเครื่องนี้ ลบเมื่อไหร่ก็ได้",
    en: "SAMECOR doesn't keep your address. It's saved only on this phone or computer, and you can delete it anytime.",
    zh: "SAMECOR 不保存你的地址，只存在这台手机或电脑上，随时可以删除。",
  },

  // EventVenuesSection
  interestedAll: { th: "สนใจทุกที่แล้ว", en: "Interested in all", zh: "已全部感兴趣" },
  markAllInterested: { th: "สนใจทั้งหมด", en: "Interested in all venues", zh: "全部感兴趣" },
  venuesSr: { th: "สถานที่", en: "venues", zh: "个地点" },
  hideMapAria: { th: "ซ่อนแผนที่และรายการสถานที่", en: "Hide the map and venue list", zh: "隐藏地图和地点列表" },
  hide: { th: "ซ่อน", en: "Hide", zh: "隐藏" },
  show: { th: "แสดง", en: "Show", zh: "显示" },
  showMapCount: { th: "ดูแผนที่และ {n} สถานที่", en: "See the map and {n} venues", zh: "查看地图和 {n} 个地点" },
  showMapCountOne: { th: "ดูแผนที่และ {n} สถานที่", en: "See the map and 1 venue", zh: "查看地图和 {n} 个地点" },
  tapMapToStart: { th: "แตะบนแผนที่ตรงจุดที่จะเริ่ม", en: "Tap the map where you'll start", zh: "在地图上点选起点" },
  tickHint: { th: "เลือกสถานที่ที่จะไป แล้วเส้นทางจะขึ้นบนแผนที่", en: "Select the venues you'll visit and the route shows on the map", zh: "选择要去的地点，路线就会显示在地图上" },
  tickHintTwo: {
    th: "เลือกสถานที่ที่จะไป 2 ที่ขึ้นไป แล้วเส้นทางจะขึ้นบนแผนที่",
    en: "Select 2 or more venues you'll visit and the route shows on the map",
    zh: "选择 2 个或以上要去的地点，路线就会显示在地图上",
  },
  yourRoute: { th: "เส้นทางของคุณ · {n} ที่", en: "Your route · {n} stops", zh: "你的路线 · {n} 个地点" },
  yourRouteOne: { th: "เส้นทางของคุณ · {n} ที่", en: "Your route · 1 stop", zh: "你的路线 · {n} 个地点" },
  calculatingRoute: { th: "กำลังคำนวณเส้นทาง…", en: "Working out the route…", zh: "正在计算路线…" },
  fromStart: { th: "จาก{place}", en: "From {place}", zh: "从{place}出发" },
  straightLine: { th: "เส้นตรงโดยประมาณ", en: "Approx. straight line", zh: "直线距离（约）" },
  inEventWalk: { th: "ในงาน (เดิน)", en: "Within the event (walk)", zh: "会场之间（步行）" },
  walkDistance: { th: "ระยะเดิน", en: "Walking distance", zh: "步行距离" },
  clearTicks: { th: "ล้างที่เลือก", en: "Clear selection", zh: "清除选择" },
  venueCount: { th: "{n} ที่", en: "{n} venues", zh: "{n} 个地点" },
  venueCountOne: { th: "{n} ที่", en: "1 venue", zh: "{n} 个地点" },
  removeFromRoute: { th: "เอาออกจากเส้นทางของฉัน: {title}", en: "Remove from my route: {title}", zh: "从我的路线移除：{title}" },
  addToRoute: { th: "เพิ่มในเส้นทางของฉัน: {title}", en: "Add to my route: {title}", zh: "加入我的路线：{title}" },
  specialProject: { th: "โปรเจกต์พิเศษ", en: "Special project", zh: "特别项目" },
  uninterestAria: { th: "เลิกสนใจ {title}", en: "Remove interest in {title}", zh: "取消感兴趣：{title}" },
  interestAria: { th: "สนใจ {title} (เตือนก่อนเริ่ม)", en: "Interested in {title} (remind me before it starts)", zh: "对 {title} 感兴趣（开始前提醒）" },
  interestedTitle: { th: "สนใจแล้ว", en: "Interested", zh: "已感兴趣" },
  interestTitle: { th: "สนใจ — เตือนก่อนเริ่ม 3 วันและ 1 วัน", en: "Interested — reminders 3 days and 1 day before", zh: "感兴趣 — 开始前 3 天和 1 天提醒" },
  freeEntry: { th: "เข้าชมฟรี", en: "Free entry", zh: "免费入场" },
  source: { th: "แหล่งข้อมูล", en: "Source", zh: "来源" },
  viewPhoto: { th: "ดูรูป {n} ของ {title}", en: "View photo {n} of {title}", zh: "查看 {title} 的第 {n} 张图片" },

  // VenueMap
  mapAria: { th: "แผนที่สถานที่จัดงาน", en: "Map of event venues", zh: "活动地点地图" },

  // useEventVenues toasts
  allInterestedOn: {
    th: "สนใจทุกสถานที่แล้ว — จะเตือนก่อนแต่ละที่เริ่ม",
    en: "Interested in all venues — we'll remind you before each one starts",
    zh: "已对所有地点感兴趣 — 每个地点开始前会提醒你",
  },
  allInterestedOff: { th: "เลิกสนใจทุกสถานที่แล้ว", en: "Removed interest in all venues", zh: "已取消所有地点的感兴趣" },
} satisfies Dict;
