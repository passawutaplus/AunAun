export const ABOUT_CV_THEMES = [
  { id: "orange", label: "เน้นสีส้ม", swatch: "#e85d04", frame: "#ffffff" },
  { id: "mono", label: "ขาว-ดำ", swatch: "#111111", frame: "#ffffff" },
  { id: "slate", label: "เส้นดำ", swatch: "#111111", frame: "#ffffff" },
] as const;

export type AboutCvTheme = (typeof ABOUT_CV_THEMES)[number]["id"];
