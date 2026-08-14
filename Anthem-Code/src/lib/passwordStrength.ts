export type PasswordStrengthLevel = "empty" | "weak" | "fair" | "good" | "strong";

export type PasswordStrength = {
  level: PasswordStrengthLevel;
  score: number;
  label: string;
  /** True when length meets product minimum (8). */
  meetsMinLength: boolean;
};

/** UI-only strength guide — server still accepts min length 8. */
export function scorePassword(password: string): PasswordStrength {
  const meetsMinLength = password.length >= 8;
  if (!password) {
    return { level: "empty", score: 0, label: "", meetsMinLength: false };
  }

  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (!meetsMinLength || score <= 1) {
    return { level: "weak", score, label: "อ่อน", meetsMinLength };
  }
  if (score === 2) return { level: "fair", score, label: "พอใช้", meetsMinLength };
  if (score === 3) return { level: "good", score, label: "ดี", meetsMinLength };
  return { level: "strong", score, label: "แข็งแรง", meetsMinLength };
}
