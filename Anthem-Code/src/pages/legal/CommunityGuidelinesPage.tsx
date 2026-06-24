import LegalLayout from "@/components/LegalLayout";
import { LEGAL_APP_NAME, LEGAL_SUPPORT_EMAIL, LEGAL_UPDATED_AT } from "@/lib/legalConfig";
import {
  COMMUNITY_CONTENT_RULES,
  COMMUNITY_MODERATION_CONTEXTS,
  COMMUNITY_STRIKE_LADDER,
  COMMUNITY_STRIKE_RESET_DAYS,
} from "@/data/communityModerationPolicy";

const CommunityGuidelinesPage = () => (
  <LegalLayout title="กฎชุมชนและการดูแลความปลอดภัย">
    <p className="text-muted-foreground text-sm">อัปเดตล่าสุด: {LEGAL_UPDATED_AT}</p>

    <p>
      {LEGAL_APP_NAME} เป็นชุมชนครีเอทีฟ — เราอยากให้ทุกคนพูดคุย แชร์ไอเดีย และช่วยเหลือกันได้อย่างสุภาพ
      เอกสารนี้อธิบายพฤติกรรมที่ไม่เหมาะสม ระบบกรองคำหยาบ และโทษแบนชั่วคราว
    </p>

    <h2>1. Designer Area (Tips & Q&A)</h2>
    <p>
      โพสต์ใน <strong>Designer Area</strong> ใช้กฎเดียวกับชุมชน ไม่ว่าจะเป็น Tips หรือคำถาม Q&A
      ระบบตรวจทุกส่วนที่ผู้ใช้พิมพ์:
    </p>
    <ul>
      <li><strong>หัวข้อโพสต์</strong> — mask คำหยาบเป็น <code>***</code> และนับ strike</li>
      <li><strong>เนื้อหาโพสต์</strong> — mask และนับ strike</li>
      <li><strong>แท็ก</strong> — <strong>ห้าม</strong>มีคำหยาบ (ต้องแก้ก่อนโพสต์)</li>
      <li><strong>ความคิดเห็น / ตอบกลับ</strong> — mask และนับ strike</li>
    </ul>
    <p>
      การสะกดเลี่ยง เช่น เว้นวรรคระหว่างพยางค์ ตัวเลขแทนตัวอักษร หรือตัวอักษรซ้ำยาวๆ ยังถูกตรวจจับ
    </p>

    <h2>2. พฤติกรรมที่ไม่เหมาะสม</h2>
    <ul>
      {COMMUNITY_CONTENT_RULES.map((rule) => (
        <li key={rule.id}>
          <strong>{rule.title}</strong> — {rule.desc}
        </li>
      ))}
    </ul>
    <p>
      หากพบเนื้อหาที่ละเมิด ให้ใช้ปุ่ม <strong>รายงาน</strong> บนโพสต์ คอมเมนต์ ผลงาน โปรไฟล์ แชท หรืองาน
      แล้วติดตามสถานะได้ที่ <a href="/me/reports">รายงานของฉัน</a>
    </p>

    <h2>3. ระบบกรองคำหยาบอัตโนมัติ</h2>
    <ul>
      <li>เมื่อระบบตรวจพบคำหยาบ จะแสดงเตือนก่อนโพสต์</li>
      <li>ใน <strong>แชท</strong> คำหยาบจะถูกแทนด้วย <code>***</code> ก่อนส่ง</li>
      <li>ใน <strong>Designer Area</strong> หัวข้อ/เนื้อหา/คอมเมนต์จะ mask แล้วบันทึก และนับ strike ต่อครั้งที่ตรวจพบ</li>
      <li><strong>แท็ก</strong> ที่มีคำหยาบจะไม่ผ่าน — ต้องลบหรือแก้ก่อนเผยแพร่</li>
      <li>รูปแบบ <strong>spam</strong> (ลิงก์โปรโมทมากเกินไป ข้อความหาเงินง่าย ฯลฯ) จะถูกบล็อก</li>
      <li>ใน <strong>FAQ โปรไฟล์</strong> ระบบจะไม่อนุญาตให้บันทึกถ้ามีคำหยาบ</li>
    </ul>

    <h3>หมวดคำที่ระบบตรวจ (ตัวอย่าง)</h3>
    <ul className="text-sm">
      <li>คำหยาบภาษาไทยและอังกฤษ</li>
      <li>คำดูหมิ่น / ท้าทาย</li>
      <li>เนื้อหาทางเพศหยาบ</li>
      <li>คำเหยียด (hate speech)</li>
      <li>วลีข่มขู่ / คุกคาม</li>
    </ul>

    <h2>4. โทษแบนจากคำหยาบ (Strike ladder)</h2>
    <table className="w-full text-sm border-collapse my-4">
      <thead>
        <tr className="border-b border-border">
          <th className="text-left py-2 pr-4">ครั้งที่</th>
          <th className="text-left py-2">ผล</th>
        </tr>
      </thead>
      <tbody>
        {COMMUNITY_STRIKE_LADDER.map((row) => (
          <tr key={row.strikes} className="border-b border-border/60">
            <td className="py-2 pr-4">{row.strikes}</td>
            <td className="py-2">
              {row.effect}
              {row.banDays > 0 ? ` ${row.banDays} วัน` : ""}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    <p>
      Strike จะรีเซ็ตหลังไม่มีเหตุการณ์ใหม่ครบ {COMMUNITY_STRIKE_RESET_DAYS} วัน
      ระหว่างถูกจำกัด คุณยังเข้าชมและอ่านเนื้อหาได้ แต่ไม่สามารถคอมเมนต์ แชท หรือโพสต์ใน Designer Area ได้
    </p>

    <h2>5. บันทึกเหตุการณ์ (สำหรับทีมดูแล)</h2>
    <p>ระบบบันทึก context ของ strike แยกตามประเภทเนื้อหา เช่น:</p>
    <ul className="text-sm font-mono">
      {Object.values(COMMUNITY_MODERATION_CONTEXTS).map((ctx) => (
        <li key={ctx}>{ctx}</li>
      ))}
    </ul>

    <h2>6. การแบนจากรายงาน (Report)</h2>
    <p>
      ทีมดูแลจะตรวจรายงานจากผู้ใช้ หากพบว่ามีการละเมิดจริง อาจ:
    </p>
    <ul>
      <li>เพิ่ม strike</li>
      <li>จำกัดการโพสต์ชั่วคราว (mute / ban)</li>
      <li>ซ่อนหรือลบเนื้อหาโพสต์ / คอมเมนต์</li>
    </ul>
    <p>โทษจากรายงานแยกจาก strike คำหยาบอัตโนมัติ — ทีมดูแลเลือกความรุนแรงตามแต่ละกรณี</p>

    <h2>7. อุทธรณ์และติดต่อ</h2>
    <p>
      หากคิดว่าถูกแบนโดยไม่เป็นธรรม ติดต่อ{" "}
      <a href={`mailto:${LEGAL_SUPPORT_EMAIL}`}>{LEGAL_SUPPORT_EMAIL}</a> พร้อม username และรายละเอียด
    </p>
    <p>
      อ่านเพิ่ม: <a href="/legal/terms">ข้อกำหนดการใช้งาน</a> ·{" "}
      <a href="/legal/privacy">นโยบายความเป็นส่วนตัว</a>
    </p>
  </LegalLayout>
);

export default CommunityGuidelinesPage;
