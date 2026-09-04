export const ABOUT_CV_THEME_KEY = "aplus1-about-cv-theme";

export const ABOUT_CV_THEMES = [
  { id: "orange", label: "ส้ม", swatch: "#e85d04", frame: "#fff6f0" },
  { id: "mono", label: "ขาว-ดำ", swatch: "#111111", frame: "#f4f4f4" },
  { id: "slate", label: "เทา", swatch: "#5b6168", frame: "#eef0f2" },
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
