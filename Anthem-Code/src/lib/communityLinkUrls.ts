const URL_RE = /https?:\/\/[^\s<>"']+/gi;

const PREVIEW_SITES: Record<string, { label: string; host: RegExp }> = {
  youtube: { label: "YouTube", host: /(?:youtube\.com|youtu\.be)/i },
  figma: { label: "Figma", host: /figma\.com/i },
  behance: { label: "Behance", host: /behance\.net/i },
  vimeo: { label: "Vimeo", host: /vimeo\.com/i },
  github: { label: "GitHub", host: /github\.com/i },
};

export type CommunityLinkPreview = {
  url: string;
  site: string;
  label: string;
};

export function extractCommunityLinkUrls(text: string, max = 3): string[] {
  const matches = text.match(URL_RE) ?? [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of matches) {
    const url = m.replace(/[.,;:!?)]+$/, "");
    if (seen.has(url)) continue;
    seen.add(url);
    out.push(url);
    if (out.length >= max) break;
  }
  return out;
}

export function communityLinkPreviews(urls: string[]): CommunityLinkPreview[] {
  return urls.map((url) => {
    let label = "ลิงก์";
    for (const site of Object.values(PREVIEW_SITES)) {
      if (site.host.test(url)) {
        label = site.label;
        break;
      }
    }
    try {
      const host = new URL(url).hostname.replace(/^www\./, "");
      return { url, site: host, label };
    } catch {
      return { url, site: "link", label };
    }
  });
}
