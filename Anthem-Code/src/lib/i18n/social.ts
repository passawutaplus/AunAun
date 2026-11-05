/** Follow, Save to Collection, Share and the feed filter button. Thai keeps its existing English words (owner, 2026-11-05). */
import type { Dict } from "./index";

export const FOLLOW = {
  follow: { th: "ติดตาม", en: "Follow", zh: "关注" },
  following: { th: "กำลังติดตาม", en: "Following", zh: "已关注" },
  unfollow: { th: "เลิกติดตาม", en: "Unfollow", zh: "取消关注" },
  mutual: { th: "ติดตามกันแล้ว", en: "Friends", zh: "互相关注" },
  followBack: { th: "ติดตามกลับ", en: "Follow back", zh: "回关" },
  mutualHint: {
    th: "ติดตามกันทั้งคู่ — แท็กเป็นผู้ร่วมงานในผลงานได้ · กดเพื่อเลิกติดตาม",
    en: "You follow each other, so you can tag each other as collaborators. Tap to unfollow.",
    zh: "你们已互相关注，可以在作品中互相标记为合作者。点击取消关注。",
  },
  followBackHint: {
    th: "คนนี้ติดตามคุณอยู่ — ติดตามกลับเพื่อแท็กกันในผลงานได้",
    en: "They follow you. Follow back so you can tag each other in your work.",
    zh: "对方关注了你。回关后即可在作品中互相标记。",
  },
  unfollowed: { th: "เลิกติดตาม {name} แล้ว", en: "You unfollowed {name}", zh: "已取消关注 {name}" },
  nowMutual: { th: "ติดตามกันแล้วกับ {name}", en: "You and {name} now follow each other", zh: "你和 {name} 已互相关注" },
  followed: { th: "ติดตาม {name} แล้ว", en: "You're following {name}", zh: "已关注 {name}" },
  mutualDesc: {
    th: "แท็กเป็นผู้ร่วมงานในผลงานได้แล้ว · ดูรวมได้ที่ Portfolio → Creators",
    en: "You can now tag each other as collaborators. See everyone in Portfolio → Creators.",
    zh: "现在可以互相标记为合作者。在 Portfolio → Creators 查看全部。",
  },
  followedDesc: {
    th: "{name} จะได้รับแจ้งเตือน · ถ้าติดตามกลับ จะแท็กกันในผลงานได้",
    en: "{name} will get a notification. If they follow back, you can tag each other in your work.",
    zh: "{name} 会收到通知。对方回关后，你们就能在作品中互相标记。",
  },
  seeAll: { th: "ดูทั้งหมด", en: "See all", zh: "查看全部" },
  visitorPreview: {
    th: "นี่คือมุมมองผู้เยี่ยมชม — ปุ่มนี้ใช้งานได้จริงเมื่อคนอื่นเปิดโปรไฟล์ของคุณ",
    en: "This is how visitors see your profile. The button works when someone else opens it.",
    zh: "这是访客视角。别人打开你的主页时，这个按钮才会生效。",
  },
  signInToFollow: { th: "กรุณาเข้าสู่ระบบก่อนติดตาม", en: "Sign in to follow creators", zh: "登录后即可关注" },
  failed: { th: "ทำรายการไม่สำเร็จ", en: "Something went wrong", zh: "操作未成功" },
  tryAgain: { th: "ลองใหม่อีกครั้ง", en: "Please try again.", zh: "请重试。" },
} satisfies Dict;

