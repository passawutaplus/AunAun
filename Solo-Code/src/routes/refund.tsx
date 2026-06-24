import { createFileRoute, Link } from "@tanstack/react-router";
import { RotateCcw } from "lucide-react";
import { LegalPageLayout, LegalSectionBlock } from "@/components/legal/LegalPageLayout";
import { LEGAL, PRICING, REFUND_SECTIONS } from "@/lib/legalMeta";
import { buildPublicPageHead } from "@/lib/seoHead";

export const Route = createFileRoute("/refund")({
  head: () =>
    buildPublicPageHead({
      title: "นโยบายคืนเงิน",
      description:
        "นโยบายคืนเงิน So1o Freelancer สำหรับแผน Pro Pro+ In-House — เงื่อนไข subscription และชำระจากลูกค้า Stripe Connect",
      path: "/refund",
    }),
  component: RefundPage,
});

function RefundPage() {
  return (
    <LegalPageLayout
      title="นโยบายคืนเงิน"
      subtitle="เงื่อนไขการคืนเงินสำหรับแผนที่ชำระเงิน"
      icon={RotateCcw}
      iconLabel="Refund"
      sections={REFUND_SECTIONS}
    >
      <LegalSectionBlock id="intro" title="1. บทนำ">
        <p>
          นโยบายนี้อธิบายเงื่อนไขการคืนเงินสำหรับการสมัครแผน Solo Pro (฿{PRICING.proMonthly}/เดือน),
          Pro+ (฿{PRICING.proPlusMonthly}/เดือน), และ In-House (฿{PRICING.inhouseMonthlyPerSeat}
          /ที่นั่ง/เดือน) ของ {LEGAL.siteName} แผน Free ไม่มีค่าใช้จ่าย จึงไม่เกี่ยวข้องกับนโยบายนี้
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="subscription" title="2. การสมัครแบบ subscription">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>การชำระเงินดำเนินการผ่าน Stripe ตามรอบบิลที่เลือก (รายเดือนหรือรายปี)</li>
          <li>คุณสามารถยกเลิกการต่ออายุได้ทุกเมื่อใน Dashboard → ตั้งค่า → จัดการการชำระเงิน</li>
          <li>เมื่อยกเลิก คุณยังใช้ฟีเจอร์ Pro ได้จนสิ้นรอบที่ชำระแล้ว</li>
        </ul>
      </LegalSectionBlock>

      <LegalSectionBlock id="eligible" title="3. กรณีที่อาจพิจารณาคืนเงิน">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>ชำระเงินซ้ำโดยไม่ตั้งใจ (double charge) ภายใน 7 วัน</li>
          <li>
            ระบบมีปัญหาร้ายแรงที่ทำให้ใช้งาน Pro ไม่ได้ต่อเนื่องเกิน 72 ชั่วโมง
            และเราไม่สามารถแก้ไขได้
          </li>
          <li>กรณีอื่นที่กฎหมายคุ้มครองผู้บริโภคบังคับ</li>
        </ul>
      </LegalSectionBlock>

      <LegalSectionBlock id="not-eligible" title="4. กรณีที่ไม่คืนเงิน">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>เปลี่ยนใจหลังใช้งานไปแล้วในช่วงรอบบิลปัจจุบัน</li>
          <li>ไม่ได้ใช้งานฟีเจอร์ Pro/Pro+ แต่ไม่ได้ยกเลิก subscription</li>
          <li>เครดิต AI ที่ใช้ไปแล้วบางส่วนในรอบบิล</li>
          <li>
            การละเมิด{" "}
            <Link to="/terms" className="text-primary hover:underline">
              ข้อกำหนดการใช้งาน
            </Link>
          </li>
        </ul>
      </LegalSectionBlock>

      <LegalSectionBlock id="client-payments" title="5. ชำระจากลูกค้า (Stripe Connect)">
        <p>
          เงินที่ลูกค้าชำระผ่าน QR/โอนหรือ Stripe Connect บนหน้า Track
          เป็นธุรกรรมระหว่างคุณกับลูกค้า So1o ไม่รับผิดชอบการคืนเงินในกรณีนั้น —
          จัดการโดยตรงกับลูกค้าหรือผ่าน Stripe Dashboard ของคุณ
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="how" title="6. วิธีขอคืนเงิน">
        <p>
          ส่งคำขอมาที่{" "}
          <a href={`mailto:${LEGAL.contactEmail}`} className="text-primary hover:underline">
            {LEGAL.contactEmail}
          </a>{" "}
          พร้อมอีเมลบัญชี วันที่ชำระเงิน และเหตุผล เราจะตอบภายใน 7–14 วันทำการ หากอนุมัติ
          การคืนเงินจะดำเนินการผ่านช่องทางเดิมที่ชำระ (Stripe) ภายใน 14–30 วัน
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="contact" title="7. ติดต่อเรา">
        <p>
          คำถามเพิ่มเติม:{" "}
          <a href={`mailto:${LEGAL.contactEmail}`} className="text-primary hover:underline">
            {LEGAL.contactEmail}
          </a>
          {" · "}
          <Link to="/terms" className="text-primary hover:underline">
            ข้อกำหนดการใช้งาน
          </Link>
        </p>
      </LegalSectionBlock>
    </LegalPageLayout>
  );
}
