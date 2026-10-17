import { AtSign, Check } from "lucide-react";
import { useCollabTagPermission } from "@/hooks/useProjectCollabInvites";
import type { CollabTagPermission } from "@/lib/portfolioCollabInvites";
import { cn } from "@/lib/utils";
import { SettingsCard, useSaveStatus } from "@/components/settings/SettingsCard";

const OPTIONS: { value: CollabTagPermission; label: string; hint: string }[] = [
  {
    value: "mutual",
    label: "คนที่ติดตามกันทั้งคู่",
    hint: "ทุกการแท็กต้องรอคุณกดยอมรับก่อน ชื่อคุณถึงจะขึ้นในผลงาน",
  },
  {
    value: "nobody",
    label: "ไม่ให้ใครแท็ก",
    hint: "ไม่มีใครเพิ่มคุณเป็นผู้ร่วมงานในผลงานได้",
  },
];

/** Settings → Privacy: who can tag me as a collaborator on their work. */
export function CollabTagSettingsSection() {
  const { permission, isLoading, save } = useCollabTagPermission();
  const { status, track } = useSaveStatus();

  return (
    <SettingsCard
      icon={AtSign}
      title="ใครแท็กคุณในผลงานได้"
      description="โดนแท็กไปแล้ว ถอนชื่อได้จากหน้าผลงานนั้น"
      status={status}
    >
      <div role="radiogroup" aria-label="ใครแท็กคุณในผลงานได้" className="grid gap-2 sm:grid-cols-2">
        {OPTIONS.map((opt) => {
          const on = permission === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={isLoading || save.isPending}
              onClick={() => !on && void track(save.mutateAsync(opt.value))}
              className={cn(
                "flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
                on ? "border-foreground bg-foreground/5" : "border-border hover:bg-accent/40",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                  on ? "border-foreground bg-foreground text-background" : "border-muted-foreground/50",
                )}
                aria-hidden
              >
                {on ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">{opt.label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{opt.hint}</span>
              </span>
            </button>
          );
        })}
      </div>
    </SettingsCard>
  );
}
