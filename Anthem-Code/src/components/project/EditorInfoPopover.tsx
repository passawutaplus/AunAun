import { useState } from "react";
import { Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type EditorInfoTopic = "cover" | "hire";

/** Sample artwork shown in the explainer animations (public/editor-help). */
const SAMPLE = {
  poster: "/editor-help/orbit-14.webp",
  ring: "/editor-help/orbit-13.webp",
};

const CSS = `
@keyframes eh-s1{0%,2%{opacity:0}5%,30%{opacity:1}33%,100%{opacity:0}}
@keyframes eh-s2{0%,33%{opacity:0}36%,63%{opacity:1}66%,100%{opacity:0}}
@keyframes eh-s3{0%,66%{opacity:0}69%,96%{opacity:1}99%,100%{opacity:0}}
@keyframes eh-p1{0%,6%{transform:scale(1.9) translateY(-30px);opacity:0}14%,100%{transform:none;opacity:1}}
@keyframes eh-p2{0%,37%{transform:scale(1.9) translateY(-30px);opacity:0}45%,100%{transform:none;opacity:1}}
@keyframes eh-p3{0%,70%{transform:scale(1.6) translateY(-24px);opacity:0}78%,100%{transform:none;opacity:1}}
@keyframes eh-t1{0%,30%{background:hsl(var(--muted));color:hsl(var(--foreground))}33%,100%{background:transparent;color:hsl(var(--muted-foreground))}}
@keyframes eh-t2{0%,33%{background:transparent;color:hsl(var(--muted-foreground))}36%,63%{background:hsl(var(--muted));color:hsl(var(--foreground))}66%,100%{background:transparent;color:hsl(var(--muted-foreground))}}
@keyframes eh-t3{0%,66%{background:transparent;color:hsl(var(--muted-foreground))}69%,96%{background:hsl(var(--muted));color:hsl(var(--foreground))}99%,100%{background:transparent;color:hsl(var(--muted-foreground))}}
@keyframes eh-cur{0%{transform:translate(200px,190px)}12%,20%{transform:translate(70px,174px)}22%{transform:translate(70px,174px) scale(.85)}24%,46%{transform:translate(70px,174px)}58%,70%{transform:translate(166px,174px)}72%{transform:translate(166px,174px) scale(.85)}74%,96%{transform:translate(166px,174px)}100%{transform:translate(200px,190px)}}
@keyframes eh-hire{0%,20%{background:#2c3036}22%,46%{background:#eb5200}48%,100%{background:#2c3036}}
@keyframes eh-collab{0%,70%{background:#2c3036}72%,96%{background:#3d5bd9}98%,100%{background:#2c3036}}
@keyframes eh-chatA{0%,23%{transform:translateX(110%);opacity:0}28%,46%{transform:none;opacity:1}50%,100%{transform:translateX(110%);opacity:0}}
@keyframes eh-chatB{0%,73%{transform:translateX(110%);opacity:0}78%,96%{transform:none;opacity:1}100%{transform:translateX(110%);opacity:0}}
.eh-scene{position:absolute;inset:0;padding:22px;box-sizing:border-box;opacity:0}
.eh-sc1{animation:eh-s1 9s infinite}.eh-sc2{animation:eh-s2 9s infinite}.eh-sc3{animation:eh-s3 9s infinite}
.eh-p1{animation:eh-p1 9s infinite}.eh-p2{animation:eh-p2 9s infinite}.eh-p3{animation:eh-p3 9s infinite}
.eh-st1{animation:eh-t1 9s infinite}.eh-st2{animation:eh-t2 9s infinite}.eh-st3{animation:eh-t3 9s infinite}
.eh-card{border-radius:8px;background:#2a2e34}
.eh-cov{border-radius:8px;object-fit:cover;display:block;width:100%;height:100%;box-shadow:0 0 0 2px #eb5200}
.eh-cursor{position:absolute;left:0;top:0;animation:eh-cur 10s infinite ease-in-out;z-index:3}
.eh-bh{animation:eh-hire 10s infinite}.eh-bc{animation:eh-collab 10s infinite}
.eh-chat{position:absolute;right:14px;top:14px;bottom:14px;width:200px;background:#1f2328;border-radius:12px;padding:12px;box-sizing:border-box;display:flex;flex-direction:column;gap:8px;box-shadow:-10px 0 30px rgba(0,0,0,.45)}
.eh-ca{animation:eh-chatA 10s infinite}.eh-cb{animation:eh-chatB 10s infinite}
@media (prefers-reduced-motion: reduce){
  .eh-scene,.eh-p1,.eh-p2,.eh-p3,.eh-st1,.eh-st2,.eh-st3,.eh-cursor,.eh-bh,.eh-bc,.eh-ca,.eh-cb{animation:none}
  .eh-sc1{opacity:1}.eh-ca{opacity:1;transform:none}.eh-cb{opacity:0}.eh-cursor{transform:translate(70px,174px)}
}
`;

function CoverScene() {
  const cells = [0, 1, 2, 3, 4, 5];
  return (
    <div className="relative h-[250px] overflow-hidden rounded-xl bg-neutral-950" aria-hidden>
      <div className="eh-scene eh-sc1">
        <div className="mb-2.5 text-[11px] text-neutral-500">หน้าแรก · ฟีดผลงาน</div>
        <div className="grid h-[180px] grid-cols-4 gap-2.5">
          <div className="eh-card" />
          <div className="eh-p1 row-span-2">
            <img className="eh-cov" src={SAMPLE.poster} alt="" />
          </div>
          {cells.map((i) => (
            <div key={i} className="eh-card" />
          ))}
        </div>
      </div>
      <div className="eh-scene eh-sc2">
        <div className="mb-3 flex items-center gap-2.5">
          <div className="h-[30px] w-[30px] rounded-full bg-[#eb5200]" />
          <div>
            <div className="text-[13px] font-semibold text-neutral-100">คุณ</div>
            <div className="text-[11px] text-neutral-500">หน้าโปรไฟล์ · ผลงาน</div>
          </div>
        </div>
        <div className="grid h-[160px] grid-cols-3 gap-2.5">
          <div className="eh-p2">
            <img className="eh-cov" src={SAMPLE.poster} alt="" />
          </div>
          {cells.slice(0, 5).map((i) => (
            <div key={i} className="eh-card" />
          ))}
        </div>
      </div>
      <div className="eh-scene eh-sc3">
        <div className="mb-3 text-[11px] text-neutral-500">ตอนแชร์ลิงก์ใน LINE / Facebook</div>
        <div className="flex justify-end">
          <div className="eh-p3 w-[260px] overflow-hidden rounded-2xl bg-[#22262b]">
            <img src={SAMPLE.poster} alt="" className="block h-[120px] w-full object-cover" />
            <div className="px-3 py-2.5">
              <div className="text-[13px] font-semibold text-neutral-100">ชื่อผลงานของคุณ</div>
              <div className="text-[11px] text-neutral-400">samecor.com</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HireScene() {
  return (
    <div className="relative h-[250px] overflow-hidden rounded-xl bg-neutral-950" aria-hidden>
      <div className="absolute left-3.5 top-3.5 w-[250px]">
        <img src={SAMPLE.ring} alt="" className="block h-[140px] w-[250px] rounded-[10px] object-cover" />
        <div className="mt-2.5 text-[13px] font-semibold text-neutral-100">หน้าผลงาน</div>
        <div className="mb-2.5 text-[11px] text-neutral-500">สิ่งที่คนดูเห็น</div>
        <div className="flex gap-2">
          <span className="eh-bh rounded-lg px-3 py-1.5 text-xs font-semibold text-white">สนใจจ้าง</span>
          <span className="eh-bc rounded-lg px-3 py-1.5 text-xs font-semibold text-white">สนใจคอลแลป</span>
        </div>
      </div>
      <div className="eh-chat eh-ca">
        <div className="text-[11px] text-neutral-400">แชทกับคุณ · จ้างงาน</div>
        <div className="overflow-hidden rounded-[10px] bg-[#2a2e34]">
          <img src={SAMPLE.ring} alt="" className="block h-14 w-full object-cover" />
          <div className="px-2 py-1.5 text-[11px] text-neutral-200">อ้างอิง: ผลงานนี้</div>
        </div>
        <div className="self-end rounded-[10px_10px_2px_10px] bg-[#eb5200] px-2.5 py-2 text-[11px] leading-relaxed text-white">
          สนใจจ้างทำงานสไตล์นี้ครับ
        </div>
      </div>
      <div className="eh-chat eh-cb">
        <div className="text-[11px] text-neutral-400">แชทกับคุณ · คอลแลป</div>
        <div className="overflow-hidden rounded-[10px] bg-[#2a2e34]">
          <img src={SAMPLE.ring} alt="" className="block h-14 w-full object-cover" />
          <div className="px-2 py-1.5 text-[11px] text-neutral-200">อ้างอิง: ผลงานนี้</div>
        </div>
        <div className="self-end rounded-[10px_10px_2px_10px] bg-[#3d5bd9] px-2.5 py-2 text-[11px] leading-relaxed text-white">
          อยากทำงานร่วมกัน ทำเพลงประกอบให้ได้นะ
        </div>
      </div>
      <svg className="eh-cursor" width="22" height="22" viewBox="0 0 24 24">
        <path d="M5 3l14 8-6 1.5L10 19z" fill="#fff" stroke="#101214" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

const STEPS = [
  "การ์ดในฟีดหน้าแรก",
  "ผลงานในหน้าโปรไฟล์ของคุณ",
  "รูปตัวอย่างตอนมีคนแชร์ลิงก์",
];

const CONTENT: Record<
  EditorInfoTopic,
  { title: string; label: string; body: JSX.Element; scene: JSX.Element }
> = {
  cover: {
    title: "ภาพปกไปขึ้นที่ไหน",
    label: "ภาพปกคืออะไร",
    scene: <CoverScene />,
    body: (
      <>
        <ol className="space-y-1">
          {STEPS.map((text, i) => (
            <li
              key={text}
              className={`eh-st${i + 1} flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm`}
            >
              <b className="inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-muted text-xs text-foreground">
                {i + 1}
              </b>
              {text}
            </li>
          ))}
        </ol>
        <p className="text-sm leading-relaxed text-muted-foreground">
          ระบบใช้<b className="text-foreground">รูปแรก</b>ในเรื่องเป็นปกให้อัตโนมัติ
          เลือกรูปที่ชัดและเห็นงานเต็ม ๆ จะได้คนกดดูมากขึ้น เปลี่ยนปกได้ทุกเมื่อ
        </p>
      </>
    ),
  },
  hire: {
    title: "ปุ่ม “สนใจจ้าง” และ “สนใจคอลแลป”",
    label: "ปุ่มสนใจจ้างและสนใจคอลแลปคืออะไร",
    scene: <HireScene />,
    body: (
      <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
        <p>
          <b className="text-foreground">สนใจจ้าง</b> — คนดูกดแล้วเปิดแชทหาคุณ พร้อมการ์ดอ้างอิงผลงานชิ้นนี้
          คุยรายละเอียดแล้วส่งใบเสนอราคาได้เลย
        </p>
        <p>
          <b className="text-foreground">สนใจคอลแลป</b> — สำหรับคนที่อยากทำงานร่วมกัน ไม่ใช่การจ้าง
        </p>
        <p className="text-xs">เปิดหรือปิดได้เฉพาะผลงานชิ้นนี้</p>
      </div>
    ),
  },
};

/** Small ⓘ button that opens an animated explainer for one editor field. */
export function EditorInfoButton({ topic }: { topic: EditorInfoTopic }) {
  const [open, setOpen] = useState(false);
  const c = CONTENT[topic];
  return (
    <>
      <button
        type="button"
        aria-label={c.label}
        title={c.label}
        onClick={() => setOpen(true)}
        className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Info className="h-3.5 w-3.5" aria-hidden />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[34rem]">
          <style>{CSS}</style>
          <DialogHeader>
            <DialogTitle>{c.title}</DialogTitle>
            <DialogDescription className="sr-only">คำอธิบายพร้อมภาพเคลื่อนไหว</DialogDescription>
          </DialogHeader>
          {c.scene}
          {c.body}
          <Button type="button" variant="secondary" className="w-full" onClick={() => setOpen(false)}>
            เข้าใจแล้ว
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
