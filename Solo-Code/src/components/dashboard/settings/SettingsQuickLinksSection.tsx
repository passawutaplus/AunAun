import { Link } from "@tanstack/react-router";
import { ExternalLink, Cookie, Sparkles, UserCircle, FileText, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/auth/AuthProvider";
import { aplus1ProfileUrl, aplus1ShowcaseUrl } from "@/lib/productLinks";
import { openCookiePreferences } from "@/lib/cookieConsent";
import { ProductTourReplayButton } from "@/components/dashboard/ProductTourProvider";

export function SettingsQuickLinksSection() {
  const { user } = useAuth();
  const aplus1Profile = aplus1ProfileUrl(user?.id);

  return (
    <Card className="border-border/40">
      <CardContent className="p-5 space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Ecosystem & ลิงก์ด่วน</h3>
          <p className="text-xs text-muted-foreground mt-1">
            So1o = หลังบ้านงาน · Aplus1 = โชว์เคสผลงานหน้าร้าน
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button asChild variant="outline" size="sm" className="h-9 justify-start gap-2">
            <a href={aplus1Profile} target="_blank" rel="noopener noreferrer">
              <UserCircle className="h-4 w-4 text-primary shrink-0" />
              โปรไฟล์ Aplus1
              <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
            </a>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-9 justify-start gap-2">
            <a href={aplus1ShowcaseUrl()} target="_blank" rel="noopener noreferrer">
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
              เปิด Aplus1 Showcase
              <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
            </a>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-9 justify-start gap-2">
            <Link to="/pricing">
              <Zap className="h-4 w-4 text-amber-500 shrink-0" />
              ดูแผนราคา & เติมเครดิต
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 justify-start gap-2"
            onClick={openCookiePreferences}
          >
            <Cookie className="h-4 w-4 shrink-0" />
            ตั้งค่าคุกกี้
          </Button>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-9 justify-start gap-2 text-muted-foreground"
          >
            <Link to="/privacy">
              <Shield className="h-4 w-4 shrink-0" />
              นโยบายความเป็นส่วนตัว
            </Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-9 justify-start gap-2 text-muted-foreground"
          >
            <Link to="/terms">
              <FileText className="h-4 w-4 shrink-0" />
              เงื่อนไขการใช้บริการ
            </Link>
          </Button>
          <ProductTourReplayButton
            variant="outline"
            size="sm"
            className="h-9 justify-start sm:col-span-2"
            label="สอนใช้งานทุกหน้าอีกครั้ง"
          />
        </div>
      </CardContent>
    </Card>
  );
}
