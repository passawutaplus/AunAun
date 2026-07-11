import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";
import { BRAND_STORAGE_THEME } from "@/lib/brandConfig";

export const ThemeProvider = ({ children }: { children: ReactNode }) => (
  <NextThemesProvider
    attribute="class"
    defaultTheme="system"
    enableSystem
    disableTransitionOnChange={false}
    storageKey={BRAND_STORAGE_THEME}
  >
    {children}
  </NextThemesProvider>
);
