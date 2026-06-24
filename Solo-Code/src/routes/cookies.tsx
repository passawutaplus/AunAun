import { createFileRoute, Link } from "@tanstack/react-router";
import { Cookie } from "lucide-react";
import { LegalPageLayout, LegalSectionBlock } from "@/components/legal/LegalPageLayout";
import { CookiePreferencesLink } from "@/components/CookiePreferencesLink";
import { CATEGORY_LABELS } from "@/lib/cookieConsent";
import { COOKIE_INVENTORY, COOKIE_SECTIONS, LEGAL } from "@/lib/legalMeta";
import { buildPublicPageHead } from "@/lib/seoHead";

export const Route = createFileRoute("/cookies")({
  head: () =>
    buildPublicPageHead({
      title: "นโยบายคุกกี้",
      description:
        "นโยบายคุกกี้ So1o Freelancer — ประเภทคุกกี้ Local Storage Stripe Supabase วิธีจัดการความยินยอมตาม PDPA",
      path: "/cookies",
    }),
  component: CookiesPage,
});

function CookiesPage() {
  return (
    <LegalPageLayout
      title="นโยบายคุกกี้"
      subtitle="ควบคุมการใช้คุกกี้และเทคโนโลยีที่คล้ายกันตาม PDPA"
      icon={Cookie}
      iconLabel="Cookies"
      sections={COOKIE_SECTIONS}
    >
      <LegalSectionBlock id="what" title="1. คุกกี้คืออะไร">
        <p>
          คุกกี้ (Cookies) คือไฟล์ข้อมูลขนาดเล็กที่เว็บไซต์เก็บในเบราว์เซอร์ นอกจากนี้เรายังใช้{" "}
          <strong>Local Storage</strong> และ <strong>Session Storage</strong>
          ซึ่งทำหน้าที่คล้ายคุกกี้ในการจดจำการตั้งค่าและสถานะการใช้งาน
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="categories" title="2. ประเภทคุกกี้ที่เราใช้">
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <span className="font-medium">คุกกี้ที่จำเป็น (Essential):</span> ล็อกอิน ความปลอดภัย
            และบันทึกการยินยอม — ปิดไม่ได้เพราะระบบใช้งานไม่ได้
          </li>
          <li>
            <span className="font-medium">คุกกี้การตั้งค่า (Preferences):</span> ธีม, ตำแหน่ง UI,
            Draft งาน, ประกาศที่ปิดแล้ว — ใช้เมื่อคุณยินยอม
          </li>
          <li>
            <span className="font-medium">คุกกี้วิเคราะห์ (Analytics):</span> สถิติการใช้งาน
            ประเภทอุปกรณ์, ความถี่ใช้ฟีเจอร์ — ไม่ขายข้อมูล ใช้เมื่อคุณยินยอม
          </li>
        </ul>
        <p className="text-muted-foreground text-xs">
          เราไม่ใช้คุกกี้โฆษณาข้ามเว็บไซต์ (Third-party Advertising Cookies)
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="inventory" title="3. รายการคุกกี้และ Storage">
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full text-xs">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="px-3 py-2 font-medium">ชื่อ</th>
                <th className="px-3 py-2 font-medium">ที่เก็บ</th>
                <th className="px-3 py-2 font-medium">ประเภท</th>
                <th className="px-3 py-2 font-medium">วัตถุประสงค์</th>
                <th className="px-3 py-2 font-medium">ระยะเวลา</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {COOKIE_INVENTORY.map((row) => (
                <tr key={row.name}>
                  <td className="px-3 py-2 font-mono whitespace-nowrap">{row.name}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{row.storage}</td>
                  <td className="px-3 py-2">{CATEGORY_LABELS[row.category]}</td>
                  <td className="px-3 py-2">{row.purpose}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{row.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </LegalSectionBlock>

      <LegalSectionBlock id="third-party" title="4. คุกกี้จากบุคคลที่สาม">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong>Supabase Auth</strong> — เก็บ token ล็อกอิน (จำเป็น)
          </li>
          <li>
            <strong>Google OAuth</strong> — อาจตั้งคุกกี้ระหว่างการล็อกอิน (จำเป็น)
          </li>
          <li>
            <strong>Stripe</strong> — Checkout แผน Pro/Pro+/In-House และ Stripe Connect
            (จำเป็นเมื่อชำระ/เชื่อมบัญชี)
          </li>
          <li>
            <strong>Google Fonts</strong> — อาจบันทึก log การโหลดฟอนต์ (ไม่ใช่คุกกี้โดยตรงจาก So1o)
          </li>
        </ul>
      </LegalSectionBlock>

      <LegalSectionBlock id="manage" title="5. การจัดการคุกกี้">
        <p>
          คุณสามารถเลือกประเภทคุกกี้ที่ยอมรับได้ตลอดเวลาผ่านปุ่ม{" "}
          <CookiePreferencesLink className="text-primary hover:underline inline" />{" "}
          ที่ด้านล่างหน้านี้หรือใน Footer
        </p>
        <p>
          นอกจากนี้ คุณสามารถลบหรือบล็อกคุกกี้ในเบราว์เซอร์ (Chrome, Safari, Firefox, Edge)
          แต่หากปิดคุกกี้ที่จำเป็น ระบบล็อกอินอาจใช้งานไม่ได้
        </p>
        <p>การยินยอมจะหมดอายุใน 180 วัน หลังจากนั้นกล่องยินยอมจะแสดงอีกครั้ง</p>
        <p>
          ดูนโยบายความเป็นส่วนตัวเพิ่มเติมที่{" "}
          <Link to="/privacy" className="text-primary hover:underline">
            นโยบาย PDPA
          </Link>
        </p>
      </LegalSectionBlock>

      <LegalSectionBlock id="contact" title="6. ติดต่อเรา">
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
