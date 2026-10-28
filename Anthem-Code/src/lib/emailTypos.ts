/** Common domain typos → the domain people almost always meant. Used to nudge before sending a code. */
const DOMAIN_FIXES: Record<string, string> = {
  "gmial.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gmali.com": "gmail.com",
  "gnail.com": "gmail.com",
  "gmaill.com": "gmail.com",
  "gmail.con": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.cm": "gmail.com",
  "gmail.comm": "gmail.com",
  "hotmial.com": "hotmail.com",
  "hotmal.com": "hotmail.com",
  "hotnail.com": "hotmail.com",
  "hotmail.con": "hotmail.com",
  "yaho.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "yhoo.com": "yahoo.com",
  "yahoo.con": "yahoo.com",
  "outlok.com": "outlook.com",
  "outlook.con": "outlook.com",
  "iclould.com": "icloud.com",
  "icloud.con": "icloud.com",
  "samcor.com": "samecor.com",
};

/** Returns the corrected address when the domain looks like a known typo, otherwise null. */
export function suggestEmailFix(email: string): string | null {
  const trimmed = email.trim();
  const at = trimmed.lastIndexOf("@");
  if (at < 1) return null;
  const fixed = DOMAIN_FIXES[trimmed.slice(at + 1).toLowerCase()];
  return fixed ? `${trimmed.slice(0, at)}@${fixed}` : null;
}
