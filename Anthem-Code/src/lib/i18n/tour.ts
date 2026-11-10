/** Guide tours: controls, invite and every step body (titles stay short English labels in all languages). */
import type { Dict } from "./index";

export const TOUR_UI = {
  invite: { th: "ดูทัวร์สั้น ๆ ของหน้านี้", en: "Take a quick tour of this page", zh: "快速了解这个页面" },
  start: { th: "เริ่มทัวร์", en: "Start tour", zh: "开始导览" },
  close: { th: "ปิดทัวร์", en: "Close tour", zh: "关闭导览" },
  neverAgain: { th: "ไม่ต้องแสดงอีก", en: "Don't show again", zh: "不再显示" },
  back: { th: "ย้อนกลับ", en: "Back", zh: "上一步" },
  go: { th: "เริ่มเลย", en: "Let's go", zh: "开始" },
  next: { th: "ถัดไป", en: "Next", zh: "下一步" },
  finish: { th: "จบทัวร์", en: "Done", zh: "完成" },
  stepOf: { th: "ขั้นที่ {n} จาก {total}", en: "Step {n} of {total}", zh: "第 {n} 步，共 {total} 步" },
  replayHint: {
    th: "ดูทัวร์นี้อีกครั้งได้จากปุ่ม ? ในหน้านี้ หรือในตั้งค่า",
    en: "Replay this tour from the ? button on this page or in Settings.",
    zh: "可通过本页的 ? 按钮或在设置中再次查看本导览。",
  },
  labelHome: { th: "ทัวร์แนะนำหน้าแรก", en: "Home page tour", zh: "首页导览" },
  labelStudio: { th: "ทัวร์แนะนำ My Studio", en: "My Studio tour", zh: "My Studio 导览" },
  labelChat: { th: "ทัวร์แนะนำแชท", en: "Chat tour", zh: "聊天导览" },
} satisfies Dict;

export const TOUR_HOME = {
  welcome: {
    th: "SAMECOR คือพื้นที่ให้ผลงานพาคุณไปเจอคนที่ใช่ พาดูหน้าแรกสั้น ๆ ดูอย่างเดียว ไม่ต้องกดอะไรจริง",
    en: "SAMECOR is where your work leads you to the right people. Here is a quick look at the home page. Just watch; nothing you tap here is real.",
    zh: "在 SAMECOR，作品会带你遇见对的人。先快速看看首页，只是演示，不会真的执行操作。",
  },
  mode: {
    th: "ชี้หรือแตะที่คำนี้เพื่อสลับว่าจะดูผลงาน หรือดูครีเอเตอร์ ฟีดด้านล่างจะเปลี่ยนตาม",
    en: "Point at or tap this to switch between work and creators. The feed below changes with it.",
    zh: "点这里在作品和创作者之间切换，下方的内容会随之改变。",
  },
  search: {
    th: "พิมพ์สิ่งที่มองหา เช่น โลโก้ร้านกาแฟ หรือภาพประกอบสไตล์มินิมอล ระบบค้นจากผลงานจริง",
    en: "Type what you are looking for, like a coffee shop logo or a minimal illustration. Results come from real work.",
    zh: "输入你想找的内容，比如咖啡店标志或极简插画，结果来自真实作品。",
  },
  filters: {
    th: "กรองฟีดตามหมวด สไตล์ หรือสีของผลงาน ล้างตัวกรองได้ทุกเมื่อ",
    en: "Filter the feed by category, style or colour. Clear the filters any time.",
    zh: "按类别、风格或颜色筛选内容，随时可以清除筛选。",
  },
  feed: {
    th: "เปิดผลงานเพื่อดูรายละเอียดและทักครีเอเตอร์ หรือกดบันทึกที่มุมภาพ ผลงานจะไปอยู่ใน Collections บนโปรไฟล์ของคุณ",
    en: "Open a work to see the details and message the creator, or tap save on the corner of the image. It goes to Collections on your profile.",
    zh: "打开作品查看详情并联系创作者，或点击图片角落的保存，作品会放进你主页的 Collections。",
  },
  create: {
    th: "ปุ่มนี้ใช้ลงผลงาน เริ่มจาก 1–3 ชิ้นที่บอกตัวตนได้ดีที่สุด ใส่บริบทสั้น ๆ ว่าคุณทำส่วนไหน",
    en: "Use this button to post your work. Start with the 1–3 pieces that say the most about you, with a line on what you did.",
    zh: "用这个按钮发布作品。先从最能代表你的 1–3 件开始，简单说明你负责的部分。",
  },
  final: {
    th: "ดูทัวร์นี้อีกครั้งได้ในตั้งค่า → ฟีดแบ็ก & รายงาน → ทัวร์แนะนำ (บนคอมมีปุ่ม ? มุมซ้ายล่างด้วย)",
    en: "Replay this tour any time from Settings (on a computer there is also a ? button at the bottom left).",
    zh: "可随时在设置中再次查看本导览（电脑端左下角也有 ? 按钮）。",
  },
} satisfies Dict;

