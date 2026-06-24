import * as React from "react";

/**
 * useDemoSeed — มาร์ก localStorage flag ครั้งเดียวเมื่อโหลดฟีเจอร์ตัวอย่างให้ user
 *
 * ใช้คู่กับ pattern: ถ้ายังไม่มี flag → ใช้ DEMO_DATA, แล้วตั้ง flag เพื่อไม่ seed ซ้ำ
 * คืนค่า hasSeededBefore เพื่อให้ component ตัดสินใจตอนสร้าง initial state ได้
 */
export function useDemoSeed(flagKey: string): { hasSeededBefore: boolean } {
  const hasSeededBefore = React.useMemo(() => {
    if (typeof window === "undefined") return true; // SSR: อย่า seed ตอน render บน server
    try {
      return window.localStorage.getItem(flagKey) !== null;
    } catch {
      return true;
    }
  }, [flagKey]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(flagKey, "1");
    } catch {
      /* non-fatal */
    }
  }, [flagKey]);

  return { hasSeededBefore };
}
