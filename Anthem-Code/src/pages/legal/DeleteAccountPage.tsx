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
          <Link to={user ? "/settings#data" : "/auth"}>
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
        <li>ไปที่ ตั้งค่า → ข้อมูลของฉัน · Go to Settings → My data</li>
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
        <li>คอมเมนต์ ไลก์ การติดตาม และไฟล์ที่คุณส่งในแชท · Your comments, likes, follows and files you sent in chat</li>
        <li>เอกสารยืนยันตัวตน (KYC) · Your identity-verification (KYC) documents</li>
      </ul>

      <h2>4. ข้อมูลที่ต้องเก็บต่อ · What we keep</h2>
      <p>
        ข้อความแชทที่คุณส่งถึงคนอื่นยังอยู่ในบทสนทนาของเขา แต่แสดงเป็น “ผู้ใช้ที่ลบบัญชี” ไม่มีชื่อหรือรูปของคุณ
        ส่วนบันทึกธุรกรรมการเงินและเอกสารภาษีต้องเก็บต่อตามระยะเวลาที่กฎหมายกำหนด แล้วจึงลบ
      </p>
      <p className="text-sm text-muted-foreground">
        Chat messages you sent stay in the other person’s conversation, shown as “deleted user” without your name or
        photo. Payment records and tax documents are kept for as long as Thai law requires, then deleted.
      </p>

      <h2>5. ระยะเวลา · How long it takes</h2>
      <p>
        เราตรวจคำขอภายใน 7 วันทำการ เมื่ออนุมัติ โปรไฟล์และผลงานจะถูกซ่อนทันที และลบถาวรหลัง 30 วัน
        คุณยกเลิกคำขอได้ที่ ตั้งค่า → ข้อมูลของฉัน ก่อนถึงวันนั้น
      </p>
      <p className="text-sm text-muted-foreground">
        We review your request within 7 business days. Once approved, your profile and work are hidden at once and
        permanently deleted 30 days later. You can cancel in Settings → My data before then.
      </p>

      <p className="text-sm">
        รายละเอียดสิทธิอื่นตาม PDPA: <Link to="/legal/rights">สิทธิของเจ้าของข้อมูล</Link> ·{" "}
        <Link to="/legal/privacy">นโยบายความเป็นส่วนตัว</Link>
      </p>
    </LegalLayout>
  );
};

export default DeleteAccountPage;
