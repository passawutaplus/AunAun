/**
 * Tiny looping motions for tour steps and (i) hints — only for ideas that are hard to get from words.
 * Pure CSS (no images), Brand Book palette (ink, hairline, one red accent), frozen under prefers-reduced-motion.
 */
const CSS = `
.gt-scene{position:relative;height:132px;overflow:hidden;background:hsl(var(--background));font-family:inherit}
.gt-scene *{box-sizing:border-box}
.gt-ink{background:hsl(var(--foreground))}
.gt-line{background:hsl(var(--border))}
.gt-card{position:absolute;border-radius:10px;background:hsl(var(--card));border:1px solid hsl(var(--border))}
.gt-pill{position:absolute;border-radius:999px}
.gt-label{position:absolute;font-size:10px;line-height:1;color:hsl(var(--muted-foreground));white-space:nowrap}
.gt-red{background:hsl(var(--brand))}
@keyframes gt-slide{0%,38%{transform:translateX(0)}50%,88%{transform:translateX(64px)}100%{transform:translateX(0)}}
@keyframes gt-gridA{0%,38%{opacity:1}50%,88%{opacity:0}100%{opacity:1}}
@keyframes gt-gridB{0%,38%{opacity:0}50%,88%{opacity:1}100%{opacity:0}}
@keyframes gt-tap{0%,20%{transform:scale(1);opacity:0}28%{opacity:1}34%{transform:scale(.8)}40%,100%{transform:scale(1);opacity:0}}
@keyframes gt-pop{0%,30%{transform:scale(1)}36%{transform:scale(1.35)}44%,100%{transform:scale(1)}}
@keyframes gt-fill{0%,32%{background:transparent}38%,100%{background:hsl(var(--brand))}}
@keyframes gt-fly{0%,40%{transform:translate(0,0) scale(1);opacity:0}46%{opacity:1}70%{transform:translate(92px,-46px) scale(.5);opacity:1}76%,100%{transform:translate(92px,-46px) scale(.5);opacity:0}}
@keyframes gt-count{0%,72%{opacity:0;transform:translateY(4px)}78%,100%{opacity:1;transform:translateY(0)}}
@keyframes gt-in{0%{transform:translateY(-38px);opacity:0}14%,100%{transform:translateY(0);opacity:1}}
@keyframes gt-in2{0%,30%{transform:translateY(-38px);opacity:0}44%,100%{transform:translateY(0);opacity:1}}
@keyframes gt-glow{0%,54%{box-shadow:0 0 0 0 transparent}62%,80%{box-shadow:0 0 0 3px hsl(var(--brand)/.35)}100%{box-shadow:0 0 0 0 transparent}}
@keyframes gt-type{0%,10%{width:0}40%,100%{width:72px}}
@keyframes gt-caret{0%,49%{opacity:1}50%,100%{opacity:0}}
@keyframes gt-results{0%,40%{opacity:0;transform:translateY(4px)}52%,100%{opacity:1;transform:translateY(0)}}
@keyframes gt-hl{0%,58%{background:transparent}66%,100%{background:hsl(var(--muted))}}
@keyframes gt-step{0%,20%{background:hsl(var(--border))}28%,100%{background:hsl(var(--foreground))}}
@keyframes gt-step2{0%,45%{background:hsl(var(--border))}53%,100%{background:hsl(var(--foreground))}}
@keyframes gt-step3{0%,70%{background:hsl(var(--border))}78%,100%{background:hsl(var(--brand))}}
@keyframes gt-check{0%,30%{transform:scale(0)}38%,100%{transform:scale(1)}}
@keyframes gt-check2{0%,55%{transform:scale(0)}63%,100%{transform:scale(1)}}
@keyframes gt-bar{0%,30%{width:0%}40%,55%{width:50%}65%,100%{width:100%}}
@keyframes gt-bubble{0%,15%{opacity:0;transform:translateY(6px)}25%,100%{opacity:1;transform:translateY(0)}}
@keyframes gt-bubble2{0%,40%{opacity:0;transform:translateY(6px)}50%,100%{opacity:1;transform:translateY(0)}}
@keyframes gt-bubble3{0%,65%{opacity:0;transform:translateY(6px)}75%,100%{opacity:1;transform:translateY(0)}}
.gt-anim{animation-duration:4.6s;animation-iteration-count:infinite;animation-timing-function:cubic-bezier(.4,0,.2,1)}
@media (prefers-reduced-motion:reduce){.gt-anim{animation:none!important}}
`;

function Scene({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="gt-scene" role="img" aria-label={label}>
      <style>{CSS}</style>
      {children}
    </div>
  );
}

const anim = (name: string, extra?: React.CSSProperties): React.CSSProperties => ({ animationName: name, ...extra });

