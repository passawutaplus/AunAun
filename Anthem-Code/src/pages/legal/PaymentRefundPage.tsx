import LegalLayout from "@/components/LegalLayout";
import { HireMoneyOutcomePanel } from "@/components/payments/HireMoneyOutcomePanel";
import {
  LEGAL_APP_NAME,
  LEGAL_COMPANY_ADDRESS,
  LEGAL_COMPANY_NAME,
  LEGAL_COMPANY_TAX_ID,
  LEGAL_SUPPORT_EMAIL,
  LEGAL_VAT_REGISTERED,
} from "@/lib/legalConfig";
import {
  computeHireMoneyOutcome,
  HIRE_MONEY_DEMO_SCENARIOS,
  HIRE_MONEY_FAQ,
} from "@/lib/payments/hireMoneyOutcome";

const MONEY_TIMELINE = [
  {
    step: "1",
    when: "จ้างและชำระสำเร็จ",
    money: "เงินเข้า Pending (พักไว้)",
    refund: "ยังไม่โอนให้ครีเอเตอร์",
  },
  {
    step: "2",
    when: "ก่อนเริ่มงาน · ≤ 7 วันหลังชำระ",
    money: "ยัง Pending",
    refund: "คืนยอดงานได้หลังคำขอยกเลิกสำเร็จ — ไม่คิดค่าดำเนินการยกเลิกล่าช้า",
  },
  {
    step: "3",
    when: "ก่อนเริ่มงาน · หลัง 7 วัน",
    money: "ยัง Pending",
    refund: "ไม่คืนอัตโนมัติ — ทีม/กระบวนการพิจารณา · อาจหักค่าดำเนินการตามต้นทุนคืนเงิน",
  },
  {
    step: "4",
    when: "ระหว่างทำงาน / มีความคืบหน้า",
    money: "ยัง Pending",
    refund: "คืนบางส่วนหรือเต็ม ตามตกลง / หลังแพลตฟอร์มช่วยประสาน",
  },
  {
    step: "5",
    when: "ส่งมอบแล้ว รออนุมัติ",
    money: "ยัง hold — เปิดข้อพิพาทได้ก่อนอนุมัติ",
    refund: "ชะลอการโอนจนกว่าจะเคลียร์ข้อพิพาท",
  },
  {
    step: "6",
    when: "อนุมัติงาน / auto-approve → ถอนเงิน",
    money: "Available → Payout (ขั้นต่ำ 1,000 บาท + KYC)",
    refund: "คืนยากขึ้น — เฉพาะข้อพิพาทหรือคำสั่งที่เกี่ยวข้อง",
  },
] as const;

const CANCEL_REASON_ROWS = [
  {
    reason: "ผู้จ้างเปลี่ยนใจ / งบหรือแผนเปลี่ยน",
    within7: "คืนยอดงานหลังคำขอยกเลิกสำเร็จ · ไม่คิดค่าดำเนินการล่าช้า",
    after7: "ทีมพิจารณา · มักคืนหักค่าดำเนินการตามต้นทุนคืนเงิน (แสดงก่อนยืนยัน)",
    afterStart: "คืนบางส่วนตามความคืบหน้า / ตามตกลง",
  },
  {
    reason: "ครีเอเตอร์ไม่ตอบ / ไม่รับงานตามที่ตกลง",
    within7: "คืนยอดงาน (คุ้มครองผู้จ้าง)",
    after7: "คืนยอดงาน — แพลตฟอร์มรับภาระต้นทุนคืนเงินในเคสนี้",
    afterStart: "คืนเต็มหรือเกือบเต็มตามข้อเท็จจริง",
  },
  {
    reason: "ครีเอเตอร์ขอยกเลิก / ถอนตัว",
    within7: "คืนยอดงานให้ผู้จ้าง",
    after7: "คืนยอดงานให้ผู้จ้าง",
    afterStart: "คืนตามความคืบหน้า + เงื่อนไขที่เสนอในระบบ",
  },
  {
    reason: "งานไม่ตรงโจทย์ / ข้อพิพาทคุณภาพ",
    within7: "เจรจาหรือขอแก้ไขก่อน · ถ้าเลิกได้คืนตามตกลง",
    after7: "ทีมช่วยประสาน · สัดส่วนคืนตามหลักฐานและความคืบหน้า",
    afterStart: "ต้องพยายามแก้/แก้ไขงานก่อน · ไม่คืนเต็มอัตโนมัติ",
  },
  {
    reason: "สองฝ่ายตกลงกันเองในแชท",
    within7: "ตามเงื่อนไขเงินที่บันทึกในคำขอยกเลิก",
    after7: "ตามเงื่อนไขที่ตกลง · ทีมช่วยดำเนินการคืนถ้าจำเป็น",
    afterStart: "ตามเงื่อนไขที่ตกลง",
  },
] as const;

