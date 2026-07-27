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
import WorkDisciplineEditor from "@/components/profile/WorkDisciplineEditor";
import DisciplineChips from "@/components/profile/DisciplineChips";
import { ChipMultiSelectWithOther } from "@/components/ui/ChipMultiSelectWithOther";
import {
  OPPORTUNITY_TYPE_KEYS,
  labelOpportunityType,
  needsOpportunityTypeHint,
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
  const [disciplines, setDisciplines] = useState<string[]>([]);

  useEffect(() => {
    if (!open || !profile) return;
    const normalized = normalizeOpportunityProfile(
      (profile as { opportunity_status?: string }).opportunity_status,
      (profile as { opportunity_types?: string[] }).opportunity_types,
    );
    setTypes(normalized.types);
    const cats = (profile as { preferred_categories?: unknown }).preferred_categories;
    setDisciplines(
      Array.isArray(cats) ? cats.filter((s): s is string => typeof s === "string") : [],
    );
  }, [open, profile]);

  const canSave = !needsOpportunityTypeHint("open_to_opportunities", types);

  const save = async () => {
    if (!canSave) return;
    try {
      await updateMut.mutateAsync({
        opportunityStatus: "open_to_opportunities",
        opportunityTypes: types,
        opportunityNote: "",
        preferredCategories: disciplines,
      });
      toast.success("อัปเดตโปรไฟล์แล้ว");
      onOpenChange(false);
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === "object" && e && "message" in e && typeof (e as { message: unknown }).message === "string"
            ? (e as { message: string }).message
            : "บันทึกไม่สำเร็จ";
      toast.error(
        msg.includes("permission") || msg.includes("42501") || msg.includes("403")
          ? "บันทึกไม่สำเร็จ — ไม่มีสิทธิ์อัปเดต ลองรีเฟรชแล้วลองใหม่"
          : msg || "บันทึกไม่สำเร็จ",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto gap-0 p-0">
        <DialogHeader className="px-5 pt-5 pb-4 space-y-2 text-left border-b border-border/50">
          <DialogTitle className="text-lg font-semibold leading-snug pr-8">
            แก้ไขกำลังมองหาและสายงาน
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
            ตั้งสเตตัสบนโปรไฟล์ และเลือกสายงานที่ทำ — แสดงใต้ชื่อในหน้าโปรไฟล์
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <InlineLoader />
        ) : (
          <div className="px-5 py-4 space-y-6">
            <section className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">สายงาน</h3>
                <p className="text-xs text-muted-foreground mt-0.5">หมวดงานที่คุณทำ — แสดงเป็นชิปแถวบน</p>
              </div>
              <WorkDisciplineEditor value={disciplines} onChange={setDisciplines} />
              {disciplines.length ? (
                <div className="rounded-xl border border-border/60 bg-secondary/40 p-3 space-y-2">
                  <p className="text-[11px] text-muted-foreground">ตัวอย่างบนโปรไฟล์</p>
                  <DisciplineChips disciplines={disciplines} size="md" />
                </div>
              ) : null}
            </section>

            <section className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">กำลังมองหา</h3>
                <p className="text-xs text-muted-foreground mt-0.5">เลือกได้หลายข้อ — แสดงเป็นชิปแถวล่าง</p>
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

            <OpportunityProfilePreview status="open_to_opportunities" types={types} />
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
            {updateMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "บันทึก"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OpportunityStatusDialog;
