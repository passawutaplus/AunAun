// Mock data for Tax & Financial Dashboard (Freelance Edition)
import type { LucideIcon } from "lucide-react";
import {
  Palette,
  Music,
  Code2,
  Wifi,
  Sparkles,
  MessageSquare,
  Cloud,
  Box,
  CreditCard,
  Wallet,
  Smartphone,
  Home,
  Tv,
  Film,
  Gamepad2,
  BookOpen,
  Briefcase,
  Database,
  Building2,
  Zap,
  Phone,
  Droplet,
  ShoppingBag,
  Brain,
  Bot,
  Image as ImageIcon,
  Languages,
  Video,
  Headphones,
  Newspaper,
  Heart,
  Dumbbell,
  Scissors,
  Shield,
  TrendingUp,
  Users,
  PawPrint,
  GraduationCap,
  Settings,
  HandCoins,
  Banknote,
} from "lucide-react";

export type SubCategory =
  | "Design"
  | "Music"
  | "Dev"
  | "Internet"
  | "AI"
  | "Streaming"
  | "Cloud"
  | "Productivity"
  | "Housing"
  | "Utilities"
  | "Health"
  | "Beauty"
  | "Insurance"
  | "Investments"
  | "CardFees"
  | "Family"
  | "Donations"
  | "Pets"
  | "Learning"
  | "Operations";

export type SubStatus = "active" | "paused" | "cancelled";
export type SubPriceMode = "monthly" | "installment";

export type Subscription = {
  id: string;
  name: string;
  category: SubCategory;
  amount: number; // THB / month (for installment = full / months)
  billingDay: number; // 1-31
  paymentMethodId: string;
  icon: LucideIcon;
  status?: SubStatus;
  priceMode?: SubPriceMode;
  fullPrice?: number;
  installmentMonths?: number;
  installmentsPaid?: number;
  lastUsedAt?: string;
};

export type PaymentKind = "credit" | "debit" | "wallet" | "cash";

export type PaymentMethod = {
  id: string;
  label: string;
  type: PaymentKind;
  last4: string;
  icon: LucideIcon;
  /** วันที่บัตรตัดรอบ (statement closing day, 1-31) */
  statementDay?: number;
  /** วันสุดท้ายที่ต้องจ่าย (payment due day, 1-31) */
  dueDay?: number;
};

export type Client = {
  id: string;
  name: string;
  project: string;
  amount: number;
  status: "paid" | "ontime" | "late7" | "late30";
  dueDate: string;
};

/** ประเภทเงินได้ตามมาตรา 40 (เน้นกลุ่มฟรีแลนซ์) */
export type IncomeType =
  | "freelance" // 40(2) รับจ้างทั่วไป — หักเหมาได้ 50% ไม่เกิน 100,000
  | "professional" // 40(6) วิชาชีพอิสระ (ออกแบบ, แพทย์, ทนาย ฯลฯ) — เหมา 30%
  | "online_sales" // 40(8) ขายของออนไลน์ — เหมา 60% หรือหักจริง
  | "commission" // 40(2) ค่าคอมมิชชั่น/นายหน้า
  | "rental" // 40(5) ค่าเช่า
  | "other"; // อื่น ๆ

export type IncomeRecord = {
  id: string;
  month: string; // "2025-01"
  client: string;
  gross: number;
  withholding: number; // คำนวณตาม whtRate
  /** ประเภทเงินได้ */
  incomeType?: IncomeType;
  /** อัตรา หัก ณ ที่จ่าย (%) เช่น 1, 2, 3, 5, 15 */
  whtRate?: number;
  /** เลขที่ใบหักภาษี ณ ที่จ่าย (50 ทวิ) */
  certificateNo?: string;
  /** ได้รับใบ 50 ทวิ จากลูกค้าแล้วหรือยัง */
  certificateReceived?: boolean;
  /** Storage path ใน bucket wht-certificates */
  certificateStoragePath?: string;
  /** หมายเหตุ */
  note?: string;
  /** id ของใบเสนอราคาที่สร้างรายได้นี้ (กรณีมา auto-sync) */
  sourceQuotationId?: string;
};

/** ป้ายชื่อสำหรับ IncomeType (ภาษาไทย) */
export const INCOME_TYPE_META: Record<
  IncomeType,
  { label: string; section: string; lumpSumPct: number; lumpSumCap?: number }