/** Home: the Projects / Designers switch changes what the feed shows. */
export function SwitchModeScene() {
  const tile = (x: number, y: number, w: number, h: number) => (
    <div className="gt-line" style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: 6 }} />
  );
  return (
    <Scene label="สลับระหว่าง Projects กับ Designers แล้วฟีดเปลี่ยนตาม">
      <div className="gt-pill" style={{ left: 16, top: 12, width: 132, height: 26, border: "1px solid hsl(var(--border))" }} />
      <div className="gt-pill gt-ink gt-anim" style={{ left: 18, top: 14, width: 62, height: 22, ...anim("gt-slide") }} />
      <span className="gt-label" style={{ left: 28, top: 21, color: "hsl(var(--muted-foreground))" }}>Projects</span>
      <span className="gt-label" style={{ left: 88, top: 21 }}>Designers</span>
      <div className="gt-anim" style={{ position: "absolute", inset: 0, ...anim("gt-gridA") }}>
        {tile(16, 50, 70, 70)}
        {tile(92, 50, 70, 34)}
        {tile(92, 88, 70, 32)}
        {tile(168, 50, 70, 70)}
        {tile(244, 50, 70, 48)}
      </div>
      <div className="gt-anim" style={{ position: "absolute", inset: 0, ...anim("gt-gridB") }}>
        {[16, 116, 216].map((x) => (
          <div key={x} className="gt-card" style={{ left: x, top: 50, width: 92, height: 70 }}>
            <div className="gt-line" style={{ position: "absolute", left: 8, top: 8, width: 22, height: 22, borderRadius: 999 }} />
            <div className="gt-line" style={{ position: "absolute", left: 36, top: 12, width: 44, height: 6, borderRadius: 3 }} />
            <div className="gt-line" style={{ position: "absolute", left: 8, top: 38, width: 76, height: 24, borderRadius: 5 }} />
          </div>
        ))}
      </div>
    </Scene>
  );
}

/** Home / project: saving a work drops it into a Collection on your profile. */
export function SaveToCollectionScene() {
  return (
    <Scene label="กดบันทึกผลงาน แล้วผลงานไปอยู่ใน Collections ของคุณ">
      <div className="gt-card" style={{ left: 20, top: 26, width: 110, height: 86 }}>
        <div className="gt-line" style={{ position: "absolute", inset: 6, borderRadius: 6 }} />
        <div className="gt-anim" style={{ position: "absolute", right: 10, top: 10, width: 16, height: 16, borderRadius: 4, border: "1.5px solid hsl(var(--foreground))", ...anim("gt-fill") }} />
        <div className="gt-anim" style={{ position: "absolute", right: 6, top: 6, width: 24, height: 24, borderRadius: 999, border: "2px solid hsl(var(--brand))", ...anim("gt-tap") }} />
      </div>
      <div className="gt-anim gt-red" style={{ position: "absolute", left: 104, top: 70, width: 22, height: 18, borderRadius: 4, ...anim("gt-fly") }} />
      <div className="gt-card" style={{ left: 186, top: 14, width: 120, height: 42 }}>
        <span className="gt-label" style={{ left: 10, top: 10, color: "hsl(var(--foreground))", fontSize: 11 }}>Collections</span>
        <span className="gt-label gt-anim" style={{ left: 10, top: 26, ...anim("gt-count") }}>+1 ผลงาน</span>
      </div>
    </Scene>
  );
}

/** Studio: a new request lands in the action queue, one tap opens that exact request. */
export function ActionQueueScene() {
  const row = (top: number, name: string, a: string) => (
    <div className="gt-card gt-anim" style={{ left: 16, right: 16, top, height: 36, ...anim(a) }}>
      <div className="gt-line" style={{ position: "absolute", left: 10, top: 8, width: 20, height: 20, borderRadius: 999 }} />
      <span className="gt-label" style={{ left: 38, top: 13, color: "hsl(var(--foreground))", fontSize: 11 }}>{name}</span>
      <div className="gt-pill gt-ink" style={{ right: 10, top: 9, width: 44, height: 18 }} />
      <span className="gt-label" style={{ right: 24, top: 13, color: "hsl(var(--background))" }}>ตอบ</span>
    </div>
  );
  return (
    <Scene label="คำขอใหม่เข้ามาในรายการวันนี้ กดตอบเพื่อเปิดคำขอนั้นทันที">
      <span className="gt-label" style={{ left: 16, top: 12 }}>วันนี้ 2 เรื่องรอคุณ</span>
      {row(30, "Kin Studio ส่งคำขอจ้าง", "gt-in")}
      <div className="gt-anim" style={{ position: "absolute", left: 16, right: 16, top: 72, height: 36, borderRadius: 10, ...anim("gt-glow") }}>
        {row(0, "Mint ชวนคอลแลป", "gt-in2")}
      </div>
      <div className="gt-anim" style={{ position: "absolute", right: 30, top: 78, width: 26, height: 26, borderRadius: 999, border: "2px solid hsl(var(--brand))", ...anim("gt-tap", { animationDelay: "1.4s" }) }} />
    </Scene>
  );
}

