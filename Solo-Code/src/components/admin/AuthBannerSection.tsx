import * as React from "react";
import { Monitor, Tablet, Smartphone } from "lucide-react";
import { AuthBannerSlider } from "@/components/auth/AuthBannerSlider";
import { BannerSlidesManager, type BannerSlidesConfig } from "./BannerSlidesManager";

type DevicePreview = "desktop" | "tablet" | "mobile";

const DEVICE_FRAMES: Record<
  DevicePreview,
  { label: string; w: number; h: number; icon: typeof Monitor; showsBanner: boolean }
> = {
  desktop: { label: "คอมพิวเตอร์", w: 1440, h: 900, icon: Monitor, showsBanner: true },
  tablet: { label: "แท็บเล็ต", w: 820, h: 1180, icon: Tablet, showsBanner: false },
  mobile: { label: "มือถือ", w: 390, h: 844, icon: Smartphone, showsBanner: false },
};

const CONFIG: BannerSlidesConfig = {
  table: "auth_banner_slides",
  bucket: "auth-banners",
  adminQueryKey: "admin_auth_banner_slides",
  publicQueryKey: "auth_banner_slides",
  heading: "แบนเนอร์หน้า Login",
  description: "จัดการสไลด์ที่แสดงในหน้าเข้าสู่ระบบ / สมัครสมาชิก",
  gridClass: "lg:grid-cols-2",
  thumbWidthClass: "w-24",
  withLink: false,
  imageLabel: "รูปภาพแบนเนอร์ (แนะนำ 4:5 หรือใหญ่กว่า)",
  dialogImageClass: "aspect-[4/5] max-h-64",
  subtitlePlaceholder: "เช่น You can easily",
  titlePlaceholder: "เช่น หลังบ้านฟรีแลนซ์ครบวงจร ที่คิดมาเพื่อคุณ",
  activeHint: "เฉพาะสไลด์ที่เปิดอยู่จะแสดงในหน้า Login",
};

export function AuthBannerSection() {
  // Live preview with device switcher
  return <BannerSlidesManager config={CONFIG} preview={<DevicePreviewPanel />} />;
}

function DevicePreviewPanel() {
  const [device, setDevice] = React.useState<DevicePreview>("desktop");
  const frame = DEVICE_FRAMES[device];
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(0.3);

  React.useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const recalc = () => {
      const availW = el.clientWidth - 24;
      // Scale purely on width so the device fills the panel; height grows naturally.
      setScale(Math.max(0.1, Math.min(1, availW / frame.w)));
    };
    recalc();
    const ro = new ResizeObserver(recalc);
    ro.observe(el);
    return () => ro.disconnect();
  }, [frame.w, frame.h]);

  const scaledH = Math.ceil(frame.h * scale);

  return (
    <div>
      <div className="flex items-center justify-between mb-2 gap-2">
        <p className="text-xs text-muted-foreground">ตัวอย่างหน้า Login</p>
        <div className="inline-flex rounded-lg border bg-muted/40 p-0.5">
          {(Object.keys(DEVICE_FRAMES) as DevicePreview[]).map((k) => {
            const F = DEVICE_FRAMES[k];
            const Icon = F.icon;
            const active = device === k;
            return (
              <button
                key={k}
                onClick={() => setDevice(k)}
                title={F.label}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] transition-colors ${
                  active
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            );
          })}
        </div>
      </div>

      <div
        ref={containerRef}
        className="rounded-xl border bg-gradient-to-br from-muted/40 to-muted/10 p-3 overflow-hidden"
      >
        <div className="mx-auto relative" style={{ width: "100%", height: scaledH }}>
          <div
            className="absolute top-0 left-1/2 bg-background rounded-[14px] border shadow-xl overflow-hidden"
            style={{
              width: frame.w,
              height: frame.h,
              transform: `translateX(-50%) scale(${scale})`,
              transformOrigin: "top center",
            }}
          >
            <MockLoginPage device={device} />
          </div>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground mt-2 text-center">
        {frame.label} · {frame.w}×{frame.h}
        {!frame.showsBanner && " · แบนเนอร์จะถูกซ่อนบนอุปกรณ์นี้ (แสดงเฉพาะจอ ≥ 1024px)"}
      </p>
    </div>
  );
}

function MockLoginPage({ device }: { device: DevicePreview }) {
  const showBanner = DEVICE_FRAMES[device].showsBanner;
  return (
    <div
      className="w-full h-full grid"
      style={{ gridTemplateColumns: showBanner ? "1fr 1fr" : "1fr" }}
    >
      {showBanner && (
        <div className="p-6 xl:p-8 h-full">
          <div className="h-full min-h-full rounded-2xl overflow-hidden">
            <AuthBannerSlider className="h-full" />
          </div>
        </div>
      )}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-4">
          <div className="text-center">
            <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white font-bold text-sm">
              So
            </div>
            <p className="text-lg font-semibold mt-3">เข้าสู่ระบบ</p>
            <p className="text-xs text-muted-foreground">ยินดีต้อนรับกลับ</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="h-9 rounded-md border bg-muted/40" />
            <div className="h-9 rounded-md border bg-muted/40" />
          </div>
          <div className="space-y-2">
            <div className="h-10 rounded-md border bg-muted/30" />
            <div className="h-10 rounded-md border bg-muted/30" />
          </div>
          <div className="h-10 rounded-md bg-gradient-to-r from-orange-500 to-orange-600" />
        </div>
      </div>
    </div>
  );
}
