import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import "../styles/chat-sheet.css";

/**
 * A box over the chat (report reasons, a document): veil, Esc / a click outside closes only this box, the focus
 * goes back where it was. Drawn in the nearest `.sc-app` (portal): the chat popups move with transforms, which would
 * trap a fixed veil, and the old Dialog (z 50) would sit under the big chat popup (z 60).
 */
export default function ChatSheet({
  label,
  onClose,
  wide = false,
  children,
}: {
  /** id of the heading inside, or the dialog name. */
  label: { id: string } | { text: string };
  onClose: () => void;
  wide?: boolean;
  children: ReactNode;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const backRef = useRef<HTMLElement | null>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    backRef.current = document.activeElement as HTMLElement | null;
    setHost((anchorRef.current?.closest(".sc-app") as HTMLElement | null) ?? document.body);
    return () => {
      const back = backRef.current;
      if (back?.isConnected) back.focus();
    };
  }, []);

  useEffect(() => {
    if (host) boxRef.current?.querySelector<HTMLElement>("input, button:not([disabled]), [href]")?.focus();
  }, [host]);

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "Escape" || e.nativeEvent.isComposing) return;
    e.stopPropagation();
    onClose();
  };

  const veil = (
    <div className="cs-veil" onKeyDown={onKey}>
      <div aria-hidden="true" className="cs-hit" onClick={onClose} />
      <div
        ref={boxRef}
        className="cs-box"
        data-wide={wide || undefined}
        role="dialog"
        aria-modal="true"
        {...("id" in label ? { "aria-labelledby": label.id } : { "aria-label": label.text })}
      >
        {children}
      </div>
    </div>
  );

  return (
    <>
      <span ref={anchorRef} hidden />
      {host ? createPortal(veil, host) : null}
    </>
  );
}