> = {
  freelance: { label: "รับจ้างทั่วไป", section: "40(2)", lumpSumPct: 0.5, lumpSumCap: 100_000 },
  professional: { label: "วิชาชีพอิสระ", section: "40(6)", lumpSumPct: 0.3 },
  online_sales: { label: "ขายของออนไลน์", section: "40(8)", lumpSumPct: 0.6 },
  commission: { label: "ค่าคอมมิชชั่น", section: "40(2)", lumpSumPct: 0.5, lumpSumCap: 100_000 },
  rental: { label: "ค่าเช่า", section: "40(5)", lumpSumPct: 0.3 },
  other: { label: "อื่น ๆ", section: "40(8)", lumpSumPct: 0.6 },
};

/** อัตรา หัก ณ ที่จ่าย แนะนำตามประเภทเงินได้ */
export const SUGGESTED_WHT_RATE: Record<IncomeType, number> = {
  freelance: 3,
  professional: 3,
  online_sales: 7, // ขายของออนไลน์ — มักบันทึก VAT 7%
  commission: 3,
  rental: 5,
  other: 3,
};

export type ExpenseRecord = {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: "work" | "personal";
  subCategory?: string;
  receiptUrl?: string;
  receiptPath?: string;
};

// Preset Thai payment providers (banks, e-wallets, BNPL)
export const PRESET_PAYMENT_PROVIDERS: Array<{
  id: string;
  label: string;
  type: PaymentMethod["type"];
  icon: LucideIcon;
}> = [
  // Banks
  { id: "kbank", label: "KBank (กสิกรไทย)", type: "credit", icon: CreditCard },
  { id: "scb", label: "SCB (ไทยพาณิชย์)", type: "credit", icon: CreditCard },
  { id: "bbl", label: "BBL (กรุงเทพ)", type: "credit", icon: CreditCard },
  { id: "ktb", label: "KTB (กรุงไทย)", type: "credit", icon: CreditCard },
  { id: "bay", label: "Krungsri / BAY (กรุงศรี)", type: "credit", icon: CreditCard },
  { id: "ttb", label: "ttb (ทีเอ็มบีธนชาต)", type: "credit", icon: CreditCard },
  { id: "uob", label: "UOB Thailand", type: "credit", icon: CreditCard },
  { id: "cimb", label: "CIMB Thai", type: "credit", icon: CreditCard },
  { id: "kkp", label: "Kiatnakin Phatra (KKP)", type: "credit", icon: CreditCard },
  { id: "lhb", label: "LH Bank", type: "credit", icon: CreditCard },
  { id: "tisco", label: "TISCO", type: "credit", icon: CreditCard },
  { id: "gsb", label: "GSB (ออมสิน)", type: "debit", icon: Wallet },
  { id: "baac", label: "ธ.ก.ส. (BAAC)", type: "debit", icon: Wallet },
  { id: "ghb", label: "ธอส. (GHB)", type: "debit", icon: Wallet },
  // E-wallets
  { id: "truewallet", label: "TrueMoney Wallet", type: "wallet", icon: Smartphone },
  { id: "linepay", label: "Rabbit LINE Pay", type: "wallet", icon: Smartphone },
  { id: "shopeepay", label: "ShopeePay", type: "wallet", icon: ShoppingBag },
  { id: "promptpay", label: "PromptPay (พร้อมเพย์)", type: "wallet", icon: Smartphone },
  { id: "grabpay", label: "GrabPay", type: "wallet", icon: Smartphone },
  { id: "applepay", label: "Apple Pay", type: "wallet", icon: Smartphone },
  { id: "googlepay", label: "Google Pay", type: "wallet", icon: Smartphone },
  { id: "alipay", label: "Alipay+", type: "wallet", icon: Smartphone },
  { id: "wechatpay", label: "WeChat Pay", type: "wallet", icon: Smartphone },
  // BNPL
  { id: "atome", label: "Atome", type: "wallet", icon: ShoppingBag },
  { id: "shopback", label: "ShopBack PayLater", type: "wallet", icon: ShoppingBag },
  // Cash / Transfer
  { id: "cash", label: "เงินสด / โอน", type: "cash", icon: Banknote },
];

