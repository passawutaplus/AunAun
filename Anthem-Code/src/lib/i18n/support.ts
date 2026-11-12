import type { Dict } from "@/lib/i18n";

/**
 * Support Us: hub, shop, bag, donate, sponsor & collaborate.
 * Voice (owner, 2026-11-12): short, friendly, spoken Thai. One line per block, no explaining.
 * Section headings are English in every language and live in the markup, not here.
 */
export const SUPPORT = {
  // Hub
  heroLine: {
    th: "เรามีของขายนะ ซื้อไปใช้ก็ช่วยเราได้แล้ว",
    en: "We make things too. Buy one and you've already helped.",
    zh: "我们也做东西卖，买一件就是在帮我们了",
  },
  seeAll: { th: "ดูทั้งหมด", en: "See all", zh: "查看全部" },
  donateLine: { th: "เลี้ยงกาแฟทีมสักแก้วก็ได้", en: "Buy the team a coffee.", zh: "请团队喝杯咖啡吧" },
  donateCta: { th: "บริจาค", en: "Donate", zh: "捐助" },
  notOpenYet: { th: "ยังไม่เปิดรับนะ", en: "Not open yet", zh: "暂未开放" },
  sponsorLine: {
    th: "จะสปอนเรา หรือชวนเราไปทำงานด้วยก็ได้ ทักมาเลย",
    en: "Sponsor us, or bring us into your project. Say hi.",
    zh: "赞助我们，或邀请我们一起合作，欢迎来聊",
  },
  talk: { th: "คุยกัน", en: "Let's talk", zh: "聊一聊" },
  chatLine: { th: "แชท LINE", en: "Chat on LINE", zh: "LINE 聊天" },
  backToSupport: { th: "กลับหน้า Support", en: "Back to Support", zh: "返回 Support" },

  // Product states
  stPrototype: { th: "ต้นแบบ · ยังไม่วางขาย", en: "Prototype · not on sale yet", zh: "原型 · 暂未发售" },
  stInDev: { th: "กำลังทำอยู่", en: "In the works", zh: "制作中" },
  stAvailable: { th: "พร้อมส่ง", en: "Ready to ship", zh: "现货" },
  stLow: { th: "เหลือ {n} ชิ้น", en: "{n} left", zh: "仅剩 {n} 件" },
  stSoldOut: { th: "ของหมด", en: "Sold out", zh: "已售罄" },
  demoBadge: { th: "ตัวอย่าง", en: "Sample", zh: "示例" },
  demoNote: {
    th: "โหมดทดสอบ ของตัวอย่าง ไม่ตัดเงินจริง",
    en: "Test mode. Sample items, no real charge.",
    zh: "测试模式：示例商品，不会真实扣款",
  },

  // Shop
  shopLine: { th: "ของที่เราทำเอง", en: "Things we make ourselves", zh: "我们自己做的东西" },
  catAll: { th: "ทั้งหมด", en: "All", zh: "全部" },
  bagAria: { th: "ถุงของคุณ {n} ชิ้น", en: "Your bag, {n} items", one: "Your bag, 1 item", zh: "购物袋，{n} 件" },

  // Product page
  colour: { th: "สี", en: "Colour", zh: "颜色" },
  addToBag: { th: "ใส่ถุง", en: "Add to bag", zh: "加入购物袋" },
  added: { th: "ใส่ถุงแล้ว", en: "Added to your bag", zh: "已加入购物袋" },
  bagLimit: { th: "ใส่ได้เท่านี้นะ", en: "That's the most you can add", zh: "已达可加入的上限" },
  viewBag: { th: "ดูถุง", en: "View bag", zh: "查看购物袋" },
  notForSale: { th: "ยังไม่วางขายนะ", en: "Not on sale yet", zh: "暂未发售" },
  tryPickerApp: { th: "ลองแอป Picker", en: "Try the Picker app", zh: "试用 Picker 应用" },
  shippingNote: { th: "ค่าส่งคิดตอนจ่ายเงิน", en: "Shipping is added at checkout", zh: "运费在结账时计算" },
  productMissing: { th: "ไม่เจอสินค้านี้", en: "We couldn't find this item", zh: "找不到该商品" },
  backToShop: { th: "กลับไปร้าน", en: "Back to the shop", zh: "返回商店" },
  conceptVisual: { th: "ภาพแนวคิด ไม่ใช่ภาพถ่ายสินค้า", en: "Concept visual, not a product photo", zh: "概念图，非实物照片" },

  // Bag
  bagEmpty: { th: "ถุงยังว่างอยู่", en: "Your bag is empty", zh: "购物袋还是空的" },
  goShop: { th: "ไปเลือกของ", en: "Go to the shop", zh: "去逛逛" },
  keepShopping: { th: "เลือกต่อ", en: "Keep shopping", zh: "继续选购" },
  qty: { th: "จำนวน", en: "Quantity", zh: "数量" },
  decrease: { th: "ลดจำนวน", en: "Decrease", zh: "减少" },
  increase: { th: "เพิ่มจำนวน", en: "Increase", zh: "增加" },
  remove: { th: "เอาออก", en: "Remove", zh: "移除" },
  subtotal: { th: "ค่าของ", en: "Items", zh: "商品" },
  shipping: { th: "ค่าส่ง", en: "Shipping", zh: "运费" },
  total: { th: "รวม", en: "Total", zh: "合计" },
  payDemo: { th: "จ่ายเงิน (ทดสอบ)", en: "Pay (test)", zh: "付款（测试）" },
  payClosed: { th: "ยังไม่เปิดขายนะ", en: "Checkout isn't open yet", zh: "暂未开放结账" },
  problemGone: { th: "ไม่มีสินค้านี้แล้ว เอาออกก่อนนะ", en: "This item is gone. Remove it to continue.", zh: "该商品已下架，请先移除" },
  problemSoldOut: { th: "ของหมดแล้ว เอาออกก่อนนะ", en: "Sold out. Remove it to continue.", zh: "已售罄，请先移除" },
  problemNotEnough: { th: "เหลือแค่ {n} ชิ้น", en: "Only {n} left", zh: "仅剩 {n} 件" },

  // Order (test checkout)
  orderLine: { th: "ได้รับออเดอร์แล้ว ขอบคุณมากนะ", en: "Got your order. Thank you!", zh: "已收到订单，非常感谢" },
  orderRef: { th: "เลขที่ออเดอร์", en: "Order no.", zh: "订单号" },
  orderDemo: {
    th: "ออเดอร์ทดสอบ ไม่มีการตัดเงิน และไม่มีการส่งของ",
    en: "Test order. No charge, and nothing ships.",
    zh: "测试订单：未扣款，也不会发货",
  },
  orderMissing: { th: "ไม่เจอออเดอร์นี้", en: "We couldn't find this order", zh: "找不到该订单" },

  // Donate
  donateHeroLine: {
    th: "เลี้ยงกาแฟทีมสักแก้วก็ได้ เราเอาไปจ่ายค่าเซิร์ฟเวอร์",
    en: "Buy the team a coffee. It goes to the server bill.",
    zh: "请团队喝杯咖啡，我们拿去付服务器费用",
  },
  ofGoal: { th: "จาก {goal}", en: "of {goal}", zh: "目标 {goal}" },
  pickAmount: { th: "เลือกจำนวน", en: "Pick an amount", zh: "选择金额" },
  other: { th: "อื่น ๆ", en: "Other", zh: "其他" },
  amountLabel: { th: "จำนวน (บาท)", en: "Amount (THB)", zh: "金额（泰铢）" },
  minAmount: { th: "ขั้นต่ำ {n} บาทนะ", en: "Minimum is {n} baht", zh: "最低 {n} 泰铢" },
  oneTime: { th: "จ่ายครั้งเดียวจบ", en: "One time, no subscription", zh: "一次性付款" },
  showName: { th: "โชว์ชื่อฉันด้วย", en: "Show my name", zh: "显示我的名字" },
  donateBtn: { th: "บริจาค {amount}", en: "Donate {amount}", zh: "捐助 {amount}" },
  donateBtnDemo: { th: "บริจาค {amount} (ทดสอบ)", en: "Donate {amount} (test)", zh: "捐助 {amount}（测试）" },
  donateClosedNote: {
    th: "ยังไม่เปิดรับนะ แวะร้านเราก่อนได้",
    en: "Not open yet. Have a look at the shop meanwhile.",
    zh: "暂未开放，可以先逛逛商店",
  },
  thanks: { th: "ขอบคุณมากนะ", en: "Thank you so much", zh: "非常感谢" },
  donateDemo: { th: "ทดสอบเฉย ๆ ไม่มีการตัดเงินจริง", en: "Just a test. No money moved.", zh: "仅为测试，未实际扣款" },
  taxNote: {
    th: "เงินนี้ใช้ดูแล SAMECOR นำไปลดหย่อนภาษีไม่ได้",
    en: "This goes to running SAMECOR. It isn't tax-deductible.",
    zh: "款项用于维护 SAMECOR，不可抵税",
  },

  // Sponsor & collaborate
  partnerLine: {
    th: "สปอนเราก็ได้ ชวนเราไปทำงานด้วยก็ได้ เล่าไอเดียมาเลย",
    en: "Sponsor us, or bring us into your project. Tell us the idea.",
    zh: "赞助我们，或邀请我们参与你的项目，说说你的想法吧",
  },
  sendMessage: { th: "ส่งข้อความ", en: "Send", zh: "发送" },
  scanLine: { th: "สแกนแล้วทักมา", en: "Scan and say hi", zh: "扫码来聊" },
  sLogo: { th: "โลโก้บน Supporter Wall", en: "Your logo on the Supporter Wall", zh: "在 Supporter Wall 展示 logo" },
  sEvent: { th: "งาน FIRST CONNECT (มี.ค. 2570)", en: "FIRST CONNECT (March 2027)", zh: "FIRST CONNECT（2027 年 3 月）" },
  sInKind: { th: "ของรางวัล อุปกรณ์ สถานที่", en: "Prizes, gear or a venue", zh: "奖品、设备或场地" },
  wContent: { th: "ทำคอนเทนต์ด้วยกัน", en: "Make content together", zh: "一起做内容" },
  wInvite: { th: "ชวนเราไปออกงาน", en: "Invite us to your event", zh: "邀请我们参加你的活动" },
  promise: {
    th: "เราไม่ขายอันดับผลงาน และไม่ขายข้อมูลสมาชิก",
    en: "We don't sell rankings or member data",
    zh: "我们不出售作品排名，也不出售会员数据",
  },
  fCompany: { th: "แบรนด์ / บริษัท", en: "Brand / company", zh: "品牌 / 公司" },
  fContact: { th: "ชื่อผู้ติดต่อ", en: "Your name", zh: "联系人" },
  fEmail: { th: "อีเมล", en: "Email", zh: "邮箱" },
  fInterest: { th: "สนใจแบบไหน", en: "What are you thinking?", zh: "感兴趣的方式" },
  fBudget: { th: "งบประมาณ", en: "Budget", zh: "预算" },
  fMessage: { th: "ไอเดีย", en: "Your idea", zh: "你的想法" },
  consent: { th: "ติดต่อฉันกลับได้", en: "You can contact me back", zh: "可以联系我" },
  privacy: { th: "นโยบายความเป็นส่วนตัว", en: "Privacy policy", zh: "隐私政策" },
  eCompany: { th: "กรอกชื่อแบรนด์ก่อนนะ", en: "Add your brand name", zh: "请填写品牌名称" },
  eContact: { th: "ใส่ชื่อหน่อยนะ", en: "Add your name", zh: "请填写姓名" },
  eEmail: { th: "เช็กอีเมลอีกทีนะ", en: "Check the email again", zh: "请再检查一下邮箱" },
  eConsent: { th: "เลือกช่องนี้ก่อนนะ", en: "Tick this first", zh: "请先勾选此项" },
  missing: { th: "ยังขาดอีก {n} ช่องนะ", en: "{n} more to fill in", one: "1 more to fill in", zh: "还有 {n} 项未填" },
  sending: { th: "กำลังส่ง…", en: "Sending…", zh: "发送中…" },
  sendFailed: {
    th: "ส่งไม่ผ่าน ลองอีกที หรือทัก LINE มาก็ได้",
    en: "Couldn't send. Try again, or message us on LINE.",
    zh: "发送失败，请重试，或通过 LINE 联系我们",
  },
  sentLine: { th: "เดี๋ยวเราตอบทางอีเมลนะ", en: "We'll reply by email", zh: "我们会通过邮件回复" },
  refNo: { th: "เลขที่ {ref}", en: "Ref {ref}", zh: "编号 {ref}" },
  sendAnother: { th: "ส่งอีกข้อความ", en: "Send another", zh: "再发一条" },
  formDemo: { th: "โหมดทดสอบ ยังไม่ส่งจริงนะ", en: "Test mode. Nothing is sent.", zh: "测试模式，不会真正发送" },

  // Select options
  iInKind: { th: "ของรางวัล / สิ่งของ", en: "Prizes / in-kind", zh: "奖品 / 实物" },
  iInvite: { th: "ชวน SAMECOR ไปร่วมงาน", en: "Invite SAMECOR to our event", zh: "邀请 SAMECOR 参加活动" },
  iUnsure: { th: "ยังไม่แน่ใจ คุยกันก่อน", en: "Not sure yet, let's talk", zh: "还不确定，先聊聊" },
  bUndecided: { th: "ยังไม่ได้กำหนด", en: "Not decided", zh: "未定" },
  bUnder5: { th: "ต่ำกว่า ฿5,000", en: "Under ฿5,000", zh: "低于 ฿5,000" },
  bOver30: { th: "มากกว่า ฿30,000", en: "Over ฿30,000", zh: "高于 ฿30,000" },
  bInKind: { th: "สนับสนุนเป็นสิ่งของ", en: "In-kind", zh: "实物支持" },
} satisfies Dict;
