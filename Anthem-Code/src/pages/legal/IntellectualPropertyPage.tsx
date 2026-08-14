import LegalLayout from "@/components/LegalLayout";
import {
  ATTESTATION_ANCHOR_ID,
  ATTESTATION_BULLETS,
  ATTESTATION_LEGAL_NOTE,
  ATTESTATION_TITLE,
} from "@/lib/legalAttestation";
import { LICENSE_LIST } from "@/lib/licenses";
import { LEGAL_APP_NAME, LEGAL_ATTESTATION_VERSION, LEGAL_SUPPORT_EMAIL } from "@/lib/legalConfig";

const IntellectualPropertyPage = () => (
  <LegalLayout title="ลิขสิทธิ์และการใช้งานผลงาน">
    <p>
      หน้านี้อธิบายเรื่องลิขสิทธิ์สำหรับครีเอเตอร์และผู้ชมบน <strong>{LEGAL_APP_NAME}</strong>
      เราเขียนให้เข้าใจง่าย แต่เนื้อหานี้มีความสำคัญทางกฎหมาย — ไม่ใช่คำปรึกษาทางกฎหมาย
      หากมีข้อพิพาทร้ายแรงควรปรึกษาทนายความ
    </p>

    <h2>1. ทำไมลิขสิทธิ์สำคัญ</h2>
    <p>
      ผลงานสร้างสรรค์ทุกชิ้น — ภาพ กราฟิก วิดีโอ UI เพลง — มีคุณค่าและใช้เวลา ความตั้งใจของครีเอเตอร์
      กฎหมายคุ้มครองผู้สร้างโดยอัตโนมัติ
    </p>
    <p>
      <strong>การนำผลงานของผู้อื่นมาแสดงโดยไม่ได้รับอนุญาต ถือเป็นการละเมิดลิขสิทธิ์</strong>
      และเทียบเท่าการนำทรัพย์สินของผู้อื่นมาใช้โดยไม่ชอบ — ไม่ต่างจากการขโมย
      เราจริงจังเรื่องนี้เพื่อปกป้องชุมชนครีเอเตอร์ทุกคน
    </p>

    <h2>2. กฎหมายที่เกี่ยวข้อง</h2>
    <p>
      ในประเทศไทย ลิขสิทธิ์ได้รับความคุ้มครองตาม<strong>พระราชบัญญัติลิขสิทธิ์ พ.ศ. 2537</strong>
      งานสร้างสรรค์ที่อยู่ในเกณฑ์ (เช่น ภาพถ่าย ภาพวาด กราฟิก วิดีโอ ดนตรี ซอฟต์แวร์) ได้รับความคุ้มครองทันทีเมื่อสร้างเสร็จ
      โดยไม่จำเป็นต้องลงทะเบียนก่อน — แต่ต้องเป็นผู้สร้างจริง หรือได้รับอนุญาตจากเจ้าของ
    </p>

    <h2>3. ลิขสิทธิ์คืออะไร?</h2>
    <p>
      ลิขสิทธิ์คือสิทธิของเจ้าของงานสร้างสรรค์ในการควบคุมการทำซ้ำ ดัดแปลง เผยแพร่ และอนุญาตให้ผู้อื่นใช้
      บน {LEGAL_APP_NAME} คุณเลือกได้ว่าผู้ชมจะนำงานไปใช้ต่อได้แค่ไหน ผ่าน &quot;สิทธิ์การใช้งาน&quot;
    </p>

    <h2 id={ATTESTATION_ANCHOR_ID}>4. {ATTESTATION_TITLE}</h2>
    <p>
      ก่อนกด <strong>เผยแพร่</strong> คุณต้องติ๊กยืนยันคำแถลงด้านล่าง
      ระบบจะบันทึกเวลาที่คุณยืนยัน (รุ่นข้อความ: {LEGAL_ATTESTATION_VERSION}) เป็นหลักฐาน
    </p>
    <div className="not-prose rounded-xl border-2 border-primary/30 bg-primary/5 p-4 space-y-2 my-4">
      <p className="font-semibold text-foreground">{ATTESTATION_TITLE}</p>
      <p className="text-base text-foreground">ข้าพเจ้ายืนยันว่า ผลงานและเนื้อหาทั้งหมดในชิ้นงานนี้:</p>
      <ul className="text-base text-foreground list-disc pl-5 space-y-1">
        {ATTESTATION_BULLETS.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
      <p className="text-sm text-muted-foreground">{ATTESTATION_LEGAL_NOTE}</p>
      <p className="text-xs text-muted-foreground">
        ข้าพเจ้ายอมรับ{" "}
        <a href="/legal/terms" className="text-primary hover:underline">ข้อกำหนดการใช้งาน</a>
        {" "}และนโยบายลิขสิทธิ์ฉบับนี้
      </p>
    </div>
    <h3>ผลหากให้คำแถลงเท็จ</h3>
    <ul>
      <li>เราอาจลบหรือจำกัดการเข้าถึงผลงานทันที</li>
      <li>บัญชีอาจถูกระงับหรือยกเลิก (โดยเฉพาะผู้ละเมิดซ้ำ)</li>
      <li>คุณอาจถูกเรียกร้องค่าเสียหายจากเจ้าของลิขสิทธิ์ และต้องชดใช้ให้แพลตฟอร์มตาม <a href="/legal/terms">ข้อกำหนดการใช้งาน</a></li>
    </ul>

    <h2>5. ตอนลงผลงานต้องทำอะไร?</h2>
    <ul>
      <li>เลือก <strong>สิทธิ์การใช้งาน</strong> ว่าคนอื่นเอาไปใช้ได้แค่ไหน</li>
      <li>ติ๊ก<strong>คำแถลงการยืนยันสิทธิ์</strong> ก่อนกดเผยแพร่ — ไม่ติ๊กจะเผยแพร่ไม่ได้</li>
      <li>ถ้าเป็นงานลูกค้าหรืองานบริษัท คำแถลงนี้รวมว่าคุณได้รับอนุญาตให้โชว์แล้ว และไม่ได้เปิดเผยข้อมูลลับ</li>
    </ul>

    <h2>5.1 แพ็กเกจบริการ</h2>
    <p>
      สื่อและข้อความในแพ็กเกจอยู่ภายใต้นโยบายลิขสิทธิ์ฉบับนี้เช่นกัน
      ก่อนเผยแพร่แพ็กเกจ คุณต้องติ๊กคำแถลงตาม{" "}
      <a href="/legal/packages#attestation">นโยบายแพ็กเกจบริการ</a>
    </p>

    <h2>6. ความหมายแต่ละแบบสิทธิ์</h2>
    <div className="not-prose space-y-3 my-4">
      {LICENSE_LIST.map((preset) => {
        const Icon = preset.icon;
        return (
          <div key={preset.id} className="rounded-xl border border-border/60 p-4 space-y-1">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <Icon className="w-4 h-4 text-primary" />
              {preset.shortLabel}
            </div>
            <p className="text-sm text-muted-foreground">{preset.description}</p>
            {preset.id !== "custom" ? (
              <p className="text-xs text-muted-foreground">{preset.detailParagraph}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                คุณพิมพ์เงื่อนไขเองได้สูงสุด 500 ตัวอักษร — เหมาะกับงานที่มีข้อตกลงเฉพาะ
              </p>
            )}
          </div>
        );
      })}
    </div>

    <h2>7. ถ้าใช้ asset จากคนอื่น</h2>
    <ul>
      <li>ฟอนต์ — ตรวจสอบ license (เช่น Google Fonts, Adobe Fonts)</li>
      <li>ภาพ/วิดีโอ stock — ต้องมีสิทธิ์ตามที่ซื้อหรือดาวน์โหลด</li>
      <li>
        ภาพที่สร้างจาก AI — เปิดเผยระดับการใช้ตามข้อ 7.1
        และอย่าใช้โมเดลหรือสไตล์ที่ละเมิดสิทธิ์ผู้อื่น
      </li>
      <li>
        งานลูกค้า / งานบริษัท / งานเอเจนซี่ — ต้องได้รับอนุญาตให้เผยแพร่ก่อนลงพอร์ต
        และห้ามเปิดเผยข้อมูลลับหรือเนื้อหาที่สัญญาห้ามโชว์
        การติ๊กคำแถลงตอนเผยแพร่ถือว่าคุณรับรองข้อนี้แล้ว
      </li>
    </ul>

    <h2>7.1 ผลงานที่ใช้ AI</h2>
    <p>
      {LEGAL_APP_NAME} อนุญาตให้ลงผลงานที่ใช้ AI ได้
      แต่ต้องเปิดเผย — คนดูและคนจ้างต้องรู้ว่างานมือแค่ไหน
    </p>
    <p>
      ถ้าใช้ AI แม้แค่ขึ้นต้นแบบหรือแต่งภาพ ให้เปิดสวิตช์ตอนลงผลงาน แล้วเลือก 1 ใน 3 ระดับให้ตรงงาน
    </p>
    <ul>
      <li><strong>ช่วยทำ</strong> — ขึ้นต้นแบบ แต่งภาพ upscale ลบพื้นหลัง moodboard</li>
      <li><strong>ส่วนหนึ่ง</strong> — AI สร้างบางส่วน แล้วคนแต่ง ประกอบ หรือวาดทับ</li>
      <li><strong>AI 100%</strong> — สร้างจาก AI ทั้งชิ้น เกือบไม่ได้แตะมือ</li>
    </ul>
    <p>
      ไม่เปิดสวิตช์ = คุณยืนยันว่าไม่ได้ใช้ AI เลย
      ปกปิดหรือเลือกระดับต่ำกว่าความเป็นจริงถือว่าผิด
      {" "}
      <a href="/legal/community#ai">กฎชุมชน</a>
    </p>

    <h2>8. ความรับผิดชอบ: ครีเอเตอร์ vs แพลตฟอร์ม</h2>
    <ul>
      <li><strong>ครีเอเตอร์</strong> — รับผิดชอบเนื้อหา ความถูกต้องของคำแถลง และการละเมิดลิขสิทธิ์</li>
      <li><strong>{LEGAL_APP_NAME}</strong> — เป็นช่องทางแสดงผล ไม่ตรวจสอบทุกชิ้นก่อนเผยแพร่ แต่ดำเนินการเมื่อได้รับแจ้ง</li>
    </ul>

    <h2>9. ถ้าเจอการละเมิดลิขสิทธิ์</h2>
    <ul>
      <li>กดปุ่ม <strong>รายงาน</strong> บนผลงาน แล้วเลือกเหตุผล &quot;ละเมิดลิขสิทธิ์&quot;</li>
      <li>แนบหลักฐานถ้ามี (ลิงก์ต้นฉบับ, ใบอนุญาต ฯลฯ)</li>
      <li>อีเมลทีมงาน: <a href={`mailto:${LEGAL_SUPPORT_EMAIL}`}>{LEGAL_SUPPORT_EMAIL}</a></li>
    </ul>
    <p>
      เราจะพิจารณาภายใน <strong>7–14 วันทำการ</strong> และแจ้งผลให้ทราบ
      เนื้อหาที่ละเมิดชัดเจนอาจถูกลบก่อนครบกำหนด
    </p>

    <h2>10. ข้อจำกัดความรับผิดชอบ</h2>
    <p>
      {LEGAL_APP_NAME} เป็นช่องทางแสดงผลและเชื่อมต่อครีเอเตอร์กับผู้ชม
      เราไม่ได้ตรวจสอบลิขสิทธิ์ทุกผลงานโดยอัตโนมัติ — ครีเอเตอร์รับผิดชอบข้อมูลที่ระบุ
      ฟีเจอร์ร่างสัญญา AI เป็นเครื่องมือช่วยร่างเท่านั้น ไม่ใช่คำปรึกษาทางกฎหมาย
    </p>

    <p className="text-sm text-muted-foreground">
      ดูเพิ่มใน <a href="/legal/terms">ข้อกำหนดการใช้งาน</a> — หมวดการรับรอง การชดใช้ค่าเสียหาย และการแจ้งลบเนื้อหา
    </p>
  </LegalLayout>
);

export default IntellectualPropertyPage;
