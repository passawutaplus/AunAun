// Checklist presets per work type. Add new templates here to surface them in the dropdown.
export type ChecklistTemplateKey = "print" | "web" | "video" | "brand" | "personal";

export const CHECKLIST_TEMPLATES: Record<ChecklistTemplateKey, { label: string; items: string[] }> =
  {
    print: {
      label: "งานสิ่งพิมพ์",
      items: [
        "เปลี่ยนโหมดสีเป็น CMYK",
        "Outline ฟอนต์ทั้งหมด",
        "Embed รูปภาพ / Link ครบ",
        "Bleed 3 มม. + Crop marks",
        "Export PDF/X-1a หรือ PNG @2x",
        "ตรวจสะกดคำอีกรอบ",
      ],
    },
    web: {
      label: "งาน Web / UI",
      items: [
        "Export SVG / WebP สำหรับไอคอน",
        "บีบอัดรูปภาพ < 300KB",
        "ทดสอบ Responsive (Mobile / Tablet / Desktop)",
        "เช็ก Contrast สี (WCAG AA)",
        "ใส่ Favicon และ Meta tags",
        "เช็ก Hover / Focus states ครบ",
      ],
    },
    video: {
      label: "งาน Video",
      items: [
        "Export H.264 / MP4 (1080p)",
        "เช็กเสียง Peak ไม่เกิน -3 dB",
        "เผื่อ Safe Zone (TikTok / Reels)",
        "Subtitle ไฟล์ .srt แยก",
        "Thumbnail / Cover สำหรับโพสต์",
        "ตรวจความยาวคลิปตามแพลตฟอร์ม",
      ],
    },
    brand: {
      label: "Brand Identity",
      items: [
        "ส่งไฟล์ครบ .ai / .svg / .png",
        "ระบุ Color codes (HEX / CMYK / Pantone)",
        "Brand Guideline PDF",
        "Mockup การใช้งานจริง (นามบัตร / สื่อ)",
        "เวอร์ชันสีเดียว / ขาวดำ",
        "ระยะปลอดภัย (Clear space) รอบโลโก้",
      ],
    },
    personal: {
      label: "ส่วนตัว (สร้างเอง)",
      items: [],
    },
  };
