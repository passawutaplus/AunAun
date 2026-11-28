import { useLayoutEffect, useRef } from "react";
import {
  ALIGNS,
  CASES,
  FONT_FAMILY,
  FONT_NAME,
  FONTS,
  TEXT_COLORS,
  TEXT_SIZE_MAX,
  TEXT_SIZE_MIN,
  textCss,
  type TextStyle,
} from "./model";

export type TextMenu = { key: string; which: "font" | "color" } | null;

const ALIGN_PATH: Record<TextStyle["align"], string> = {
  left: "M4 6h16M4 10h10M4 14h16M4 18h10",
  center: "M4 6h16M7 10h10M4 14h16M7 18h10",
  right: "M4 6h16M10 10h10M4 14h16M10 18h10",
  justify: "M4 6h16M4 10h16M4 14h16M4 18h16",
};

type Props = {
  /** Unique per box: the menu key and the textarea id. */
  id: string;
  text: string;
  style: TextStyle;
  onText: (text: string) => void;
  onStyle: (style: TextStyle) => void;
  menu: TextMenu;
  setMenu: (m: TextMenu) => void;
  /** Toolbar on the left edge (Basic, and Template cells starting at column 1); else on the right (mock). */
  left: boolean;
  /** Basic grows with its text; Template fills its cell. */
  grow: boolean;
  label: string;
};

/** A text block with its toolbar: font, size, colour, B I U S, case, align — for the whole block (mock mkText). */
export default function TextBox({ id, text, style, onText, onStyle, menu, setMenu, left, grow, label }: Props) {
  const ta = useRef<HTMLTextAreaElement>(null);
  const fontOpen = menu?.key === id && menu.which === "font";
  const colorOpen = menu?.key === id && menu.which === "color";
  const set = (p: Partial<TextStyle>) => {
    onStyle({ ...style, ...p });
    setMenu(null);
  };

  // Grows with its content (mock field-sizing: content, with a script fallback).
  useLayoutEffect(() => {
    const el = ta.current;
    if (!grow || !el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [grow, text, style.size, style.font]);

  const toggle = (on: boolean) => (on ? "up-tb up-tb-on" : "up-tb");

  return (
    <div className={grow ? "up-tbox" : "up-tbox up-tbox-cell"}>
      <div className={left ? "up-ttools" : "up-ttools up-ttools-r"} role="toolbar" aria-label="จัดข้อความ">
        <div className="up-rel">
          <button
            type="button"
            className="up-font"
            aria-haspopup="listbox"
            aria-expanded={fontOpen}
            aria-label={`ฟอนต์ ${FONT_NAME[style.font]}`}
            onClick={() => setMenu(fontOpen ? null : { key: id, which: "font" })}
            style={{ fontFamily: FONT_FAMILY[style.font] }}
          >
            <span>{FONT_NAME[style.font]}</span>
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666666" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9.5l6 6 6-6" />
            </svg>
          </button>
          {fontOpen ? (
            <div className="up-fontlist" role="listbox" aria-label="เลือกฟอนต์">
              {FONTS.map((f) => (
                <button
                  key={f}
                  type="button"
                  role="option"
                  aria-selected={style.font === f}
                  className={style.font === f ? "up-fontopt up-fontopt-on" : "up-fontopt"}
                  style={{ fontFamily: FONT_FAMILY[f] }}
                  onClick={() => set({ font: f })}
                >
                  {FONT_NAME[f]}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <div className="up-size">
          <button type="button" aria-label="ลดขนาดตัวอักษร" onClick={() => set({ size: Math.max(TEXT_SIZE_MIN, style.size - 1) })}>
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.7" strokeLinecap="round">
              <path d="M5 12h14" />
            </svg>
          </button>
          <span aria-live="polite">{style.size}</span>
          <button type="button" aria-label="เพิ่มขนาดตัวอักษร" onClick={() => set({ size: Math.min(TEXT_SIZE_MAX, style.size + 1) })}>
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.7" strokeLinecap="round">
              <path d="M5 12h14M12 5v14" />
            </svg>
          </button>
        </div>
        <div className="up-rel">
          <button
            type="button"
            className="up-tb up-tb-col"
            aria-label="สีตัวอักษร"
            title="Color"
            aria-expanded={colorOpen}
            onClick={() => setMenu(colorOpen ? null : { key: id, which: "color" })}
          >
            <span className="up-tb-a">A</span>
            <span aria-hidden="true" className="up-tb-bar" style={{ background: style.color }} />
          </button>
          {colorOpen ? (
            <div className="up-colors" role="group" aria-label="เลือกสี">
              {TEXT_COLORS.map(([name, hex]) => (
                <button
                  key={hex}
                  type="button"
                  aria-label={`สี ${name}`}
                  aria-pressed={style.color === hex}
                  className={style.color === hex ? "up-sw up-sw-on" : "up-sw"}
                  style={{ background: hex }}
                  onClick={() => set({ color: hex })}
                />
              ))}
            </div>
          ) : null}
        </div>
        <button type="button" className={`${toggle(style.bold)} up-tb-b`} aria-label="ตัวหนา" title="Bold" aria-pressed={style.bold} onClick={() => set({ bold: !style.bold })}>
          B
        </button>
        <button type="button" className={`${toggle(style.italic)} up-tb-i`} aria-label="ตัวเอียง" title="Italic" aria-pressed={style.italic} onClick={() => set({ italic: !style.italic })}>
          I
        </button>
        <button type="button" className={`${toggle(style.underline)} up-tb-u`} aria-label="ขีดเส้นใต้" title="Underline" aria-pressed={style.underline} onClick={() => set({ underline: !style.underline })}>
          U
        </button>
        <button type="button" className={`${toggle(style.strike)} up-tb-s`} aria-label="ขีดฆ่า" title="Strikethrough" aria-pressed={style.strike} onClick={() => set({ strike: !style.strike })}>
          S
        </button>
        <button
          type="button"
          className={`${toggle(style.tcase !== "none")} up-tb-c`}
          aria-label={`ตัวพิมพ์เล็กใหญ่ ${style.tcase}`}
          title="Case"
          onClick={() => set({ tcase: CASES[(CASES.indexOf(style.tcase) + 1) % CASES.length] })}
        >
          aA
        </button>
        <button
          type="button"
          className="up-tb"
          aria-label={`จัดย่อหน้า ${style.align}`}
          title="Align"
          onClick={() => set({ align: ALIGNS[(ALIGNS.indexOf(style.align) + 1) % ALIGNS.length] })}
        >
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.6" strokeLinecap="round">
            <path d={ALIGN_PATH[style.align]} />
          </svg>
        </button>
      </div>
      <label className="up-sr" htmlFor={id}>
        {label}
      </label>
      <textarea
        ref={ta}
        id={id}
        className={grow ? "up-ta up-ta-grow" : "up-ta up-ta-cell"}
        rows={1}
        placeholder="Aa"
        value={text}
        onChange={(e) => onText(e.target.value)}
        style={textCss(style)}
      />
    </div>
  );
}
