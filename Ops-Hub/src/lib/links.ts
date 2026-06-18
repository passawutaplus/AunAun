import { formatMemberCode } from "@/lib/memberCode";

const trim = (u: string) => u.replace(/\/$/, "");

export const SO1O_APP_URL = trim(
  (import.meta.env.VITE_SO1O_APP_URL as string | undefined) ?? "http://localhost:3000",
);

export const ANTHEM_APP_URL = trim(
  (import.meta.env.VITE_ANTHEM_APP_URL as string | undefined) ?? "http://localhost:8081",
);

export const SO1O_ADMIN = `${SO1O_APP_URL}/admin`;
export const ANTHEM_ADMIN = `${ANTHEM_APP_URL}/admin`;

export function so1oAdmin(section: string) {
  return `${SO1O_ADMIN}?section=${section}`;
}

export function anthemAdmin(path = "") {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${ANTHEM_ADMIN}${p === "/admin" ? "" : p.replace(/^\/admin/, "")}`;
}

/** Ops Hub user detail (relative). */
export function hubUser(userId: string) {
  return `/users/${userId}`;
}

/** So1o Mission Control — prefill users search with member code. */
export function so1oAdminUser(userId: string) {
  const code = formatMemberCode(userId);
  return `${SO1O_ADMIN}?section=users&q=${encodeURIComponent(code)}`;
}

/** an1hem admin users — search hint via member code in URL (client filter). */
export function anthemAdminUser(userId: string) {
  const code = formatMemberCode(userId);
  return `${ANTHEM_ADMIN}/users?q=${encodeURIComponent(code)}`;
}

export function so1oEcosystemOps() {
  return so1oAdmin("ecosystem_ops");
}

export function anthemDrillGallery(date?: string) {
  const base = `${ANTHEM_APP_URL}/drill`;
  if (!date) return base;
  return `${base}?date=${encodeURIComponent(date)}`;
}
