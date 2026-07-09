export type AuthEmailBrand = "solo" | "anthem";

const ANTHEM_HOST_PATTERNS = [
  "aplus1.app",
  "pixel100.com",
  "1px.app",
  "1px.net",
  "px1.app",
  "anthem",
  "an1hem.app",
];

const ANTHEM_TEXT_HINT =
  /aplus1\.app|pixel100\.com|1px\.app|1px\.net|px1\.app|an1hem\.app|\/anthem\b/i;

function anthemEnvOrigins(): string[] {
  const values = [
    process.env.VITE_APLUS1_APP_URL,
    process.env.VITE_ANTHEM_APP_URL,
    process.env.ANTHEM_SITE_URL,
    process.env.VITE_ANTHEM_SITE_URL,
    import.meta.env.VITE_APLUS1_APP_URL as string | undefined,
    import.meta.env.VITE_ANTHEM_APP_URL as string | undefined,
    import.meta.env.VITE_ANTHEM_SITE_URL as string | undefined,
  ];
  return values.filter((v): v is string => Boolean(v?.trim()));
}

function hostsFromUrl(raw: string): string[] {
  const hosts: string[] = [];
  if (ANTHEM_TEXT_HINT.test(raw)) {
    for (const pattern of ANTHEM_HOST_PATTERNS) {
      if (raw.toLowerCase().includes(pattern)) hosts.push(pattern);
    }
  }

  try {
    hosts.push(new URL(raw).hostname.toLowerCase());
    return hosts;
  } catch {
    for (const base of anthemEnvOrigins()) {
      try {
        hosts.push(new URL(raw, base).hostname.toLowerCase());
      } catch {
        /* ignore invalid combination */
      }
    }
    return hosts;
  }
}

function hostsFromCandidate(raw: string): string[] {
  const hosts = hostsFromUrl(raw);
  try {
    const redirectTo = new URL(raw).searchParams.get("redirect_to");
    if (redirectTo) hosts.push(...hostsFromUrl(redirectTo));
  } catch {
    /* ignore */
  }
  return hosts;
}

function isAnthemHost(host: string): boolean {
  return ANTHEM_HOST_PATTERNS.some((p) => host === p || host.endsWith(`.${p}`));
}

/**
 * Pick auth email brand from redirect / confirmation URLs in the Supabase hook payload.
 */
export function resolveAuthEmailBrand(
  ...candidates: (string | undefined | null)[]
): AuthEmailBrand {
  for (const raw of candidates) {
    if (!raw) continue;
    if (ANTHEM_TEXT_HINT.test(raw)) return "anthem";
    for (const host of hostsFromCandidate(raw)) {
      if (isAnthemHost(host)) return "anthem";
    }
  }

  for (const origin of anthemEnvOrigins()) {
    try {
      const host = new URL(origin).hostname.toLowerCase();
      for (const raw of candidates) {
        if (!raw) continue;
        for (const candidateHost of hostsFromCandidate(raw)) {
          if (candidateHost === host) return "anthem";
        }
      }
    } catch {
      /* ignore */
    }
  }

  return "solo";
}
