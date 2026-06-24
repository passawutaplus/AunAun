import * as React from "react";

const LOCKOUT_KEY = "so1o_login_lockout";
const FAIL_KEY = "so1o_login_fails";
const MAX_FAILS = 5;
const LOCKOUT_SECONDS = 30;

export function useAuthLockout() {
  const [lockedUntil, setLockedUntil] = React.useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return Number(sessionStorage.getItem(LOCKOUT_KEY) || 0);
  });
  const [now, setNow] = React.useState(Date.now());

  React.useEffect(() => {
    if (lockedUntil <= Date.now()) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [lockedUntil]);

  const remaining = Math.max(0, Math.ceil((lockedUntil - now) / 1000));
  const isLocked = remaining > 0;

  function recordFail() {
    const fails = Number(sessionStorage.getItem(FAIL_KEY) || 0) + 1;
    sessionStorage.setItem(FAIL_KEY, String(fails));
    if (fails >= MAX_FAILS) {
      const until = Date.now() + LOCKOUT_SECONDS * 1000;
      sessionStorage.setItem(LOCKOUT_KEY, String(until));
      sessionStorage.setItem(FAIL_KEY, "0");
      setLockedUntil(until);
    }
  }

  function reset() {
    sessionStorage.setItem(FAIL_KEY, "0");
    sessionStorage.setItem(LOCKOUT_KEY, "0");
    setLockedUntil(0);
  }

  return { isLocked, remaining, recordFail, reset };
}
