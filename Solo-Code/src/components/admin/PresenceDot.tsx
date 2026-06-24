import * as React from "react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

const ONLINE_WINDOW_MS = 5 * 60 * 1000; // 5 นาที

export function PresenceDot({ lastSeen }: { lastSeen?: Date | null }) {
  const isOnline = !!lastSeen && Date.now() - lastSeen.getTime() < ONLINE_WINDOW_MS;
  const label = isOnline
    ? "ออนไลน์อยู่"
    : lastSeen
      ? `ออฟไลน์ · ใช้งานล่าสุด ${lastSeen.toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })}`
      : "ยังไม่มีกิจกรรม";
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            aria-label={label}
            className={`inline-block h-2 w-2 rounded-full ring-2 ring-background ${
              isOnline ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/40"
            }`}
          />
        </TooltipTrigger>
        <TooltipContent side="top">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
