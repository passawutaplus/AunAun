/**
 * Motion explainers for the editor's ⓘ buttons (modules, templates, single image, gallery, video).
 * Pure CSS keyframes (9s loops) over the real sample artwork in public/editor-help, so there is no JS timer
 * to leak and `prefers-reduced-motion` simply shows the finished frame.
 */

const IMG = {
  a: "/editor-help/orbit-12.webp",
  b: "/editor-help/orbit-13.webp",
  c: "/editor-help/orbit-14.webp",
  d: "/editor-help/orbit-15.webp",
};

export const SCENES_CSS = `
.es{position:relative;height:250px;overflow:hidden;border-radius:12px;background:#0d0e10;color:#e8e6e1;font-size:11px}
.es *{box-sizing:border-box}
.es img{display:block;object-fit:cover;width:100%;height:100%}
.es-rail{position:absolute;left:12px;top:12px;bottom:12px;width:92px;display:flex;flex-direction:column;gap:8px}
.es-tile{flex:1;border-radius:9px;background:#1b1d21;border:1px solid #2a2d33;display:flex;align-items:center;justify-content:center;color:#9a9893}
.es-canvas{position:absolute;left:116px;right:12px;top:12px;bottom:12px;border-radius:12px;border:1px dashed #34373d;padding:10px;display:flex;flex-direction:column;gap:8px;overflow:hidden}
.es-blk{border-radius:7px;overflow:hidden;opacity:0;flex:none}
.es-bar{height:14px;width:62%;background:#e8e6e1;border-radius:99px}
.es-line{height:6px;background:#3a3d44;border-radius:99px}
.es-ph{background:#25282d}
.es-row{display:flex;gap:6px;height:46px}
.es-row>*{flex:1;border-radius:6px;overflow:hidden;position:relative}
.es-cur{position:absolute;left:0;top:0;z-index:5;pointer-events:none;filter:drop-shadow(0 1px 2px rgba(0,0,0,.6))}
@keyframes es-in{from{opacity:0;transform:translateY(10px) scale(.96)}to{opacity:1;transform:none}}
@keyframes es-hl{0%,100%{background:#1b1d21;border-color:#2a2d33;color:#9a9893}}
.es-m1{animation:es-m1 9s infinite}.es-m2{animation:es-m2 9s infinite}.es-m3{animation:es-m3 9s infinite}
@keyframes es-m1{0%,10%{opacity:0;transform:translateY(10px)}16%,92%{opacity:1;transform:none}98%,100%{opacity:0}}
@keyframes es-m2{0%,36%{opacity:0;transform:translateY(10px)}42%,92%{opacity:1;transform:none}98%,100%{opacity:0}}
@keyframes es-m3{0%,62%{opacity:0;transform:translateY(10px)}68%,92%{opacity:1;transform:none}98%,100%{opacity:0}}
.es-t1{animation:es-t1 9s infinite}.es-t2{animation:es-t2 9s infinite}.es-t3{animation:es-t3 9s infinite}
@keyframes es-t1{0%,3%{background:#1b1d21;color:#9a9893}6%,18%{background:#e8e6e1;color:#101114;border-color:#e8e6e1}22%,100%{background:#1b1d21;color:#9a9893}}
@keyframes es-t2{0%,29%{background:#1b1d21;color:#9a9893}32%,44%{background:#e8e6e1;color:#101114;border-color:#e8e6e1}48%,100%{background:#1b1d21;color:#9a9893}}
@keyframes es-t3{0%,55%{background:#1b1d21;color:#9a9893}58%,70%{background:#e8e6e1;color:#101114;border-color:#e8e6e1}74%,100%{background:#1b1d21;color:#9a9893}}
.es-cur1{animation:es-cur1 9s infinite ease-in-out}
@keyframes es-cur1{0%{transform:translate(70px,40px)}6%{transform:translate(52px,36px) scale(.88)}13%{transform:translate(180px,50px)}28%{transform:translate(180px,50px)}32%{transform:translate(52px,100px) scale(.88)}40%{transform:translate(180px,100px)}54%{transform:translate(180px,100px)}58%{transform:translate(52px,164px) scale(.88)}66%{transform:translate(180px,170px)}92%{transform:translate(180px,170px)}100%{transform:translate(70px,40px)}}
.es-tpl{flex:1;border-radius:9px;background:#1b1d21;border:1px solid #2a2d33;padding:7px;display:flex;flex-direction:column;gap:4px;justify-content:center}
.es-tpl.pick{animation:es-pick 9s infinite}
@keyframes es-pick{0%,14%{border-color:#2a2d33;background:#1b1d21}18%,92%{border-color:#e8e6e1;background:#23262b}98%,100%{border-color:#2a2d33;background:#1b1d21}}
.es-cur2{animation:es-cur2 9s infinite ease-in-out}
@keyframes es-cur2{0%{transform:translate(120px,150px)}12%{transform:translate(62px,102px)}17%{transform:translate(62px,102px) scale(.86)}24%{transform:translate(200px,170px)}60%{transform:translate(220px,120px)}66%{transform:translate(220px,120px) scale(.86)}72%{transform:translate(220px,150px)}92%{transform:translate(220px,150px)}100%{transform:translate(120px,150px)}}
.es-f1{animation:es-f1 9s infinite}.es-f2{animation:es-f2 9s infinite}.es-f3{animation:es-f3 9s infinite}.es-f4{animation:es-f4 9s infinite}
@keyframes es-f1{0%,20%{opacity:0;transform:translateY(8px)}25%,92%{opacity:1;transform:none}98%,100%{opacity:0}}
@keyframes es-f2{0%,26%{opacity:0;transform:translateY(8px)}31%,92%{opacity:1;transform:none}98%,100%{opacity:0}}
@keyframes es-f3{0%,32%{opacity:0;transform:translateY(8px)}37%,92%{opacity:1;transform:none}98%,100%{opacity:0}}
@keyframes es-f4{0%,38%{opacity:0;transform:translateY(8px)}43%,92%{opacity:1;transform:none}98%,100%{opacity:0}}
.es-swap{animation:es-swap 9s infinite}
@keyframes es-swap{0%,58%{opacity:0}66%,92%{opacity:1}98%,100%{opacity:0}}
.es-slot{position:absolute;left:50%;top:50%;width:300px;height:170px;margin:-85px 0 0 -150px;border-radius:14px;border:1.5px dashed #4a4d54;display:flex;align-items:center;justify-content:center;color:#8d8b86}
.es-fill{position:absolute;inset:0;border-radius:13px;overflow:hidden;animation:es-fill 9s infinite}
@keyframes es-fill{0%,22%{opacity:0;transform:scale(.55)}34%,90%{opacity:1;transform:none}97%,100%{opacity:0}}
.es-ph-ico{animation:es-phico 9s infinite}
@keyframes es-phico{0%,20%{opacity:1}30%,92%{opacity:0}98%,100%{opacity:1}}
.es-cap{position:absolute;left:0;right:0;bottom:10px;text-align:center;color:#9a9893}
.es-track{position:absolute;inset:34px 38px;border-radius:12px;overflow:hidden}
.es-strip{display:flex;width:300%;height:100%;animation:es-strip 9s infinite cubic-bezier(.65,0,.35,1)}
.es-strip>*{width:calc(100%/3);height:100%;padding-right:0}
@keyframes es-strip{0%,24%{transform:translateX(0)}33%,57%{transform:translateX(-33.3333%)}66%,90%{transform:translateX(-66.6666%)}100%{transform:translateX(0)}}
.es-dots{position:absolute;left:0;right:0;bottom:12px;display:flex;justify-content:center;gap:6px}
.es-dots i{width:7px;height:7px;border-radius:99px;background:#3a3d44}
.es-d1{animation:es-d1 9s infinite}.es-d2{animation:es-d2 9s infinite}.es-d3{animation:es-d3 9s infinite}
@keyframes es-d1{0%,28%{background:#e8e6e1}33%,95%{background:#3a3d44}100%{background:#e8e6e1}}
@keyframes es-d2{0%,28%{background:#3a3d44}33%,60%{background:#e8e6e1}66%,100%{background:#3a3d44}}
@keyframes es-d3{0%,60%{background:#3a3d44}66%,92%{background:#e8e6e1}98%,100%{background:#3a3d44}}
.es-arrow{position:absolute;top:50%;margin-top:-13px;width:26px;height:26px;border-radius:99px;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px}
.es-vph{animation:es-vph 9s infinite}
@keyframes es-vph{0%,24%{opacity:1}34%,92%{opacity:0}98%,100%{opacity:1}}
.es-vposter{animation:es-vposter 9s infinite}
@keyframes es-vposter{0%,24%{opacity:0}34%,92%{opacity:1}98%,100%{opacity:0}}
.es-play{animation:es-play 9s infinite}
@keyframes es-play{0%,36%{opacity:0;transform:scale(.7)}42%,50%{opacity:1;transform:scale(1)}54%,100%{opacity:0;transform:scale(1.2)}}
.es-prog{animation:es-prog 9s infinite;transform-origin:left}
@keyframes es-prog{0%,52%{transform:scaleX(0);opacity:0}54%{opacity:1;transform:scaleX(.04)}90%{transform:scaleX(.9);opacity:1}97%,100%{transform:scaleX(.9);opacity:0}}
@media (prefers-reduced-motion:reduce){
  .es-m1,.es-m2,.es-m3,.es-f1,.es-f2,.es-f3,.es-f4,.es-fill,.es-swap,.es-vposter,.es-prog{animation:none;opacity:1;transform:none}
  .es-t1,.es-t2,.es-t3,.es-cur1,.es-cur2,.es-strip,.es-d1,.es-d2,.es-d3,.es-play,.es-vph,.es-ph-ico,.es-tpl.pick{animation:none}
  .es-play,.es-vph,.es-ph-ico{opacity:0}.es-prog{transform:scaleX(.6)}
}
`;

