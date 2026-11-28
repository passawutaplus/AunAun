import { useEffect, useRef, useState } from "react";
import { MAX_SEARCH_COLORS } from "@/lib/colorSearch";
import { onEscape } from "../shell/panels";
import { usePresence } from "../lib/usePresence";

/** Mock hsl2hex: the picked hue at saturation 62 %, lightness 46 %. */
function hueHex(h: number): string {
  const s = 0.62;
  const l = 0.46;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const v = l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    return Math.round(v * 255).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

type Props = {
  /** Colours in use ("#2E4A6B" …), from the URL. */
  colors: string[];
  onApply: (colors: string[]) => void;
};

/**
 * Colour search on the Showcase tab (mock: Main.dc.html "ค้นหาด้วยสี"): a hue slider, up to three colours,
 * and a search button. Applying with no colour turns it off. The saturation box is a picture of the hue
 * only, as in the mock.
 */
export default function ColorSearch({ colors, onApply }: Props) {
  const panel = usePresence(180);
  const [hue, setHue] = useState(8);
  const [picked, setPicked] = useState<string[]>(colors);
  const btnRef = useRef<HTMLButtonElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const hex = hueHex(hue);
  const { close } = panel;

  const closeToButton = () => {
    close();
    btnRef.current?.focus();
  };

  useEffect(() => {
    if (!panel.isOpen) return;
    boxRef.current?.querySelector<HTMLElement>("input")?.focus();
    return onEscape(() => {
      close();
      btnRef.current?.focus();
    });
  }, [panel.isOpen, close]);

  const toggle = () => {
    if (panel.isOpen) {
      closeToButton();
      return;
    }
    setPicked(colors.map((c) => c.toUpperCase()));
    panel.open();
  };

  const apply = () => {
    onApply(picked);
    closeToButton();
  };

  const on = colors.length > 0;

  return (
    <div className="cs">
      <button
        ref={btnRef}
        type="button"
        className="mn-tool"
        aria-label="ค้นหาด้วยสี"
        aria-expanded={panel.isOpen}
        data-open={panel.isOpen ? "" : undefined}
        onClick={toggle}
      >
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.33">
          <circle cx="12" cy="8.5" r="5" />
          <circle cx="8.5" cy="14.5" r="5" />
          <circle cx="15.5" cy="14.5" r="5" />
        </svg>
        {on ? <span aria-hidden="true" className="cs-on" style={{ background: colors[0] }} /> : null}
      </button>
      {panel.mounted ? (
        <>
          <div className="cs-catch" aria-hidden="true" onClick={closeToButton} />
          <div ref={boxRef} className="cs-box pv-drop" role="dialog" aria-label="ค้นหาด้วยสี" data-leaving={panel.leaving ? "" : undefined}>
            <div aria-hidden="true" className="cs-sat" style={{ ["--cs-hue" as string]: String(hue) }}>
              <span className="cs-mark" />
            </div>
            <label className="sc-sr" htmlFor="sc-cs-hue">
              เฉดสี
            </label>
            <input id="sc-cs-hue" className="cs-hue" type="range" min={0} max={360} value={hue} onChange={(e) => setHue(Number(e.target.value))} />
            <div className="cs-row">
              <div className="cs-slots">
                {Array.from({ length: MAX_SEARCH_COLORS }, (_, i) => {
                  const c = picked[i];
                  if (c) {
                    return (
                      <button
                        key={i}
                        type="button"
                        className="cs-slot"
                        aria-label={`เอาสี ${c} ออก`}
                        style={{ background: c }}
                        onClick={() => setPicked(picked.filter((_, j) => j !== i))}
                      />
                    );
                  }
                  const next = i === picked.length;
                  return (
                    <button
                      key={i}
                      type="button"
                      className="cs-slot cs-add"
                      aria-label={next ? `เพิ่มสี ${hex}` : "ช่องสีว่าง"}
                      disabled={!next}
                      onClick={() => {
                        if (!picked.includes(hex)) setPicked([...picked, hex]);
                      }}
                    >
                      +
                    </button>
                  );
                })}
              </div>
              <button type="button" className="cs-go" aria-label="ค้นหาผลงานด้วยสีที่เลือก" onClick={apply}>
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.33">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3.5-3.5" />
                </svg>
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
