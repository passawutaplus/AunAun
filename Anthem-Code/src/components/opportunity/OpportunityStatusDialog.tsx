import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { InlineLoader } from "@/components/ui/BanterLoader";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import OpportunityProfilePreview from "@/components/opportunity/OpportunityProfilePreview";
import { ChipMultiSelectWithOther } from "@/components/ui/ChipMultiSelectWithOther";
import {
  OPPORTUNITY_NOTE_MAX,
  OPPORTUNITY_TYPE_KEYS,
  labelOpportunityType,
  needsOpportunityTypeHint,
  normalizeOpportunityNote,
  normalizeOpportunityProfile,
} from "@/lib/opportunity";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const OpportunityStatusDialog = ({ open, onOpenChange }: Props) => {
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile(open ? user?.id : undefined);
  const updateMut = useUpdateProfile(user?.id);

  const [types, setTypes] = useState<string[]>([]);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open || !profile) return;
    const normalized = normalizeOpportunityProfile(
      (profile as { opportunity_status?: string }).opportunity_status,
      (profile as { opportunity_types?: string[] }).opportunity_types,
    );
    setTypes(normalized.types);
    setNote(normalizeOpportunityNote((profile as { opportunity_note?: string | null }).opportunity_note));
  }, [open, profile]);

  const canSave = !needsOpportunityTypeHint("open_to_opportunities", types);

  const save = async () => {
    if (!canSave) return;
    try {
      await updateMut.mutateAsync({
        opportunityStatus: "open_to_opportunities",
        opportunityTypes: types,
        opportunityNote: normalizeOpportunityNote(note),
      });
      toast.success("อัปเดตสเตตัสบนโปรไฟล์แล้ว");
      onOpenChange(false);
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === "object" && e && "message" in e && typeof (e as { message: unknown }).message === "string"
            ? (e as { message: string }).message
            : "บันทึกไม่สำเร็จ";
      toast.error(msg.includes("permission") || msg.includes("42501") || msg.includes("403")
        ? "บันทึกไม่สำเร็จ — ไม่มีสิทธิ์อัปเดตสเตตัส ลองรีเฟรชแล้วลองใหม่"
        : msg || "บันทึกไม่สำเร็จ");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto gap-0 p-0">
        <DialogHeader className="px-5 pt-5 pb-4 space-y-2 text-left border-b border-border/50">
          <DialogTitle className="text-lg font-semibold leading-snug pr-8">
            ช่วงนี้กำลังมองหาอะไร?
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
            ตั้งเป็นสเตตัสบนโปรไฟล์ บอกคนอื่นว่าควรทักเรื่องอะไร — เลือกได้หลายอย่าง และพิมพ์สั้น ๆ เพิ่มได้
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <InlineLoader />
        ) : (
          <div className="px-5 py-4 space-y-6">
            <section className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">กำลังมองหา</h3>
                <p className="text-xs text-muted-foreground mt-0.5">เลือกได้หลายข้อ — แสดงเป็นชิปบนโปรไฟล์</p>
              </div>
              <ChipMultiSelectWithOther
                options={OPPORTUNITY_TYPE_KEYS.map((id) => ({
                  id,
                  label: labelOpportunityType(id),
                }))}
                selected={types}
                onChange={setTypes}
                knownIds={OPPORTUNITY_TYPE_KEYS}
                otherPlaceholder="พิมพ์สิ่งที่มองหาแล้วกด Enter"
              />
              {types.length === 0 && (
                <p className="text-xs text-amber-500/90 leading-relaxed">
                  เลือกอย่างน้อย 1 อย่าง เพื่อให้คนทักคุณได้ตรงขึ้น
                </p>
              )}
            </section>

            <section className="space-y-2">
              <div>
                <h3 className="text-sm font-semibold text-foreground">เขียนสั้น ๆ (ไม่บังคับ)</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  เช่น “มองหา React dev โปรเจกต์ 2 เดือน” หรือ “เปิดรับคอลแลปด้าน branding”
                </p>
              </div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, OPPORTUNITY_NOTE_MAX))}
                rows={2}
                maxLength={OPPORTUNITY_NOTE_MAX}
                placeholder="ช่วงนี้กำลังมองหา…"
                className="w-full px-3.5 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              />
              <p className="text-[11px] text-muted-foreground text-right">
                {note.trim().length}/{OPPORTUNITY_NOTE_MAX}
              </p>
            </section>

            <OpportunityProfilePreview status="open_to_opportunities" types={types} note={note} />
          </div>
        )}

        <DialogFooter className="px-5 py-4 gap-2 sm:justify-end border-t border-border/50">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            ยกเลิก
          </Button>
          <Button
            type="button"
            onClick={() => void save()}
            disabled={updateMut.isPending || isLoading || !canSave}
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-5"
          >
            {updateMut.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "อัปเดตสเตตัส"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OpportunityStatusDialog;