export const paymentMethods: PaymentMethod[] = [
  { id: "pm1", label: "KBank (กสิกรไทย)", type: "credit", last4: "4892", icon: CreditCard },
  { id: "pm2", label: "SCB (ไทยพาณิชย์)", type: "debit", last4: "1027", icon: Wallet },
  { id: "pm3", label: "TrueMoney Wallet", type: "wallet", last4: "8821", icon: Smartphone },
];

export const subscriptions: Subscription[] = [
  {
    id: "s1",
    name: "Adobe Creative Cloud",
    category: "Design",
    amount: 1099,
    billingDay: 5,
    paymentMethodId: "pm1",
    icon: Palette,
  },
  {
    id: "s2",
    name: "Canva Pro",
    category: "Design",
    amount: 399,
    billingDay: 12,
    paymentMethodId: "pm1",
    icon: Sparkles,
  },
  {
    id: "s3",
    name: "Figma Professional",
    category: "Design",
    amount: 540,
    billingDay: 18,
    paymentMethodId: "pm2",
    icon: Box,
  },
  {
    id: "s4",
    name: "Spotify Premium",
    category: "Music",
    amount: 159,
    billingDay: 8,
    paymentMethodId: "pm3",
    icon: Music,
  },
  {
    id: "s5",
    name: "ChatGPT Plus",
    category: "Dev",
    amount: 720,
    billingDay: 22,
    paymentMethodId: "pm1",
    icon: MessageSquare,
  },
  {
    id: "s6",
    name: "GitHub Copilot",
    category: "Dev",
    amount: 360,
    billingDay: 14,
    paymentMethodId: "pm2",
    icon: Code2,
  },
  {
    id: "s7",
    name: "Vercel Pro",
    category: "Dev",
    amount: 720,
    billingDay: 3,
    paymentMethodId: "pm1",
    icon: Cloud,
  },
  {
    id: "s8",
    name: "AIS Fibre 1Gbps",
    category: "Internet",
    amount: 899,
    billingDay: 25,
    paymentMethodId: "pm2",
    icon: Wifi,
  },
];

export const clients: Client[] = [
  {
    id: "c1",
    name: "Studio Mango",
    project: "Brand Identity",
    amount: 35000,
    status: "paid",
    dueDate: "2025-03-10",
  },
  {
    id: "c2",
    name: "Cafe Nimman",
    project: "Web Design",
    amount: 22000,
    status: "ontime",
    dueDate: "2025-04-25",
  },
  {
    id: "c3",
    name: "Tech Bangkok Co.",
    project: "Mobile App UI",
    amount: 48000,
    status: "late7",
    dueDate: "2025-04-15",
  },
  {
    id: "c4",
    name: "Khun Anong",
    project: "Logo Refresh",
    amount: 8000,
    status: "late30",
    dueDate: "2025-03-20",
  },
  {
    id: "c5",
    name: "Indie Music Lab",
    project: "Album Artwork",
    amount: 15000,
    status: "ontime",
    dueDate: "2025-04-30",
  },
  {
    id: "c6",
    name: "Northern Foods",
    project: "Packaging",
    amount: 28000,
    status: "paid",
    dueDate: "2025-02-28",
  },
];

export const incomes: IncomeRecord[] = [
  {
    id: "i1",
    month: "2025-01",
    client: "Studio Mango",
    gross: 35000,
    withholding: 1050,
    incomeType: "freelance",
    whtRate: 3,
    certificateNo: "WHT-2025-0011",
    certificateReceived: true,
  },
  {
    id: "i2",
    month: "2025-01",
    client: "Northern Foods",
    gross: 28000,
    withholding: 840,
    incomeType: "freelance",
    whtRate: 3,
    certificateNo: "WHT-2025-0014",
    certificateReceived: true,
  },
  {
    id: "i3",
    month: "2025-02",
    client: "Cafe Nimman",
    gross: 22000,
    withholding: 660,
    incomeType: "professional",
    whtRate: 3,
    certificateReceived: false,
    note: "รอใบ 50 ทวิ",
  },
  {
    id: "i4",
    month: "2025-02",
    client: "Indie Music Lab",
    gross: 15000,
    withholding: 450,
    incomeType: "freelance",
    whtRate: 3,
    certificateNo: "IML-25-02",
    certificateReceived: true,
  },
  {
    id: "i5",
    month: "2025-03",
    client: "Tech Bangkok Co.",
    gross: 48000,
    withholding: 1440,
    incomeType: "professional",
    whtRate: 3,
    certificateNo: "TBC-0325",
    certificateReceived: true,
  },
  {
    id: "i6",
    month: "2025-03",
    client: "Studio Mango",
    gross: 18000,
    withholding: 540,
    incomeType: "freelance",
    whtRate: 3,
    certificateReceived: false,
  },
  {
    id: "i7",
    month: "2025-04",
    client: "ลูกค้า Shopee",
    gross: 12500,
    withholding: 0,
    incomeType: "online_sales",
    whtRate: 0,
    note: "ออเดอร์รวมเดือน เม.ย.",
  },
  {
    id: "i8",
    month: "2025-04",
    client: "Tech Bangkok Co.",
    gross: 32000,
    withholding: 960,
    incomeType: "professional",
    whtRate: 3,
    certificateNo: "TBC-0425",
    certificateReceived: true,
  },
  {
    id: "i9",
    month: "2025-04",
    client: "ลูกค้า TikTok Shop",
    gross: 8800,
    withholding: 0,
    incomeType: "online_sales",
    whtRate: 0,
  },
];

