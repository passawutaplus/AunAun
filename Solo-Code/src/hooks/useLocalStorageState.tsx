import * as React from "react";

/**
 * useLocalStorageState — useState ที่ persist ค่าเข้ากับ localStorage โดยอัตโนมัติ
 * ปลอดภัยต่อ SSR (ไม่แตะ window ตอน render บน server)
 *
 * ฟีเจอร์เพิ่มเติม (กัน race condition):
 *  - ข้ามการเขียนรอบแรก เพื่อไม่ทับค่าที่อ่านมาจาก storage โดยใช่เหตุ
 *  - ฟัง 'storage' event แล้วอัปเดต state เมื่อแท็บอื่นเขียนค่าเดียวกัน (cross-tab sync)
 *  - ใช้ ref กันการอัปเดตวนลูปเมื่อ event มาจากการเขียนของตัวเอง
 */
export function useLocalStorageState<T>(
  key: string,
  initialValue: T | (() => T),
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = React.useState<T>(() => {
    if (typeof window === "undefined") {
      return typeof initialValue === "function" ? (initialValue as () => T)() : initialValue;
    }
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) return JSON.parse(raw) as T;
    } catch {
      /* fallthrough to initial */
    }
    return typeof initialValue === "function" ? (initialValue as () => T)() : initialValue;
  });

  // เก็บค่าล่าสุดที่ "เราเขียนเอง" ไว้ เพื่อตรวจ event ที่กลับเข้ามาจากแท็บอื่น
  const lastWrittenRef = React.useRef<string | null>(null);
  const isFirstRunRef = React.useRef(true);

  // Persist ค่าเมื่อ state เปลี่ยน — ข้ามรอบแรกเพื่อกันทับค่าที่เพิ่งอ่านจาก storage
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (isFirstRunRef.current) {
      isFirstRunRef.current = false;
      return;
    }
    try {
      const serialized = JSON.stringify(state);
      lastWrittenRef.current = serialized;
      window.localStorage.setItem(key, serialized);
    } catch {
      /* quota / serialization errors are non-fatal */
    }
  }, [key, state]);

  // ฟังการเปลี่ยนแปลงจากแท็บอื่น
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key || e.newValue === null) return;
      // เพิกเฉยถ้าเป็นค่าที่เราเองเป็นคนเขียน (กัน loop)
      if (e.newValue === lastWrittenRef.current) return;
      try {
        setState(JSON.parse(e.newValue) as T);
      } catch {
        /* ignore malformed */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [key]);

  return [state, setState];
}
