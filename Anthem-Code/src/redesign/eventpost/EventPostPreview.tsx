import { useEffect, type ReactNode } from "react";
import { deadlineLabel, parseEventInsights } from "@/lib/exhibitionEvents";
import EventPictures from "../event/EventPictures";
import { closingDay, feeLabel, paragraphs, siteLabel, summaryRows } from "../event/eventSummary";
import { usePosterLabel } from "../event/usePosterLabel";
import { EVENT_KIND, shortDate } from "../main/useHomeEvents";
import { mediaSrc } from "../upload/BasicEditor";
import type { Media } from "../upload/model";
import { normalizeLink, toSaveData, type EpForm } from "./model";

const Icon = ({ children }: { children: ReactNode }) => (
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

function dateRange(start: string | null, end: string | null): string {
  if (!start) return "Date";
  if (!end || end === start) return shortDate(start, true);
  return `${shortDate(start, start.slice(0, 4) !== end.slice(0, 4))} – ${shortDate(end, true)}`;
}

type Props = {
  form: EpForm;
  media: Record<string, Media>;
  ownerId: string;
  pubLabel: string;
  ready: boolean;
  onBack: () => void;
  onPublish: () => void;
};

/**
 * Mock EventPost "Preview": the event as others will see it. Same markup and classes as the Event page
 * (pages/Event.tsx, event.css), without its buttons doing anything; pictures are the local copies picked here.
 */
export default function EventPostPreview({ form: f, media, ownerId, pubLabel, ready, onBack, onPublish }: Props) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") onBack();
    };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [onBack]);

  const d = toSaveData(f, media, null);
  const insights = parseEventInsights({ ...(d.insights as object), links: [] });
  const category = String(d.category);
  const openCall = category === "open_call";
  const rows = summaryRows(insights, category);
  const about = paragraphs(String(d.description));
  const poster = usePosterLabel("community", ownerId);
  const start = (d.starts_on as string | null) ?? null;
  const end = (d.ends_on as string | null) ?? null;
  const closes = openCall ? closingDay(insights, end, start) : null;
  const closesLabel = closes ? deadlineLabel(closes, new Date(), "th") : null;
  const link = normalizeLink(f.link);
  const site = siteLabel(link || null);
  const place = String(d.location_name ?? "") || "Place";

  // Pictures: local copies first (blob:), so a picture is seen before its upload ends.
  const ids = [f.coverId, ...f.details].filter((id): id is string => !!id && !!media[id] && !media[id].error && !!(media[id].preview || media[id].url));
  const srcs = ids.map((id) => mediaSrc(media[id]));
  const sizeOf = new Map(ids.map((id, i) => [srcs[i], media[id].size] as const));
  const pictures = srcs.filter((s, i) => srcs.indexOf(s) === i);

  return (
    <div className="ep-pv pv-veil" role="dialog" aria-modal="true" aria-label="ตัวอย่างที่คนอื่นเห็น">
      <div className="ep-pvbar-w">
        <div className="ep-pvbar">
          <span className="ep-pvtx">ตัวอย่าง · คนอื่นจะเห็นงานนี้แบบนี้</span>
          <button type="button" className="ep-pvback" onClick={onBack}>
            กลับไปแก้
          </button>
          <button type="button" className="ep-pvpub" aria-disabled={!ready} onClick={onPublish}>
            {pubLabel}
          </button>
        </div>
      </div>
      <div className="ev-m ep-pv-m">
        <div className="ev-grid">
          <article className="ev-card">
            {pictures.length ? (
              <EventPictures pictures={pictures} title={f.title.trim() || "Untitled"} size={(src) => sizeOf.get(src) ?? null} />
            ) : (
              <div aria-hidden="true" className="ep-pv-nopic" />
            )}
            {about.length ? (
              <section className="ev-sec ev-about">
                <h2>About</h2>
                <div className="ev-sec-body">
                  <div className="ev-ab-text">
                    {about.map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                </div>
              </section>
            ) : null}
            {rows.length ? (
              <section className="ev-sec ev-sum">
                <div className="ev-sum-hd">
                  <h2>
                    Summary
                    <br />
                    <span>by SAMECOR</span>
                  </h2>
                  {closes && closesLabel ? (
                    <span className="ev-close">
                      <i aria-hidden="true" />
                      {`${closesLabel} · ${shortDate(closes, true)}`}
                    </span>
                  ) : null}
                </div>
                <div className="ev-rows">
                  {rows.map((r) => (
                    <div key={r.key}>
                      <h3 lang="en">{r.title}</h3>
                      <ul data-numbered={r.numbered ? "" : undefined}>
                        {r.items.map((it, i) => (
                          <li key={i}>
                            <span aria-hidden={r.numbered ? undefined : "true"}>{r.numbered ? i + 1 : null}</span>
                            <span>{it}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </article>

          <aside aria-label="ข้อมูลงาน" className="ev-aside">
            <div className="ev-head">
              <p className="ev-kind" lang="en">
                <span data-open-call={openCall ? "" : undefined}>{f.type ? EVENT_KIND[category] : "TYPE"}</span>
                {poster ? (
                  <>
                    <i aria-hidden="true" />
                    <span>{poster}</span>
                  </>
                ) : null}
              </p>
              <h1>{f.title.trim() || "Untitled"}</h1>
              <div className="ev-acts" aria-hidden="true">
                <span className="ev-save">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 3h12v18l-6-4.5L6 21z" />
                  </svg>
                  <span>สนใจ</span>
                </span>
                <span className="ev-cc ev-share">
                  <Icon>
                    <circle cx="18" cy="5.5" r="2.5" />
                    <circle cx="6" cy="12" r="2.5" />
                    <circle cx="18" cy="18.5" r="2.5" />
                    <path d="M8.2 10.8l7.6-4.1M8.2 13.2l7.6 4.1" />
                  </Icon>
                </span>
              </div>
            </div>

            <div className="ev-facts">
              <div>
                <span className="ev-ic">
                  <Icon>
                    <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
                    <path d="M3.5 10h17M8 3v4M16 3v4" />
                  </Icon>
                </span>
                <div>
                  <span>{dateRange(start, end)}</span>
                  <span className="ev-sub">{f.time.trim() || "ไม่ระบุเวลา"}</span>
                </div>
              </div>
              <div>
                <span className="ev-ic">
                  <Icon>
                    <path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" />
                    <circle cx="12" cy="10" r="2.3" />
                  </Icon>
                </span>
                <div>
                  <span>{place}</span>
                </div>
              </div>
              <div>
                <span className="ev-ic">
                  <Icon>
                    <path d="M3.5 7.5h17v3a1.5 1.5 0 0 0 0 3v3h-17v-3a1.5 1.5 0 0 0 0-3z" />
                    <path d="M14 7.5v9" strokeDasharray="1.5 2" />
                  </Icon>
                </span>
                <div>
                  <span>{feeLabel(String(d.fee_type), (d.fee_note as string | null) ?? null)}</span>
                </div>
              </div>
              {site ? (
                <div>
                  <span className="ev-ic">
                    <Icon>
                      <circle cx="12" cy="12" r="8.5" />
                      <path d="M3.5 12h17M12 3.5c2.5 2.6 2.5 14.4 0 17M12 3.5c-2.5 2.6-2.5 14.4 0 17" />
                    </Icon>
                  </span>
                  <div>
                    <span>{site}</span>
                  </div>
                </div>
              ) : null}
            </div>

            {link || f.pdf ? (
              <div className="ev-act" aria-hidden="true">
                {link ? (
                  <span className="ev-cta">
                    {openCall ? "ไปสมัครที่เว็บผู้จัด" : "ไปเว็บไซต์งาน"}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
                    </svg>
                  </span>
                ) : null}
                {f.pdf ? (
                  <span className="ev-file">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 11.5l-8 8a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7L9.7 17.2a1.7 1.7 0 0 1-2.4-2.4L15 7" />
                    </svg>
                    {f.pdf.name}
                  </span>
                ) : null}
              </div>
            ) : null}

            {f.org.trim() ? (
              <div className="ev-org">
                <span lang="en">ORGANIZER</span>
                <span>{f.org.trim()}</span>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}
