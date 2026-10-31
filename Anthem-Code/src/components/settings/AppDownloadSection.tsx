import { Bell, Check, Share2, Smartphone, Zap } from "lucide-react";
import { SettingsCard } from "@/components/settings/SettingsCard";
import { isPlayStoreLive, PLAY_STORE_URL } from "@/components/AndroidAppBanner";
import { isStandaloneDisplay } from "@/lib/appShell";

const PERKS = [
  { icon: Bell, text: "แจ้งเตือนแชทและงานใหม่ทันที แม้ปิดแอปอยู่" },
  { icon: Share2, text: "แชร์รูปจากแกลเลอรีเข้า SAMECOR ได้เลย" },
  { icon: Zap, text: "เปิดไวกว่า เต็มจอ ไม่มีแถบเบราว์เซอร์" },
];

/** Settings → "แอป SAMECOR": tells web users there is an app and how to get it. Hidden inside the Android app. */
export function AppDownloadSection() {
  const live = isPlayStoreLive();
  const installed = isStandaloneDisplay();
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIos = /iPhone|iPad|iPod/i.test(ua);

  return (
    <SettingsCard
      icon={Smartphone}
      title="แอป SAMECOR"
      description="ใช้ SAMECOR บนมือถือได้สะดวกกว่า"
      id="settings-app"
    >
      <div className="flex items-center gap-3">
        <img src="/icons/icon-192.png" alt="" className="h-14 w-14 shrink-0 rounded-2xl" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">SAMECOR สำหรับ Android</p>
          <p className="text-xs text-muted-foreground">
            {live ? "ดาวน์โหลดฟรีบน Google Play" : "เร็ว ๆ นี้บน Google Play"}
          </p>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {PERKS.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-start gap-2 text-sm text-foreground">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            {text}
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {live ? (
          <a
            href={PLAY_STORE_URL.replace("utm_medium=banner", "utm_medium=settings")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
          >
            <Smartphone className="h-4 w-4" /> ดาวน์โหลดบน Google Play
          </a>
        ) : (
          <span className="inline-flex items-center rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground">
            กำลังเปิดให้ทดสอบ · Coming soon
          </span>
        )}
      </div>

      <div className="mt-5 rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
        {installed ? (
          <p className="flex items-center gap-1.5 text-foreground">
            <Check className="h-3.5 w-3.5" /> ติดตั้ง SAMECOR บนเครื่องนี้แล้ว
          </p>
        ) : isIos ? (
          <p>
            <span className="font-medium text-foreground">iPhone / iPad:</span> เปิดใน Safari → กดปุ่มแชร์ →
            “เพิ่มไปยังหน้าจอโฮม” ใช้งานได้เหมือนแอปและรับแจ้งเตือนได้
          </p>
        ) : (
          <p>
            <span className="font-medium text-foreground">ยังไม่มีแอปในเครื่อง?</span> ติดตั้งจากเบราว์เซอร์ได้เลย:
            เมนูเบราว์เซอร์ → “ติดตั้งแอป” หรือ “เพิ่มลงหน้าจอหลัก”
          </p>
        )}
      </div>
    </SettingsCard>
  );
}
