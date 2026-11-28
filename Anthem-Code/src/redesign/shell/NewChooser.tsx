import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { SC_LINKS } from "../routes";
import { onEscape } from "./panels";

type Props = {
  leaving: boolean;
  onClose: (restoreFocus?: boolean) => void;
};

/** "+" on the home page → choose what to post (mock: Main.dc.html "ปุ่ม + → เลือกจะลงอะไร"). */
export default function NewChooser({ leaving, onClose }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    boxRef.current?.querySelector<HTMLElement>(".nw-opt")?.focus();
  }, []);

  useEffect(() => onEscape(() => onClose()), [onClose]);

  return (
    <div className="nw-wrap" data-leaving={leaving ? "" : undefined}>
      <div className="pv-veil" aria-hidden="true" data-leaving={leaving ? "" : undefined} onClick={() => onClose()} />
      <div
        ref={boxRef}
        className="pv-box nw-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sc-nw-h"
        data-leaving={leaving ? "" : undefined}
      >
        <div className="nw-hd">
          <h2 id="sc-nw-h">New</h2>
          <button type="button" aria-label="ปิด" className="nw-x" onClick={() => onClose()}>
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.5" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="nw-grid">
          <Link to={SC_LINKS.upload} className="nw-opt" onClick={() => onClose(false)}>
            <svg aria-hidden="true" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.1" strokeLinejoin="round">
              <rect x="3.5" y="3.5" width="8" height="10" rx="1.5" />
              <rect x="13.5" y="3.5" width="7" height="6" rx="1.5" />
              <rect x="13.5" y="11.5" width="7" height="9" rx="1.5" />
              <rect x="3.5" y="15.5" width="8" height="5" rx="1.5" />
            </svg>
            <span className="nw-t">Showcase</span>
            <span className="nw-s">ผลงานของคุณ</span>
          </Link>
          <Link to={SC_LINKS.eventNew} className="nw-opt" onClick={() => onClose(false)}>
            <svg aria-hidden="true" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
              <path d="M3.5 10h17M8 3v4M16 3v4" />
              <path d="M12 13v4M10 15h4" />
            </svg>
            <span className="nw-t">Event</span>
            <span className="nw-s">งานที่คุณจัด</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
