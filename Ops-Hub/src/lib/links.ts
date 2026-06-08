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