/** Studio: Ctrl K finds works, requests and settings from anywhere. */
export function CommandSearchScene() {
  return (
    <Scene label="กด Ctrl K แล้วพิมพ์ค้นหาผลงาน คำขอ หรือการตั้งค่าได้ทันที">
      <div className="gt-card" style={{ left: 30, right: 30, top: 14, height: 30 }}>
        <span className="gt-label" style={{ left: 10, top: 10 }}>Ctrl K</span>
        <div className="gt-anim" style={{ position: "absolute", left: 46, top: 10, height: 10, overflow: "hidden", ...anim("gt-type") }}>
          <span style={{ fontSize: 11, color: "hsl(var(--foreground))", whiteSpace: "nowrap" }}>Kin Studio</span>
        </div>
        <div className="gt-anim gt-ink" style={{ position: "absolute", left: 120, top: 8, width: 1.5, height: 14, animationDuration: "1s", animationIterationCount: "infinite", animationName: "gt-caret" }} />
      </div>
      <div className="gt-anim" style={{ position: "absolute", left: 30, right: 30, top: 50, ...anim("gt-results") }}>
        {["คำขอจ้าง · Kin Studio", "ผลงาน · Kin Coffee logo", "ตั้งค่า · การแจ้งเตือน"].map((t, i) => (
          <div key={t} className={i === 0 ? "gt-anim" : undefined} style={{ height: 24, borderRadius: 6, padding: "6px 8px", ...(i === 0 ? anim("gt-hl") : {}) }}>
            <span style={{ fontSize: 10, color: i === 0 ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))" }}>{t}</span>
          </div>
        ))}
      </div>
    </Scene>
  );
}

/** Inbox chips: every request moves ติดต่อใหม่ → ตอบรับ → ปิดแล้ว. */
export function RequestStatusScene() {
  const dot = (x: number, a: string, label: string) => (
    <>
      <div className="gt-anim" style={{ position: "absolute", left: x, top: 54, width: 14, height: 14, borderRadius: 999, ...anim(a) }} />
      <span className="gt-label" style={{ left: x - 18, top: 78, width: 50, textAlign: "center" }}>{label}</span>
    </>
  );
  return (
    <Scene label="คำขอเดินจาก ติดต่อใหม่ ไป ตอบรับ แล้วจบที่ ปิดแล้ว">
      <div className="gt-line" style={{ position: "absolute", left: 50, right: 50, top: 60, height: 2 }} />
      {dot(44, "gt-step", "ติดต่อใหม่")}
      {dot(158, "gt-step2", "ตอบรับ")}
      {dot(272, "gt-step3", "ปิดแล้ว")}
      <span className="gt-label" style={{ left: 16, top: 104, width: 300, textAlign: "center" }}>ปฏิเสธ ยกเลิก และจบงาน รวมอยู่ใน “ปิดแล้ว”</span>
    </Scene>
  );
}

/** Chat → collab: talk, agree a plan, tick tasks together. */
export function CollabPlanScene() {
  const task = (top: number, label: string, a: string) => (
    <div style={{ position: "absolute", left: 184, top, display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 12, height: 12, borderRadius: 3, border: "1.5px solid hsl(var(--foreground))", position: "relative" }}>
        <div className="gt-anim gt-ink" style={{ position: "absolute", inset: 1.5, borderRadius: 1.5, ...anim(a) }} />
      </div>
      <span style={{ fontSize: 10, color: "hsl(var(--foreground))" }}>{label}</span>
    </div>
  );
  return (
    <Scene label="คุยในแชท ตกลงแผน แล้วติ๊กงานไปด้วยกันใน Plan & Tasks">
      <div className="gt-card gt-anim" style={{ left: 14, top: 16, width: 112, height: 22, ...anim("gt-bubble") }}>
        <span className="gt-label" style={{ left: 8, top: 6 }}>สนใจทำด้วยกันไหม</span>
      </div>
      <div className="gt-pill gt-ink gt-anim" style={{ left: 40, top: 46, width: 112, height: 22, ...anim("gt-bubble2") }}>
        <span className="gt-label" style={{ left: 10, top: 6, color: "hsl(var(--background))" }}>ตกลง เริ่มกันเลย</span>
      </div>
      <div className="gt-card" style={{ left: 172, top: 14, width: 144, height: 104 }}>
        <span className="gt-label" style={{ left: 12, top: 10, color: "hsl(var(--foreground))", fontSize: 11 }}>Plan & Tasks</span>
        <div className="gt-line" style={{ position: "absolute", left: 12, right: 12, top: 26, height: 4, borderRadius: 2 }}>
          <div className="gt-anim gt-red" style={{ height: 4, borderRadius: 2, ...anim("gt-bar") }} />
        </div>
      </div>
      {task(54, "ร่างไอเดีย", "gt-check")}
      {task(76, "ส่งงานรอบแรก", "gt-check2")}
      <div className="gt-card gt-anim" style={{ left: 14, top: 78, width: 120, height: 22, ...anim("gt-bubble3") }}>
        <span className="gt-label" style={{ left: 8, top: 6 }}>ส่งไฟล์แล้วนะ</span>
      </div>
    </Scene>
  );
}
