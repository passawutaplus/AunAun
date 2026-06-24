import * as React from "react";
import {
  Palette,
  Camera,
  Pencil,
  Code2,
  Megaphone,
  Video,
  Music,
  Sparkles,
  User,
  Briefcase,
  Wallet,
  Target,
  Clock,
  AlertCircle,
  BarChart3,
  Heart,
  Crown,
  History,
  Layers,
  Star,
} from "lucide-react";

export type Persona = "freelancer" | "client";

export interface QuestionOption {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface Question {
  key: string;
  title: string;
  subtitle: string;
  multi?: boolean;
  options: QuestionOption[];
}

export const FREELANCER_QS: Question[] = [
  {
    key: "category",
    title: "หมวดหมู่ที่คุณถนัด",
    subtitle: "เลือกได้มากกว่าหนึ่งข้อ",
    multi: true,
    options: [
      { value: "graphic", label: "Graphic", icon: Palette },
      { value: "photo", label: "Photography", icon: Camera },
      { value: "illustration", label: "Illustration", icon: Pencil },
      { value: "web", label: "Web / Dev", icon: Code2 },
      { value: "marketing", label: "Marketing", icon: Megaphone },
      { value: "video", label: "Video / Motion", icon: Video },
      { value: "music", label: "Music / Audio", icon: Music },
      { value: "other", label: "อื่นๆ", icon: Sparkles },
    ],
  },
  {
    key: "experience",
    title: "ประสบการณ์ของคุณ",
    subtitle: "เพื่อจัดเครื่องมือให้เหมาะกับระดับ",
    options: [
      { value: "junior", label: "< 1 ปี", icon: Star },
      { value: "mid", label: "1–3 ปี", icon: Star },
      { value: "senior", label: "3–7 ปี", icon: Star },
      { value: "expert", label: "7+ ปี", icon: Crown },
    ],
  },
  {
    key: "pain_point",
    title: "ปัญหาที่อยากแก้ที่สุด",
    subtitle: "บอกเราหน่อย เราจะแนะนำฟีเจอร์ให้",
    options: [
      { value: "client", label: "หาลูกค้ายาก", icon: User },
      { value: "money", label: "บริหารเงิน/ภาษี", icon: Wallet },
      { value: "time", label: "เวลาไม่พอ", icon: Clock },
      { value: "scope", label: "งานบานปลาย", icon: AlertCircle },
    ],
  },
  {
    key: "volume",
    title: "ปริมาณงานต่อเดือน",
    subtitle: "ประมาณเท่าไหร่",
    options: [
      { value: "1-3", label: "1–3 งาน", icon: BarChart3 },
      { value: "4-8", label: "4–8 งาน", icon: BarChart3 },
      { value: "9-15", label: "9–15 งาน", icon: BarChart3 },
      { value: "15+", label: "15+ งาน", icon: BarChart3 },
    ],
  },
  {
    key: "goal",
    title: "เป้าหมายในปีนี้",
    subtitle: "อยากไปถึงจุดไหน",
    options: [
      { value: "income", label: "รายได้เพิ่ม", icon: Wallet },
      { value: "brand", label: "สร้างแบรนด์", icon: Crown },
      { value: "skill", label: "อัพสกิล", icon: Sparkles },
      { value: "balance", label: "Work-life balance", icon: Heart },
    ],
  },
];

export const CLIENT_QS: Question[] = [
  {
    key: "interest",
    title: "งานที่สนใจจ้าง",
    subtitle: "เลือกได้มากกว่าหนึ่งข้อ",
    multi: true,
    options: [
      { value: "graphic", label: "Graphic", icon: Palette },
      { value: "photo", label: "Photography", icon: Camera },
      { value: "illustration", label: "Illustration", icon: Pencil },
      { value: "web", label: "Web / Dev", icon: Code2 },
      { value: "marketing", label: "Marketing", icon: Megaphone },
      { value: "video", label: "Video / Motion", icon: Video },
      { value: "music", label: "Music / Audio", icon: Music },
      { value: "other", label: "อื่นๆ", icon: Sparkles },
    ],
  },
  {
    key: "budget",
    title: "งบประมาณต่อโปรเจกต์",
    subtitle: "โดยเฉลี่ย",
    options: [
      { value: "<5k", label: "< 5,000", icon: Wallet },
      { value: "5-20k", label: "5k–20k", icon: Wallet },
      { value: "20-50k", label: "20k–50k", icon: Wallet },
      { value: "50k+", label: "50k+", icon: Crown },
    ],
  },
  {
    key: "scope",
    title: "ขนาดของงาน",
    subtitle: "งานแบบไหนที่จ้างบ่อย",
    options: [
      { value: "oneoff", label: "งานเดี่ยว", icon: Layers },
      { value: "campaign", label: "แคมเปญ", icon: Target },
      { value: "longterm", label: "ระยะยาว", icon: Clock },
      { value: "team", label: "ทีมเต็มฟอร์ม", icon: Briefcase },
    ],
  },
  {
    key: "priority",
    title: "สิ่งที่ให้ความสำคัญ",
    subtitle: "ปัจจัยหลักในการเลือก",
    options: [
      { value: "quality", label: "คุณภาพ", icon: Crown },
      { value: "price", label: "ราคา", icon: Wallet },
      { value: "speed", label: "ความเร็ว", icon: Clock },
      { value: "trust", label: "ความน่าเชื่อถือ", icon: Heart },
    ],
  },
  {
    key: "history",
    title: "เคยจ้างฟรีแลนซ์มาก่อน?",
    subtitle: "ประสบการณ์ที่ผ่านมา",
    options: [
      { value: "never", label: "ครั้งแรก", icon: Star },
      { value: "few", label: "1–5 ครั้ง", icon: History },
      { value: "many", label: "5+ ครั้ง", icon: History },
      { value: "regular", label: "ประจำ", icon: Crown },
    ],
  },
];