const PaymentRefundPage = () => (
  <LegalLayout title="นโยบายการชำระเงินและการคืนเงิน" updatedAt="27 กรกฎาคม 2569">
    <p>
      นโยบายฉบับนี้อธิบายการชำระเงินค่าจ้างงานผ่าน <strong>{LEGAL_APP_NAME}</strong> โดย {LEGAL_COMPANY_NAME}
      {" "}ในฐานะ<strong>ตัวกลางรับชำระเงิน / ตัวแทนเก็บเงิน</strong> ระหว่างผู้จ้าง (ลูกค้า) กับฟรีแลนซ์ / ครีเอเตอร์ (ผู้รับจ้าง)
      นโยบายนี้ใช้ร่วมกับ <a href="/legal/terms">ข้อกำหนดการใช้งาน</a>,{" "}
      <a href="/legal/service-agreement">ข้อตกลงการให้บริการ/การจ้างงาน</a> และ{" "}
      <a href="/legal/privacy">นโยบายความเป็นส่วนตัว</a>
    </p>
    <p className="text-sm text-muted-foreground">
      นโยบายนี้ครอบคลุม<strong>การชำระค่าจ้าง THB</strong> เท่านั้น — ไม่รวม PX/ของขวัญ หรือ subscription ผ่าน So1o Freelancer
    </p>

    <div className="not-prose my-6 rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
      <p className="text-sm font-medium text-foreground">สรุปสั้นๆ — คืนอัตโนมัติเมื่อไหร่?</p>
      <ol className="list-decimal pl-5 space-y-1.5 text-sm text-foreground/90">
        <li>
          เงินค่าจ้างถูก<strong>พักไว้ก่อน</strong> ไม่โอนให้ครีเอเตอร์จนกว่าจะอนุมัติงาน
        </li>
        <li>
          <strong>ไม่คืนเงินทันทีแค่กดยกเลิก</strong> — ต้องส่งคำขอยกเลิกในแอป และผ่านขั้นตอนด้านล่าง
        </li>
        <li>
          <strong>ภายในวันเดียวกับที่ชำระ</strong> (ช่วงที่ผู้ให้บริการชำระเงินรองรับการยกเลิกรายการ):
          เร่งคืนได้เร็วที่สุด · มักไม่มีค่าดำเนินการคืนเงินเพิ่ม
        </li>
        <li>
          <strong>ภายใน 7 วันหลังชำระ · ยังไม่เริ่มงาน:</strong> คืน<strong>ยอดงาน</strong>ได้หลังคำขอยกเลิกสำเร็จ
          (อีกฝ่ายยืนยัน หรือครบเวลารอตามที่แอปกำหนด) — <strong>ไม่คิดค่าดำเนินการยกเลิกล่าช้า</strong>
        </li>
        <li>
          <strong>หลัง 7 วัน</strong> หรือ<strong>เริ่มงานแล้ว</strong>: <strong>ไม่คืนอัตโนมัติ</strong> —
          พิจารณาเป็นรายเคส (อีกฝ่าย / ทีม) และอาจหักค่าดำเนินการตามต้นทุนคืนเงิน
        </li>
        <li>
          หลังอนุมัติคืน: โดยทั่วไปเข้าบัญชี/ช่องทางเดิมใน <strong>7–14 วันทำการ</strong>
          (บัตรอาจ <strong>14–30 วันทำการ</strong>)
        </li>
      </ol>
    </div>

    <h2 id="timeline">ไทม์ไลน์เงินและการคืนเงิน</h2>
    <p className="text-sm text-muted-foreground -mt-2">
      อ่านทีละขั้นจากบนลงล่าง — รายละเอียดการยกเลิกอยู่ในหมวด 5–6
    </p>
    <div className="not-prose overflow-x-auto rounded-xl border border-border/60 my-4">
      <table className="w-full text-sm text-left">
        <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium w-10">ขั้น</th>
            <th className="px-3 py-2 font-medium">สถานการณ์</th>
            <th className="px-3 py-2 font-medium">เงินทำอะไร</th>
            <th className="px-3 py-2 font-medium">คืนเงินได้ไหม</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {MONEY_TIMELINE.map((row) => (
            <tr key={row.step} className="align-top">
              <td className="px-3 py-2.5 font-medium text-primary">{row.step}</td>
              <td className="px-3 py-2.5 font-medium text-foreground">{row.when}</td>
              <td className="px-3 py-2.5 text-muted-foreground">{row.money}</td>
              <td className="px-3 py-2.5 text-muted-foreground">{row.refund}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <h2 id="cancel">5. การเปลี่ยนแปลงสถานะและการยกเลิกออเดอร์</h2>
    <p>
      เมื่อมีการเปิดออเดอร์และชำระเงินแล้ว ในช่วงที่ครีเอเตอร์<strong>ยังไม่ส่งมอบงานจนได้รับการอนุมัติ</strong>
      ผู้ใช้งานสามารถขอยกเลิกหรือเปลี่ยนสถานะออเดอร์ผ่านช่องทางในแอปได้
    </p>
    <ul>
      <li>
        การกดขอยกเลิก<strong>ไม่ถือว่ายกเลิกเสร็จทันที</strong> และ<strong>ไม่ใช่การคืนเงินอัตโนมัติทุกกรณี</strong>
      </li>
      <li>
        โดยปกติอีกฝ่ายจะได้ยืนยัน ปฏิเสธ หรือเสนอเงื่อนไขเงินในระบบ
        (รวมถึงความคืบหน้างานและเงื่อนไขคืนเงินที่ระบุในคำขอ)
        · หากครบเวลารอตามที่แอปกำหนดโดยไม่มีการตอบ ระบบอาจดำเนินการตามเงื่อนไขล่าสุดของคำขอ
      </li>
      <li>
        ในกรณีที่ทั้งสองฝ่ายตกลงไม่ได้ หลังเลยกำหนด หรือมีเหตุพิเศษ{" "}
        {LEGAL_COMPANY_NAME} มีสิทธิใช้ดุลพินิจเข้าช่วยพิจารณา
        รวมถึงอนุมัติ/ปฏิเสธการคืนเงิน และกำหนดสัดส่วนคืนตามความเหมาะสม
      </li>
      <li>
        ปัจจัยที่อาจใช้ประกอบการพิจารณา ได้แก่ ความคืบหน้าของงาน ระยะเวลาหลังชำระ
        เหตุผลและหลักฐาน การละเมิดข้อตกลง พฤติการณ์ไม่เหมาะสม และความเสียหายที่เกิดขึ้น
      </li>
    </ul>

    <h3 id="auto-vs-review">5.1 เมื่อไหร่คืนได้เร็ว / เมื่อไหร่ต้องรอพิจารณา</h3>
    <div className="not-prose overflow-x-auto rounded-xl border border-border/60 my-4">
      <table className="w-full text-sm text-left">
        <thead className="bg-muted/40 text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">จังหวะ</th>
            <th className="px-3 py-2 font-medium">แนวทางคืนเงิน</th>
            <th className="px-3 py-2 font-medium">ค่าดำเนินการยกเลิกล่าช้า</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          <tr className="align-top">
            <td className="px-3 py-2.5 font-medium">ภายในวันเดียวกับที่ชำระ (ช่วงที่ผู้ให้บริการรองรับ)</td>
            <td className="px-3 py-2.5 text-muted-foreground">
              เร่งคืนได้เร็วที่สุดหลังคำขอยกเลิกสำเร็จ — มักยกเลิกรายการชำระเดิมได้
            </td>
            <td className="px-3 py-2.5 text-muted-foreground">ไม่คิด</td>
          </tr>
          <tr className="align-top">
            <td className="px-3 py-2.5 font-medium">≤ 7 วันหลังชำระ · ยังไม่เริ่มงาน</td>
            <td className="px-3 py-2.5 text-muted-foreground">
              คืน<strong className="text-foreground">ยอดงาน</strong>หลังคำขอยกเลิกสำเร็จ
              (ยืนยันโดยอีกฝ่ายหรือตามเงื่อนไขเวลารอในแอป) — <strong className="text-foreground">ไม่ใช่กดแล้วเงินเข้าทันทีโดยไม่มีขั้นตอน</strong>
            </td>
            <td className="px-3 py-2.5 text-muted-foreground">ไม่คิด</td>
          </tr>
          <tr className="align-top">
            <td className="px-3 py-2.5 font-medium">หลัง 7 วัน · ยังไม่เริ่มงาน · ผู้จ้างเปลี่ยนใจ</td>
            <td className="px-3 py-2.5 text-muted-foreground">
              <strong className="text-foreground">รอพิจารณา</strong> — อาจคืนเต็มหรือคืนหักค่าดำเนินการ
              · จำนวนที่หัก (ถ้ามี) จะแสดงก่อนยืนยันเมื่อทำได้
            </td>
            <td className="px-3 py-2.5 text-muted-foreground">อาจมี ตามต้นทุนคืนเงินจริง</td>
          </tr>
          <tr className="align-top">
            <td className="px-3 py-2.5 font-medium">เริ่มงานแล้ว / ส่งมอบบางส่วน</td>
            <td className="px-3 py-2.5 text-muted-foreground">
              ไม่คืนเต็มอัตโนมัติ — ตามความคืบหน้า เงื่อนไขในคำขอ และการพิจารณา
            </td>
            <td className="px-3 py-2.5 text-muted-foreground">อาจมี ถ้าเข้าเงื่อนไขรายการอายุเกิน 7 วัน</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p className="text-sm text-muted-foreground">
      หมายเหตุ: “คืนยอดงาน” หมายถึงเงินค่าจ้างที่พักไว้ — ค่าธรรมเนียมระบบรับชำระเงินบางส่วนอาจคืนไม่ได้ตามเงื่อนไขผู้ให้บริการ
      และค่าธรรมเนียมแพลตฟอร์ม (ถ้าเรียกเก็บแล้ว) โดยทั่วไปไม่คืน เว้นแต่เราเห็นสมควรเป็นอย่างอื่น
    </p>

    <h3 id="reason-table">5.2 ตารางเหตุผล → แนวคืนเงิน</h3>
    <div className="not-prose overflow-x-auto rounded-xl border border-border/60 my-4">
      <table className="w-full text-sm text-left min-w-[40rem]">
        <thead className="bg-muted/40 text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">เหตุผลหลัก</th>
            <th className="px-3 py-2 font-medium">≤ 7 วัน · ก่อนเริ่ม</th>
            <th className="px-3 py-2 font-medium">หลัง 7 วัน · ก่อนเริ่ม</th>
            <th className="px-3 py-2 font-medium">หลังเริ่มงาน</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {CANCEL_REASON_ROWS.map((row) => (
            <tr key={row.reason} className="align-top">
              <td className="px-3 py-2.5 font-medium text-foreground">{row.reason}</td>
              <td className="px-3 py-2.5 text-muted-foreground">{row.within7}</td>
              <td className="px-3 py-2.5 text-muted-foreground">{row.after7}</td>
              <td className="px-3 py-2.5 text-muted-foreground">{row.afterStart}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <h3>5.3 หลังอนุมัติคืนเงิน</h3>
    <ul>
      <li>โดยทั่วไป <strong>7–14 วันทำการ</strong> เข้าช่องทางเดิมหรือตามที่แจ้ง</li>
      <li>ชำระด้วยบัตรเครดิต/เดบิต: อาจ <strong>14–30 วันทำการ</strong> หรือตามธนาคารผู้ออกบัตร</li>
      <li>
        {LEGAL_COMPANY_NAME} ขอสงวนสิทธิ์ในการไม่คืนค่าธรรมเนียมการชำระเงิน และ/หรือ ค่าธรรมเนียมใช้บริการแพลตฟอร์ม
        เว้นแต่จะเห็นสมควรเป็นอย่างอื่น
      </li>
    </ul>

    <h2 id="cancel-limits">6. ข้อจำกัดการยกเลิกออเดอร์และการคืนเงิน</h2>
    <p>
      ในกรณีดังต่อไปนี้ ผู้ใช้งานอาจถูกจำกัดสิทธิในการยกเลิกและ/หรือการคืนเงิน
      รวมถึงอาจถูกระงับการใช้งานชั่วคราวตาม<a href="/legal/terms">ข้อกำหนดการใช้งาน</a>
    </p>
    <ul>
      <li>ครีเอเตอร์ส่งมอบงานตามขอบเขตและเงื่อนไขที่ตกลง / ใบเสนอราคาแล้ว และผู้จ้างอนุมัติหรือปล่อยให้อนุมัติอัตโนมัติ</li>
      <li>
        ผู้จ้างขอยกเลิกฝ่ายเดียวโดยไม่มีเหตุอันสมควรหลังงานคืบหน้าแล้ว
        หรือมีพฤติการณ์หลีกเลี่ยงค่าธรรมเนียม / จ้างนอกระบบ
      </li>
      <li>ข้อมูลเท็จ การฉ้อโกง หรือแสวงหาประโยชน์โดยมิชอบ</li>
      <li>
        ผู้จ้างไประงับการชำระหรือขอคืนเงินโดยตรงจากธนาคาร/ผู้ให้บริการชำระเงิน (chargeback)
        นอกเหนือจากกระบวนการของ {LEGAL_APP_NAME}
      </li>
      <li>มีเหตุอันควรเชื่อว่าการยกเลิกมีเจตนาทำให้อีกฝ่ายเสียหาย หรือหลีกเลี่ยงภาระตามข้อตกลง</li>
    </ul>

    <h2 id="scenarios">ตัวอย่างสถานการณ์ (จำลองตัวเลข)</h2>
    <p className="text-sm text-muted-foreground -mt-2">
      คำนวณด้วยสูตรเดียวกับแอดมินการเงิน — ค่าธรรมเนียมผู้ให้บริการชำระเงินเป็นประมาณการ
      (เช่น PromptPay ~1.35% ขั้นต่ำ 5 บาท + VAT · บัตร ~3%+VAT) · ยกเลิกหลัง 7 วันอาจมีค่าเพิ่มตามต้นทุนคืนเงิน
    </p>
    <div className="not-prose my-4 space-y-4">
      {HIRE_MONEY_DEMO_SCENARIOS.map((s) => {
        const outcome = computeHireMoneyOutcome(s.input);
        return (
          <div key={s.id} id={s.id} className="space-y-2 scroll-mt-24">
            <div>
              <p className="text-sm font-medium text-foreground">{s.title}</p>
              <p className="text-xs text-muted-foreground">{s.summary}</p>
            </div>
            <HireMoneyOutcomePanel variant="legal" outcome={outcome} />
          </div>
        );
      })}
    </div>

    <h2 id="faq">คำถามที่พบบ่อย</h2>
    <div className="not-prose my-4 space-y-2">
      {HIRE_MONEY_FAQ.map((item) => (
        <details
          key={item.q}
          className="rounded-xl border border-border/60 bg-background/40 px-4 py-3 group"
        >
          <summary className="cursor-pointer text-sm font-medium text-foreground list-none flex items-center justify-between gap-2">
            <span>{item.q}</span>
            <span className="text-muted-foreground text-xs group-open:hidden">เปิด</span>
            <span className="text-muted-foreground text-xs hidden group-open:inline">ปิด</span>
          </summary>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{item.a}</p>
          {item.scenarioId ? (
            <p className="mt-1.5 text-xs">
              <a href={`#${item.scenarioId}`} className="text-primary hover:underline">
                ดูตัวอย่างสถานการณ์ที่เกี่ยวข้อง
              </a>
            </p>
          ) : null}
        </details>
      ))}
    </div>

    <h2>1. บทบาทของแพลตฟอร์ม</h2>
    <ul>
      <li>
        {LEGAL_COMPANY_NAME} รับชำระเงินค่าจ้างแทนครีเอเตอร์ผ่านผู้ให้บริการชำระเงินภายนอก{" "}
        <strong>Payso</strong> (บริษัท เพย์ โซลูชั่น จำกัด) และบันทึกในบัญชีภายใน (ledger)
      </li>
      <li>
        เงินค่าจ้างที่ผู้จ้างชำระ<strong>ไม่ใช่รายได้ของ {LEGAL_COMPANY_NAME}</strong>
        — เป็นทรัพย์สินของครีเอเตอร์ที่รอโอนตามเงื่อนไข
      </li>
      <li>
        รายได้ของแพลตฟอร์มมาจาก<strong>ค่าธรรมเนียมแพลตฟอร์ม (platform fee) เท่านั้น</strong>
        ไม่รวมเงินค่าจ้าง
      </li>
      <li>
        ในการไกล่เกลี่ยข้อพิพาท เราทำหน้าที่เป็นผู้ให้บริการแพลตฟอร์มและผู้ประสานงาน
        — <strong>ไม่ใช่คู่สัญญาจ้างงาน</strong>ระหว่างผู้จ้างกับครีเอเตอร์
      </li>
    </ul>

    <h2>2. วิธีชำระเงิน</h2>
    <p>ช่องทางที่เปิดใช้งานจริงจะแสดงตอนชำระ — ช่องทางหลักที่รองรับตามสัญญาผู้ให้บริการชำระเงิน:</p>
    <ul>
      <li>
        <strong>PromptPay QR</strong> — ผู้จ้างชำระราคางานตามที่แสดง (อาจรองรับมัดจำ/งวด)
        · ยอดต่อรายการตามเงื่อนไขผู้ให้บริการ (โดยทั่วไป 6–699,999 บาท)
      </li>
      <li>
        <strong>บัตรเครดิต/เดบิต</strong> — เช่น VISA, Mastercard, JCB, UnionPay (และช่องทางอื่นที่เปิดแล้ว)
        · เราไม่เก็บเลขบัตรเต็ม
      </li>
      <li>
        <strong>ช่องทางอื่น</strong> (ถ้าเปิดในแอป) เช่น Internet/Mobile Banking หรือ E-wallet —
        จะแสดงเฉพาะช่องทางที่พร้อมใช้ตอนชำระ
      </li>
      <li>สกุลเงินชำระจริงเป็น <strong>THB (สตางค์)</strong> แม้หน้าจอจะแสดงสกุลอื่นเพื่อความสะดวก (FX display)</li>
      <li>อัตราค่าธรรมเนียมและยอดชำระ snapshot ตอนสร้างคำสั่ง — ไม่เปลี่ยนย้อนหลัง</li>
    </ul>

    <h2>3. การเก็บรักษาเงิน (Escrow-like hold)</h2>
    <p>หลังชำระสำเร็จ เงินค่าจ้างจะอยู่ในสถานะดังนี้:</p>
    <ol>
      <li><strong>Pending</strong> — รอครีเอเตอร์ส่งมอบงาน</li>
      <li><strong>Available</strong> — หลังผู้จ้างอนุมัติงาน หรือครบเงื่อนไข auto-approve</li>
      <li><strong>Payout</strong> — ครีเอเตอร์ขอถอน/ระบบโอนอัตโนมัติตามนโยบาย</li>
    </ol>
    <p>
      เรา<strong>ไม่โอนเงินให้ครีเอเตอร์ทันที</strong>หลังชำระ — เพื่อคุ้มครองทั้งผู้จ้างและครีเอเตอร์
      ตาม<a href="/legal/service-agreement">ข้อตกลงการจ้างงาน</a>
    </p>

    <h2>4. ค่าธรรมเนียมและภาษี</h2>
    <ul>
      <li>
        <strong>ค่าธรรมเนียมแพลตฟอร์ม:</strong> 10% ของราคางาน (ก่อนหัก WHT) — เป็นค่าบริการของ {LEGAL_COMPANY_NAME}
        {LEGAL_VAT_REGISTERED ? " · ออกใบกำกับภาษี VAT 7% สำหรับค่าธรรมเนียม" : null}
        · โดยทั่วไปเรียกเก็บเมื่องานสำเร็จ
      </li>
      <li>
        <strong>ภาษีหัก ณ ที่จ่าย (WHT):</strong> ผู้จ้างนิติบุคคลอาจหัก <strong>3%</strong> จากค่าจ้างตามที่กฎหมายกำหนด
        — ลดยอดที่ผู้จ้างชำระและยอดที่ครีเอเตอร์ได้รับตามที่แสดงตอนยืนยัน
      </li>
      <li>
        <strong>ค่าธรรมเนียมโอน (payout fee):</strong> การถอนเงินครั้งที่ 2 ขึ้นไปในเดือนปฏิทิน อาจมีค่าธรรมเนียม 25 บาท
        (ครั้งแรกของเดือนฟรี ตามนโยบายปัจจุบัน)
      </li>
      <li>
        <strong>ค่าธรรมเนียมผู้ให้บริการชำระเงิน (Payso):</strong> PromptPay โดยทั่วไปแพลตฟอร์มรับภาระตามการตั้งค่าปัจจุบัน
        · ค่าธรรมเนียมบัตรหรือช่องทางอื่น (ถ้าผลักให้ผู้จ้าง) จะ<strong>แสดงก่อนยืนยันชำระ</strong>
        · เรทของผู้ให้บริการยังไม่รวม VAT 7% ตามใบเสนอราคา
      </li>
    </ul>

    <h2>7. ข้อพิพาท (Dispute)</h2>
    <ul>
      <li>ผู้จ้างสามารถเปิดข้อพิพาทก่อนอนุมัติงาน — เงินจะถูก hold ไว้จนกว่าจะแก้ไข</li>
      <li>แพลตฟอร์มอาจขอหลักฐานจากทั้งสองฝ่าย (แชท ไฟล์งาน ความคืบหน้า ฯลฯ)</li>
      <li>เราอาจเสนอทางแก้ (คืนบางส่วน / โอนให้ครีเอเตอร์ / ยกเลิก) แต่<strong>ไม่ใช่ผู้ตัดสินทางกฎหมาย</strong></li>
      <li>กรณีร้ายแรง (ทุจริต ละเมิดกฎหมาย) เราอาจระงับบัญชีและแจ้งหน่วยงานที่เกี่ยวข้อง</li>
    </ul>

    <h2>8. การถอนเงิน (Payout)</h2>
    <ul>
      <li>ขั้นต่ำถอน: <strong>1,000 บาท</strong> (100,000 satang)</li>
      <li>
        ต้องยืนยันตัวตน (KYC) และบัญชีธนาคารที่ตรงกับชื่อบัญชี รวมถึงการเปิดเผยสถานะ PEP
        และการรับรองเรื่องบัญชีคว่ำบาตร — ดู{" "}
        <a href="/legal/kyc-aml">KYC / PEP / Sanctions</a>
      </li>
      <li>
        โอนเข้าบัญชีธนาคารในประเทศไทย — ระยะเวลาขึ้นกับการอนุมัติถอนและรอบโอนจากผู้ให้บริการชำระเงินมายังแพลตฟอร์ม
        (โดยทั่วไปเป็นรอบรายสัปดาห์) จากนั้นโอนต่อให้ผู้รับจ้างภายในไม่กี่วันทำการ
      </li>
      <li>ระบบอาจโอนอัตโนมัติรายสัปดาห์เมื่อยอดถึงขั้นต่ำ หรือ sweep ปลายเดือน (ตามการตั้งค่า)</li>
    </ul>

    <h2>9. ใบเสร็จและเอกสารภาษี</h2>
    <ul>
      <li>
        {LEGAL_COMPANY_NAME} ออก<strong>ใบเสร็จ/ใบกำกับภาษีค่าธรรมเนียมแพลตฟอร์ม</strong>ให้ผู้จ้าง (ถ้าระบุข้อมูลครบ)
        — ไม่ใช่ใบกำกับค่าจ้างระหว่างผู้จ้างกับครีเอเตอร์
      </li>
      <li>ใบกำกับค่าจ้าง — เป็นความรับผิดชอบระหว่างผู้จ้างกับครีเอเตอร์โดยตรง</li>
      <li>
        เอกสารภาษีที่เกี่ยวข้องเก็บ<strong>อย่างน้อย 5 ปี</strong> ตาม<a href="/legal/privacy">นโยบายความเป็นส่วนตัว</a>
      </li>
    </ul>

    <h2>10. การเปลี่ยนแปลงนโยบาย</h2>
    <p>
      เราอาจปรับปรุงนโยบายนี้ได้ โดยแจ้งล่วงหน้าอย่างน้อย <strong>15 วัน</strong> สำหรับการเปลี่ยนแปลงที่มีผลสำคัญ
      การชำระเงินหลังวันที่มีผลถือว่ายอมรับนโยบายฉบับใหม่
    </p>

    <h2>11. ติดต่อ</h2>
    <p>
      คำถามด้านการชำระเงินและการคืนเงิน:{" "}
      <a href={`mailto:${LEGAL_SUPPORT_EMAIL}`}>{LEGAL_SUPPORT_EMAIL}</a>
      {LEGAL_COMPANY_ADDRESS ? (
        <>
          <br />
          ที่อยู่: {LEGAL_COMPANY_ADDRESS}
        </>
      ) : null}
      {LEGAL_COMPANY_TAX_ID ? (
        <>
          <br />
          เลขประจำตัวผู้เสียภาษี: {LEGAL_COMPANY_TAX_ID}
        </>
      ) : null}
    </p>
  </LegalLayout>
);

export default PaymentRefundPage;
