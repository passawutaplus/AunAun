import { Link } from "react-router-dom";
import LegalLayout from "@/components/LegalLayout";
import { Button } from "@/components/ui/button";
import { requestOpenCookiePreferences } from "@/lib/cookieConsent";
import {
  LEGAL_APP_NAME,
  LEGAL_DPO_EMAIL,
  LEGAL_SOLO_NAME,
  LEGAL_SUPPORT_EMAIL,
} from "@/lib/legalConfig";
import { useAuth } from "@/hooks/useAuth";

const mailto = (subject: string, body: string) =>
  `mailto:${LEGAL_DPO_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

const DataRightsPage = () => {
  const { user } = useAuth();
  const uid = user?.id ?? "";
  const email = user?.email ?? "";

  const templates = {
    access: mailto(
      `[${LEGAL_APP_NAME}] ขอเข้าถึงข้อมูลส่วนบุคคล`,
      `เรียน เจ้าหน้าที่คุ้มครองข้อมูล\n\nข้าพเจ้าขอใช้สิทธิเข้าถึงข้อมูลส่วนบุคคลตาม PDPA\n\nUser ID: ${uid}\nอีเมลบัญชี: ${email}\n\nขอบคุณ`,
    ),
    correct: mailto(
      `[${LEGAL_APP_NAME}] ขอแก้ไขข้อมูลส่วนบุคคล`,
      `เรียน เจ้าหน้าที่คุ้มครองข้อมูล\n\nข้าพเจ้าขอแก้ไขข้อมูลส่วนบุคคลให้ถูกต้อง\n\nUser ID: ${uid}\nอีเมลบัญชี: ${email}\n\nรายการที่ต้องการแก้ไข:\n(ระบุ)\n\nขอบคุณ`,
    ),
    delete: mailto(
      `[${LEGAL_APP_NAME}] ขอลบบัญชีและข้อมูล`,
      `เรียน เจ้าหน้าที่คุ้มครองข้อมูล\n\nข้าพเจ้าขอลบบัญชีและข้อมูลส่วนบุคคลที่เกี่ยวข้อง\n\nUser ID: ${uid}\nอีเมลบัญชี: ${email}\n\nขอบคุณ`,
    ),
    portability: mailto(
      `[${LEGAL_APP_NAME}] ขอโอนข้อมูลส่วนบุคคล`,
      `เรียน เจ้าหน้าที่คุ้มครองข้อมูล\n\nข้าพเจ้าขอรับข้อมูลส่วนบุคคลในรูปแบบที่อ่านได้ หรือขอให้โอนข้อมูลตาม PDPA\n\nUser ID: ${uid}\nอีเมล: ${email}\n\nขอบคุณ`,
    ),
    object: mailto(
      `[${LEGAL_APP_NAME}] คัดค้านการประมวลผลข้อมูล`,
      `เรียน เจ้าหน้าที่คุ้มครองข้อมูล\n\nข้าพเจ้าขอคัดค้านการประมวลผลข้อมูลในเรื่อง: (ระบุ)\n\nUser ID: ${uid}\nอีเมล: ${email}\n\nขอบคุณ`,
    ),
    withdraw: mailto(
      `[${LEGAL_APP_NAME}] ถอนความยินยอม`,
      `เรียน เจ้าหน้าที่คุ้มครองข้อมูล\n\nข้าพเจ้าขอถอนความยินยอมในเรื่อง: (ระบุ เช่น การแจ้งเตือนทางอีเมล)\n\nUser ID: ${uid}\nอีเมล: ${email}\n\nขอบคุณ`,
    ),
    kyc: mailto(
      `[${LEGAL_APP_NAME}] ถอนความยินยอม KYC / ขอลบเอกสารยืนยันตัวตน`,
      `เรียน เจ้าหน้าที่คุ้มครองข้อมูล\n\nข้าพเจ้าขอถอนความยินยอมการประมวลผลข้อมูล KYC หรือขอลบเอกสารยืนยันตัวตน\n\nUser ID: ${uid}\nอีเมล: ${email}\n\nหมายเหตุ: หากมีธุรกรรมถอนเงินที่ต้องเก็บตามกฎหมาย AML เราอาจเก็บข้อมูลบางส่วนต่อตามที่กฎหมายอนุญาต\n\nขอบคุณ`,
    ),
  };

  const rights = [
    { title: "ขอเข้าถึงข้อมูล", desc: "ทราบว่าเราเก็บข้อมูลอะไรของคุณบ้าง", action: "อีเมล DPO หรือใช้เทมเพลตด้านล่าง" },
    { title: "ขอสำเนาข้อมูล", desc: "รับข้อมูลในรูปแบบที่อ่านได้", action: "อีเมล DPO" },
    { title: "ขอแก้ไขข้อมูล", desc: "ให้ข้อมูลถูกต้อง ครบถ้วน", action: "ตั้งค่าบัญชี หรืออีเมล DPO" },
    { title: "ขอลบหรือทำลายข้อมูล", desc: "เมื่อไม่จำเป็นต้องเก็บต่อ", action: "อีเมล DPO" },
    { title: "ขอระงับการใช้ข้อมูล", desc: "หยุดใช้ชั่วคราวระหว่างตรวจสอบ", action: "อีเมล DPO" },
    { title: "ขอโอนข้อมูล", desc: "รับข้อมูลเพื่อย้ายไปบริการอื่น (เมื่อเทคนิคทำได้)", action: "อีเมล DPO" },
    { title: "คัดค้านการประมวลผล", desc: "เช่น คัดค้านการใช้เพื่อการตลาดโดยตรง", action: "อีเมล DPO" },
    { title: "ถอนความยินยอม", desc: "ถอนความยินยอมที่เคยให้ (ไม่กระทบการประมวลผลก่อนหน้า)", action: "ตั้งค่าคุกกี้ / อีเมล DPO" },
    { title: "ร้องเรียน สคส.", desc: "หากไม่พอใจการดำเนินการของเรา", action: "pdpc.or.th" },
  ];

  return (
    <LegalLayout title="สิทธิของเจ้าของข้อมูล (PDPA)">
      <p>
        ตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA) ม.39 คุณมีสิทธิเกี่ยวกับข้อมูลของตนเองบน {LEGAL_APP_NAME}
      หน้านี้สรุปวิธีใช้สิทธิและช่องทางติดต่อ — เขียนให้เข้าใจง่าย
    </p>
    <p className="text-sm text-muted-foreground">
      บัญชี {LEGAL_APP_NAME} ทำงานคู่กับ {LEGAL_SOLO_NAME} — การลบข้อมูลอาจกระทบทั้ง ecosystem ติดต่อ DPO ก่อนดำเนินการ
    </p>

    <h2>1. สิทธิที่คุณมี (PDPA ม.39)</h2>
      <div className="not-prose space-y-3 my-4">
        {rights.map((r) => (
          <div key={r.title} className="rounded-xl border border-border/60 p-3 space-y-0.5">
            <p className="font-medium text-sm text-foreground">{r.title}</p>
            <p className="text-xs text-muted-foreground">{r.desc}</p>
            <p className="text-xs text-primary/90">วิธีใช้: {r.action}</p>
          </div>
        ))}
      </div>

      <h2>2. ดำเนินการด้วยตนเอง (ทันที)</h2>
      <ul>
        <li>
          <strong>แก้ไขโปรไฟล์</strong> — <Link to="/settings">ตั้งค่า → โปรไฟล์</Link>
        </li>
        <li>
          <strong>ยืนยันตัวตน (KYC)</strong> — <Link to="/verify">หน้ายืนยันตัวตน</Link> (ต้องยินยอม PDPA ก่อนส่ง)
        </li>
        <li>
          <strong>คุกกี้</strong> — ปุ่มด้านล่าง
        </li>
      </ul>
      <div className="not-prose my-3">
        <Button type="button" size="sm" variant="outline" onClick={() => requestOpenCookiePreferences()}>
          จัดการความยินยอมคุกกี้
        </Button>
      </div>

      <h2>3. ส่งคำขอถึง DPO</h2>
      <p>
        สำหรับการเข้าถึงข้อมูล การลบบัญชี การโอนข้อมูล หรือถอนความยินยอมที่ต้องตรวจสอบโดยเจ้าหน้าที่
        กรุณาอีเมล <a href={`mailto:${LEGAL_DPO_EMAIL}`}>{LEGAL_DPO_EMAIL}</a>
        {user ? " (เทมเพลตด้านล่างจะใส่ User ID ให้อัตโนมัติ)" : " — กรุณาเข้าสู่ระบบก่อนเพื่อให้ระบุตัวตนได้ง่าย"}
      </p>

      <div className="not-prose flex flex-col sm:flex-row flex-wrap gap-2 my-4">
        <Button type="button" variant="secondary" size="sm" asChild>
          <a href={templates.access}>ขอเข้าถึง / สำเนาข้อมูล</a>
        </Button>
        <Button type="button" variant="secondary" size="sm" asChild>
          <a href={templates.correct}>ขอแก้ไขข้อมูล</a>
        </Button>
        <Button type="button" variant="secondary" size="sm" asChild>
          <a href={templates.delete}>ขอลบบัญชี</a>
        </Button>
        <Button type="button" variant="secondary" size="sm" asChild>
          <a href={templates.portability}>ขอโอนข้อมูล</a>
        </Button>
        <Button type="button" variant="secondary" size="sm" asChild>
          <a href={templates.object}>คัดค้านการประมวลผล</a>
        </Button>
        <Button type="button" variant="secondary" size="sm" asChild>
          <a href={templates.withdraw}>ถอนความยินยอม</a>
        </Button>
        <Button type="button" variant="secondary" size="sm" asChild>
          <a href={templates.kyc}>ถอนยินยอม KYC</a>
        </Button>
      </div>

      <h2>4. ขั้นตอนหลังส่งคำขอ</h2>
      <ol>
        <li><strong>รับเรื่อง</strong> — เราจะตอบรับคำขอภายใน 7 วันทำการ</li>
        <li><strong>ยืนยันตัวตน</strong> — อาจขอให้ยืนยันจากอีเมลที่ลงทะเบียน</li>
        <li><strong>ดำเนินการ</strong> — ตรวจสอบและดำเนินการตามสิทธิที่ขอ</li>
        <li><strong>แจ้งผล</strong> — ภายใน 30 วันนับจากได้รับคำขอที่ครบถ้วน (หรือขยายตามที่ PDPA อนุญาต พร้อมแจ้งเหตุผล)</li>
      </ol>

      <h2>5. ข้อจำกัดสิทธิ</h2>
      <p>เราอาจปฏิเสธหรือจำกัดคำขอเมื่อ:</p>
      <ul>
        <li>กฎหมายกำหนดให้เก็บข้อมูลต่อ (เช่น บันทึกธุรกรรม หลักฐาน KYC/AML หลังถอนเงิน)</li>
        <li>การเปิดเผยกระทบสิทธิของบุคคลที่สาม</li>
        <li>ไม่สามารถยืนยันตัวตนผู้ขอได้</li>
      </ul>

      <h2>6. การยืนยันตัวตน</h2>
      <p>
        เพื่อความปลอดภัย เราอาจขอให้ยืนยันตัวตนจากอีเมลที่ลงทะเบียนก่อนดำเนินการลบหรือส่งข้อมูลออก
      </p>

      <h2>7. เอกสารที่เกี่ยวข้อง</h2>
      <ul>
        <li><Link to="/legal/privacy">นโยบายความเป็นส่วนตัว</Link></li>
        <li><Link to="/legal/cookies">นโยบายคุกกี้</Link></li>
        <li><Link to="/legal/terms">ข้อกำหนดการใช้งาน</Link></li>
        <li><Link to="/legal/ip">นโยบายลิขสิทธิ์</Link></li>
      </ul>

      <h2>8. ติดต่อทั่วไป</h2>
      <p>
        คำถามอื่น: <a href={`mailto:${LEGAL_SUPPORT_EMAIL}`}>{LEGAL_SUPPORT_EMAIL}</a>
      </p>
    </LegalLayout>
  );
};

export default DataRightsPage;
