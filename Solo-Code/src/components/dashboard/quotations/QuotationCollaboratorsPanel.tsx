import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Save, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import {
  useQuotationCollaborators,
  useSyncQuotationCollaborators,
} from "@/hooks/useQuotationCollaborators";
import { ensureSingleLead, validateCollaboratorRevenue } from "@/lib/collaboratorValidation";
import type { QuotationCollaborator, QuotationKind } from "@/lib/quotationKinds";

type DraftCollaborator = Omit<QuotationCollaborator, "id" | "quotationId">;

interface Props {
  quotationId: string;
  quotationKind?: QuotationKind;
  canEdit?: boolean;
  /** ใช้ภายใน collapsible block — ไม่แสดง Card header ซ้ำ */
  embedded?: boolean;
}

export function QuotationCollaboratorsPanel({
  quotationId,
  quotationKind,
  canEdit = false,
  embedded = false,
}: Props) {
  const { data: collaborators = [], isLoading } = useQuotationCollaborators(
    quotationKind && quotationKind !== "solo" ? quotationId : undefined,
  );
  const sync = useSyncQuotationCollaborators();
  const [draft, setDraft] = React.useState<DraftCollaborator[]>([]);
  const [dirty, setDirty] = React.useState(false);

  React.useEffect(() => {
    setDraft(
      collaborators.map((c) => ({
        userId: c.userId,
        displayName: c.displayName,
        role: c.role,
        revenuePercent: c.revenuePercent,
        sortOrder: c.sortOrder,
      })),
    );
    setDirty(false);
  }, [collaborators]);

  if (!quotationKind || quotationKind === "solo") return null;

  const label =
    quotationKind === "inhouse" ? "สมาชิกทีม (In-House)" : "สมาชิก Studio (Aplus1 nest)";

  const updateRow = (index: number, patch: Partial<DraftCollaborator>) => {
    setDraft((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
    setDirty(true);
  };

  const removeRow = (index: number) => {
    setDraft((rows) => rows.filter((_, i) => i !== index).map((r, i) => ({ ...r, sortOrder: i })));
    setDirty(true);
  };

  const addRow = () => {
    setDraft((rows) => [
      ...rows,
      {
        userId: null,
        displayName: "",
        role: rows.some((r) => r.role === "lead") ? "member" : "lead",
        revenuePercent: null,
        sortOrder: rows.length,
      },
    ]);
    setDirty(true);
  };

  const handleSave = async () => {
    const leadCheck = ensureSingleLead(draft);
    if (!leadCheck.ok) {
      toast.error(leadCheck.message);
      return;
    }
    const revCheck = validateCollaboratorRevenue(draft);
    if (!revCheck.ok) {
      toast.error(revCheck.message);
      return;
    }
    try {
      await sync.mutateAsync({ quotationId, collaborators: draft });
      toast.success("บันทึกสมาชิกแล้ว");
      setDirty(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    }
  };

  const body = (
    <>
      {embedded && canEdit && dirty && (
        <div className="flex justify-end -mt-1 mb-1">
          <Button size="sm" className="h-8 gap-1" onClick={handleSave} disabled={sync.isPending}>
            {sync.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            บันทึก
          </Button>
        </div>
      )}
      {isLoading ? (
        <p className="text-xs text-muted-foreground">กำลังโหลด...</p>
      ) : draft.length === 0 ? (
        <p className="text-xs text-muted-foreground">ยังไม่มีสมาชิกในใบเสนอราคานี้</p>
      ) : (
        <ul className="space-y-3">
          {draft.map((c, i) => (
            <li
              key={`${c.userId ?? "x"}-${i}`}
              className="rounded-lg border border-border/60 p-3 space-y-2"
            >
              {canEdit ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <Label className="text-[10px]">ชื่อที่แสดง</Label>
                      <Input
                        value={c.displayName ?? ""}
                        onChange={(e) => updateRow(i, { displayName: e.target.value })}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px]">บทบาท</Label>
                      <Select
                        value={c.role}
                        onValueChange={(v) => updateRow(i, { role: v as "lead" | "member" })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lead">Lead</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[10px]">สัดส่วน %</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={c.revenuePercent ?? ""}
                        onChange={(e) =>
                          updateRow(i, {
                            revenuePercent: e.target.value === "" ? null : Number(e.target.value),
                          })
                        }
                        className="h-8 text-sm"
                        placeholder="—"
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-destructive"
                    onClick={() => removeRow(i)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    ลบ
                  </Button>
                </>
              ) : (
                <div className="flex items-center justify-between text-sm">
                  <span>{c.displayName || "สมาชิก"}</span>
                  <div className="flex items-center gap-2">
                    {c.revenuePercent != null && (
                      <span className="text-xs text-muted-foreground num">{c.revenuePercent}%</span>
                    )}
                    {c.role === "lead" && (
                      <Badge variant="secondary" className="text-[10px]">
                        Lead
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {canEdit && (
        <Button type="button" variant="outline" size="sm" className="h-8 gap-1" onClick={addRow}>
          <Plus className="h-3.5 w-3.5" />
          เพิ่มสมาชิก
        </Button>
      )}
    </>
  );

  if (embedded) {
    return <div className="space-y-3">{body}</div>;
  }

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="h-4 w-4" />
          {label}
        </CardTitle>
        {canEdit && dirty && (
          <Button size="sm" className="h-8 gap-1" onClick={handleSave} disabled={sync.isPending}>
            {sync.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            บันทึก
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">{body}</CardContent>
    </Card>
  );
}
