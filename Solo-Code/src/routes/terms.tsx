import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { LegalPageLayout, LegalSectionBlock } from "@/components/legal/LegalPageLayout";
import { LEGAL, PRICING, TERMS_SECTIONS } from "@/lib/legalMeta";
import { isEarlyAccessMode } from "@/lib/publicAccess";
import { buildPublicPageHead } from "@/lib/seoHead";

export const Route = createFileRoute("/terms")({
  head: () =>
    buildPublicPageHead({
      title: "ข้อกำหนดการใช้งาน",
      description:
        "ข้อกำหนดและเงื่อนไข So1o Freelancer — แพ็ก Pro/Pro+ Stripe Connect Support Hub หน้าลูกค้า Track/Brief และ ecosystem Aplus1",
      path: "/terms",
    }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalPageLayout
      title="ข้อกำหนดการใช้งาน"
      subtitle="เงื่อนไขการใช้บริการ So1o Freelancer"
      icon={FileText}
      iconLabel="Terms"
      sections={TERMS_SECTIONS}
    >
      <LegalSectionBlock id="accept" title="1. การยอมรับข้อกำหนด">
        <p>
          การเข้าใช้งาน {LEGAL.siteName} ถือว่าคุณได้อ่านและยอมรับข้อกำหนดเหล่านี้ รวมถึง{" "}
          <Link to="/privacy" className="text-primary hover:underline">
            นโยบายความเป็นส่วนตัว (PDPA)
          </Link>{" "}
          และ{" "}
          <Link to="/cookies" className="text-primary hover:underline">
            นโยบายคุกกี้
          </Link>
          หากไม่ยอมรับ กรุณาหยุดใช้งานทันที
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="service" title="2. ลักษณะการให้บริการ">
        <p>
          {LEGAL.siteName} เป็นแพลตฟอร์มช่วยฟรีแลนซ์ไทยจัดการงาน ลูกค้า (CRM) ใบเสนอราคา (QT/INV/RC)
          Smart Brief, Job Tracker, Portal ติดตามงาน (`/track/:token`, `/brief/:token`) การเงิน ภาษี
          ธีมเอกสาร/Portal (แพ็ก Pro) แจ้งเตือน LINE (แพ็ก Pro ขึ้นไป) และฟีเจอร์ AI
        </p>
        <p>
          บริการอยู่ในระยะพัฒนาอย่างต่อเนำ — อาจมีการเปลี่ยนแปลง ปรับปรุง
          หรือระงับฟีเจอร์โดยไม่ต้องแจ้งล่วงหน้า ฟีเจอร์ที่ระบุว่า «เร็วๆ นี้»
          ยังไม่ถือเป็นสัญญาให้บริการ
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="ecosystem" title="3. So1o + Aplus1 (Ecosystem)">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong>So1o</strong> = หลังบ้านฟรีแลนซ์ ({LEGAL.siteUrl}) · <strong>Aplus1</strong> =
            โชว์เคสผลงาน ({LEGAL.ecosystemUrl}) — บัญชีเดียว สมัครครั้งเดียว
          </li>
          <li>
            แพ็ก Pro / Pro+ / In-House ปลดล็อกโควต้าและฟีเจอร์ข้ามทั้งสองแอป ตามตารางที่{" "}
            <Link to="/pricing" className="text-primary hover:underline">
              หน้าราคา
            </Link>
          </li>
          <li>
            การละเมิดข้อกำหนดฝั่งใดฝั่งหนึ่ง อาจส่งผลต่อสิทธิใช้งานทั้ง ecosystem ตามความเหมาะสม
          </li>
        </ul>
        <p className="text-sm text-muted-foreground">
          เอกสารกฎหมายของ {LEGAL.ecosystemName}:{" "}
          <a
            href={`${LEGAL.ecosystemUrl}/legal/terms`}
            className="text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            ข้อกำหนด Aplus1
          </a>
          {" · "}
          <a
            href={`${LEGAL.ecosystemUrl}/legal/privacy`}
            className="text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            PDPA Aplus1
          </a>
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="account" title="4. บัญชีผู้ใช้">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>คุณเป็นผู้รับผิดชอบรหัสผ่านและการเข้าถึงบัญชีของตนเอง</li>
          <li>ห้ามใช้บัญชีของผู้อื่น หรือสร้างบัญชีปลอม</li>
          <li>ข้อมูลที่กรอกต้องเป็นข้อมูลจริงและไม่ละเมิดสิทธิ์ผู้อื่น</li>
          <li>คุณรับผิดชอบข้อมูลลูกค้าและเอกสารที่กรอก/อัปโหลดในระบบ</li>
        </ul>
      </LegalSectionBlock>

      <LegalSectionBlock id="prohibited" title="5. การใช้งานที่ห้าม">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>ห้ามใช้ระบบเพื่อกระทำผิดกฎหมาย ฉ้อโกง หรือหลอกลวงลูกค้า</li>
          <li>ห้าม Reverse Engineer, ทำซ้ำ หรือลอกเลียนระบบ</li>
          <li>ห้ามอัปโหลดเนื้อหาที่ละเมิดลิขสิทธิ์หรือข้อมูลส่วนบุคคลโดยไม่มีสิทธิ</li>
          <li>ห้าม Spam หรือใช้ระบบส่งข้อความรบกวนผู้อื่น</li>
          <li>ห้ามพยายามเข้าถึงข้อมูลของผู้ใช้อื่นโดยไม่ได้รับอนุญาต</li>
        </ul>
      </LegalSectionBlock>

      <LegalSectionBlock id="content" title="6. กรรมสิทธิ์ในเนื้อหา">
        <p>
          เนื้อหาที่คุณกรอก (ใบเสนอราคา, บรีฟ, ลูกค้า, เอกสารภาษี, โลโก้แบรนด์ ฯลฯ)
          เป็นกรรมสิทธิ์ของคุณ เราเก็บไว้เพื่อให้บริการเท่านั้น โลโก้ ดีไซน์ UI และซอร์สโค้ดของ So1o
          เป็นของเรา
        </p>
        <p>
          แพ็ก Pro ขึ้นไปสามารถ white-label เอกสารและ Portal — ดูรายละเอียดใน Settings → ธีมเอกสาร &
          Portal
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="client-portals" title="7. หน้าลูกค้า (Track / Brief)">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            ลิงก์สาธารณะ (`/track/:token`, `/brief/:token`)
            ออกแบบให้ลูกค้าของคุณเข้าถึงได้โดยไม่ต้องสมัคร So1o
          </li>
          <li>
            คุณเป็นผู้รับผิดชอบเนื้อหาและลิงก์ที่ส่งให้ลูกค้า รวมถึงการเก็บ/ใช้ข้อมูลลูกค้าตาม PDPA
            ในฐานะผู้ควบคุมข้อมูลของลูกค้าของคุณ
          </li>
          <li>อย่าแชร์ token ในที่สาธารณะ — ใครมีลิงก์อาจเข้าถึงงานและเอกสารที่เกี่ยวข้องได้</li>
        </ul>
      </LegalSectionBlock>

      <LegalSectionBlock id="esign" title="7.1 ลายเซ็นเอกสาร (E-sign tool)">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            ลิงก์ `/sign/:token` ให้ลูกค้าวาดลายเซ็นหรืออัปโหลดเอกสารที่เซ็นแล้ว (wet sign)
            โดยไม่ต้องล็อกอิน So1o
          </li>
          <li>
            ฟีเจอร์เป็นเครื่องมือช่วยจัดทำเอกสาร — ไม่ใช่บริการลงนามอิเล็กทรอนิกส์ตามกฎหมายเต็มรูปแบบ
            หรือคำปรึกษาทางกฎหมาย
          </li>
          <li>
            คุณต้องขอความยินยอมจากลูกค้าและรับผิดชอบความถูกต้องของเอกสาร — So1o
            เป็นแพลตฟอร์มช่วยจัดการเท่านั้น
          </li>
          <li>ลูกค้าเซ็นซ้ำไม่ได้เมื่อบันทึกสำเร็จแล้ว</li>
        </ul>
      </LegalSectionBlock>

      <LegalSectionBlock id="payments-client" title="8. รับชำระจากลูกค้า">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong>QR / โอน + สลิป</strong> — คุณตั้งค่าใน Settings → การเงิน
            เงินเข้าบัญชีของคุณโดยตรง เราแสดง QR/ข้อมูลโอนและรับอัปโหลดสลิป —
            การตรวจสอบและยืนยันเป็นความรับผิดชอบของคุณ
          </li>
          <li>
            <strong>ชำระออนไลน์ (Stripe Connect)</strong> — ลูกค้าชำระบัตรบนหน้า Track เงินเข้าบัญชี
            Stripe ที่คุณเชื่อม ค่าธรรมเนียม card อาจคิดจากลูกค้าแยกตามที่ตั้งค่า
          </li>
          <li>
            So1o เป็นผู้ให้บริการซอฟต์แวร์ ไม่ใช่ผู้รับชำระแทนคุณ (ยกเว้นค่า subscription แผน Pro
            ของตัวคุณเอง)
          </li>
          <li>
            รายละเอียดใช้งาน:{" "}
            <Link to="/help/payments" className="text-primary hover:underline">
              คู่มือรับชำระ
            </Link>
          </li>
        </ul>
      </LegalSectionBlock>

      <LegalSectionBlock id="ai-tax" title="9. AI, ภาษี และเอกสาร 50 ทวิ">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            ฟีเจอร์ AI Mentor และสแกน 50 ทวิ ให้ผลลัพธ์เพื่อ<strong>ช่วยกรอกข้อมูล</strong>
            ไม่ใช่คำแนะนำทางกฎหมายหรือภาษี
          </li>
          <li>
            ตัวเลขจากเครื่องคิดราคา (Price Calculator) เป็นเพียงการประมาณการเบื้องต้น
            คุณต้องตรวจสอบก่อนใช้ต่อรองหรือยื่นภาษี
          </li>
          <li>
            คุณรับผิดชอบความถูกต้องของข้อมูลในใบเสนอราคา ใบหัก ณ ที่จ่าย
            และเอกสารที่ส่งให้ลูกค้า/สรรพากร
          </li>
        </ul>
      </LegalSectionBlock>

      <LegalSectionBlock id="subscription" title="10. แผนราคาและการชำระเงิน">
        <p>
          แผน Free, Solo Pro (฿{PRICING.proMonthly}/เดือน หรือ ฿{PRICING.proYearly}/ปี), Pro+ (฿
          {PRICING.proPlusMonthly}/เดือน หรือ ฿{PRICING.proPlusYearly}/ปี) และ In-House (฿
          {PRICING.inhouseMonthlyPerSeat}/ที่นั่ง/เดือน) อาจมีการเปลี่ยนแปลงราคาและฟีเจอร์ การชำระ
          subscription ผ่าน Stripe ตามเงื่อนไขของ Stripe
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            แผน Free จำกัด Job Tracker {PRICING.freeMonthlyJobs} งาน/เดือน (Pro ขึ้นไปไม่จำกัด)
          </li>
          <li>
            เครดิต AI และ storage ขึ้นกับแพ็ก — ดูรายละเอียดที่{" "}
            <Link to="/pricing" className="text-primary hover:underline">
              หน้าราคา
            </Link>
          </li>
          <li>การสมัครแผนเสียเงินสามารถยกเลิกได้ใน Dashboard → ตั้งค่า → จัดการการชำระเงิน</li>
          <li>
            รายละเอียดการคืนเงิน:{" "}
            <Link to="/refund" className="text-primary hover:underline">
              นโยบายคืนเงิน
            </Link>
          </li>
        </ul>
      </LegalSectionBlock>

      <LegalSectionBlock id="support" title="11. Support Hub">
        <p>
          แจ้งปัญหา ติดตามตั๋ว (TKT-xxxx) แชทกับทีม และคู่มือช่วยเหลือ ผ่าน So1o Support Hub ใน
          Dashboard การส่งตั๋วหรือข้อความถือว่าคุณยินยอมให้เราใช้ข้อมูลที่จำเป็นเพื่อแก้ปัญหา ดู{" "}
          <Link to="/help" className="text-primary hover:underline">
            ศูนย์ช่วยเหลือ
          </Link>
        </p>
      </LegalSectionBlock>

      {isEarlyAccessMode() && (
        <LegalSectionBlock id="beta" title="12. Early Access / Beta">
          <p>
            ในช่วง Early Access สิทธิ์การใช้งานอาจมีจำกัด เราขอสงวนสิทธิ์ระงับบัญชี Free
            ที่ไม่มีความเคลื่อนไหวเกิน 7 วัน (ตามที่แจ้งตอนสมัคร) เพื่อจัดสรรทรัพยากร —
            ไม่ใช้กับผู้ใช้แผน Pro/In-House ที่ชำระเงินแล้ว
          </p>
        </LegalSectionBlock>
      )}

      <LegalSectionBlock
        id="liability"
        title={isEarlyAccessMode() ? "13. ข้อจำกัดความรับผิด" : "12. ข้อจำกัดความรับผิด"}
      >
        <p>
          ระบบให้บริการ "ตามสภาพ" (as-is) เราพยายามดูแลให้ใช้งานได้ต่อเนื่อง
          แต่ไม่รับประกันความเสียหายจากการสูญหายของข้อมูล การหยุดให้บริการชั่วคราว
          หรือการตัดสินใจทางธุรกิจ/ภาษีที่อาศัยข้อมูลในระบบ
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock
        id="termination"
        title={isEarlyAccessMode() ? "14. การยกเลิกบัญชี" : "13. การยกเลิกบัญชี"}
      >
        <p>
          คุณยกเลิกบัญชีได้ตลอดเวลา เราขอสงวนสิทธิ์ระงับหรือลบบัญชีที่ละเมิดข้อกำหนดเหล่านี้
          โดยไม่ต้องชดเชยใดๆ ข้อมูลจะถูกลบตาม{" "}
          <Link to="/privacy" className="text-primary hover:underline">
            นโยบายความเป็นส่วนตัว
          </Link>
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock
        id="changes"
        title={isEarlyAccessMode() ? "15. การเปลี่ยนแปลงข้อกำหนด" : "14. การเปลี่ยนแปลงข้อกำหนด"}
      >
        <p>
          เราอาจปรับปรุงข้อกำหนดนี้เป็นระยะ การใช้งานต่อหลังการเปลี่ยนแปลงถือเป็นการยอมรับฉบับใหม่
          วันที่อัปเดตแสดงด้านบนของหน้านี้
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock
        id="law"
        title={isEarlyAccessMode() ? "16. กฎหมายที่ใช้บังคับ" : "15. กฎหมายที่ใช้บังคับ"}
      >
        <p>
          ข้อกำหนดนี้อยู่ภายใต้กฎหมาย{LEGAL.jurisdiction}
          กรณีพิพาทให้ใช้ศาลในประเทศไทยเป็นผู้ตัดสิน
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock
        id="contact"
        title={isEarlyAccessMode() ? "17. ติดต่อเรา" : "16. ติดต่อเรา"}
      >
        <p>
          สอบถามเพิ่มเติมได้ที่{" "}
          <a href={`mailto:${LEGAL.contactEmail}`} className="text-primary hover:underline">
            {LEGAL.contactEmail}
          </a>
        </p>
      </LegalSectionBlock>
    </LegalPageLayout>
  );
}
