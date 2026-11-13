import type { Dict } from "@/lib/i18n";

/**
 * Founding Projects / Picker, The First 30 (waitlist stage).
 * Voice: short, friendly, spoken Thai; headings stay English and live in the markup.
 * Rules from the spec: no accuracy numbers, no partner names, no "works on every phone",
 * no promised dates or prices, and every drawing of the device carries the `mockLabel` line.
 */
export const FOUNDING = {
  heroLine: { th: "ช่วยเราทำ Picker ล็อตแรก 30 เครื่อง", en: "Help us build the first 30 Pickers.", zh: "和我们一起做出首批 30 台 Picker" },
  mockLabel: { th: "ภาพจำลองต้นแบบเท่านั้น", en: "Prototype mock-up only", zh: "仅为原型示意图" },
  statusWaitlist: { th: "เปิดรับชื่อก่อน ยังไม่รับเงิน", en: "Waitlist open. No payment yet.", zh: "先登记，暂不收款" },

  // Facts strip
  factUnits: { th: "{n} เครื่อง ล็อตแรก", en: "{n} units, first batch", zh: "首批 {n} 台" },
  factPrice: { th: "ราคา คิดจากต้นทุนจริง ยังไม่ประกาศ", en: "Price: from real cost, not announced yet", zh: "价格：按实际成本计算，尚未公布" },
  factMade: { th: "ตั้งใจประกอบเองทุกเครื่อง", en: "We plan to assemble every unit ourselves", zh: "计划每台都由我们亲手组装" },

  // How it works
  s1: { th: "เลือกสิทธิ์ผู้สนับสนุน", en: "Pick your backer spot", zh: "选择支持名额" },
  s2: { th: "ยอดจริงถึงเงื่อนไข เราถึงเริ่ม", en: "We start once real payments meet the condition", zh: "实际到账达到条件后才启动" },
  s3: { th: "ผลิตและตรวจทุกเครื่อง", en: "We build and check every unit", zh: "逐台生产并质检" },
  s4: { th: "รับเครื่อง แล้วบอกเราว่าเป็นยังไง", en: "Get yours, then tell us how it goes", zh: "收到设备后告诉我们使用感受" },

  // Story
  storyLine: {
    th: "เราอยากให้การเก็บสีจากของจริงเป็นเรื่องง่าย",
    en: "We want capturing colour from real things to be easy.",
    zh: "我们想让从真实物体取色变得简单",
  },
  problem: {
    th: "สีจากของจริงจดยาก ส่งต่อให้ลูกค้ากับโรงงานก็ยาก",
    en: "Real-world colour is hard to record and hard to hand to clients and factories.",
    zh: "真实世界的颜色难以记录，也难以传达给客户和工厂",
  },
  whyPicker: {
    th: "เครื่องเล็ก ๆ วัดสีจากวัสดุ แล้วเก็บ จัดกลุ่ม ส่งออกในแอป",
    en: "A small device that reads colour from materials, with an app to keep, group and export it.",
    zh: "一台小设备从材料上读取颜色，再用应用保存、分组、导出",
  },
  whyThirty: {
    th: "ทำแค่ 30 เครื่องก่อน เพื่อเรียนรู้จากคนใช้จริง",
    en: "Only 30 first, so we learn from people who really use it.",
    zh: "先做 30 台，向真正使用的人学习",
  },

  // Product today
  appLive: { th: "แอป Picker {v} ใช้ได้แล้ว", en: "Picker app {v} is live", zh: "Picker 应用 {v} 已上线" },
  appBrowsers: {
    th: "ใช้ผ่าน Chrome บน Android และคอม",
    en: "Runs in Chrome on Android and desktop",
    zh: "在 Android 和电脑的 Chrome 上使用",
  },
  hwProto: { th: "ตัวเครื่องยังเป็นต้นแบบ", en: "The hardware is still a prototype", zh: "硬件仍是原型" },
  hwSize: { th: "ประมาณ 84 × 33 × 20 มม. · USB-C · ปุ่มเดียว", en: "About 84 × 33 × 20 mm · USB-C · one button", zh: "约 84 × 33 × 20 毫米 · USB-C · 单按键" },
  openApp: { th: "ลองแอป Picker", en: "Try the Picker app", zh: "试用 Picker 应用" },
  seeProduct: { th: "ดูหน้าสินค้า", en: "See the product page", zh: "查看商品页" },

  // Reward
  rewardLine: { th: "Picker 1 เครื่อง · {n} สิทธิ์ ราคาเดียวกัน", en: "1 Picker · {n} spots, one price", zh: "1 台 Picker · {n} 个名额，统一价格" },
  rewardPrice: { th: "ราคาจะบอกก่อนเปิดรับ", en: "Price announced before we open", zh: "开放前公布价格" },
  rewardUpdates: { th: "ตามดูความคืบหน้าได้ตลอด", en: "Follow every project update", zh: "随时关注项目进展" },
  rewardTester: {
    th: "ใช้แล้วบอกเราได้ทั้งที่ชอบและไม่ชอบ",
    en: "Tell us what works and what doesn't. Honest feedback only.",
    zh: "用后告诉我们好与不好，只要真实反馈",
  },
  rewardNotShares: {
    th: "เป็นการสนับสนุนเพื่อรับสินค้า ไม่ใช่หุ้นหรือการลงทุน",
    en: "Backing gets you a product. It is not shares or an investment.",
    zh: "支持是为了获得产品，并非股份或投资",
  },

  // Timeline
  msCompleted: { th: "เสร็จแล้ว", en: "Done", zh: "已完成" },
  msInProgress: { th: "กำลังทำ", en: "In progress", zh: "进行中" },
  msPlanned: { th: "ยังไม่กำหนดวัน", en: "Date to be set", zh: "日期待定" },
  msDelayed: { th: "เลื่อน", en: "Delayed", zh: "延期" },
  msCancelled: { th: "ยกเลิก", en: "Cancelled", zh: "已取消" },
  m1: { th: "แนวคิด งานออกแบบ และตัวถัง 3D", en: "Concept, design work and the 3D enclosure", zh: "概念、设计与 3D 外壳" },
  m2: { th: "มีเว็บแอปสำหรับวัด เก็บ และส่งออกสี", en: "A web app to measure, keep and export colour", zh: "用于测量、保存和导出颜色的网页应用" },
  m3: { th: "ทดสอบความสม่ำเสมอ การปรับเทียบ และ Bluetooth", en: "Testing consistency, calibration and Bluetooth", zh: "测试一致性、校准与蓝牙" },
  m4: { th: "เปิดรับชื่อ แล้วค่อยเปิดรับการสนับสนุน", en: "Waitlist first, then backing opens", zh: "先登记，再开放支持" },
  m5: { th: "ซื้ออะไหล่ ประกอบ และตรวจทุกเครื่อง", en: "Buy parts, assemble and check every unit", zh: "采购零件、组装并逐台质检" },
  m6: { th: "ส่งเครื่อง แล้วฟังเสียงคนใช้จริง", en: "Ship, then listen to real users", zh: "发货，并倾听真实用户的声音" },

  // Updates
  noUpdates: { th: "ยังไม่มีอัปเดต เดี๋ยวมาเล่าให้ฟัง", en: "No updates yet. We'll write soon.", zh: "暂无更新，敬请期待" },

  // FAQ
  q1: { th: "ใช้กับอุปกรณ์อะไรได้บ้าง", en: "Which devices does it work with?", zh: "支持哪些设备？" },
  a1: {
    th: "ตอนนี้ใช้ผ่าน Chrome บน Android และคอม ส่วน iPhone ยังใช้ไม่ได้",
    en: "Chrome on Android and desktop for now. iPhone isn't supported yet.",
    zh: "目前支持 Android 和电脑上的 Chrome，iPhone 暂不支持",
  },
  q2: { th: "ใช้แทนมาตรฐานสีงานพิมพ์ได้ไหม", en: "Can it replace print colour standards?", zh: "能替代印刷色彩标准吗？" },
  a2: {
    th: "ยังบอกไม่ได้ เรายังไม่มีผลทดสอบจากเครื่องจริง",
    en: "We can't say yet. We have no test results from real units.",
    zh: "目前无法确定，我们还没有真机测试结果",
  },
  q3: { th: "ล็อตแรกต่างจากของปกติยังไง", en: "How is the first batch different?", zh: "首批与正式产品有何不同？" },
  a3: {
    th: "เป็นรุ่นแรก ทำ 30 เครื่อง ราคาคิดจากต้นทุนกับค่าแรง",
    en: "It's the first run: 30 units, priced from cost and labour.",
    zh: "这是第一批：30 台，价格按成本与人工计算",
  },
  q4: { th: "จะผลิตและส่งเมื่อไหร่", en: "When will it be made and shipped?", zh: "何时生产和发货？" },
  a4: {
    th: "ยังไม่กำหนดวัน ต้องทดสอบเครื่องให้ผ่านก่อน",
    en: "No date yet. The hardware has to pass testing first.",
    zh: "日期未定，硬件需先通过测试",
  },
  q5: { th: "ถ้าไม่ถึงเป้าหรือช้าจะเป็นยังไง", en: "What if the goal isn't met, or it runs late?", zh: "未达目标或延期怎么办？" },
  a5: {
    th: "เงื่อนไขและการคืนเงินจะบอกชัด ๆ ก่อนเปิดรับเงิน",
    en: "The conditions and refunds will be spelled out before we take any money.",
    zh: "收款前会明确说明条件与退款方式",
  },
  q6: { th: "ขอคืนเงินหรือแก้ที่อยู่ยังไง", en: "How do I get a refund or change my address?", zh: "如何退款或修改地址？" },
  a6: {
    th: "ตอนนี้ยังไม่รับเงิน ขั้นตอนจะประกาศพร้อมวันเปิด",
    en: "We aren't taking money yet. The steps come with the opening date.",
    zh: "目前尚未收款，流程将与开放日期一同公布",
  },

  // Risks
  r1: {
    th: "ตัวเครื่องยังเป็นต้นแบบ ยังไม่มีตัวเลขความแม่นยำที่ทดสอบจริง",
    en: "The hardware is a prototype. There are no tested accuracy figures yet.",
    zh: "硬件仍是原型，尚无经过实测的精度数据",
  },
  r2: {
    th: "เปลือก แบตเตอรี่ และการตรวจคุณภาพ ต้องผ่านก่อนส่ง",
    en: "The shell, battery and quality checks must pass before anything ships.",
    zh: "外壳、电池与质检必须通过后才会发货",
  },
  r3: {
    th: "iPhone ยังใช้ไม่ได้ เพราะ Safari ยังจำกัด Bluetooth บนเว็บ",
    en: "iPhone isn't supported yet: Safari limits web Bluetooth.",
    zh: "暂不支持 iPhone：Safari 对网页蓝牙有限制",
  },
  r4: {
    th: "วันส่งอาจเลื่อนได้ ถ้าเลื่อนเราจะบอกตรง ๆ",
    en: "Delivery may slip. If it does, we'll say so plainly.",
    zh: "交付可能延期，如有延期我们会如实告知",
  },
  r5: {
    th: "เงินสนับสนุนคือการซื้อสินค้า ไม่ใช่หุ้นหรือผลตอบแทน",
    en: "Backing buys a product. It is not shares or a return.",
    zh: "支持款用于购买产品，并非股份或回报",
  },

  // Waitlist
  wlLine: { th: "เปิดเมื่อไหร่ บอกคุณก่อนเลย", en: "You'll hear first when we open.", zh: "开放时第一时间通知你" },
  wlEmail: { th: "อีเมล", en: "Email", zh: "邮箱" },
  wlConsent: { th: "ส่งข่าว The First 30 มาที่อีเมลนี้ได้", en: "Email me news about The First 30", zh: "可以向此邮箱发送 The First 30 的消息" },
  wlJoin: { th: "ลงชื่อ", en: "Join", zh: "登记" },
  wlJoining: { th: "กำลังลงชื่อ…", en: "Joining…", zh: "登记中…" },
  wlEmailError: { th: "เช็กอีเมลอีกทีนะ", en: "Check the email again", zh: "请再检查一下邮箱" },
  wlConsentError: { th: "เลือกช่องนี้ก่อนนะ", en: "Tick this first", zh: "请先勾选此项" },
  wlFailed: {
    th: "ลงชื่อไม่ผ่าน ลองอีกที หรือทัก LINE มาก็ได้",
    en: "Couldn't join. Try again, or message us on LINE.",
    zh: "登记失败，请重试，或通过 LINE 联系我们",
  },
  wlDone: { th: "เดี๋ยวเปิดแล้วบอกคุณก่อนเลยนะ", en: "We'll tell you first when it opens.", zh: "开放时会第一时间告诉你" },
  wlLeave: { th: "อยากออกจากลิสต์ ทัก LINE มาได้เลย", en: "Want off the list? Message us on LINE.", zh: "想退出名单？LINE 联系我们即可" },
  wlTest: { th: "ลงชื่อแบบทดสอบ", en: "Saved as a test sign-up", zh: "已保存为测试登记" },
  privacy: { th: "นโยบายความเป็นส่วนตัว", en: "Privacy policy", zh: "隐私政策" },
  chatLine: { th: "แชท LINE", en: "Chat on LINE", zh: "LINE 聊天" },
  backToShop: { th: "กลับไปร้าน", en: "Back to the shop", zh: "返回商店" },
  notFound: { th: "ไม่เจอโครงการนี้", en: "We couldn't find this project", zh: "找不到该项目" },
} satisfies Dict;
