import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Plus, X } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DASHBOARD_SHORTCUT_GROUPS,
  DASHBOARD_SHORTCUT_MAX,
  DASHBOARD_SHORTCUT_OPTIONS,
  getShortcutOption,
  normalizeShortcutIds,
} from "@/lib/dashboardNavCatalog";

type Props = {
  onGo: (tab: string, sub?: string) => void;
};

export function DashboardShortcuts({ onGo }: Props) {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [shortcutIds, setShortcutIds] = React.useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [replaceIndex, setReplaceIndex] = React.useState<number | null>(null);

  React.useEffect(() => {
    const data = (profile?.onboarding_data ?? {}) as Record<string, unknown>;
    setShortcutIds(normalizeShortcutIds(data.dashboard_shortcuts));
  }, [profile?.onboarding_data]);

  const persist = async (next: string[]) => {
    setShortcutIds(next);
    if (!user) return;
    const prev = (profile?.onboarding_data ?? {}) as Record<string, unknown>;
    const { error } = await supabase
      .from("profiles")
      .update({
        onboarding_data: { ...prev, dashboard_shortcuts: next },
      } as never)
      .eq("user_id", user.id);
    if (error) {
      toast.error("บันทึกปุ่มลัดไม่สำเร็จ");
      return;
    }
    await refreshProfile();
  };

  const openPicker = (index: number | null = null) => {
    setReplaceIndex(index);
    setPickerOpen(true);
  };

  const addShortcut = async (id: string) => {
    const replacing =
      replaceIndex != null && replaceIndex >= 0 && replaceIndex < shortcutIds.length;
    const existingAt = shortcutIds.indexOf(id);
    if (!replacing && existingAt >= 0) {
      toast.info("มีปุ่มลัดนี้อยู่แล้ว");
      return;
    }
    if (replacing && existingAt === replaceIndex) {
      setPickerOpen(false);
      setReplaceIndex(null);
      return;
    }

    let next: string[];
    if (replacing) {
      next = [...shortcutIds];
      if (existingAt >= 0 && existingAt !== replaceIndex) {
        const prevId = next[replaceIndex!];
        next[replaceIndex!] = id;
        next[existingAt] = prevId;
      } else {
        next[replaceIndex!] = id;
      }
    } else if (shortcutIds.length >= DASHBOARD_SHORTCUT_MAX) {
      toast.info(`เพิ่มได้สูงสุด ${DASHBOARD_SHORTCUT_MAX} ปุ่ม — ลบปุ่มเดิมก่อน`);
      return;
    } else {
      next = [...shortcutIds, id];
    }

    await persist(next);
    setPickerOpen(false);
    setReplaceIndex(null);
    toast.success("บันทึกปุ่มลัดแล้ว");
  };

  const removeShortcut = async (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = shortcutIds.filter((_, i) => i !== index);
    await persist(next);
    toast.success("ลบปุ่มลัดแล้ว");
  };

  const slots = Array.from({ length: DASHBOARD_SHORTCUT_MAX }, (_, i) => shortcutIds[i] ?? null);

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1 pr-1 overflow-visible">
        {slots.map((id, index) =>
          id ? (
            <ShortcutPill
              key={`${id}-${index}`}
              option={getShortcutOption(id)!}
              onNavigate={() => {
                const ref = getShortcutOption(id);
                if (!ref) return;
                if (ref.href) {
                  void navigate({ to: ref.href });
                  return;
                }
                onGo(ref.section, ref.sub);
              }}
              onRemove={(e) => removeShortcut(index, e)}
            />
          ) : (
            <AddShortcutPill key={`empty-${index}`} onClick={() => openPicker(null)} />
          ),
        )}
      </div>

      <CommandDialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <CommandInput placeholder="ค้นหาเมนู..." />
        <CommandList>
          <CommandEmpty>ไม่พบเมนู</CommandEmpty>
          {DASHBOARD_SHORTCUT_GROUPS.map((group) => (
            <CommandGroup key={group} heading={group}>
              {DASHBOARD_SHORTCUT_OPTIONS.filter((o) => o.group === group).map((option) => {
                const taken = shortcutIds.includes(option.id);
                return (
                  <CommandItem
                    key={option.id}
                    value={`${option.label} ${option.group}`}
                    disabled={taken && replaceIndex == null}
                    onSelect={() => addShortcut(option.id)}
                    className="gap-2"
                  >
                    <option.icon className="h-4 w-4 text-primary" />
                    <span className="flex-1">{option.label}</span>
                    {taken && <span className="text-[10px] text-muted-foreground">มีอยู่แล้ว</span>}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}

function ShortcutPill({
  option,
  onNavigate,
  onRemove,
}: {
  option: NonNullable<ReturnType<typeof getShortcutOption>>;
  onNavigate: () => void;
  onRemove: (e: React.MouseEvent) => void;
}) {
  const Icon = option.icon;

  return (
    <div className="group relative overflow-visible">
      <button
        type="button"
        onClick={onNavigate}
        className="w-full rounded-xl border border-border/60 bg-card hover:bg-card hover:shadow-elevated hover:-translate-y-0.5 transition-all p-3 flex items-center gap-2 text-left"
      >
        <span className="rounded-lg bg-primary-soft text-primary p-2 shrink-0">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold truncate">{option.label}</p>
        </div>
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mr-0.5" />
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="absolute -top-2 -right-2 z-10 rounded-full bg-background border border-border/60 p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
        aria-label={`ลบปุ่มลัด ${option.label}`}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

function AddShortcutPill({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border border-dashed border-border/70 bg-muted/20 hover:bg-muted/40 hover:border-primary/40",
        "transition-all p-3 flex items-center justify-center gap-2 min-h-[52px] text-muted-foreground hover:text-primary",
      )}
    >
      <Plus className="h-4 w-4" />
      <span className="text-xs font-medium">เพิ่มปุ่มลัดเมนู</span>
    </button>
  );
}
