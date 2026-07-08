export function host(u) {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch (e) {
    return "";
  }
}

export function load(k, fallback) {
  try {
    const raw = localStorage.getItem(k);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

export function save(k, value) {
  localStorage.setItem(k, JSON.stringify(value));
}

export function clamp(v) {
  return Math.max(0, Math.min(255, v));
}

export function esc(v) {
  return String(v || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function escA(v) {
  return esc(v).replace(new RegExp(String.fromCharCode(96), "g"), "&#096;");
}
