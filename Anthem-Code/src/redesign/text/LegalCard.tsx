import { Link } from "react-router-dom";
import { SC_LINKS } from "../routes";
import "../styles/legal.css";

export type LegalSection = { title: string; body: string };

/** Card shared by Terms and Privacy (mock: pages/Terms.dc.html, pages/Privacy.dc.html). */
export default function LegalCard({ current, heading, sections }: { current: "terms" | "privacy"; heading: string; sections: readonly LegalSection[] }) {
  return (
    <main className="sc-main lg-main">
      <div className="lg-card">
        {/* The mock has no heading on these pages; the tab of the current page reads as one, this is for screen readers. */}
        <h1 className="sc-sr">{heading}</h1>
        <nav aria-label="Legal" lang="en" className="lg-nav">
          <Link to={SC_LINKS.terms} aria-current={current === "terms" ? "page" : undefined}>Terms</Link>
          <Link to={SC_LINKS.privacy} aria-current={current === "privacy" ? "page" : undefined}>Privacy</Link>
        </nav>
        <p className="lg-note">[ฉบับร่างสำหรับเว็บใหม่ · ย่อจากฉบับ 28 ตุลาคม 2569 · รอทบทวนก่อนใช้จริง]</p>
        <div>
          {sections.map((s, i) => (
            <section key={s.title} className="lg-sec">
              <h2>
                <span>{String(i + 1).padStart(2, "0")}</span>
                {s.title}
              </h2>
              <p>{s.body}</p>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
