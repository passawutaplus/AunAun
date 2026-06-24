import {
  Printer,
  Camera,
  Package,
  Handshake,
  Sparkles,
  Building2,
  FolderOpen,
  type LucideIcon,
} from "lucide-react";

export interface SupplierCategory {
  key: string;
  label: string;
  icon: LucideIcon;
  hint: string;
}

export const SUPPLIER_CATEGORIES: SupplierCategory[] = [
  {
    key: "print",
    icon: Printer,
    label: "Print & Packaging",
    hint: "โรงพิมพ์ / สติกเกอร์ / กล่อง / ป้ายไวนิล",
  },
  {
    key: "production",
    icon: Camera,
    label: "Production & Studio",
    hint: "สตูดิโอถ่ายภาพ / เช่ากล้อง-ไฟ / พร็อพ / สตูดิโอเสียง",
  },
  {
    key: "material",
    icon: Package,
    label: "Material & Sourcing",
    hint: "ขายส่งวัสดุ / ผ้า / อะไหล่เฉพาะทาง",
  },
  {
    key: "partners",
    icon: Handshake,
    label: "Partners & Co-creators",
    hint: "ซับคอนแทรค / โปรแกรมเมอร์ / นักพากย์ / Studio เพื่อนกัน",
  },
  {
    key: "mockup",
    icon: Sparkles,
    label: "Mockup & Prototyping",
    hint: "โมเดล 3D / ตัวต้นแบบ / ตัดเย็บตัวอย่าง",
  },
  {
    key: "services",
    icon: Building2,
    label: "Services & Logistics",
    hint: "แมสเซนเจอร์ / ชิปปิ้ง / จดทะเบียนบริษัท",
  },
  { key: "other", icon: FolderOpen, label: "อื่นๆ", hint: "หมวดอื่นที่ไม่อยู่ในรายการ" },
];

export function findCategory(label: string | undefined): SupplierCategory | undefined {
  if (!label) return undefined;
  return SUPPLIER_CATEGORIES.find((c) => c.label === label || c.key === label);
}

export function categoryIcon(label: string | undefined): LucideIcon {
  return findCategory(label)?.icon ?? FolderOpen;
}
