/**
 * Listens to SecurityPolicyViolationEvent and logs to console.
 * Used during the CSP report-only phase to discover blocked resources
 * before we switch the policy to enforce.
 *
 * See docs/csp-report.md for the rollout plan.
 */
export const installCspReporter = () => {
  if (typeof window === "undefined") return;

  window.addEventListener("securitypolicyviolation", (e) => {
    // Keep noise low — only warn (not error) since this is report-only.
    console.warn("[CSP]", {
      violatedDirective: e.violatedDirective,
      effectiveDirective: e.effectiveDirective,
      blockedURI: e.blockedURI,
      sourceFile: e.sourceFile,
      lineNumber: e.lineNumber,
      columnNumber: e.columnNumber,
      sample: e.sample,
      disposition: e.disposition, // "report" while we're in report-only
    });

    // TODO (Phase 2): POST a sampled subset to an edge function for aggregation.
  });
};