export const workExpenses: ExpenseRecord[] = [
  {
    id: "we1",
    date: "2025-01-15",
    description: "Stock photos license",
    amount: 2400,
    category: "work",
    subCategory: "Software",
  },
  {
    id: "we2",
    date: "2025-02-08",
    description: "iPad stylus + accessories",
    amount: 4800,
    category: "work",
    subCategory: "Equipment",
  },
  {
    id: "we3",
    date: "2025-03-12",
    description: "Coworking space (Q1)",
    amount: 9000,
    category: "work",
    subCategory: "Office",
  },
  {
    id: "we4",
    date: "2025-04-02",
    description: "Online course - Motion design",
    amount: 3200,
    category: "work",
    subCategory: "Education",
  },
];

export const personalExpenses: ExpenseRecord[] = [
  {
    id: "pe1",
    date: "2025-04-01",
    description: "ค่าเช่าบ้าน",
    amount: 12000,
    category: "personal",
  },
  {
    id: "pe2",
    date: "2025-04-05",
    description: "ค่าน้ำ-ค่าไฟ",
    amount: 1850,
    category: "personal",
  },
  { id: "pe3", date: "2025-04-08", description: "ค่าโทรศัพท์", amount: 599, category: "personal" },
  { id: "pe4", date: "2025-04-10", description: "ค่าอาหาร", amount: 6200, category: "personal" },
  { id: "pe5", date: "2025-04-15", description: "ฟิตเนส", amount: 1500, category: "personal" },
];

export type QuickAddItem = {
  name: string;
  category: SubCategory;
  suggestedAmount: number;
  icon: LucideIcon;
};

