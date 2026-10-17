import { useLayoutEffect } from "react";
import { Outlet } from "react-router-dom";
import { LearnScrollBlur } from "@/components/learn/LearnScrollBlur";
import { MOBILE_PAGE_BOTTOM_CLASS } from "@/lib/mobileLayout";
import { cn } from "@/lib/utils";

export function LearnShell() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.add("learn-paper");
    return () => root.classList.remove("learn-paper");
  }, []);

  return (
    <main className={cn("min-h-screen bg-[#f5f5f5] text-[#2f2e2c]", MOBILE_PAGE_BOTTOM_CLASS)}>
      <LearnScrollBlur />
      <Outlet />
    </main>
  );
}
