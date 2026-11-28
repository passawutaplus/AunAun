/**
 * Shown when a page or a list could not load (network down, server error) — never a blank
 * page and never the 404, so the person can try again. Styles: shell.css `.sc-load-error`.
 */
export default function LoadError({ onRetry, label = "โหลดไม่ขึ้น ลองใหม่อีกทีนะ" }: { onRetry: () => void; label?: string }) {
  return (
    <div className="sc-load-error" role="alert">
      <p>{label}</p>
      <button type="button" className="sc-load-error-btn" onClick={onRetry}>
        ลองใหม่
      </button>
    </div>
  );
}