export const QUICK_ADD_GROUPS: Array<{ group: string; items: QuickAddItem[] }> = [
  {
    group: "Design",
    items: [
      { name: "Adobe Creative Cloud", category: "Design", suggestedAmount: 1099, icon: Palette },
      { name: "Canva Pro", category: "Design", suggestedAmount: 399, icon: Sparkles },
      { name: "Figma Pro", category: "Design", suggestedAmount: 540, icon: Box },
      { name: "Framer", category: "Design", suggestedAmount: 540, icon: Box },
      { name: "Procreate", category: "Design", suggestedAmount: 449, icon: Palette },
    ],
  },
  {
    group: "AI",
    items: [
      { name: "ChatGPT Plus", category: "AI", suggestedAmount: 720, icon: MessageSquare },
      { name: "Claude Pro", category: "AI", suggestedAmount: 720, icon: Brain },
      { name: "Gemini Advanced", category: "AI", suggestedAmount: 720, icon: Sparkles },
      { name: "Perplexity Pro", category: "AI", suggestedAmount: 720, icon: Brain },
      { name: "Midjourney", category: "AI", suggestedAmount: 360, icon: ImageIcon },
      { name: "Runway", category: "AI", suggestedAmount: 540, icon: Video },
      { name: "ElevenLabs", category: "AI", suggestedAmount: 360, icon: Headphones },
      { name: "Cursor Pro", category: "AI", suggestedAmount: 720, icon: Bot },
    ],
  },
  {
    group: "Dev / Cloud",
    items: [
      { name: "GitHub Copilot", category: "Dev", suggestedAmount: 360, icon: Code2 },
      { name: "GitHub Pro", category: "Dev", suggestedAmount: 150, icon: Code2 },
      { name: "Vercel Pro", category: "Cloud", suggestedAmount: 720, icon: Cloud },
      { name: "Netlify Pro", category: "Cloud", suggestedAmount: 700, icon: Cloud },
      { name: "Supabase Pro", category: "Cloud", suggestedAmount: 900, icon: Database },
      { name: "AWS / GCP", category: "Cloud", suggestedAmount: 500, icon: Cloud },
      { name: "Cloudflare Pro", category: "Cloud", suggestedAmount: 720, icon: Cloud },
    ],
  },
  {
    group: "Streaming / Music",
    items: [
      { name: "Spotify Premium", category: "Music", suggestedAmount: 159, icon: Music },
      { name: "Apple Music", category: "Music", suggestedAmount: 169, icon: Music },
      { name: "YouTube Premium", category: "Streaming", suggestedAmount: 159, icon: Tv },
      { name: "Netflix", category: "Streaming", suggestedAmount: 419, icon: Film },
      { name: "Disney+ Hotstar", category: "Streaming", suggestedAmount: 289, icon: Film },
      { name: "Apple TV+", category: "Streaming", suggestedAmount: 199, icon: Tv },
      { name: "Viu Premium", category: "Streaming", suggestedAmount: 119, icon: Tv },
      { name: "TrueID+", category: "Streaming", suggestedAmount: 119, icon: Tv },
      { name: "PlayStation Plus", category: "Streaming", suggestedAmount: 249, icon: Gamepad2 },
    ],
  },
  {
    group: "Productivity",
    items: [
      { name: "Notion Plus", category: "Productivity", suggestedAmount: 350, icon: BookOpen },
      { name: "Microsoft 365", category: "Productivity", suggestedAmount: 219, icon: Briefcase },
      { name: "Google One", category: "Productivity", suggestedAmount: 70, icon: Cloud },
      { name: "iCloud+", category: "Productivity", suggestedAmount: 35, icon: Cloud },
      { name: "1Password", category: "Productivity", suggestedAmount: 110, icon: Briefcase },
      { name: "DeepL Pro", category: "Productivity", suggestedAmount: 290, icon: Languages },
    ],
  },
  {
    group: "Internet / Mobile",
    items: [
      { name: "AIS Fibre", category: "Internet", suggestedAmount: 899, icon: Wifi },
      { name: "True Online", category: "Internet", suggestedAmount: 799, icon: Wifi },
      { name: "3BB Fibre", category: "Internet", suggestedAmount: 690, icon: Wifi },
      { name: "NT Fibre", category: "Internet", suggestedAmount: 590, icon: Wifi },
      { name: "AIS Mobile", category: "Internet", suggestedAmount: 599, icon: Smartphone },
      { name: "True Mobile", category: "Internet", suggestedAmount: 599, icon: Smartphone },
      { name: "dtac Mobile", category: "Internet", suggestedAmount: 499, icon: Smartphone },
    ],
  },
  {
    group: "ค่าเช่า / ที่อยู่อาศัย",
    items: [
      { name: "ค่าเช่าบ้าน / คอนโด", category: "Housing", suggestedAmount: 12000, icon: Home },
      { name: "ค่าเช่าออฟฟิศ", category: "Housing", suggestedAmount: 8000, icon: Building2 },
      { name: "ค่าส่วนกลาง", category: "Housing", suggestedAmount: 1500, icon: Building2 },
      { name: "Coworking Space", category: "Housing", suggestedAmount: 3500, icon: Briefcase },
      { name: "ค่าน้ำ", category: "Utilities", suggestedAmount: 250, icon: Droplet },
      { name: "ค่าไฟ", category: "Utilities", suggestedAmount: 1500, icon: Zap },
      { name: "ค่าแก๊ส", category: "Utilities", suggestedAmount: 400, icon: Zap },
      { name: "ค่าโทรศัพท์บ้าน", category: "Utilities", suggestedAmount: 350, icon: Phone },
      {
        name: "หนังสือพิมพ์ / นิตยสาร",
        category: "Productivity",
        suggestedAmount: 200,
        icon: Newspaper,
      },
    ],
  },
  {
    group: "สุขภาพ & ดูแลตัวเอง",
    items: [
      { name: "ฟิตเนส / Gym", category: "Health", suggestedAmount: 1500, icon: Dumbbell },
      { name: "คลาสโยคะ", category: "Health", suggestedAmount: 1200, icon: Heart },
      { name: "Headspace", category: "Health", suggestedAmount: 350, icon: Brain },
      { name: "Calm", category: "Health", suggestedAmount: 350, icon: Heart },
      { name: "แอปนับแคลอรี่", category: "Health", suggestedAmount: 199, icon: Heart },
      { name: "คอร์สทำหน้า", category: "Beauty", suggestedAmount: 2500, icon: Sparkles },
      { name: "ตัดผมรายเดือน", category: "Beauty", suggestedAmount: 800, icon: Scissors },
    ],
  },
  {
    group: "การเงิน & ประกัน",
    items: [
      { name: "ประกันชีวิต", category: "Insurance", suggestedAmount: 2000, icon: Shield },
      { name: "ประกันสุขภาพ", category: "Insurance", suggestedAmount: 1800, icon: Shield },
      { name: "ประกันรถยนต์", category: "Insurance", suggestedAmount: 1500, icon: Shield },
      { name: "DCA หุ้น/กองทุน", category: "Investments", suggestedAmount: 3000, icon: TrendingUp },
      {
        name: "เงินออมอัตโนมัติ",
        category: "Investments",
        suggestedAmount: 2000,
        icon: TrendingUp,
      },
      {
        name: "ค่าธรรมเนียมบัตรเครดิต",
        category: "CardFees",
        suggestedAmount: 100,
        icon: CreditCard,
      },
    ],
  },
  {
    group: "ครอบครัว & สังคม",
    items: [
      { name: "เงินให้พ่อแม่", category: "Family", suggestedAmount: 5000, icon: HandCoins },
      { name: "ค่าเทอมลูก", category: "Family", suggestedAmount: 8000, icon: GraduationCap },
      { name: "บริจาครายเดือน", category: "Donations", suggestedAmount: 500, icon: Heart },
      { name: "Patreon", category: "Donations", suggestedAmount: 200, icon: Users },
      { name: "อาหารสัตว์เลี้ยง", category: "Pets", suggestedAmount: 1200, icon: PawPrint },
      { name: "ประกันสัตว์เลี้ยง", category: "Pets", suggestedAmount: 800, icon: PawPrint },
    ],
  },
  {
    group: "เรียนรู้ & ธุรกิจ",
    items: [
      { name: "Skillshare", category: "Learning", suggestedAmount: 350, icon: GraduationCap },
      { name: "Udemy / คอร์สออนไลน์", category: "Learning", suggestedAmount: 500, icon: BookOpen },
      { name: "โปรแกรมบัญชี", category: "Operations", suggestedAmount: 500, icon: Settings },
      { name: "CRM", category: "Operations", suggestedAmount: 1000, icon: Settings },
      { name: "ค่าโดเมนเว็บ", category: "Operations", suggestedAmount: 50, icon: Cloud },
    ],
  },
];

