import LegalLayout from "@/components/LegalLayout";
import { LEGAL_APP_NAME, LEGAL_SUPPORT_EMAIL } from "@/lib/legalConfig";
import {
  COMMUNITY_CONTENT_RULES,
  COMMUNITY_FIELD_RULES,
  COMMUNITY_GUIDELINES_UPDATED_AT,
  COMMUNITY_REPORT_REASONS,
  COMMUNITY_REPORT_TARGETS,
  COMMUNITY_STRIKE_LADDER,
  COMMUNITY_STRIKE_RESET_DAYS,
} from "@/data/communityModerationPolicy";

const CommunityGuidelinesPage = () => (
  <LegalLayout title="กฎชุมชนและการดูแลความปลอดภัย">
    <p className="text-muted-foreground text-sm">อัปเดตล่าสุด: {COMMUNITY_GUIDELINES_UPDATED_AT}</p>

    <p>
      {LEGAL_APP_NAME} เป็นชุมชนครีเอทีฟ — เราอยากให้ทุกคนแชร์ไอเดีย คุยงาน และช่วยเหลือกันได้อย่างสุภาพ
      เอกสารนี้อธิบายพฤติกรรมที่ไม่เหมาะสม ระบบกรองคำหยาบ และโทษจำกัดการโพสต์
    </p>

    <h2>1. โพสต์ชุมชน (Area)</h2>
    <p>
      โพสต์ในชุมชน (แท็บ Area บนหน้าแรก) ใช้กฎเดียวกัน ไม่ว่าจะเป็น Tips คำถาม หรือแชร์ประสบการณ์
      ระบบตรวจทุกส่วนที่ผู้ใช้พิมพ์:
    </p>
    <ul>
      {Object.entries(COMMUNITY_FIELD_RULES).map(([key, rule]) => (
        <li key={key}>
          <strong>{rule.label}</strong>
          {rule.blockOnProfanity
            ? " — ห้ามมีคำหยาบ (ต้องแก้ก่อนโพสต์)"
            : " — แทนคำหยาบด้วย *** และอาจนับ strike"}
        </li>
      ))}
    </ul>
    <p>
      การสะกดเลี่ยง เช่น เว้นวรรคระหว่างพยางค์ ตัวเลขแทนตัวอักษร ตัวอักษรซ้ำยาวๆ หรือใช้สัญลักษณ์แทนตัวอักษร
      ยังถูกตรวจจับ
    </p>

    <h2>2. พฤติกรรมที่ไม่เหมาะสม</h2>
    <ul>
      {COMMUNITY_CONTENT_RULES.map((rule) => (
        <li key={rule.id}>
          <strong>{rule.title}</strong> — {rule.desc}
        </li>
      ))}
    </ul>

    <h2>3. ระบบกรองอัตโนมัติ</h2>
    <ul>
      <li>เมื่อระบบตรวจพบคำหยาบ จะแสดงเตือนก่อนโพสต์หรือส่งข้อความ</li>
      <li>
        ใน <strong>แชท</strong> (จ้างงาน / คอลแลป / กลุ่ม) คำหยาบจะถูกแทนด้วย <code>***</code> ก่อนส่ง
        และอาจนับ strike
      </li>
      <li>
        ใน <strong>โพสต์ชุมชน</strong> หัวข้อ/เนื้อหา/ความคิดเห็นจะ mask แล้วบันทึก และนับ strike ต่อครั้งที่ตรวจพบ
      </li>
      <li>
        <strong>แท็ก</strong> ที่มีคำหยาบจะไม่ผ่าน — ต้องลบหรือแก้ก่อนเผยแพร่
      </li>
      <li>
        <strong>ความคิดเห็นบนผลงาน</strong> ใช้กฎเดียวกัน — mask และนับ strike
      </li>
      <li>
        รูปแบบ <strong>spam</strong> (ลิงก์โปรโมทมากเกินไป ข้อความหาเงินง่าย ลิงก์ Telegram/LINE น่าสงสัย ฯลฯ)
        จะถูกบล็อก
      </li>
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
      ระหว่างถูกจำกัด คุณยังเข้าชมและอ่านเนื้อหาได้ แต่ไม่สามารถคอมเมนต์ แชท หรือโพสต์ในชุมชนได้
    </p>

    <h2>5. วิธีรายงานเนื้อหา</h2>
    <p>
      หากพบเนื้อหาที่ละเมิด ให้ใช้ปุ่ม <strong>รายงาน</strong> บนเนื้อหานั้น แล้วติดตามสถานะได้ที่{" "}
      <a href="/me/reports">รายงานของฉัน</a>
    </p>
    <p className="text-sm text-muted-foreground">รายงานได้จาก:</p>
    <ul className="text-sm">
      {COMMUNITY_REPORT_TARGETS.map((t) => (
        <li key={t.id}>{t.label}</li>
      ))}
    </ul>
    <p className="text-sm text-muted-foreground mt-3">เหตุผลที่เลือกได้:</p>
    <ul className="text-sm">
      {COMMUNITY_REPORT_REASONS.map((r) => (
        <li key={r.id}>{r.label}</li>
      ))}
    </ul>
    <p className="text-sm">
      สามารถแนบรายละเอียดและหลักฐานเพิ่มเติมได้ — ทีมดูแลจะไม่เปิดเผยตัวตนผู้รายงาน
    </p>

    <h2>6. การดูแลจากทีม</h2>
    <p>ทีมดูแลจะตรวจรายงานจากผู้ใช้ หากพบว่ามีการละเมิดจริง อาจ:</p>
    <ul>
      <li>เพิ่ม strike</li>
      <li>จำกัดการโพสต์ชั่วคราว (mute / ban)</li>
      <li>ซ่อนหรือลบเนื้อหาโพสต์ / คอมเมนต์</li>
    </ul>
    <p>โทษจากรายงานแยกจาก strike คำหยาบอัตโนมัติ — ทีมดูแลเลือกความรุนแรงตามแต่ละกรณี</p>

    <h2>7. อุทธรณ์และติดต่อ</h2>
    <p>
      หากคิดว่าถูกจำกัดโดยไม่เป็นธรรม ติดต่อ{" "}
      <a href={`mailto:${LEGAL_SUPPORT_EMAIL}`}>{LEGAL_SUPPORT_EMAIL}</a> พร้อม username และรายละเอียด
    </p>
    <p>
      อ่านเพิ่ม: <a href="/legal/terms">ข้อกำหนดการใช้งาน</a> ·{" "}
      <a href="/legal/privacy">นโยบายความเป็นส่วนตัว</a> ·{" "}
      <a href="/legal/ip">ทรัพย์สินทางปัญญา</a>
    </p>
  </LegalLayout>
);

export default CommunityGuidelinesPage;
