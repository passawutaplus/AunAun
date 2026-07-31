import LegalLayout from "@/components/LegalLayout";
import {
  PACKAGE_ATTESTATION_BULLETS,
  PACKAGE_ATTESTATION_LEGAL_NOTE,
  PACKAGE_ATTESTATION_TITLE,
  PACKAGE_ATTESTATION_VERSION,
  PACKAGE_POLICY_ATTESTATION_ANCHOR,
  PACKAGE_POLICY_SUMMARY,
} from "@/lib/packageLegalAttestation";
import {
  LEGAL_APP_NAME,
  LEGAL_DPO_EMAIL,
  LEGAL_SUPPORT_EMAIL,
  LEGAL_UPDATED_AT,
} from "@/lib/legalConfig";

const PackagesPolicyPage = () => (
  <LegalLayout title="นโยบายแพ็กเกจบริการ">
    <p className="text-sm text-muted-foreground">อัปเดตล่าสุด: {LEGAL_UPDATED_AT}</p>

    <p>
      หน้านี้อธิบายกติกาของฟีเจอร์<strong>แพ็กเกจ</strong>บน <strong>{LEGAL_APP_NAME}</strong> —
      รวมถึงการเผยแพร่ ข้อมูลส่วนบุคคล (PDPA) ข้อกำหนด และความรับผิดชอบของครีเอเตอร์
      เนื้อหานี้ไม่ใช่คำปรึกษาทางกฎหมาย
    </p>

    <p>
      <strong>สรุปสั้น ๆ:</strong> {PACKAGE_POLICY_SUMMARY}
    </p>

    <h2>1. แพ็กเกจคืออะไร</h2>
    <ul>
      <li>
        แพ็กเกจคือการโชว์ขอบเขตบริการ ราคาโดยประมาณ ระยะเวลาทำงานโดยประมาณ สิ่งที่ส่งมอบ
        และสื่อตัวอย่าง เพื่อให้ผู้สนใจเริ่มคุยงานได้
      </li>
      <li>
        การเผยแพร่แพ็กเกจ<strong>ไม่ใช่</strong>การทำสัญญาจ้างอัตโนมัติ และไม่ใช่การรับประกันว่าจะมีคนจ้าง
      </li>
      <li>
        การคุยงานต่อจากแพ็กเกจเป็นการติดต่อระหว่างผู้ใช้โดยตรง — {LEGAL_APP_NAME} เป็นแพลตฟอร์มกลาง
        ไม่ใช่คู่สัญญา นายจ้าง หรือตัวแทนจัดหางาน
      </li>
      <li>
        หากมีการจ้างงานผ่านเครื่องมือของแพลตฟอร์ม ให้ดู{" "}
        <a href="/legal/service-agreement">ข้อตกลงการจ้างงาน</a> และ{" "}
        <a href="/legal/payment-refund">นโยบายการชำระเงินและการคืนเงิน</a>
      </li>
    </ul>

    <h2>2. สิ่งที่ครีเอเตอร์ต้องระบุให้ถูกต้อง</h2>
    <ul>
      <li>ชื่อบริการ รายละเอียด หมวดหมู่</li>
      <li>ภาพปก (จำเป็นก่อนเผยแพร่) และสื่อสไลด์ประกอบ (ถ้ามี)</li>
      <li>ช่วงราคา (บาท) และจำนวนวันทำงานโดยประมาณ (บังคับก่อนเผยแพร่)</li>
      <li>สิ่งที่ส่งมอบอย่างน้อย 1 รายการ</li>
      <li>ผลงานตัวอย่างอย่างน้อย 1 ชิ้น (ผลงานที่เผยแพร่แล้ว)</li>
      <li>จำนวนรอบแก้ไข และสิ่งที่ไม่รวม (ไม่บังคับ)</li>
    </ul>
    <p>
      ข้อมูลราคาและระยะเวลาเป็น<strong>ประมาณการ</strong>เพื่อเริ่มคุย — ขอบเขตงานจริงอาจตกลงกันใหม่ในแชทหรือเอกสารจ้าง
    </p>

    <h2 id={PACKAGE_POLICY_ATTESTATION_ANCHOR}>3. {PACKAGE_ATTESTATION_TITLE}</h2>
    <p>
      ก่อนกด<strong>เผยแพร่</strong> คุณต้องติ๊กยืนยันคำแถลงด้านล่าง
      (รุ่นข้อความ: {PACKAGE_ATTESTATION_VERSION})
    </p>
    <div className="not-prose rounded-xl border-2 border-primary/30 bg-primary/5 p-4 space-y-2 my-4">
      <p className="font-semibold text-foreground">{PACKAGE_ATTESTATION_TITLE}</p>
      <ul className="text-base text-foreground list-disc pl-5 space-y-1">
        {PACKAGE_ATTESTATION_BULLETS.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
      <p className="text-sm text-muted-foreground">{PACKAGE_ATTESTATION_LEGAL_NOTE}</p>
      <p className="text-xs text-muted-foreground">
        ข้าพเจ้ายอมรับ{" "}
        <a href="/legal/terms" className="text-primary hover:underline">
          ข้อกำหนดการใช้งาน
        </a>
        {", "}
        <a href="/legal/privacy" className="text-primary hover:underline">
          นโยบายความเป็นส่วนตัว (PDPA)
        </a>
        {" "}และนโยบายแพ็กเกจฉบับนี้
      </p>
    </div>

    <h2>4. ลิขสิทธิ์และสื่อประกอบแพ็กเกจ</h2>
    <ul>
      <li>
        สื่อในแพ็กเกจ (ภาพปก สไลด์ วิดีโอ) อยู่ภายใต้{" "}
        <a href="/legal/ip">นโยบายลิขสิทธิ์</a> เช่นเดียวกับผลงาน
      </li>
      <li>ห้ามใช้สื่อของผู้อื่นโดยไม่ได้รับอนุญาต หรือเนื้อหาที่ผิดกฎหมาย / ละเมิดกฎชุมชน</li>
      <li>
        หากพบการละเมิด ดูช่องทางแจ้งที่{" "}
        <a href="/legal/copyright-report">แจ้งละเมิดลิขสิทธิ์</a>
      </li>
    </ul>

    <h2>5. ความเป็นส่วนตัว (PDPA)</h2>
    <p>
      การสร้างและเผยแพร่แพ็กเกจเกี่ยวข้องกับการประมวลผลข้อมูลตาม{" "}
      <a href="/legal/privacy">นโยบายความเป็นส่วนตัว (PDPA)</a> ดังนี้:
    </p>
    <ul>
      <li>
        <strong>ข้อมูลที่แสดงสาธารณะ:</strong> ชื่อบริการ รายละเอียด ราคา ระยะเวลา สิ่งที่ส่งมอบ สื่อประกอบ
        และโปรไฟล์ครีเอเตอร์ที่เชื่อมกับแพ็กเกจ
      </li>
      <li>
        <strong>ข้อมูลการใช้งาน:</strong> การเปิดดูแพ็กเกจ การกดขอใช้บริการ / เริ่มคุยงาน
        อาจถูกบันทึกเพื่อสถิติครีเอเตอร์ ความปลอดภัย และการปรับปรุงบริการ
      </li>
      <li>
        <strong>ฐานทางกฎหมาย:</strong> สัญญา/การให้บริการตามที่คุณร้องขอ และประโยชน์โดยชอบด้วยกฎหมายของแพลตฟอร์ม
        ในการดูแลชุมชนและป้องกันการละเมิด
      </li>
      <li>
        สิทธิของเจ้าของข้อมูล — ดู{" "}
        <a href="/legal/rights">สิทธิเจ้าของข้อมูล</a> หรือติดต่อ DPO ที่{" "}
        <a href={`mailto:${LEGAL_DPO_EMAIL}`}>{LEGAL_DPO_EMAIL}</a>
      </li>
    </ul>

    <h2>6. พฤติกรรมที่ห้ามเกี่ยวกับแพ็กเกจ</h2>
    <ul>
      <li>ระบุราคาหรือขอบเขตงานหลอกลวง / โฆษณาเกินจริงโดยเจตนา</li>
      <li>ใช้แพ็กเกจเพื่อฟิชชิ่ง สแปม หรือเก็บข้อมูลส่วนบุคคลของผู้อื่นโดยไม่ชอบ</li>
      <li>โพสต์เนื้อหาที่ผิดกฎหมาย ลามกอนาจาร หมิ่นประมาท หรือละเมิดสิทธิบุคคลที่สาม</li>
      <li>ปลอมแปลงตัวตนหรือแอบอ้างบริการของผู้อื่น</li>
    </ul>
    <p>
      การฝ่าฝืนอาจถูกดำเนินการตาม <a href="/legal/community">กฎชุมชน</a> และ{" "}
      <a href="/legal/terms">ข้อกำหนดการใช้งาน</a>
    </p>

    <h2>7. การแก้ไข ถอน และข้อจำกัดของแพลตฟอร์ม</h2>
    <ul>
      <li>คุณสามารถบันทึกร่าง แก้ไข หรือถอนการเผยแพร่แพ็กเกจของตนเองได้ตามสิทธิในระบบ</li>
      <li>
        {LEGAL_APP_NAME} อาจซ่อน ถอด หรือจำกัดแพ็กเกจที่ละเมิดนโยบาย โดยไม่ต้องแจ้งล่วงหน้าในกรณีเร่งด่วน
        เพื่อความปลอดภัยของชุมชน
      </li>
      <li>แพลตฟอร์มไม่รับประกันจำนวนผู้ชม การจ้างงาน หรือรายได้จากแพ็กเกจ</li>
    </ul>

    <h2>8. การเปลี่ยนแปลงนโยบาย</h2>
    <p>
      เราอาจปรับปรุงนโยบายนี้เป็นครั้งคราว โดยแสดงวันที่อัปเดตด้านบน
      การใช้ฟีเจอร์แพ็กเกจต่อหลังมีการเปลี่ยนแปลงถือว่าคุณรับทราบฉบับใหม่
    </p>
    <p>
      คำถามทั่วไป: <a href={`mailto:${LEGAL_SUPPORT_EMAIL}`}>{LEGAL_SUPPORT_EMAIL}</a>
      {" · "}
      เรื่องข้อมูลส่วนบุคคล: <a href={`mailto:${LEGAL_DPO_EMAIL}`}>{LEGAL_DPO_EMAIL}</a>
    </p>
  </LegalLayout>
);

export default PackagesPolicyPage;
