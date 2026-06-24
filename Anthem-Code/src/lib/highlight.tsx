import React from "react";

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const tokenize = (query: string): string[] =>
  query
    .toLowerCase()
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);

export const highlight = (text: string | null | undefined, query: string): React.ReactNode => {
  const t = text ?? "";
  const tokens = tokenize(query);
  if (!t || tokens.length === 0) return t;
  const re = new RegExp(`(${tokens.map(escapeRe).join("|")})`, "gi");
  const parts = t.split(re);
  return parts.map((p, i) =>
    re.test(p) ? (
      <mark key={i} className="bg-primary/15 text-primary rounded px-0.5">
        {p}
      </mark>
    ) : (
      <React.Fragment key={i}>{p}</React.Fragment>
    )
  );
};
