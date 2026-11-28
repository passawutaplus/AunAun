import { Fragment } from "react";
import { cellPlace, cellsOf, DEFAULT_TEXT_STYLE, isTextCell, LAYOUT_GROUPS, slotKey, type Draft, type LayoutName, type Media, type TextStyle } from "./model";
import { ErrorRow, ImageAddIcon, mediaSrc, Progress } from "./BasicEditor";
import TextBox, { type TextMenu } from "./TextBox";

/** Which "+" / layout panel is open: a row id, "__end", or null. */
export type TplPanel = string | null;

function LayoutPicker({ current, tab, setTab, onPick }: { current: LayoutName | null; tab: number | null; setTab: (i: number) => void; onPick: (l: LayoutName) => void }) {
  const def = Math.max(0, LAYOUT_GROUPS.findIndex(([, ls]) => !!current && ls.includes(current)));
  const gi = tab ?? def;
  return (
    <div>
      <div className="up-tg-tabs" role="group" aria-label="หมวดเลเอาท์">
        {LAYOUT_GROUPS.map(([label, ls], k) => (
          <button key={label} type="button" className={k === gi ? "up-tg-tab up-tg-tab-on" : "up-tg-tab"} aria-pressed={k === gi} onClick={() => setTab(k)}>
            {label}
            <span className="up-tg-n">{ls.length}</span>
          </button>
        ))}
      </div>
      <div className="up-tg-grid">
        {LAYOUT_GROUPS[gi][1].map((l) => {
          const on = l === current;
          return (
            <button key={l} type="button" className={on ? "up-tg-o up-tg-o-on" : "up-tg-o"} aria-label={l} title={l} onClick={() => onPick(l)}>
              <span aria-hidden="true" className="up-tg-mini">
                {cellsOf(l).map((c, i) => (
                  <span key={i} className={isTextCell(c) ? "up-tg-mt" : "up-tg-mi"} style={cellPlace(c)} />
                ))}
              </span>
              <span className="up-tg-name">{l}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

type Props = {
  draft: Draft;
  media: Record<string, Media>;
  coverKey: string | null;
  menu: TextMenu;
  setMenu: (m: TextMenu) => void;
  adding: TplPanel;
  setAdding: (p: TplPanel) => void;
  swapping: TplPanel;
  setSwapping: (p: TplPanel) => void;
  tab: number | null;
  setTab: (i: number | null) => void;
  onSwap: (ri: number, l: LayoutName) => void;
  /** Inserts a row at `at` (rows.length = the end). */
  onAddRow: (at: number, l: LayoutName) => void;
  onMoveRow: (ri: number, d: -1 | 1) => void;
  onRemoveRow: (ri: number) => void;
  onPickSlot: (key: string) => void;
  onClearSlot: (key: string) => void;
  onRetrySlot: (key: string) => void;
  onToggleFit: (key: string) => void;
  onSlotText: (key: string, text: string) => void;
  onSlotStyle: (key: string, style: TextStyle) => void;
};

/** Template mode: rows, each with its own layout on a 6-column grid (mock Upload "TEMPLATE"). */
export default function TemplateEditor(p: Props) {
  const { rows } = p.draft;
  const openAdd = (id: string) => {
    p.setAdding(id);
    p.setSwapping(null);
    p.setTab(null);
  };
  return (
    <>
      {rows.map((r, ri) => {
        const swapping = p.swapping === r.id;
        return (
          <Fragment key={r.id}>
            <div className="up-mod">
              {swapping ? (
                <div className="up-swap" role="group" aria-label="เปลี่ยนเลเอาท์">
                  <LayoutPicker current={r.layout} tab={p.tab} setTab={p.setTab} onPick={(l) => p.onSwap(ri, l)} />
                </div>
              ) : null}
              <div className="up-grid">
                {cellsOf(r.layout).map((c, i) => {
                  const key = slotKey(r.id, i);
                  const place = cellPlace(c);
                  if (isTextCell(c)) {
                    const t = p.draft.slotTexts[key];
                    return (
                      <div key={key} className="up-cellwrap" style={place}>
                        <TextBox
                          id={`up-c-${r.id}-${i}`}
                          text={t?.text ?? ""}
                          style={t?.style ?? DEFAULT_TEXT_STYLE}
                          onText={(x) => p.onSlotText(key, x)}
                          onStyle={(s) => p.onSlotStyle(key, s)}
                          menu={p.menu}
                          setMenu={p.setMenu}
                          left={c[0] === 1}
                          grow={false}
                          label="ข้อความในเลเอาท์"
                        />
                      </div>
                    );
                  }
                  const mid = p.draft.fills[key];
                  const m = mid ? p.media[mid] : undefined;
                  if (!m) {
                    return (
                      <button key={key} type="button" className="up-slot-e" aria-label="อัปโหลดรูป" title="Upload" style={place} onClick={() => p.onPickSlot(key)}>
                        <span className="up-slot-ic">
                          <ImageAddIcon size={28} />
                        </span>
                      </button>
                    );
                  }
                  if (m.error) {
                    return (
                      <div key={key} className="up-slot up-slot-errw" style={place}>
                        <ErrorRow name={m.name} error={m.error} onRetry={() => p.onRetrySlot(key)} onRemove={() => p.onClearSlot(key)} />
                      </div>
                    );
                  }
                  const fit = !!p.draft.fit[key];
                  const loading = m.progress != null;
                  return (
                    <div key={key} className={fit ? "up-slot up-slot-fit" : "up-slot"} style={place}>
                      {loading ? <Progress name={m.name} progress={m.progress ?? 0} /> : <img src={mediaSrc(m, 1200)} alt="" />}
                      {key === p.coverKey ? <span className="up-cover">COVER</span> : null}
                      <div className="up-stools">
                        {/* "เลื่อนตำแหน่ง" (Move) has no behaviour in the mock yet: hidden until Beam answers (question 48). */}
                        <button
                          type="button"
                          className={fit ? "up-tb34 up-tb34-on" : "up-tb34"}
                          aria-label={fit ? "Fill — ครอปเต็มช่อง" : "Fit — เห็นทั้งภาพ"}
                          title={fit ? "Fill — ครอปเต็มช่อง" : "Fit — เห็นทั้งภาพ"}
                          aria-pressed={fit}
                          onClick={() => p.onToggleFit(key)}
                        >
                          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
                            <rect x="8" y="8" width="8" height="8" rx="1" />
                          </svg>
                        </button>
                        <button type="button" className="up-tb34" aria-label="เปลี่ยนรูป" title="Replace" onClick={() => p.onPickSlot(key)}>
                          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 11a8 8 0 0 0-14.5-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.5 4.5L20 16M20 20v-4h-4" />
                          </svg>
                        </button>
                        <button type="button" className="up-tb34" aria-label="เอารูปออก" title="Remove" onClick={() => p.onClearSlot(key)}>
                          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.5" strokeLinecap="round">
                            <path d="M6 6l12 12M18 6L6 18" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="up-mtools">
                <button
                  type="button"
                  className="up-tb36"
                  aria-label="เปลี่ยนเลเอาท์"
                  title="Layout"
                  onClick={() => {
                    p.setSwapping(swapping ? null : r.id);
                    p.setAdding(null);
                    p.setTab(null);
                  }}
                >
                  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.6" strokeLinejoin="round">
                    <rect x="3.5" y="3.5" width="17" height="8" rx="1.5" />
                    <rect x="3.5" y="14" width="7.5" height="6.5" rx="1.5" />
                    <rect x="13" y="14" width="7.5" height="6.5" rx="1.5" />
                  </svg>
                </button>
                <button type="button" className="up-tb36" aria-label="ย้ายขึ้น" onClick={() => p.onMoveRow(ri, -1)}>
                  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 14.5l6-6 6 6" />
                  </svg>
                </button>
                <button type="button" className="up-tb36" aria-label="ย้ายลง" onClick={() => p.onMoveRow(ri, 1)}>
                  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9.5l6 6 6-6" />
                  </svg>
                </button>
                <button type="button" className="up-tb36" aria-label="ลบแถวนี้" onClick={() => p.onRemoveRow(ri)}>
                  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
            </div>
            {ri < rows.length - 1 ? (
              <div className="up-addrow up-addrow-t">
                <span className="up-addline" aria-hidden="true" />
                {p.adding === r.id ? (
                  <div className="up-addpanel" role="group" aria-label="เพิ่มเลเอาท์">
                    <LayoutPicker current={null} tab={p.tab} setTab={p.setTab} onPick={(l) => p.onAddRow(ri + 1, l)} />
                  </div>
                ) : (
                  <button type="button" className="up-addbtn" aria-label="เพิ่มเลเอาท์ตรงนี้" onClick={() => openAdd(r.id)}>
                    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.5">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </button>
                )}
              </div>
            ) : null}
          </Fragment>
        );
      })}
      <div className="up-addrow up-addrow-t">
        <span className="up-addline" aria-hidden="true" />
        {p.adding === "__end" ? (
          <div className="up-addpanel" role="group" aria-label="เพิ่มเลเอาท์ต่อท้าย">
            <LayoutPicker current={null} tab={p.tab} setTab={p.setTab} onPick={(l) => p.onAddRow(rows.length, l)} />
          </div>
        ) : (
          <button type="button" className="up-addbtn" aria-label="เพิ่มเลเอาท์ต่อท้าย" onClick={() => openAdd("__end")}>
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        )}
      </div>
    </>
  );
}
