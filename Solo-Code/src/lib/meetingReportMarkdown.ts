/** Minimal Markdown → HTML for meeting report display & PDF */
export function meetingReportMarkdownToHtml(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const t = line.trim();
    if (!t) {
      closeList();
      continue;
    }
    if (t.startsWith("# ")) {
      closeList();
      out.push(`<h1>${escapeHtml(t.slice(2))}</h1>`);
      continue;
    }
    if (t.startsWith("## ")) {
      closeList();
      out.push(`<h2>${escapeHtml(t.slice(3))}</h2>`);
      continue;
    }
    if (t.startsWith("- ") || t.startsWith("* ")) {
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${escapeHtml(t.slice(2))}</li>`);
      continue;
    }
    closeList();
    out.push(`<p>${escapeHtml(t)}</p>`);
  }
  closeList();
  return out.join("\n");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
