/**
 * TH / EN / 中文 copy for /auth (login + sign-up). The language is remembered in localStorage so an
 * artist who reads their invitation in English lands on an English sign-up page.
 */
import { useSyncExternalStore } from "react";
import type { PageLang } from "@/lib/creatorInvite";

const KEY = "samecor.uiLang";
const EVENT = "samecor-ui-lang";

export function getUiLang(): PageLang {
  try {
    const v = localStorage.getItem(KEY);
    return v === "en" || v === "zh" ? v : "th";
  } catch {
    return "th";
  }
}

export function setUiLang(lang: PageLang) {
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function useUiLang(): [PageLang, (l: PageLang) => void] {
  const lang = useSyncExternalStore(
    (cb) => {
      window.addEventListener(EVENT, cb);
      window.addEventListener("storage", cb);
      return () => {
        window.removeEventListener(EVENT, cb);
        window.removeEventListener("storage", cb);
      };
    },
    getUiLang,
    () => "th" as PageLang,
  );
  return [lang, setUiLang];
}

const th = {
  language: "ภาษา",
  seoTitle: "เข้าสู่ระบบ",
  backHome: "กลับหน้าแรก",
  heroLine: "",
  welcomeBack: "ยินดีต้อนรับกลับมา",
  createAccount: "สร้างบัญชีใหม่",
  startFree: "เริ่มต้นใช้งานฟรี",
  loginTab: "เข้าสู่ระบบ",
  signupTab: "สมัครสมาชิก",
  agreePrefix: "ดำเนินการต่อเท่ากับยอมรับ",
  terms: "ข้อกำหนด",
  and: "และ",
  privacy: "นโยบายความเป็นส่วนตัว",
  badLogin: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
  loginOk: "เข้าสู่ระบบสำเร็จ",
  email: "อีเมล",
  password: "รหัสผ่าน",
  remember: "จดจำฉันไว้",
  forgot: "ลืมรหัสผ่าน?",
  login: "เข้าสู่ระบบ",
  noAccount: "ยังไม่มีบัญชี?",
  signupHere: "สมัครสมาชิกที่นี่",
  emailInvalid: "กรุณากรอกอีเมลให้ถูกต้อง",
  passShort: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร",
  passMismatch: "รหัสผ่านยืนยันไม่ตรงกัน",
  consentRequired: "กรุณายอมรับข้อกำหนดและนโยบายความเป็นส่วนตัวก่อนสมัคร",
  emailTaken: "อีเมลนี้มีบัญชีแล้ว ลองเข้าสู่ระบบแทน",
  signupOk: "สมัครสำเร็จ ยินดีต้อนรับสู่ SAMECOR",
  displayName: "ชื่อที่แสดง",
  namePlaceholder: "ชื่อของคุณ",
  passwordMin: "รหัสผ่าน (อย่างน้อย 8 ตัว)",
  confirmPassword: "ยืนยันรหัสผ่าน",
  signup: "สมัครสมาชิก",
  haveAccount: "มีบัญชีอยู่แล้ว?",
  google: "เข้าสู่ระบบด้วย Google",
  orEmail: "หรือเข้าด้วยอีเมล",
  termsTitle: "ข้อกำหนดการใช้งาน",
  termsAccept: "ยอมรับ",
  termsBody: "เข้าใจว่า SAMECOR ช่วยให้ผลงานถูกค้นพบและเริ่มคุยเรื่องโอกาส",
  termsNot: "ไม่ใช่",
  termsBody2: "ตัวแทนจัดหางานหรือผู้รับประกันการจ้าง",
  privacyTitle: "ความเป็นส่วนตัว",
  privacyAck: "รับทราบ",
  pdpa: "นโยบาย PDPA",
  cookies: "คุกกี้",
  privacyBody: "เราใช้ข้อมูลเพื่อบัญชี โปรไฟล์ ผลงาน และความปลอดภัย",
};
export type AuthCopy = typeof th;

const en: AuthCopy = {
  language: "Language",
  seoTitle: "Sign in",
  backHome: "Back to home",
  heroLine: "Let your work take you to new opportunities",
  welcomeBack: "Welcome back",
  createAccount: "Create your account",
  startFree: "Get started for free",
  loginTab: "Sign in",
  signupTab: "Sign up",
  agreePrefix: "By continuing you accept the",
  terms: "Terms",
  and: "and",
  privacy: "Privacy Policy",
  badLogin: "Incorrect email or password",
  loginOk: "Signed in",
  email: "Email",
  password: "Password",
  remember: "Remember me",
  forgot: "Forgot password?",
  login: "Sign in",
  noAccount: "No account yet?",
  signupHere: "Sign up here",
  emailInvalid: "Please enter a valid email",
  passShort: "Password must be at least 8 characters",
  passMismatch: "Passwords don't match",
  consentRequired: "Please accept the Terms and Privacy Policy to sign up",
  emailTaken: "This email already has an account — try signing in",
  signupOk: "Signed up — welcome to SAMECOR",
  displayName: "Display name",
  namePlaceholder: "Your name",
  passwordMin: "Password (at least 8 characters)",
  confirmPassword: "Confirm password",
  signup: "Sign up",
  haveAccount: "Already have an account?",
  google: "Continue with Google",
  orEmail: "or use your email",
  termsTitle: "Terms of use",
  termsAccept: "I accept the",
  termsBody: "and understand that SAMECOR helps work get discovered and starts conversations about opportunities. It is",
  termsNot: "not",
  termsBody2: "a recruitment agency and does not guarantee work",
  privacyTitle: "Privacy",
  privacyAck: "I acknowledge the",
  pdpa: "PDPA policy",
  cookies: "cookies",
  privacyBody: "we use data for your account, profile, work and security",
};

const zh: AuthCopy = {
  language: "语言",
  seoTitle: "登录",
  backHome: "返回首页",
  heroLine: "让作品带您走向新的机会",
  welcomeBack: "欢迎回来",
  createAccount: "创建账号",
  startFree: "免费开始使用",
  loginTab: "登录",
  signupTab: "注册",
  agreePrefix: "继续即表示您接受",
  terms: "条款",
  and: "和",
  privacy: "隐私政策",
  badLogin: "邮箱或密码错误",
  loginOk: "登录成功",
  email: "邮箱",
  password: "密码",
  remember: "记住我",
  forgot: "忘记密码？",
  login: "登录",
  noAccount: "还没有账号？",
  signupHere: "在此注册",
  emailInvalid: "请输入有效的邮箱",
  passShort: "密码至少需要 8 个字符",
  passMismatch: "两次输入的密码不一致",
  consentRequired: "注册前请先同意条款和隐私政策",
  emailTaken: "该邮箱已注册，请直接登录",
  signupOk: "注册成功，欢迎加入 SAMECOR",
  displayName: "显示名称",
  namePlaceholder: "您的名字",
  passwordMin: "密码（至少 8 个字符）",
  confirmPassword: "确认密码",
  signup: "注册",
  haveAccount: "已有账号？",
  google: "使用 Google 登录",
  orEmail: "或使用邮箱",
  termsTitle: "使用条款",
  termsAccept: "我接受",
  termsBody: "并了解 SAMECOR 帮助作品被发现并促成合作沟通，但",
  termsNot: "并非",
  termsBody2: "招聘中介，也不保证获得工作",
  privacyTitle: "隐私",
  privacyAck: "我已知悉",
  pdpa: "PDPA 政策",
  cookies: "Cookie",
  privacyBody: "我们使用数据来管理账号、主页、作品与安全",
};

export function authCopy(lang: PageLang): AuthCopy {
  return lang === "en" ? en : lang === "zh" ? zh : th;
}
