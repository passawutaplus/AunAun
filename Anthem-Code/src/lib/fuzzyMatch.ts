// Fuzzy multi-token matcher with simple aliases & Levenshtein tolerance.

const ALIASES: Record<string, string[]> = {
  ux: ["ui", "ux/ui", "experience", "user experience"],
  ui: ["ux", "ux/ui", "interface"],
  ai: ["artificial intelligence", "machine learning", "ml"],
  ps: ["photoshop"],
  ill: ["illustrator"],
  ae: ["after effects", "aftereffects", "motion"],
  pr: ["premiere"],
  fig: ["figma"],
  br: ["branding", "brand"],
  dev: ["developer", "development"],
  pm: ["product manager", "project manager"],
  ux_ui: ["ui/ux", "ux/ui"],
  motion: ["after effects", "animation"],
  logo: ["branding", "identity"],
  web: ["website", "frontend", "html", "css"],
};

const normalize = (s: string) =>
  (s ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u0E00-\u0E7F\s/+#.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const levenshtein = (a: string, b: string): number => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[b.length];
};

const tokenMatches = (token: string, haystack: string): boolean => {
  if (!token) return true;
  if (haystack.includes(token)) return true;
  // alias expansion
  const aliases = ALIASES[token] ?? [];
  for (const a of aliases) {
    if (haystack.includes(a)) return true;
  }
  // levenshtein for tokens of length >=4
  if (token.length >= 4) {
    for (const word of haystack.split(/\s+/)) {
      if (!word) continue;
      if (Math.abs(word.length - token.length) > 1) continue;
      if (levenshtein(word, token) <= 1) return true;
    }
  }
  return false;
};

export const tokenizeQuery = (q: string): string[] =>
  normalize(q).split(" ").filter((t) => t.length >= 2);

export const fuzzyMatchAll = (query: string, haystack: string): boolean => {
  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) return true;
  const hay = normalize(haystack);
  return tokens.every((t) => tokenMatches(t, hay));
};
