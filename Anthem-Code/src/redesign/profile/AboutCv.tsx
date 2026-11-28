import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AboutDocumentSheet, type CvFit } from "@/components/profile/AboutDocumentPreview";
import { buildAboutCvModel, type AboutCvModel, type CvContactItem, type CvSectionKey } from "@/lib/aboutCvModel";
import { downloadAboutCvDocument } from "@/lib/aboutCvDownload";
import { aboutCvPdfFilename } from "@/lib/aboutCvPdf";
import { copyText } from "@/lib/copyText";
import { parseProfileCv } from "@/lib/profileCv";
import { resolveToolIconSlug, toolIconUrl } from "@/lib/toolIcons";
import { useAboutCv } from "./useAboutCv";
import "../styles/about-cv.css";

const SECTION_TITLE: Record<CvSectionKey, string> = {
  experience: "Experience",
  education: "Education",
  certification: "Certificates",
  awards: "Awards",
  references: "References",
};

/** "instagram.com/x" — enough to tell two links apart. */
const linkKey = (href: string) =>
  href
    .trim()
    .toLowerCase()
    .replace(/^mailto:/, "")
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "");

/** Anything the person wrote for a CV (not only the profile fields every account has). */
function hasRealCv(model: AboutCvModel, rawCv: unknown): boolean {
  const cv = parseProfileCv(rawCv);
  return (
    model.sections.length > 0 ||
    model.languages.length > 0 ||
    model.personal.length > 0 ||
    !!model.desiredRole ||
    !!cv.fullName.trim() ||
    !!cv.nameEn.trim() ||
    !!cv.about.trim() ||
    cv.tools.length > 0
  );
}

function contactHref(c: CvContactItem): string | undefined {
  if (c.href) return c.href;
  if (c.kind === "phone") return `tel:${c.value.replace(/[^\d+]/g, "")}`;
  return undefined;
}

function Row({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="acv-row">
      <h3>{title}</h3>
      <div className="acv-body">{children}</div>
    </section>
  );
}

const IconLink = () => (
  <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
    <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1" />
    <path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" />
  </svg>
);
const IconDown = () => (
  <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 4v11M7 10.5l5 5 5-5M5 19.5h14" />
  </svg>
);
const IconPrint = () => (
  <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
    <path d="M7 9V4h10v5M7 17H5a1.5 1.5 0 0 1-1.5-1.5v-5A1.5 1.5 0 0 1 5 9h14a1.5 1.5 0 0 1 1.5 1.5v5A1.5 1.5 0 0 1 19 17h-2" />
    <path d="M7 14h10v6H7z" />
  </svg>
);

/**
 * The CV under the short About (owner 2026-11-28: bring About/CV back in full). Web layout for
 * reading; Print and Download PDF use the A4 sheet in the template the person picked.
 */
