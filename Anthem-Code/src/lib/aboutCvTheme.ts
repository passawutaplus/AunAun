export const ABOUT_CV_THEME_KEY = "aplus1-about-cv-theme";

export const ABOUT_CV_THEMES = [
  { id: "orange", label: "ไอคอนส้ม", swatch: "#e85d04", frame: "#ffffff" },
  { id: "mono", label: "ขาว-ดำ", swatch: "#111111", frame: "#ffffff" },
  { id: "slate", label: "เส้นดำ", swatch: "#111111", frame: "#ffffff" },
] as const;

export type AboutCvTheme = (typeof ABOUT_CV_THEMES)[number]["id"];

export function readAboutCvTheme(): AboutCvTheme {
  try {
    const raw = localStorage.getItem(ABOUT_CV_THEME_KEY);
    if (raw === "orange" || raw === "mono" || raw === "slate") return raw;
  } catch {
    /* ignore */
  }
  return "orange";
}

export function writeAboutCvTheme(theme: AboutCvTheme) {
  try {
    localStorage.setItem(ABOUT_CV_THEME_KEY, theme);
  } catch {
    /* ignore */
  }
}
