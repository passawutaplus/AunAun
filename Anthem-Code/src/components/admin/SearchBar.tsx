import { useState } from "react";

export function useSearch<T>(rows: T[] | undefined, fields: (keyof T)[]) {
  const [q, setQ] = useState("");
  const filtered = (rows ?? []).filter((r) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return fields.some((f) => String(r[f] ?? "").toLowerCase().includes(s));
  });
  return { q, setQ, filtered };
}

export function SearchBar({ value, onChange, placeholder = "ค้นหา..." }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="bg-admin-surface border border-admin-border px-3 py-1.5 text-sm text-admin-fg placeholder:text-admin-muted rounded-sm focus:outline-none focus:border-admin-fg w-full md:w-64"
    />
  );
}
