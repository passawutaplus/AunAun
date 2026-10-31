import { Link } from "react-router-dom";
import LegalLayout from "@/components/LegalLayout";
import { Button } from "@/components/ui/button";
import { LEGAL_APP_NAME, LEGAL_DPO_EMAIL } from "@/lib/legalConfig";
import { useAuth } from "@/hooks/useAuth";

/**
 * Public account-deletion page — the URL given to Google Play (Data safety → account deletion).
 * Must work signed out, name the app, and say what is deleted and what is kept.
 */
const DeleteAccountPage = () => {
  const { user } = useAuth();
  const subject = encodeURIComponent(`[${LEGAL_APP_NAME}] Delete my account / ขอลบบัญชี`);
  const body = encodeURIComponent(
    `Please delete my ${LEGAL_APP_NAME} account and its personal data.\nขอลบบัญชี ${LEGAL_APP_NAME} และข้อมูลส่วนบุคคล\n\nAccount email / อีเมลบัญชี: ${user?.email ?? ""}\n`,
  );
  const mailHref = `mailto:${LEGAL_DPO_EMAIL}?subject=${subject}&body=${body}`;

  return (
    <LegalLayout title={`ลบบัญชี ${LEGAL_APP_NAME} · Delete your ${LEGAL_APP_NAME} account`}>
      <p>
        หน้านี้อธิบายวิธีลบบัญชี {LEGAL_APP_NAME} ทั้งบนเว็บ samecor.com และแอป {LEGAL_APP_NAME} บน Android
      </p>
      <p className="text-sm text-muted-foreground">
        How to delete your {LEGAL_APP_NAME} account, for both samecor.com and the {LEGAL_APP_NAME} Android app.
      </p>

      <div className="not-prose my-6 flex flex-wrap gap-2">
        {/* LegalLayout colours every <a> text-primary — reset it so the label stays readable on the button. */}
        <Button asChild size="sm" className="!text-primary-foreground hover:!no-underline">
          <Link to={user ? "/settings" : "/auth"}>
            {user ? "ไปที่ตั้งค่า · Open settings" : "เข้าสู่ระบบ · Sign in"}
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline" className="!text-foreground hover:!no-underline">
          <a href={mailHref}>อีเมลขอลบบัญชี · Email a request</a>
        </Button>
      </div>

      <h2>1. ลบจากในแอปหรือเว็บ · In the app or on the web</h2>
      <ol>
        <li>เข้าสู่ระบบ · Sign in</li>
        <li>ไปที่ ตั้งค่า → ความเป็นส่วนตัว · Go to Settings → Privacy</li>
        <li>กด “ขอลบบัญชี” แล้วยืนยันตัวตน · Tap “Delete account” and confirm it’s you</li>
      </ol>

      <h2>2. ไม่ต้องเข้าสู่ระบบ · Without signing in</h2>
      <p>
        ส่งอีเมลจากอีเมลที่ใช้สมัครไปที่ <a href={mailHref}>{LEGAL_DPO_EMAIL}</a> หัวข้อ “ขอลบบัญชี”
      </p>
      <p className="text-sm text-muted-foreground">
        Email <a href={mailHref}>{LEGAL_DPO_EMAIL}</a> from the address you signed up with, subject “Delete my account”.
      </p>

      <h2>3. ข้อมูลที่ถูกลบ · What we delete</h2>
      <ul>
        <li>บัญชีและโปรไฟล์ · Your account and profile</li>
        <li>ผลงาน รูปภาพ และคอลเลกชัน · Your projects, images and collections</li>
        <li>ข้อความแชท คอมเมนต์ ไลก์ และการติดตาม · Your chat messages, comments, likes and follows</li>
      </ul>

      <h2>4. ข้อมูลที่ต้องเก็บต่อ · What we keep</h2>
      <p>
        บันทึกธุรกรรมการเงิน เอกสารภาษี และหลักฐานยืนยันตัวตน (KYC) อาจต้องเก็บต่อตามระยะเวลาที่กฎหมายกำหนด
        แล้วจึงลบ
      </p>
      <p className="text-sm text-muted-foreground">
        Payment records, tax documents and identity-verification (KYC) records may be kept for as long as Thai law
        requires, then deleted.
      </p>

      <h2>5. ระยะเวลา · How long it takes</h2>
      <p>
        เราตอบรับคำขอภายใน 7 วันทำการ และลบให้เสร็จภายใน 30 วัน
      </p>
      <p className="text-sm text-muted-foreground">
        We confirm your request within 7 business days and finish deleting within 30 days.
      </p>

      <p className="text-sm">
        รายละเอียดสิทธิอื่นตาม PDPA: <Link to="/legal/rights">สิทธิของเจ้าของข้อมูล</Link> ·{" "}
        <Link to="/legal/privacy">นโยบายความเป็นส่วนตัว</Link>
      </p>
    </LegalLayout>
  );
};

export default DeleteAccountPage;