export const TOUR_STUDIO = {
  welcome: {
    th: "หลังบ้านของคุณ ที่รวมคำขอจ้าง คอลแลป ผลงาน และสิ่งที่ต้องทำวันนี้ไว้ในที่เดียว",
    en: "Your back office: requests, collabs, your work and today's to-dos in one place.",
    zh: "你的工作台：委托、合作、作品和今天的待办都在这里。",
  },
  nav: {
    th: "เมนูแบ่งเป็นกลุ่ม ตัวเลขสีแดงคือเรื่องใหม่ที่ยังไม่ได้ตอบ ย่อเมนูได้จากปุ่มด้านบน",
    en: "The menu is grouped. Red numbers are new items you haven't answered yet. Collapse the menu with the button at the top.",
    zh: "菜单按组排列，红色数字表示尚未回复的新消息，可用顶部按钮收起菜单。",
  },
  search: {
    th: "กด Ctrl K (Mac: ⌘K) หรือกดช่องนี้ เพื่อค้นหาผลงาน คำขอ หรือการตั้งค่า แล้วกระโดดไปที่นั่นทันที",
    en: "Press Ctrl K (Mac: ⌘K) or tap here to find work, requests or settings and jump straight there.",
    zh: "按 Ctrl K（Mac：⌘K）或点这里，搜索作品、请求或设置并直接跳转。",
  },
  queue: {
    th: "คำขอจ้าง คำชวนคอลแลป และงานใกล้กำหนดส่งที่รอคุณ กดปุ่มที่แถวเพื่อเปิดคำขอนั้นตรง ๆ",
    en: "Requests, collab invites and deadlines waiting for you. Tap a row's button to open that request directly.",
    zh: "等你处理的委托、合作邀请和临近截止的工作，点行内按钮直接打开。",
  },
  stats: {
    th: "ตัวเลขสรุป: เรื่องที่รอตอบ งานจ้างทั้งหมด คนเข้าชม 7 วัน และผลงานที่เผยแพร่",
    en: "At a glance: items waiting for a reply, all jobs, visitors in the last 7 days and published work.",
    zh: "概览：待回复事项、全部委托、近 7 天访客和已发布作品。",
  },
  inbox: {
    th: "ในหน้างานจ้างและคอลแลป คำขอแบ่งตามสถานะ ติดต่อใหม่ → ตอบรับ → ปิดแล้ว ใช้ชิปด้านบนกรองได้",
    en: "On the Hire and Collab pages, requests are grouped by status: new → accepted → closed. Filter with the chips at the top.",
    zh: "在委托和合作页面，请求按状态分组：新联系 → 已接受 → 已关闭，可用顶部标签筛选。",
  },
  final: {
    th: "ดูทัวร์นี้อีกครั้งได้จากปุ่ม ? ข้างหัวข้อหน้า หรือในตั้งค่า → ข้อมูลและความช่วยเหลือ",
    en: "Replay this tour from the ? button next to the page title or in Settings.",
    zh: "可通过页面标题旁的 ? 按钮或在设置中再次查看本导览。",
  },
} satisfies Dict;

export const TOUR_CHAT = {
  welcome: {
    th: "ทุกการคุยเรื่องงานอยู่ที่นี่ ทั้งคำขอจ้าง คอลแลป และข้อความทั่วไป",
    en: "Every work conversation lives here: requests, collabs and everyday messages.",
    zh: "所有工作沟通都在这里：委托、合作和日常消息。",
  },
  list: {
    th: "รายการแชททั้งหมด เรียงตามข้อความล่าสุด แชทที่ยังไม่ได้อ่านจะเด่นขึ้นมา",
    en: "All your chats, newest message first. Unread chats stand out.",
    zh: "全部聊天按最新消息排序，未读聊天会突出显示。",
  },
  thread: {
    th: "คำขอ แผนงาน และสถานะต่าง ๆ จะขึ้นเป็นการ์ดในแชท กดปุ่มบนการ์ดเพื่อตอบรับหรือดูรายละเอียด",
    en: "Requests, plans and status updates show up as cards in the chat. Use the card buttons to accept or see details.",
    zh: "请求、计划和状态会以卡片形式出现在聊天中，点卡片按钮接受或查看详情。",
  },
  plan: {
    th: "แชทคอลแลปมีแผงด้านข้าง ตกลงแผน แบ่งงาน และเลือกงานที่เสร็จไปด้วยกัน ทุกคนเห็นความคืบหน้าเหมือนกัน",
    en: "Collab chats have a side panel to agree on a plan, split tasks and tick them off together. Everyone sees the same progress.",
    zh: "合作聊天有侧边栏，可一起确定计划、分工并勾选完成，大家看到的进度一致。",
  },
  composer: {
    th: "พิมพ์ตอบหรือแนบไฟล์ได้ที่นี่ ถ้าคอลแลปเงียบเกิน 7 วันและยังมีงานค้าง ระบบจะเตือนทุกคนในทีม",
    en: "Reply or attach files here. If a collab goes quiet for 7 days with tasks still open, everyone on the team gets a reminder.",
    zh: "在这里回复或添加文件。合作超过 7 天无动静且仍有未完成任务时，会提醒团队所有人。",
  },
  final: {
    th: "ดูทัวร์นี้อีกครั้งได้จากปุ่ม ? ในหัวแชท หรือในตั้งค่า → ข้อมูลและความช่วยเหลือ",
    en: "Replay this tour from the ? button in the chat header or in Settings.",
    zh: "可通过聊天顶部的 ? 按钮或在设置中再次查看本导览。",
  },
} satisfies Dict;
