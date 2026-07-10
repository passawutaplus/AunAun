import { useEffect, useState } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";
import { CompactLoader, InlineLoader } from "@/components/ui/BanterLoader";
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
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import OpportunityProfilePreview from "@/components/opportunity/OpportunityProfilePreview";
import {
  OPPORTUNITY_AVAILABILITY,
  OPPORTUNITY_STATUS_KEYS,
  OPPORTUNITY_TYPE_KEYS,
  labelOpportunityType,
  needsOpportunityTypeHint,
  normalizeOpportunityProfile,
  type OpportunityStatusKey,
  type OpportunityTypeKey,
} from "@/lib/opportunity";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const OpportunityStatusDialog = ({ open, onOpenChange }: Props) => {
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile(open ? user?.id : undefined);
  const updateMut = useUpdateProfile(user?.id);

  const [status, setStatus] = useState<OpportunityStatusKey>("open_to_opportunities");
  const [types, setTypes] = useState<OpportunityTypeKey[]>([]);

  useEffect(() => {
    if (!open || !profile) return;
    const normalized = normalizeOpportunityProfile(
      (profile as { opportunity_status?: string }).opportunity_status,
      (profile as { opportunity_types?: string[] }).opportunity_types,
    );
    setStatus(normalized.status);
    setTypes(normalized.types);
  }, [open, profile]);

  const toggleType = (key: OpportunityTypeKey) => {
    setTypes((prev) =>
      prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key],
    );
  };

  const save = async () => {
    if (needsOpportunityTypeHint(status, types)) {
      return;
    }
    try {
      await updateMut.mutateAsync({ opportunityStatus: status, opportunityTypes: types });
      toast.success("อัปเดตบนโปรไฟล์แล้ว");
      onOpenChange(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto gap-0 p-0">
        <DialogHeader className="px-5 pt-5 pb-4 space-y-2 text-left border-b border-border/50">
          <DialogTitle className="text-lg font-semibold leading-snug pr-8">
            ตอนนี้คุณเปิดรับอะไรอยู่?
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
            บอกให้คนที่สนใจผลงานของคุณรู้ว่าเขาควรทักเรื่องอะไรได้บ้าง ข้อมูลนี้จะแสดงเป็นชิปบนโปรไฟล์
            และช่วยให้โอกาสที่เข้ามาตรงกับคุณมากขึ้น
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <InlineLoader />
        ) : (
          <div className="px-5 py-4 space-y-6">
            <section className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">ความพร้อมตอนนี้</h3>
                <p className="text-xs text-muted-foreground mt-0.5">เลือกได้เพียงข้อเดียว</p>
              </div>
              <div className="space-y-2">
                {OPPORTUNITY_STATUS_KEYS.map((key) => {
                  const option = OPPORTUNITY_AVAILABILITY[key];
                  const active = status === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setStatus(key)}
                      className={cn(
                        "w-full text-left rounded-2xl border p-4 transition-all",
                        "hover:border-primary/40 hover:bg-accent/30",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                        active
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-border/60 bg-card/40",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "mt-0.5 w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors",
                            active
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-muted-foreground/40",
                          )}
                        >
                          {active && <Check className="w-3 h-3" strokeWidth={3} />}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-foreground">
                              {option.title}
                            </span>
                            {option.recommended && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/20 text-primary">
                                <Sparkles className="w-3 h-3" />
                                แนะนำ
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {option.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {status !== "not_available" && (
              <section className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    อยากให้คนทักเรื่องอะไรได้บ้าง?
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">เลือกได้หลายข้อ</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {OPPORTUNITY_TYPE_KEYS.map((key) => {
                    const active = types.includes(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleType(key)}
                        className={cn(
                          "px-3.5 py-2 min-h-10 rounded-full text-xs font-medium transition-all",
                          "border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                          active
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-secondary/80 text-foreground border-border/60 hover:border-primary/30 hover:bg-accent",
                        )}
                      >
                        {labelOpportunityType(key)}
                      </button>
                    );
                  })}
                </div>
                {status === "open_to_opportunities" && types.length === 0 && (
                  <p className="text-xs text-amber-500/90 leading-relaxed">
                    เลือกอย่างน้อย 1 ประเภท เพื่อให้คนทักคุณได้ตรงขึ้น
                  </p>
                )}
              </section>
            )}

            <OpportunityProfilePreview status={status} types={types} />
          </div>
        )}

        <DialogFooter className="px-5 py-4 gap-2 sm:justify-end border-t border-border/50">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            ยกเลิก
          </Button>
          <Button
            type="button"
            onClick={() => void save()}
            disabled={updateMut.isPending || isLoading || needsOpportunityTypeHint(status, types)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-5"
          >
            {updateMut.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "แสดงบนโปรไฟล์"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OpportunityStatusDialog;
