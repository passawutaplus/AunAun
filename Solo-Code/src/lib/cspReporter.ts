/**
 * CSP Violation Reporter
 *
 * Listens for `securitypolicyviolation` events fired by the browser when
 * a CSP rule blocks a resource. Logs compact info to console under the
 * `[CSP]` tag so the team can filter in DevTools.
 *
 * Plug into `src/main.tsx` (or root entry) with `installCspReporter()` once.
 *
 * Roll-out plan: see docs/csp-report.md
 */

let installed = false;

export function installCspReporter() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("securitypolicyviolation", (e) => {
    const payload = {
      blockedURI: e.blockedURI,
      violatedDirective: e.violatedDirective,
      effectiveDirective: e.effectiveDirective,
      sourceFile: e.sourceFile,
      lineNumber: e.lineNumber,
      columnNumber: e.columnNumber,
      disposition: e.disposition,
    };

    console.warn("[CSP]", payload);

    try {
      void fetch("/api/public/csp-report", {
        method: "POST",
        headers: { "Content-Type": "application/csp-report" },
        body: JSON.stringify(payload),
        keepalive: true,
      });
    } catch {
      /* ignore network errors */
    }
  });
}
