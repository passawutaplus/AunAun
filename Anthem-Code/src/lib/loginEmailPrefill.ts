const KEY = "aplus1:login-email";

export function saveLoginEmailPrefill(email: string): void {
  if (typeof window === "undefined") return;
  const t = email.trim();
  if (!t) {
    sessionStorage.removeItem(KEY);
    return;
  }
  sessionStorage.setItem(KEY, t);
}

export function readLoginEmailPrefill(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(KEY)?.trim() ?? "";
}

export function loginEmailFormatError(email: string): string | null {
  const t = email.trim();
  if (!t) return "กรุณากรอกอีเมล";
  if (!/^\S+@\S+\.\S+$/.test(t)) return "กรุณากรอกอีเมลให้ถูกต้อง";
  return null;
}

export function loginPasswordEmptyError(password: string): string | null {
  if (!password) return "กรุณากรอกรหัสผ่าน";
  return null;
}