// Backwards-compat flat list (kept for any older imports)
export const POPULAR_SUBS: QuickAddItem[] = QUICK_ADD_GROUPS.flatMap((g) => g.items);

export const MONTHLY_GOAL = 80000;
export const VAT_THRESHOLD = 1_800_000;

// Thai personal income tax brackets (2025)
export const TAX_BRACKETS = [
  { from: 0, to: 150_000, rate: 0 },
  { from: 150_000, to: 300_000, rate: 0.05 },
  { from: 300_000, to: 500_000, rate: 0.1 },
  { from: 500_000, to: 750_000, rate: 0.15 },
  { from: 750_000, to: 1_000_000, rate: 0.2 },
  { from: 1_000_000, to: 2_000_000, rate: 0.25 },
  { from: 2_000_000, to: 5_000_000, rate: 0.3 },
  { from: 5_000_000, to: Infinity, rate: 0.35 },
];

export function calcThaiTax(net: number): number {
  let tax = 0;
  for (const b of TAX_BRACKETS) {
    if (net <= b.from) break;
    const taxable = Math.min(net, b.to) - b.from;
    tax += taxable * b.rate;
  }
  return Math.max(0, tax);
}

export function formatTHB(n: number): string {
  return n.toLocaleString("th-TH", { maximumFractionDigits: 0 });
}
