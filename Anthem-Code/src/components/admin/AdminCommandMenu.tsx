import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ADMIN_TONE } from "@/lib/admin/adminTone";
import { adminSearchEntries, type AdminSearchEntry } from "@/lib/admin/adminNavigation";
import { adminDbGapForPath } from "@/lib/admin/adminDbGaps";
import { cn } from "@/lib/utils";

type Props = { open: boolean; onOpenChange: (open: boolean) => void };

/** Ctrl/⌘+K — jump to any back-office page by name, hint or synonym (Thai or English). */
export default function AdminCommandMenu({ open, onOpenChange }: Props) {
  const navigate = useNavigate();

  const byGroup = useMemo(() => {
    const map = new Map<string, AdminSearchEntry[]>();
    for (const e of adminSearchEntries()) {
      const list = map.get(e.groupTitle) ?? [];
      list.push(e);
      map.set(e.groupTitle, list);
    }
    return [...map.entries()];
  }, []);

  const go = (to: string) => {
    onOpenChange(false);
    navigate(to);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* The dialog is portalled outside the admin wrapper, so it carries the admin tokens itself. */}
      <DialogContent className="admin-theme overflow-hidden border-admin-border bg-admin-bg p-0 text-admin-fg shadow-xl sm:max-w-xl">
        <DialogTitle className="sr-only">ค้นหาเมนูหลังบ้าน</DialogTitle>
        <DialogDescription className="sr-only">พิมพ์ชื่อหน้าหรือคำที่เกี่ยวข้อง แล้วกด Enter เพื่อไปที่หน้านั้น</DialogDescription>
        <Command className="bg-admin-bg text-admin-fg [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.16em] [&_[cmdk-group-heading]]:text-admin-muted">
          <CommandInput placeholder="ค้นหาเมนู เช่น kyc, ถอนเงิน, รายงาน, ลิขสิทธิ์…" className="placeholder:text-admin-muted" />
          <CommandList className="max-h-[60vh]">
            <CommandEmpty>ไม่พบเมนูที่ตรงกัน</CommandEmpty>
            {byGroup.map(([title, entries]) => (
              <CommandGroup key={title} heading={title}>
                {entries.map((e) => {
                  const gap = adminDbGapForPath(e.to.split("?")[0]);
                  return (
                    <CommandItem
                      key={e.to + e.label}
                      value={`${e.label} ${e.to}`}
                      keywords={[e.hint, e.groupTitle, ...(e.keywords ?? [])]}
                      onSelect={() => go(e.to)}
                      className="gap-3 rounded-md px-2 py-2 data-[selected=true]:bg-admin-hover data-[selected=true]:text-admin-fg"
                    >
                      <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md", ADMIN_TONE[e.groupTone].chip)}>
                        <e.icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{e.label}</span>
                        <span className="block truncate text-[11px] text-admin-muted">{e.hint}</span>
                      </span>
                      {gap ? (
                        <span className="shrink-0 rounded border border-admin-border px-1 font-mono text-[9px] uppercase text-admin-muted">รอ DB</span>
                      ) : null}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
