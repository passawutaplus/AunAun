import { createContext, useContext, type ReactNode } from "react";
import { useSensitiveActionReauth } from "@/hooks/useSensitiveActionReauth";

type Ctx = {
  ensureVerified: (reason: string) => Promise<void>;
};

const SensitiveActionReauthContext = createContext<Ctx | null>(null);

/** ครอบ App เพื่อให้ทุกจุดเรียก ensureVerified ได้โดยไม่ซ้ำ dialog */
export function SensitiveActionReauthProvider({ children }: { children: ReactNode }) {
  const { ensureVerified, reauthDialog } = useSensitiveActionReauth();

  return (
    <SensitiveActionReauthContext.Provider value={{ ensureVerified }}>
      {children}
      {reauthDialog}
    </SensitiveActionReauthContext.Provider>
  );
}

export function useEnsureSensitiveAction() {
  const ctx = useContext(SensitiveActionReauthContext);
  if (!ctx) {
    throw new Error("useEnsureSensitiveAction must be used within SensitiveActionReauthProvider");
  }
  return ctx.ensureVerified;
}
