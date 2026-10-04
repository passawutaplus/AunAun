# Launch checklist (legal / privacy). Tick only when verified.

- [ ] Thai and English drafts exist for Privacy, Terms, Copyright/Takedown, AUP, AI, Cookies, Sub-processors (in `outputs/a-plus-vault/legal.html`)
- [ ] A Thai lawyer reviewed Terms, Privacy, Cookies and Copyright/Takedown; all `[PLACEHOLDERS]` replaced
- [ ] Owner confirmed the single contact addresses (now: privacy@aplus1.app, copyright@aplus1.app) and they receive mail
- [ ] Controller name, address and (if required) DPO filled in; minimum age and parental-consent wording decided
- [ ] Sub-processor regions and the AI provider's CURRENT retention/training terms filled in (`legal.html#subprocessors`, `#ai`)
- [ ] Retention periods in ROPA.md match the code (trash 30 days, signals 90 days) and counsel agreed
- [ ] Export tested end to end with a real account (zip opens, files present); delete tested (rows + files gone, login kept)
- [ ] Decision made: the login is shared with other Aplus apps, so "delete my Vault data" keeps the login; full account erasure is a separate owner process
- [ ] Data-request form creates a row; the daily report lists due dates; someone answers within 30 days
- [ ] Takedown tested end to end: report -> hidden at once -> admin restore / delete permanently -> reporter email answered
- [ ] Consent: AI-on-private-images and digest are off by default, logged in `consent_events`, withdrawable in Settings
- [ ] Cookie inventory matches a clean browser profile (devtools Application tab: no cookies, only listed keys); no third-party requests in the Network tab
- [ ] Extension PRIVACY.md matches manifest permissions (test) and the Chrome Web Store single-purpose text is written
- [ ] Incident plan (RUNBOOK) read by the owner; keys rotatable
- [ ] Email provider chosen and domain verified (SPF/DKIM) before any digest is sent
