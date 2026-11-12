import type { Dict } from "@/lib/i18n";

/**
 * Chat shell: conversation list, composer, message bubbles, media gallery, "say hi" dialog.
 * Hire / collab cards and dialogs keep their own dictionaries (not translated yet).
 * Text that is saved as a message is NOT here — stored messages stay as they were written.
 */
export const CHAT = {
  cancel: { th: "ยกเลิก", en: "Cancel", zh: "取消" },
  user: { th: "ผู้ใช้", en: "User", zh: "用户" },
  retry: { th: "ลองใหม่", en: "Try again", zh: "重试" },
  back: { th: "กลับหน้าก่อนหน้า", en: "Back to the previous page", zh: "返回上一页" },
  profile: { th: "โปรไฟล์", en: "Profile", zh: "个人主页" },

  // Conversation list
  searchPlaceholder: { th: "ค้นหาชื่อหรืองาน…", en: "Search a name or a job…", zh: "搜索姓名或工作…" },
  searchChats: { th: "ค้นหาแชท", en: "Search chats", zh: "搜索聊天" },
  closeSearch: { th: "ปิดการค้นหา", en: "Close search", zh: "关闭搜索" },
  createGroup: { th: "สร้างกลุ่มแชท", en: "Create group chat", zh: "创建群聊" },
  groupSoon: { th: "สร้างกลุ่มแชทจะเปิดให้ใช้เร็ว ๆ นี้", en: "Group chats are coming soon", zh: "群聊功能即将开放" },
  groupProOnly: {
    th: "สร้างกลุ่มแชทได้เฉพาะสมาชิก Pro ขึ้นไป",
    en: "Group chats are for Pro members and above",
    zh: "仅 Pro 及以上会员可创建群聊",
  },
  upgrade: { th: "อัปเกรด", en: "Upgrade", zh: "升级" },
  listLoadFailed: { th: "โหลดรายการแชทไม่สำเร็จ", en: "Couldn't load your chats", zh: "聊天列表加载失败" },
  noSearchResults: { th: "ไม่พบบทสนทนาจากการค้นหา", en: "No conversations match your search", zh: "未找到匹配的对话" },
  noSearchResultsHint: {
    th: "ลองคำอื่น หรือล้างช่องค้นหาเพื่อดูรายการทั้งหมด",
    en: "Try another word, or clear the search to see everything",
    zh: "换个关键词，或清空搜索查看全部",
  },
  empty: { th: "ยังไม่มีบทสนทนา", en: "No conversations yet", zh: "还没有对话" },
  emptyHint: {
    th: "คำขอจ้างและคอลแลปจะอยู่ที่นี่ — เปิดแชทตอบได้เลย",
    en: "Hire and collab requests show up here — open a chat to reply",
    zh: "雇佣和合作请求会显示在这里 — 打开聊天即可回复",
  },
  conversationType: { th: "ประเภทบทสนทนา", en: "Conversation type", zh: "对话类型" },
  conversationTypeIs: { th: "ประเภทบทสนทนา: {label}", en: "Conversation type: {label}", zh: "对话类型：{label}" },
  tabHire: { th: "งานจ้าง", en: "Hire", zh: "雇佣" },
  tabCollab: { th: "คอลแลป", en: "Collab", zh: "合作" },
  tabGroup: { th: "กลุ่ม", en: "Groups", zh: "群组" },
  groupChat: { th: "กลุ่มแชท", en: "Group chat", zh: "群聊" },
  badgeGroupHire: { th: "กลุ่มจ้าง", en: "Hire group", zh: "雇佣群" },
  badgeGroupCollab: { th: "กลุ่มคอลแลป", en: "Collab group", zh: "合作群" },
  badgeGroup: { th: "กลุ่ม", en: "Group", zh: "群组" },
  badgeHire: { th: "จ้าง", en: "Hire", zh: "雇佣" },
  badgeCollab: { th: "คอลแลป", en: "Collab", zh: "合作" },
  youPrefix: { th: "คุณ: ", en: "You: ", zh: "你：" },
  messageUnsent: { th: "ข้อความถูกยกเลิก", en: "Message unsent", zh: "消息已撤回" },
  startGroup: { th: "เริ่มแชทกลุ่มได้เลย", en: "Start the group chat", zh: "开始群聊吧" },
  startHire: { th: "เริ่มพูดคุยเรื่องงานได้เลย", en: "Start talking about the job", zh: "开始聊聊这份工作吧" },
  startCollab: { th: "เริ่มคุยคอลแลปได้เลย", en: "Start talking about the collab", zh: "开始聊聊合作吧" },
  chatMenu: { th: "เมนูแชท", en: "Chat menu", zh: "聊天菜单" },
  pin: { th: "ปักหมุด", en: "Pin", zh: "置顶" },
  unpin: { th: "เลิกปักหมุด", en: "Unpin", zh: "取消置顶" },
  pinned: { th: "ปักหมุดแล้ว", en: "Pinned", zh: "已置顶" },
  unpinned: { th: "เลิกปักหมุดแล้ว", en: "Unpinned", zh: "已取消置顶" },
  pinFailed: { th: "ปักหมุดไม่สำเร็จ", en: "Couldn't pin", zh: "置顶失败" },
  reportChat: { th: "รายงานแชท", en: "Report chat", zh: "举报聊天" },
  removeChat: { th: "ลบแชท", en: "Remove chat", zh: "移除聊天" },
  removeChatTitle: { th: "ลบแชทนี้ออกจากรายการ?", en: "Remove this chat from your list?", zh: "从列表中移除此聊天？" },
  removeChatBody: {
    th: "แชทจะหายจากรายการของคุณเท่านั้น คู่สนทนายังเห็นอยู่ และจะกลับมาอีกครั้งถ้ามีข้อความใหม่",
    en: "It only disappears from your list. The other person still sees it, and it comes back when there's a new message.",
    zh: "聊天仅从你的列表中消失，对方仍可看到；有新消息时会重新出现。",
  },
  removing: { th: "กำลังลบ…", en: "Removing…", zh: "正在移除…" },
  chatRemoved: { th: "ลบแชทออกจากรายการแล้ว", en: "Chat removed from your list", zh: "已从列表中移除聊天" },
  chatRemoveFailed: { th: "ลบแชทไม่สำเร็จ", en: "Couldn't remove the chat", zh: "移除聊天失败" },
  loadFailed: { th: "โหลดแชทไม่สำเร็จ", en: "Couldn't load this chat", zh: "聊天加载失败" },
  backToList: { th: "กลับรายการแชท", en: "Back to chats", zh: "返回聊天列表" },

  // Composer
  placeholderHire: {
    th: "พิมพ์ข้อความถึงลูกค้าอย่างสุภาพ…",
    en: "Write a polite message to the client…",
    zh: "礼貌地给客户留言…",
  },
  placeholderGroup: { th: "ส่งข้อความถึงกลุ่ม…", en: "Message the group…", zh: "给群组发消息…" },
  placeholderCollab: { th: "คุยเล่นไอเดียกันต่อได้เลย…", en: "Keep the ideas flowing…", zh: "继续聊聊想法吧…" },
  communityRules: { th: "กฎชุมชน", en: "Community rules", zh: "社区准则" },
  sendFailed: { th: "ส่งไม่สำเร็จ", en: "Couldn't send", zh: "发送失败" },
  imageTypes: {
    th: "รองรับเฉพาะ JPG, PNG, WebP หรือ HEIC",
    en: "Only JPG, PNG, WebP or HEIC are supported",
    zh: "仅支持 JPG、PNG、WebP 或 HEIC",
  },
  imageTooLarge: { th: "รูปใหญ่เกินไป — สูงสุด {mb} MB", en: "Image too large — {mb} MB max", zh: "图片过大 — 最大 {mb} MB" },
  uploadFailed: { th: "อัปโหลดไม่สำเร็จ", en: "Upload failed", zh: "上传失败" },
  uploadFailedRetry: { th: "อัปโหลดไม่สำเร็จ — ลองใหม่", en: "Upload failed — try again", zh: "上传失败 — 重试" },
  useImageButton: {
    th: "รูปและวิดีโอใช้ปุ่มรูปภาพทางขวา",
    en: "For images and videos, use the image button on the right",
    zh: "图片和视频请使用右侧的图片按钮",
  },
  fileTypes: {
    th: "รองรับ PDF, ZIP, Word, Excel, PowerPoint, TXT, CSV, ฟอนต์",
    en: "Supported: PDF, ZIP, Word, Excel, PowerPoint, TXT, CSV, fonts",
    zh: "支持 PDF、ZIP、Word、Excel、PowerPoint、TXT、CSV、字体",
  },
  fileTooLarge: { th: "ไฟล์ใหญ่เกินไป — สูงสุด 25 MB", en: "File too large — 25 MB max", zh: "文件过大 — 最大 25 MB" },
  fileSent: { th: "ส่งไฟล์แล้ว", en: "File sent", zh: "文件已发送" },
  fileUploadFailed: { th: "อัปโหลดไฟล์ไม่สำเร็จ", en: "Couldn't upload the file", zh: "文件上传失败" },
  reply: { th: "ตอบกลับ", en: "Reply", zh: "回复" },
  attachFile: { th: "แนบไฟล์จากเครื่อง", en: "Attach a file from your device", zh: "从设备添加文件" },
  attachFileTitle: {
    th: "แนบไฟล์ (PDF, ZIP, เอกสาร · สูงสุด 25 MB)",
    en: "Attach a file (PDF, ZIP, documents · 25 MB max)",
    zh: "添加文件（PDF、ZIP、文档 · 最大 25 MB）",
  },
  attachImage: { th: "แนบรูป", en: "Attach an image", zh: "添加图片" },
  attachImageTitle: {
    th: "แนบรูป JPG/PNG/WebP/HEIC · สูงสุด {mb} MB (ย่อให้อัตโนมัติ)",
    en: "Attach JPG/PNG/WebP/HEIC · {mb} MB max (resized automatically)",
    zh: "添加 JPG/PNG/WebP/HEIC 图片 · 最大 {mb} MB（自动压缩）",
  },
  sendMessage: { th: "ส่งข้อความ", en: "Send message", zh: "发送消息" },

  // Message bubble
  attachment: { th: "ไฟล์แนบ", en: "Attachment", zh: "附件" },
  tapToOpen: { th: "แตะเพื่อเปิด / ดาวน์โหลด", en: "Tap to open / download", zh: "点击打开 / 下载" },
  originalMessage: { th: "ข้อความเดิม", en: "Original message", zh: "原消息" },
  copy: { th: "คัดลอก", en: "Copy", zh: "复制" },
  copied: { th: "คัดลอกแล้ว", en: "Copied", zh: "已复制" },
  copyFailed: { th: "คัดลอกไม่สำเร็จ", en: "Couldn't copy", zh: "复制失败" },
  messageMenu: { th: "เมนูข้อความ", en: "Message menu", zh: "消息菜单" },
  addAsTask: { th: "เพิ่มเป็น Task", en: "Add as a task", zh: "添加为任务" },
  translate: { th: "แปลภาษา", en: "Translate", zh: "翻译" },
  announce: { th: "ประกาศ", en: "Announce", zh: "公告" },
  unsend: { th: "ยกเลิกการส่ง", en: "Unsend", zh: "撤回" },
  report: { th: "รายงาน", en: "Report", zh: "举报" },
  noCover: { th: "ไม่มีรูปปก", en: "No cover image", zh: "无封面" },
  creator: { th: "ครีเอเตอร์", en: "Creator", zh: "创作者" },
  product: { th: "สินค้า", en: "Product", zh: "商品" },
  qtyPieces: { th: "{n} ชิ้น", en: "{n} pcs", one: "{n} pc", zh: "{n} 件" },
  read: { th: "อ่านแล้ว", en: "Read", zh: "已读" },
  sent: { th: "ส่งแล้ว", en: "Sent", zh: "已发送" },
  today: { th: "วันนี้", en: "Today", zh: "今天" },
  yesterday: { th: "เมื่อวาน", en: "Yesterday", zh: "昨天" },
  addEmoji: { th: "เพิ่มอีโมจิ", en: "Add emoji", zh: "添加表情" },

  // Media gallery
  mediaAll: { th: "ทั้งหมด", en: "All", zh: "全部" },
  mediaImage: { th: "ภาพ", en: "Images", zh: "图片" },
  mediaVideo: { th: "วิดีโอ", en: "Videos", zh: "视频" },
  mediaFile: { th: "ไฟล์", en: "Files", zh: "文件" },
  mediaEmpty: {
    th: "ยังไม่มีรูป วิดีโอ หรือไฟล์ในแชทนี้",
    en: "No images, videos or files in this chat yet",
    zh: "此聊天中还没有图片、视频或文件",
  },
  mediaFilter: { th: "กรองมีเดีย", en: "Filter media", zh: "筛选媒体" },

  // "Say hi" dialog
  connectSendFailed: { th: "ส่งข้อความไม่สำเร็จ", en: "Couldn't send the message", zh: "消息发送失败" },
  connectTitleWork: { th: "ทักแชทเรื่องผลงานนี้", en: "Message about this work", zh: "就这件作品发消息" },
  connectTitleUser: { th: "ทักแชทหา {name}", en: "Message {name}", zh: "给 {name} 发消息" },
  connectDescWork: {
    th: "ถาม {name} เรื่องผลงานชิ้นนี้ได้เลย — ลิงก์ผลงานจะแนบไปกับข้อความให้อัตโนมัติ",
    en: "Ask {name} about this work — the link is attached to your message automatically",
    zh: "直接向 {name} 询问这件作品 — 作品链接会自动附在消息中",
  },
  connectDescUser: {
    th: "ทักทาย ถามเรื่องผลงาน หรือชวนคุยได้เลย — ถ้าจะจ้างหรือคอลแลป ใช้ปุ่มบนโปรไฟล์จะได้ส่งบรีฟไปพร้อมกัน",
    en: "Say hi, ask about their work, or start a conversation. To hire or collab, use the buttons on the profile so your brief goes along.",
    zh: "打个招呼、聊聊作品或随便聊聊。如需雇佣或合作，请使用主页上的按钮，以便同时发送需求说明。",
  },
  attachedWork: { th: "แนบผลงาน", en: "Attached work", zh: "附带作品" },
  connectPlaceholderWork: {
    th: "เช่น ชอบงานนี้มาก อยากรู้ว่าใช้เวลาทำนานไหม / รับงานสไตล์นี้ไหม…",
    en: "e.g. I love this piece — how long did it take? Do you take work in this style?…",
    zh: "例如：很喜欢这件作品，想了解制作花了多久 / 是否接这种风格的委托…",
  },
  connectPlaceholderUser: {
    th: "สวัสดีครับ/ค่ะ ชอบผลงานของ {name} มาก…",
    en: "Hi! I really like your work, {name}…",
    zh: "你好！我很喜欢 {name} 的作品…",
  },
} satisfies Dict;

export type ChatKey = keyof typeof CHAT;
