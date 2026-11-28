import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import type { FeedbackKind } from "@/lib/feedbackTicket";
import { feedbackErrorText, submitFeedback } from "@/server/mutations/feedback";
import { SC_LINKS } from "../routes";
import { usePageSeo } from "../lib/usePageSeo";
import "../styles/feedback.css";

/** The three types of the mock and the kind each one is stored as (anthem.app_feedback.kind). */
const KINDS = [
  { key: "love", label: "Love", placeholder: "What do you like?", kind: "praise" },
  { key: "bug", label: "Bug", placeholder: "What went wrong?", kind: "bug" },
  { key: "idea", label: "Idea", placeholder: "What should we build?", kind: "idea" },
] as const satisfies ReadonlyArray<{ key: string; label: string; placeholder: string; kind: FeedbackKind }>;
type KindKey = (typeof KINDS)[number]["key"];

/** Text kept while a signed-out visitor goes to log in, so it is still there when they come back. */
const DRAFT_KEY = "sc-feedback-draft";

function readDraft(): string {
  try {
    return sessionStorage.getItem(DRAFT_KEY) ?? "";
  } catch {
    return "";
  }
}

/**
 * Feedback (mock: pages/Feedback.dc.html), the page version with header and footer.
 * Type lives in the URL (?type=bug|idea, Love when absent). Notes go to the existing feedback inbox.
 */
export default function Feedback() {
  // A form for members: not a page to find from Google.
  usePageSeo({ title: "Feedback", path: SC_LINKS.feedback, noindex: true });
  const { user, loading } = useAuth();
  const { pathname, search, state } = useLocation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const kind = KINDS.find((k) => k.key === params.get("type")) ?? KINDS[0];

  const [text, setText] = useState(readDraft);
  const [shot, setShot] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);
  const textId = useId();

  const ok = !!text.trim();
  // A link may say which page the note is about (state.from); otherwise the note is about this page.
  const from = (state as { from?: unknown } | null)?.from;
  const route = typeof from === "string" && from.startsWith("/") ? from : pathname;

  useEffect(() => {
    try {
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {
      // nothing kept
    }
  }, []);

  useEffect(() => {
    if (sent) doneRef.current?.focus();
  }, [sent]);

  const pickKind = (key: KindKey) => {
    const next = new URLSearchParams(window.location.search);
    if (key === "love") next.delete("type");
    else next.set("type", key);
    setParams(next, { replace: true, state });
    setError("");
  };

  const toggleShot = () => {
    if (shot) setShot(null);
    else fileRef.current?.click();
  };

  const send = async () => {
    if (!ok || busy || loading) return;
    if (!user) {
      try {
        sessionStorage.setItem(DRAFT_KEY, text);
      } catch {
        // private mode: the text is simply not kept
      }
      navigate(`${SC_LINKS.login}?redirect=${encodeURIComponent(pathname + search)}`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await submitFeedback({ userId: user.id, kind: kind.kind, message: text.trim(), route, screenshot: shot });
      setSent(true);
    } catch (err) {
      setError(feedbackErrorText(err));
    } finally {
      setBusy(false);
    }
  };

  const again = () => {
    setSent(false);
    setText("");
    setShot(null);
    requestAnimationFrame(() => textRef.current?.focus());
  };

  const shotLabel = shot ? "Remove screenshot" : "Attach screenshot";

  return (
    <main className="sc-main fb-main">
      <div className="fb-card">
        {sent ? (
          <>
            <div role="status" className="fb-done">
              <h1 ref={doneRef} tabIndex={-1}>Thanks.</h1>
              <p>We read every note.</p>
            </div>
            <div className="fb-row fb-row-done">
              <button type="button" className="fb-again" onClick={again}>Send another</button>
              <Link to={SC_LINKS.home} className="fb-ok">Done</Link>
            </div>
          </>
        ) : (
          <>
            <h1>Feedback</h1>
            <div role="group" aria-label="Type" className="fb-kinds">
              {KINDS.map((k) => (
                <button key={k.key} type="button" aria-pressed={k.key === kind.key} onClick={() => pickKind(k.key)}>
                  {k.label}
                </button>
              ))}
            </div>
            <div>
              <label htmlFor={textId} className="sc-sr">Your feedback</label>
              <textarea
                ref={textRef}
                id={textId}
                rows={5}
                className="fb-text"
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setError("");
                }}
                placeholder={kind.placeholder}
                maxLength={2000}
              />
            </div>
            <div className="fb-row">
              <button type="button" className="fb-shot" aria-label={shotLabel} title={shotLabel} aria-pressed={!!shot} onClick={toggleShot}>
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 11.5l-7 7a4.6 4.6 0 0 1-6.5-6.5l7.5-7.5a3.1 3.1 0 0 1 4.4 4.4L10 16.3a1.6 1.6 0 0 1-2.2-2.2l6.7-6.7" />
                </svg>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                tabIndex={-1}
                onChange={(e) => {
                  setShot(e.target.files?.[0] ?? null);
                  e.target.value = "";
                }}
              />
              <button type="button" className="fb-send" aria-disabled={!ok} aria-busy={busy || undefined} onClick={() => void send()}>
                Send
              </button>
            </div>
            {error ? <p role="alert" className="fb-err">{error}</p> : null}
          </>
        )}
      </div>
    </main>
  );
}
