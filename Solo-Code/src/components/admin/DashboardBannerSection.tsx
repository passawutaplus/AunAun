import { BannerSlidesManager, type BannerSlidesConfig } from "./BannerSlidesManager";
import { DashboardBannerSlider } from "@/components/DashboardBannerSlider";

const CONFIG: BannerSlidesConfig = {
  table: "dashboard_banner_slides",
  bucket: "dashboard-banners",
  adminQueryKey: "admin_dashboard_banner_slides",
  publicQueryKey: "dashboard_banner_slides",
  heading: "แบนเนอร์หน้าแดชบอร์ด",
  description: "สไลด์ใหญ่ที่แสดงด้านบนสุดของหน้าแดชบอร์ดให้ผู้ใช้ทุกคนเห็น",
  gridClass: "lg:grid-cols-[1fr_420px]",
  thumbWidthClass: "w-28",
  withLink: true,
  imageLabel: "รูปภาพแบนเนอร์ (แนะนำ 16:5 หรือ 16:4)",
  dialogImageClass: "aspect-[16/5]",
  subtitlePlaceholder: "เช่น โปรโมชั่นเดือนนี้",
  titlePlaceholder: "เช่น ฟีเจอร์ใหม่: ตัวช่วยส่งใบเสนอราคา",
  activeHint: "เฉพาะสไลด์ที่เปิดอยู่จะแสดงบน Dashboard",
};

export function DashboardBannerSection() {
  return (
    <BannerSlidesManager
      config={CONFIG}
      preview={
        <div>
          <p className="text-xs text-muted-foreground mb-2">ตัวอย่างที่จะแสดงบน Dashboard</p>
          <DashboardBannerSlider />
          <p className="text-[11px] text-muted-foreground mt-2 leading-snug">
            💡 อัตราส่วนแนะนำ <span className="font-medium">16:5 หรือ 16:4</span> —
            สไลด์จะเล่นอัตโนมัติทุก 6 วินาที
          </p>
        </div>
      }
    />
  );
}