const Cursor = ({ className }: { className: string }) => (
  <svg className={`es-cur ${className}`} width="20" height="20" viewBox="0 0 24 24" aria-hidden>
    <path d="M5 3l14 8-6 1.5L10 19z" fill="#fff" stroke="#101114" strokeWidth="1.2" strokeLinejoin="round" />
  </svg>
);

/** Pick a module in the left rail → it lands on the artboard, one after another. */
export function ModulesScene() {
  return (
    <div className="es" aria-hidden>
      <div className="es-rail">
        <div className="es-tile es-t1">หัวข้อ</div>
        <div className="es-tile es-t2">ภาพ</div>
        <div className="es-tile es-t3">แกลเลอรี</div>
      </div>
      <div className="es-canvas">
        <div className="es-blk es-m1">
          <div className="es-bar" />
        </div>
        <div className="es-blk es-m2" style={{ height: 78 }}>
          <img src={IMG.c} alt="" />
        </div>
        <div className="es-blk es-m3">
          <div className="es-row">
            <div><img src={IMG.a} alt="" /></div>
            <div><img src={IMG.b} alt="" /></div>
            <div><img src={IMG.d} alt="" /></div>
          </div>
        </div>
      </div>
      <Cursor className="es-cur1" />
    </div>
  );
}

