import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { LEGAL_UPDATED_AT } from "@/lib/legalConfig";
import { SC_LINKS } from "../routes";
import "../styles/legal.css";

const COOKIES_POLICY = "/legal/cookies";

/**
 * Card shared by Terms and Privacy (mock: pages/Terms.dc.html, pages/Privacy.dc.html). `sections` is the page's
 * full text — components/legal/TermsContent / PrivacyContent, the version users agreed to (owner 2026-11-28),
 * the same text the old /legal pages show — styled by `.lg-prose`.
 */
export default function LegalCard({ current, heading, sections }: { current: "terms" | "privacy"; heading: string; sections: ReactNode }) {
  return (
    <main className="sc-main lgp-main">
      <div className="lgp-card">
        {/* The mock has no heading on these pages; the tab of the current page reads as one, this is for screen readers. */}
        <h1 className="sc-sr">{heading}</h1>
        <nav aria-label="Legal" lang="en" className="lgp-nav">
          <Link to={SC_LINKS.terms} aria-current={current === "terms" ? "page" : undefined}>Terms</Link>
          <Link to={SC_LINKS.privacy} aria-current={current === "privacy" ? "page" : undefined}>Privacy</Link>
        </nav>
        <p className="lgp-note">
          อัปเดตล่าสุด {LEGAL_UPDATED_AT}
          {current === "privacy" ? (
            <>
              {" · "}
              <Link to={COOKIES_POLICY}>นโยบายคุกกี้</Link>
            </>
          ) : null}
        </p>
        <article className="lgp-prose">{sections}</article>
      </div>
    </main>
  );
}
