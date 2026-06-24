import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Cookie, Settings2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  type CookiePreferences,
  CONSENT_CHANGE_EVENT,
  OPEN_PREFERENCES_EVENT,
  readCookieConsent,
  writeCookieConsent,
} from "@/lib/cookieConsent";
import { cn } from "@/lib/utils";

const ESSENTIAL_ONLY: CookiePreferences = {
  essential: true,
  preferences: false,
  analytics: false,
};

const ALL_ENABLED: CookiePreferences = {
  essential: true,
  preferences: true,
  analytics: true,
};

export function CookieConsent() {
  const [visible, setVisible] = React.useState(false);
  const [showPrefs, setShowPrefs] = React.useState(false);
  const [prefs, setPrefs] = React.useState<CookiePreferences>(ESSENTIAL_ONLY);

  React.useEffect(() => {
    const existing = readCookieConsent();
    if (existing) {
      setPrefs(existing.preferences);
      return;
    }
    const t = window.setTimeout(() => setVisible(true), 600);
    return () => window.clearTimeout(t);
  }, []);

  React.useEffect(() => {
    const onOpen = () => {
      const existing = readCookieConsent();
      setPrefs(existing?.preferences ?? ESSENTIAL_ONLY);
      setShowPrefs(true);
      setVisible(true);
    };
    const onChange = () => {
      const existing = readCookieConsent();
      if (existing) {
        setPrefs(existing.preferences);
        setVisible(false);
        setShowPrefs(false);
      }
    };
    window.addEventListener(OPEN_PREFERENCES_EVENT, onOpen);
    window.addEventListener(CONSENT_CHANGE_EVENT, onChange);
    return () => {
      window.removeEventListener(OPEN_PREFERENCES_EVENT, onOpen);
      window.removeEventListener(CONSENT_CHANGE_EVENT, onChange);
    };
  }, []);

  const save = (next: CookiePreferences) => {
    writeCookieConsent(next);
    setPrefs(next);
    setVisible(false);
    setShowPrefs(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="การยินยอมใช้คุกกี้"
      className={cn(
        "fixed z-[60] inset-x-3 bottom-3 sm:inset-x-auto sm:right-4 sm:bottom-4 animate-in fade-in slide-in-from-bottom-4 duration-300",
        showPrefs ? "sm:max-w-md" : "sm:max-w-sm",
      )}
    >
      <div className="relative rounded-2xl border border-border/60 bg-card/95 backdrop-blur-xl shadow-xl ring-1 ring-primary/10 p-4 sm:p-5">
        <button
          type="button"
          onClick={() => save(ESSENTIAL_ONLY)}
          aria-label="ปิดและใช้เฉพาะคุกกี้จำเป็น"
          className="absolute right-2 top-2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        {!showPrefs ? (
          <>
            <div className="flex items-start gap-3 pr-4">
              <div className="shrink-0 h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Cookie className="h-4 w-4" />
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">
                  ความเป็นส่วนตัวของคุณสำคัญ
                </h3>
                <p className="text-[12px] leading-relaxed text-muted-foreground">
                  เราใช้คุกกี้และเทคโนโลยีที่คล้ายกันเพื่อให้ระบบทำงาน จดจำการตั้งค่า
                  และวิเคราะห์การใช้งานแบบไม่ระบุตัวตน ตาม{" "}
                  <Link to="/privacy" className="text-primary hover:underline font-medium">
                    PDPA
                  </Link>{" "}
                  อ่านรายละเอียดที่{" "}
                  <Link to="/cookies" className="text-primary hover:underline font-medium">
                    นโยบายคุกกี้
                  </Link>
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => save(ESSENTIAL_ONLY)}
                className="h-9 text-xs sm:flex-1"
              >
                เฉพาะที่จำเป็น
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowPrefs(true)}
                className="h-9 text-xs gap-1.5 sm:flex-1"
              >
                <Settings2 className="h-3.5 w-3.5" />
                ตั้งค่า
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => save(ALL_ENABLED)}
                className="h-9 text-xs bg-primary hover:bg-primary/90 sm:flex-1"
              >
                ยอมรับทั้งหมด
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 pr-6 mb-4">
              <Settings2 className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">ตั้งค่าคุกกี้</h3>
            </div>

            <div className="space-y-4">
              <PrefRow
                id="cookie-essential"
                title="คุกกี้ที่จำเป็น"
                description="ล็อกอิน ความปลอดภัย และบันทึกการยินยอม — ปิดไม่ได้"
                checked
                disabled
              />
              <PrefRow
                id="cookie-preferences"
                title="คุกกี้การตั้งค่า"
                description="ธีม, ตำแหน่ง UI, Draft งาน และประกาศที่ปิดแล้ว"
                checked={prefs.preferences}
                onCheckedChange={(v) => setPrefs((p) => ({ ...p, preferences: v }))}
              />
              <PrefRow
                id="cookie-analytics"
                title="คุกกี้วิเคราะห์"
                description="สถิติการใช้งาน ประเภทอุปกรณ์ และความถี่ใช้ฟีเจอร์ (ไม่ขายข้อมูล)"
                checked={prefs.analytics}
                onCheckedChange={(v) => setPrefs((p) => ({ ...p, analytics: v }))}
              />
            </div>

            <div className="mt-4 flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setShowPrefs(false)}
                className="flex-1 h-9 text-xs"
              >
                ย้อนกลับ
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => save(prefs)}
                className="flex-1 h-9 text-xs bg-primary hover:bg-primary/90"
              >
                บันทึกการตั้งค่า
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PrefRow({
  id,
  title,
  description,
  checked,
  disabled,
  onCheckedChange,
}: {
  id: string;
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange?: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
      <div className="space-y-0.5 min-w-0">
        <Label htmlFor={id} className="text-xs font-medium cursor-pointer">
          {title}
        </Label>
        <p className="text-[11px] text-muted-foreground leading-relaxed">{description}</p>
      </div>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        className="shrink-0 mt-0.5"
      />
    </div>
  );
}