export const SAVE = {
  signIn: { th: "กรุณาเข้าสู่ระบบก่อน", en: "Sign in to save work", zh: "请先登录" },
  unpublished: { th: "ผลงานนี้ยังไม่ได้เผยแพร่", en: "This work isn't published yet", zh: "该作品尚未发布" },
  removed: { th: "เอาออกจากคอลเลกชันแล้ว", en: "Removed from collection", zh: "已从 Collection 中移除" },
  added: { th: "เพิ่มเข้าคอลเลกชันแล้ว", en: "Saved to collection", zh: "已保存到 Collection" },
  addedTo: { th: "เพิ่มเข้า “{name}” แล้ว", en: "Saved to “{name}”", zh: "已保存到“{name}”" },
  error: { th: "ผิดพลาด", en: "Something went wrong", zh: "出错了" },
  createFailed: { th: "สร้างคอลเลกชันไม่สำเร็จ", en: "Couldn't create the collection", zh: "Collection 创建失败" },
  title: { th: "เก็บเข้าคอลเลกชัน", en: "Save to Collection", zh: "保存到 Collection" },
  loadFailed: { th: "โหลดรายการไม่สำเร็จ", en: "Couldn't load your collections", zh: "无法加载 Collection 列表" },
  retry: { th: "ลองใหม่", en: "Try again", zh: "重试" },
  empty: { th: "ยังไม่มีคอลเลกชัน — สร้างอันแรกของคุณ", en: "No collections yet. Create your first one.", zh: "还没有 Collection，来创建第一个吧。" },
  itemCount: { th: "{n} ผลงาน", en: "{n} works", zh: "{n} 件作品" },
  itemCountOne: { th: "1 ผลงาน", en: "1 work", zh: "1 件作品" },
  lastUsed: { th: " · ใช้ล่าสุด", en: " · Last used", zh: " · 最近使用" },
  newName: { th: "ชื่อคอลเลกชันใหม่", en: "New collection name", zh: "新 Collection 名称" },
  create: { th: "สร้าง", en: "Create", zh: "创建" },
  createNew: { th: "สร้างคอลเลกชันใหม่", en: "New collection", zh: "新建 Collection" },
  createHint: {
    th: "เริ่มเป็นส่วนตัว — ตั้งเป็นสาธารณะได้ทีหลัง และผลงานนี้จะถูกเพิ่มเข้าให้ทันที",
    en: "It starts private, and you can make it public later. This work goes in right away.",
    zh: "默认仅自己可见，之后可设为公开。这件作品会立即加入。",
  },
} satisfies Dict;

export const SHARE = {
  share: { th: "แชร์", en: "Share", zh: "分享" },
  shareWork: { th: "แชร์ผลงาน", en: "Share this work", zh: "分享作品" },
  copied: { th: "คัดลอกลิงก์แล้ว", en: "Link copied", zh: "链接已复制" },
  copiedPaste: {
    th: "คัดลอกลิงก์แล้ว — วางใน Instagram หรือที่อื่นได้เลย",
    en: "Link copied. Paste it into Instagram or anywhere else.",
    zh: "链接已复制，可粘贴到 Instagram 或其他地方。",
  },
  copyFailed: { th: "คัดลอกไม่สำเร็จ", en: "Couldn't copy the link", zh: "复制失败" },
  intro: {
    th: "คัดลอกลิงก์หรือแชร์ไปยัง Facebook, Messenger, Instagram, LINE, WhatsApp, WeChat, X และอีเมล",
    en: "Copy the link or share to Facebook, Messenger, Instagram, LINE, WhatsApp, WeChat, X or email.",
    zh: "复制链接，或分享到 Facebook、Messenger、Instagram、LINE、WhatsApp、微信、X 或邮件。",
  },
  preview: { th: "ตัวอย่างการ์ดที่เพื่อนจะเห็น", en: "What your friends will see", zh: "好友看到的预览卡片" },
  linkLabel: { th: "ลิงก์สำหรับการแชร์", en: "Share link", zh: "分享链接" },
  copiedShort: { th: "คัดลอกแล้ว", en: "Copied", zh: "已复制" },
  copyLink: { th: "คัดลอกลิงก์", en: "Copy link", zh: "复制链接" },
  copyThenOpen: { th: "คัดลอกลิงก์แล้วเปิด {app}", en: "Copy the link and open {app}", zh: "复制链接并打开 {app}" },
  shareTo: { th: "แชร์ไปยัง {app}", en: "Share to {app}", zh: "分享到 {app}" },
  otherApps: { th: "แชร์ด้วยแอปอื่น", en: "More apps", zh: "其他应用" },
} satisfies Dict;

export const FILTER = {
  filters: { th: "ตัวกรอง", en: "Filters", zh: "筛选" },
  filtersOn: { th: "ตัวกรอง (เปิดอยู่ {n})", en: "Filters ({n} on)", zh: "筛选（已开启 {n} 项）" },
} satisfies Dict;