/** Pick a ready-made template → the whole layout appears → your own images replace the placeholders. */
export function TemplatesScene() {
  return (
    <div className="es" aria-hidden>
      <div className="es-rail">
        <div className="es-tpl"><div className="es-line" style={{ width: "70%" }} /><div className="es-line" /></div>
        <div className="es-tpl pick">
          <div className="es-line" style={{ width: "55%", background: "#e8e6e1" }} />
          <div className="es-line" style={{ height: 22, background: "#3a3d44" }} />
        </div>
        <div className="es-tpl"><div className="es-line" style={{ height: 22 }} /><div className="es-line" style={{ width: "50%" }} /></div>
      </div>
      <div className="es-canvas">
        <div className="es-blk es-f1"><div className="es-bar" /></div>
        <div className="es-blk es-f2 es-ph" style={{ height: 70, position: "relative" }}>
          <div className="es-swap" style={{ position: "absolute", inset: 0 }}><img src={IMG.c} alt="" /></div>
        </div>
        <div className="es-blk es-f3"><div className="es-line" style={{ width: "92%" }} /><div className="es-line" style={{ width: "74%", marginTop: 5 }} /></div>
        <div className="es-blk es-f4">
          <div className="es-row">
            <div className="es-ph"><div className="es-swap" style={{ position: "absolute", inset: 0 }}><img src={IMG.a} alt="" /></div></div>
            <div className="es-ph"><div className="es-swap" style={{ position: "absolute", inset: 0 }}><img src={IMG.b} alt="" /></div></div>
            <div className="es-ph"><div className="es-swap" style={{ position: "absolute", inset: 0 }}><img src={IMG.d} alt="" /></div></div>
          </div>
        </div>
      </div>
      <Cursor className="es-cur2" />
    </div>
  );
}

/** Single image: an empty slot gets your picture, full width. */
export function SingleImageScene() {
  return (
    <div className="es" aria-hidden>
      <div className="es-slot">
        <span className="es-ph-ico">+ อัปโหลดรูป</span>
        <div className="es-fill"><img src={IMG.c} alt="" /></div>
      </div>
      <div className="es-cap">หนึ่งรูป เต็มความกว้างของหน้าผลงาน</div>
    </div>
  );
}

/** Gallery slideshow: several pictures in one slot, swiped through. */
export function GalleryScene() {
  return (
    <div className="es" aria-hidden>
      <div className="es-track">
        <div className="es-strip">
          <div><img src={IMG.a} alt="" /></div>
          <div><img src={IMG.b} alt="" /></div>
          <div><img src={IMG.d} alt="" /></div>
        </div>
      </div>
      <span className="es-arrow" style={{ left: 44 }}>‹</span>
      <span className="es-arrow" style={{ right: 44 }}>›</span>
      <div className="es-dots"><i className="es-d1" /><i className="es-d2" /><i className="es-d3" /></div>
    </div>
  );
}

/** Video: place the slot first, upload the clip later — the poster and player appear. */
export function VideoScene() {
  return (
    <div className="es" aria-hidden>
      <div className="es-slot" style={{ overflow: "hidden" }}>
        <span className="es-vph">วางช่องวิดีโอก่อน · อัปโหลดคลิปทีหลัง</span>
        <div className="es-vposter" style={{ position: "absolute", inset: 0 }}>
          <img src={IMG.b} alt="" />
        </div>
        <div
          className="es-play"
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: 46,
            height: 46,
            margin: "-23px 0 0 -23px",
            borderRadius: 99,
            background: "rgba(0,0,0,.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 18,
          }}
        >
          ▶
        </div>
        <div style={{ position: "absolute", left: 10, right: 10, bottom: 10, height: 3, background: "rgba(255,255,255,.25)", borderRadius: 99 }}>
          <div className="es-prog" style={{ height: "100%", background: "#fff", borderRadius: 99 }} />
        </div>
      </div>
    </div>
  );
}
