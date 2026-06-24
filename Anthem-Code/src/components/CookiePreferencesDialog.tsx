import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { COOKIE_CATALOG } from "@/components/legal/CookieCatalog";
import {
  acceptAllCookies,
  acceptEssentialOnly,
  clearNonEssentialStorage,
  type CookieConsentPreferences,
} from "@/lib/cookieConsent";
import { useCookieConsent } from "@/hooks/useCookieConsent";

interface CookiePreferencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (prefs: CookieConsentPreferences) => void;
}

const CookiePreferencesDialog = ({ open, onOpenChange, onSaved }: CookiePreferencesDialogProps) => {
  const { consent, save } = useCookieConsent();
  const [functional, setFunctional] = useState(true);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFunctional(consent?.functional ?? true);
    setAnalytics(consent?.analytics ?? false);
  }, [open, consent]);

  const persist = (fn: () => CookieConsentPreferences) => {
    const next = fn();
    if (!next.functional || !next.analytics) clearNonEssentialStorage();
    onSaved?.(next);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>การตั้งค่าความเป็นส่วนตัว</DialogTitle>
          <DialogDescription>
            เลือกประเภทคุกกี้และการเก็บข้อมูลในเบราว์เซอร์ที่คุณยินยอม รายละเอียดเพิ่มเติมที่{" "}
            <Link to="/legal/cookies" className="text-primary hover:underline" onClick={() => onOpenChange(false)}>
              นโยบายคุกกี้
            </Link>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-xl border border-border/60 p-4 space-y-2 bg-muted/30">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">คุกกี้ที่จำเป็น</p>
                <p className="text-xs text-muted-foreground">เข้าสู่ระบบ ความปลอดภัย บันทึกความยินยอม — ปิดไม่ได้</p>
              </div>
              <Switch checked disabled aria-readonly />
            </div>
          </div>

          <div className="rounded-xl border border-border/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">คุกกี้เชิงฟังก์ชัน</p>
                <p className="text-xs text-muted-foreground">ธีม มุมมองฟีด การตั้งค่าที่จดจำในอุปกรณ์</p>
              </div>
              <Switch checked={functional} onCheckedChange={setFunctional} aria-label="คุกกี้เชิงฟังก์ชัน" />
            </div>
          </div>

          <div className="rounded-xl border border-border/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">คุกกี้วิเคราะห์</p>
                <p className="text-xs text-muted-foreground">สถิติการเข้าชมผลงานต่อเซสชัน เพื่อปรับปรุงฟีด</p>
              </div>
              <Switch checked={analytics} onCheckedChange={setAnalytics} aria-label="คุกกี้วิเคราะห์" />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border/60">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/60 bg-muted/40 text-left">
                  <th className="p-2 font-medium">ชื่อ</th>
                  <th className="p-2 font-medium">วัตถุประสงค์</th>
                  <th className="p-2 font-medium">ระยะเวลา</th>
                </tr>
              </thead>
              <tbody>
                {COOKIE_CATALOG.map((row) => (
                  <tr key={row.name} className="border-b border-border/40 last:border-0">
                    <td className="p-2 font-mono text-[10px] align-top">{row.name}</td>
                    <td className="p-2 text-muted-foreground align-top">{row.purpose}</td>
                    <td className="p-2 text-muted-foreground align-top whitespace-nowrap">{row.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => persist(acceptEssentialOnly)}>
            จำเป็นเท่านั้น
          </Button>
          <Button
            type="button"
            className="w-full sm:w-auto"
            onClick={() => persist(() => save(functional, analytics))}
          >
            บันทึกการตั้งค่า
          </Button>
          <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={() => persist(acceptAllCookies)}>
            ยอมรับทั้งหมด
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CookiePreferencesDialog;