export default function AboutCv({
  userId,
  owner = false,
  shownLinks = [],
  shownLine = "",
  topBio = "",
  topTools = "",
  onEdit,
}: {
  userId: string;
  /** My Profile: an empty CV shows a "make one" box, and Print/PDF carry the application contacts. */
  owner?: boolean;
  /** Links the short About already shows (Instagram, website, email) — not listed twice. */
  shownLinks?: readonly string[];
  /** LINE ID the short About already shows. */
  shownLine?: string;
  /** Bio shown above; the CV's own About text appears only when it says something else. */
  topBio?: string;
  /** The short About's tools line: skills already listed there are not repeated as chips. */
  topTools?: string;
  onEdit?: () => void;
}) {
  const { input, pending, error, retry } = useAboutCv(userId);
  const [busy, setBusy] = useState(false);
  const [say, setSay] = useState("");
  const [fit, setFit] = useState<CvFit>({ scale: 1, overflow: false });

  useEffect(() => {
    if (!say) return;
    const t = window.setTimeout(() => setSay(""), 2600);
    return () => window.clearTimeout(t);
  }, [say]);

  const model = useMemo(() => (input ? buildAboutCvModel(input) : null), [input]);
  // Print / PDF are for job applications: the owner's copy carries the application contacts.
  const printInput = useMemo(() => (input ? { ...input, forceShowApplicationContact: owner } : null), [input, owner]);

  if (pending) return <div className="acv-wait" aria-busy="true" />;
  if (error || !input || !model || !printInput) {
    return error ? (
      <div className="acv-err" role="alert">
        <p>โหลด CV ไม่ขึ้น ลองใหม่อีกทีนะ</p>
        <button type="button" className="acv-btn" onClick={retry}>
          ลองใหม่
        </button>
      </div>
    ) : null;
  }

  const real = hasRealCv(model, input.profile.cv);
  if (!real) {
    return owner && onEdit ? (
      <div className="acv-empty">
        <div>
          <b>ยังไม่มี CV เลย</b>
          <p>ใส่ประสบการณ์ การศึกษา รางวัล แล้วโหลดเป็น PDF ไปสมัครงานได้เลยนะ</p>
        </div>
        <button type="button" className="acv-btn acv-btn-ink" onClick={onEdit}>
          ทำ CV
        </button>
      </div>
    ) : null;
  }

  const shown = new Set(shownLinks.filter(Boolean).map(linkKey));
  const contacts = model.contacts.filter(
    (c) =>
      c.kind !== "profile" &&
      !(c.href && shown.has(linkKey(c.href))) &&
      !(c.kind === "line" && shownLine && c.value.trim().toLowerCase() === shownLine.trim().toLowerCase()),
  );
  const listed = new Set(topTools.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean));
  const skills = model.craftSkills.filter((s) => !listed.has(s.trim().toLowerCase()));
  const cvBio = model.bio.trim() && model.bio.trim() !== topBio.trim() ? model.bio.trim() : "";
  const shareUrl = `${input.profileUrl ?? ""}?tab=about`;

  const copyLink = async () => {
    try {
      await copyText(shareUrl);
      setSay("คัดลอกลิงก์ CV แล้ว");
    } catch {
      setSay("คัดลอกลิงก์ไม่สำเร็จ");
    }
  };

  const downloadPdf = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { photoSkipped } = await downloadAboutCvDocument({
        input: printInput,
        theme: "mono",
        filename: aboutCvPdfFilename(parseProfileCv(input.profile.cv).fullName.trim() || model.name),
      });
      setSay(photoSkipped ? "ได้ PDF แล้ว แต่ใส่รูปไม่ได้นะ" : "ดาวน์โหลด PDF แล้ว");
    } catch {
      setSay("ทำ PDF ไม่สำเร็จ ลองใหม่อีกทีนะ");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="acv">
      <section className="acv-row acv-head">
        <h3>CV</h3>
        <div className="acv-body">
          {model.name || model.desiredRole ? (
            <p className="acv-who">
              {model.name ? <b>{model.name}</b> : null}
              {model.desiredRole ? <span>{model.desiredRole}</span> : null}
            </p>
          ) : null}
          <div className="acv-acts">
            {owner && onEdit ? (
              <button type="button" className="acv-btn acv-btn-ink" onClick={onEdit}>
                แก้ CV
              </button>
            ) : null}
            <button type="button" className="acv-btn" aria-busy={busy} disabled={busy} onClick={() => void downloadPdf()}>
              <IconDown />
              {busy ? "กำลังทำ PDF…" : "Download PDF"}
            </button>
            <button type="button" className="acv-btn" onClick={() => window.print()}>
              <IconPrint />
              Print
            </button>
            <button type="button" className="acv-btn" onClick={() => void copyLink()}>
              <IconLink />
              Copy link
            </button>
          </div>
          {owner && fit.overflow ? <p className="acv-warn">CV ยาวเกิน 1 หน้า A4 แล้วนะ ลองตัดข้อความหรือปิดบางหัวข้อ</p> : null}
          {cvBio ? <p className="acv-bio">{cvBio}</p> : null}
        </div>
      </section>

      {model.sections.map((s) => (
        <Row key={s.key} title={SECTION_TITLE[s.key]}>
          <ol className="acv-list">
            {s.entries.map((e, i) => (
              <li key={`${s.key}-${i}`}>
                <div className="acv-entry-h">
                  <b>{e.title}</b>
                  {e.period ? <span>{e.period}</span> : null}
                </div>
                {e.lines.map((l) => (
                  <p key={l}>{l}</p>
                ))}
                {e.bullets.length ? (
                  <ul>
                    {e.bullets.map((b, j) => (
                      <li key={j}>{b}</li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ol>
        </Row>
      ))}

      {skills.length ? (
        <Row title="Skills">
          <ul className="acv-chips">
            {skills.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </Row>
      ) : null}

      {model.software.length ? (
        <Row title="Software">
          <ul className="acv-chips">
            {model.software.map((t) => {
              const slug = resolveToolIconSlug(t);
              return (
                <li key={t}>
                  {slug ? <img src={toolIconUrl(slug)} alt="" width={18} height={18} loading="lazy" /> : null}
                  {t}
                </li>
              );
            })}
          </ul>
        </Row>
      ) : null}

      {model.languages.length ? (
        <Row title="Languages">
          <ul className="acv-plain">
            {model.languages.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </Row>
      ) : null}

      {model.personal.length ? (
        <Row title="Personal">
          <dl className="acv-dl">
            {model.personal.map((p) => (
              <div key={p.key}>
                <dt>{p.label}</dt>
                <dd>{p.value}</dd>
              </div>
            ))}
          </dl>
        </Row>
      ) : null}

      {contacts.length ? (
        <Row title="Contact">
          <dl className="acv-dl">
            {contacts.map((c) => {
              const href = contactHref(c);
              const ext = !!href && /^https?:/i.test(href);
              return (
                <div key={c.key}>
                  <dt>{c.label}</dt>
                  <dd>
                    {href ? (
                      <a href={href} target={ext ? "_blank" : undefined} rel={ext ? "noopener noreferrer" : undefined}>
                        {c.value}
                      </a>
                    ) : (
                      c.value
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
        </Row>
      ) : null}

      {say ? (
        <div role="status" className="acv-say">
          {say}
        </div>
      ) : null}

      {/* Portalled to <body>: print hides the whole app and shows only this A4 sheet (index.css). */}
      {createPortal(
        <div id="about-cv-print" className="about-cv-print-root" aria-hidden="true">
          <AboutDocumentSheet {...printInput} theme="mono" onFit={(next) => setFit((p) => (p.scale === next.scale && p.overflow === next.overflow ? p : next))} />
        </div>,
        document.body,
      )}
    </div>
  );
}
