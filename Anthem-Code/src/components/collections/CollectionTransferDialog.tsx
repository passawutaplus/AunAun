import { useEffect, useState } from "react";
import { Check, Layers3, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CollectionWithCovers } from "@/hooks/useCollections";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "copy" | "move";
  /** How many works are being transferred. */
  count: number;
  /** The owner's collections, minus the one the works are in. */
  targets: CollectionWithCovers[];
  busy: boolean;
  onConfirm: (targetCollectionId: string) => void;
};

/** Pick one of the owner's other collections to copy or move the selected works into. */
export default function CollectionTransferDialog({ open, onOpenChange, mode, count, targets, busy, onConfirm }: Props) {
  const [targetId, setTargetId] = useState<string | null>(null);

  useEffect(() => {
    if (open) setTargetId(null);
  }, [open]);

  const verb = mode === "move" ? "ย้าย" : "คัดลอก";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {verb} {count} ผลงานไปที่
          </DialogTitle>
        </DialogHeader>

        {targets.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            ยังไม่มีคอลเลกชันอื่น — สร้างคอลเลกชันใหม่ก่อน
          </p>
        ) : (
          <ul className="max-h-72 space-y-1 overflow-y-auto" role="radiogroup" aria-label="คอลเลกชันปลายทาง">
            {targets.map((c) => {
              const selected = targetId === c.id;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setTargetId(c.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-accent",
                      selected && "bg-accent",
                    )}
                  >
                    <div className="grid h-10 w-10 shrink-0 grid-cols-2 grid-rows-2 gap-px overflow-hidden rounded-md bg-muted">
                      {c.covers.length === 1 ? (
                        <img src={c.covers[0]} alt="" className="col-span-2 row-span-2 h-full w-full object-cover" />
                      ) : (
                        c.covers.slice(0, 4).map((u, i) => (
                          <img key={i} src={u} alt="" className="h-full w-full object-cover" loading="lazy" />
                        ))
                      )}
                      {c.covers.length === 0 ? (
                        <div className="col-span-2 row-span-2 flex items-center justify-center">
                          <Layers3 className="h-4 w-4 text-muted-foreground" />
                        </div>
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1 text-sm font-medium text-foreground">
                        <span className="truncate">{c.name}</span>
                        {!c.is_public ? <Lock className="h-3 w-3 shrink-0 text-muted-foreground" /> : null}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{c.item_count} ผลงาน</p>
                    </div>
                    <span
                      aria-hidden
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                        selected ? "border-primary bg-primary text-primary-foreground" : "border-border",
                      )}
                    >
                      {selected ? <Check className="h-3.5 w-3.5" /> : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="ghost" className="rounded-full" disabled={busy} onClick={() => onOpenChange(false)}>
            ยกเลิก
          </Button>
          <Button
            type="button"
            variant="gradient"
            className="rounded-full"
            disabled={busy || !targetId}
            onClick={() => targetId && onConfirm(targetId)}
          >
            {busy ? "กำลังดำเนินการ..." : verb}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
