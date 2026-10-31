import { useEffect, useRef, useState } from "react";
import type { LandingText } from "./useLandingCopy";

/** Scripted demo of a quote card in chat: sent, client typing, accepted. Plays once on view. */
export function QuoteChat({ t }: { t: LandingText }) {
  const [step, setStep] = useState(0); // 0 idle · 1 sent · 2 client typing · 3 accepted
  const rootRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };

  const send = () => {
    setStep((s) => (s === 0 ? 1 : s));
    clearTimers();
    timers.current = [window.setTimeout(() => setStep((s) => (s === 1 ? 2 : s)), 1400), window.setTimeout(() => setStep(3), 2700)];
  };
  const sendRef = useRef(send);
  sendRef.current = send;

  useEffect(() => {
    let start = 0;
    const once = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        once.disconnect();
        start = window.setTimeout(() => sendRef.current(), 700);
      },
      { threshold: 0.5 },
    );
    if (rootRef.current) once.observe(rootRef.current);
    return () => {
      once.disconnect();
      window.clearTimeout(start);
      clearTimers();
    };
  }, []);

  return (
    <div className="chat reveal" ref={rootRef}>
      <div className="chat-top">
        <span className="av" />
        <div>
          <b>{t("chat.who")}</b>
          <small>{t("chat.online")}</small>
        </div>
      </div>
      <div className="chat-body">
        <div className="bub">{t("chat.c1")}</div>
        <div className="bub me">{t("chat.m1")}</div>
        {step > 0 ? (
          <div className="qcard">
            <div className="qh">
              <span>{t("q.title")} · QT-014</span>
              <span>✓</span>
            </div>
            <div className="qb">
              <div className="qrow">
                <span>{t("q.job")}</span>
                <b>{t("q.jobv")}</b>
              </div>
              <div className="qrow">
                <span>{t("q.steps")}</span>
                <b>{t("q.stepsv")}</b>
              </div>
              <div className="qrow">
                <span>{t("q.pay")}</span>
                <b>{t("q.payv")}</b>
              </div>
              <div className="qrow">
                <span>{t("q.status")}</span>
                <span className={step === 3 ? "qst ok" : "qst"}>{step === 3 ? t("q.acc") : t("q.wait")}</span>
              </div>
            </div>
          </div>
        ) : null}
        {step === 2 ? (
          <div className="typing">
            <i />
            <i />
            <i />
          </div>
        ) : null}
        {step === 3 ? <div className="bub">{t("chat.ok")}</div> : null}
      </div>
      <div className="chat-bar">
        <button type="button" className="btn primary" disabled={step > 0} onClick={send}>
          {step > 0 ? t("q.sent") : t("q.send")}
        </button>
        <button
          type="button"
          className="icon-btn"
          aria-label="Reset"
          onClick={() => {
            clearTimers();
            setStep(0);
          }}
        >
          ↺
        </button>
      </div>
    </div>
  );
}
