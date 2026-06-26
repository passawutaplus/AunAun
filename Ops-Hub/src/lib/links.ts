import { formatMemberCode } from "@/lib/memberCode";

const trim = (u: string) => u.replace(/\/$/, "");

export const SO1O_APP_URL = trim(
  (import.meta.env.VITE_SO1O_APP_URL as string | undefined) ?? "http://localhost:3000",
);

function readAplus1AppUrl(): string | undefined {
  return (
    (import.meta.env.VITE_APLUS1_APP_URL as string | undefined) ??
    (import.meta.env.VITE_ANTHEM_APP_URL as string | undefined)
  );
}

export const APLUS1_APP_URL = trim(readAplus1AppUrl() ?? "http://localhost:8081");

/** @deprecated use APLUS1_APP_URL */
export const ANTHEM_APP_URL = APLUS1_APP_URL;

export const SO1O_ADMIN = `${SO1O_APP_URL}/admin`;
export const APLUS1_ADMIN = `${APLUS1_APP_URL}/admin`;

/** @deprecated use APLUS1_ADMIN */
export const ANTHEM_ADMIN = APLUS1_ADMIN;

export function so1oAdmin(section: string) {
  return `${SO1O_ADMIN}?section=${section}`;
}

export function aplus1Admin(path = "") {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${APLUS1_ADMIN}${p === "/admin" ? "" : p.replace(/^\/admin/, "")}`;
}

/** @deprecated use aplus1Admin */
export const anthemAdmin = aplus1Admin;

/** Ops Hub user detail (relative). */
export function hubUser(userId: string) {
  return `/users/${userId}`;
}

/** So1o Mission Control — prefill users search with member code. */
export function so1oAdminUser(userId: string) {
  const code = formatMemberCode(userId);
  return `${SO1O_ADMIN}?section=users&q=${encodeURIComponent(code)}`;
}

/** Aplus1 admin users — search hint via member code in URL (client filter). */
export function aplus1AdminUser(userId: string) {
  const code = formatMemberCode(userId);
  return `${APLUS1_ADMIN}/users?q=${encodeURIComponent(code)}`;
}

/** @deprecated use aplus1AdminUser */
export const anthemAdminUser = aplus1AdminUser;

export function so1oEcosystemOps() {
  return so1oAdmin("ecosystem_ops");
}

export function aplus1DrillGallery(date?: string) {
  const base = `${APLUS1_APP_URL}/drill`;
  if (!date) return base;
  return `${base}?date=${encodeURIComponent(date)}`;
}

/** @deprecated use aplus1DrillGallery */
export const anthemDrillGallery = aplus1DrillGallery;
