import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ArrowLeft,
  Plus,
  FileText,
  Loader2,
  Trash2,
  Brain,
  ShieldCheck,
  Save,
  Check,
  Eye,
  Pencil,
  Copy as CopyIcon,
  X as XIcon,
  Download,
  Receipt,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";
import { toast } from "sonner";
import {
  type DesignBrief,
  type BriefDesignDirection,
  briefShareUrl,
  briefCompleteness,
  STATUS_LABEL,
  STATUS_TONE,
  PROJECT_TYPES,
  MOOD_OPTIONS,
  sanitizeBriefDesignDirection,
} from "@/lib/briefSchema";
import { ReferenceUploader } from "./ReferenceUploader";
import { AiAnalysisSheet } from "./AiAnalysisSheet";
import { BriefPdfPreviewDialog } from "./BriefPdfPreviewDialog";
import { ClientPicker } from "./ClientPicker";
import { ColorChipsField } from "./ColorChipsField";
import { ScopeItemsField } from "./ScopeItemsField";
import { ConfirmBriefDialog } from "./ConfirmBriefDialog";

import { AiImageToBriefButton } from "./AiImageToBriefButton";
import { QuickCapturePanel } from "./QuickCapturePanel";
import { ClientBrandAssetsField } from "./ClientBrandAssetsField";
import { DesignLinksField } from "./DesignLinksField";
import { mergeFieldClass } from "@/lib/formFieldStyles";
import { consumeOpenBriefMode } from "@/lib/pipelineNewDeal";
import { consumeLabsPaletteHandoff } from "@/lib/labsPaletteHandoff";
import {
  consumeCreativeLabHandoff,
  consumeOpenBriefId,
  CREATIVE_LAB_HANDOFF_EVENT,
} from "@/lib/creativeLabHandoff";
import { mergeCreativeHandoffIntoDirection } from "@/lib/mergeCreativeHandoff";
import { normalizeHexArray } from "@/lib/colorUtils";
import { PageFooterActions } from "@/components/dashboard/PageFooterActions";

function rowToBrief(r: any): DesignBrief {
  return {
    id: r.id,
    user_id: r.user_id,
    project_id: r.project_id,
    share_token: r.share_token,
    title: r.title,
    status: r.status,
    client_info: r.client_info ?? {},
    project_overview: r.project_overview ?? {},
    audience: r.audience ?? {},
    design_direction: sanitizeBriefDesignDirection(r.design_direction ?? { moods: [] }),
    tech_specs: r.tech_specs ?? { formats: [] },
    timeline_budget: r.timeline_budget ?? {},
    notes: r.notes ?? "",
    references: r.references ?? [],
    design_links: r.design_links ?? (r.design_direction as { design_links?: DesignBrief["design_links"] })?.design_links ?? [],
    ai_analysis: r.ai_analysis,
    confirmed_at: r.confirmed_at,
    confirmed_by_name: r.confirmed_by_name,
    confirmed_signature: r.confirmed_signature,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export function BriefsTab() {
  const { user } = useAuth();
  const [items, setItems] = React.useState<DesignBrief[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [quickCapture, setQuickCapture] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("design_briefs")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    if (error) toast.error(error.message);
    else setItems((data ?? []).map(rowToBrief));
    setLoading(false);
  }, [user]);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    const mode = consumeOpenBriefMode();
    if (mode === "quick") setQuickCapture(true);
  }, []);

  React.useEffect(() => {
    const handoff = consumeLabsPaletteHandoff();
    if (!handoff || !user) return;

    const hexes = normalizeHexArray(handoff.hexes);
    if (hexes.length === 0) return;

    void (async () => {
      const title = handoff.paletteName.trim()
        ? `บรีฟ — ${handoff.paletteName.trim()}`
        : "บรีฟจาก Color Lab";
      const { data, error } = await supabase
        .from("design_briefs")
        .insert({
          user_id: user.id,
          title,
          status: "draft",
          design_direction: { liked_color_chips: hexes },
        } as never)
        .select("*")
        .single();
      if (error) {
        toast.error(error.message);
        return;
      }
      const b = rowToBrief(data);
      setItems((arr) => [b, ...arr]);
      setEditingId(b.id);
      toast.success(`สร้างบรีฟพร้อม ${hexes.length} สีจาก Labs แล้ว`);
    })();
  }, [user]);

  const applyCreativeHandoff = React.useCallback(async () => {
    const handoff = consumeCreativeLabHandoff();
    if (!handoff || !user) return;

    const hexes = handoff.hexes ? normalizeHexArray(handoff.hexes) : [];
    const hasColors = hexes.length > 0;
    const hasFonts = !!handoff.likedFonts?.trim();
    if (!hasColors && !hasFonts) return;

    const mergePatch = (dd: BriefDesignDirection) =>
      mergeCreativeHandoffIntoDirection(dd, { ...handoff, hexes });

    if (handoff.briefId) {
      const existing = items.find((x) => x.id === handoff.briefId);
      const dd = existing?.design_direction ?? { moods: [] };
      const directionPatch = mergePatch(dd);
      const { data, error } = await supabase
        .from("design_briefs")
        .update({ design_direction: { ...dd, ...directionPatch } } as never)
        .eq("id", handoff.briefId)
        .select("*")
        .single();
      if (error) {
        toast.error(error.message);
        return;
      }
      const b = rowToBrief(data);
      setItems((arr) => arr.map((x) => (x.id === b.id ? b : x)));
      setEditingId(b.id);
      toast.success("อัปเดตบรีฟจาก Creative Labs แล้ว");
      return;
    }

    const title =
      handoff.paletteName?.trim() ||
      (hasColors ? "บรีฟจาก Color Lab" : "บรีฟจาก Typography Lab");
    const design_direction = mergePatch({ moods: [] });
    const { data, error } = await supabase
      .from("design_briefs")
      .insert({
        user_id: user.id,
        title,
        status: "draft",
        design_direction,
      } as never)
      .select("*")
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    const b = rowToBrief(data);
    setItems((arr) => [b, ...arr]);
    setEditingId(b.id);
    toast.success("สร้างบรีฟจาก Creative Labs แล้ว");
  }, [user, items]);

  React.useEffect(() => {
    void applyCreativeHandoff();
  }, [applyCreativeHandoff]);

  React.useEffect(() => {
    const onHandoff = () => void applyCreativeHandoff();
    window.addEventListener(CREATIVE_LAB_HANDOFF_EVENT, onHandoff);
    return () => window.removeEventListener(CREATIVE_LAB_HANDOFF_EVENT, onHandoff);
  }, [applyCreativeHandoff]);

  React.useEffect(() => {
    const openId = consumeOpenBriefId();
    if (!openId) return;
    if (items.some((x) => x.id === openId)) setEditingId(openId);
  }, [items]);

  const create = () => {
    if (!user) {
      toast.error("กรุณาเข้าสู่ระบบ");
      return;
    }
    setQuickCapture(true);
  };

  const createBlank = async () => {
    if (!user) {
      toast.error("กรุณาเข้าสู่ระบบ");
      return;
    }
    const { data, error } = await supabase
      .from("design_briefs")
      .insert({ user_id: user.id, title: "บรีฟใหม่", status: "draft" })
      .select("*")
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    const b = rowToBrief(data);
    setItems((arr) => [b, ...arr]);
    setEditingId(b.id);
    toast.success("สร้างบรีฟเปล่าแล้ว");
  };

  const remove = async (id: string) => {
    if (!confirm("ลบบรีฟนี้?")) return;
    const { error } = await supabase.from("design_briefs").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setItems((arr) => arr.filter((x) => x.id !== id));
    toast.success("ลบแล้ว");
  };

  const rename = async (id: string, title: string) => {
    const t = title.trim();
    if (!t) {
      toast.error("ใส่ชื่อบรีฟ");
      return false;
    }
    const { data, error } = await supabase
      .from("design_briefs")
      .update({ title: t })
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      toast.error(error.message);
      return false;
    }
    const nb = rowToBrief(data);
    setItems((arr) => arr.map((x) => (x.id === id ? nb : x)));
    toast.success("เปลี่ยนชื่อแล้ว");
    return true;
  };

  const duplicate = async (src: DesignBrief) => {
    if (!user) return;
    const { data, error } = await supabase
      .from("design_briefs")
      .insert({
        user_id: user.id,
        title: `${src.title} (สำเนา)`,
        status: "draft",
        client_info: src.client_info as any,
        project_overview: src.project_overview as any,
        audience: src.audience as any,
        design_direction: src.design_direction as any,
        tech_specs: src.tech_specs as any,
        timeline_budget: src.timeline_budget as any,
        notes: src.notes,
        references: src.references as any,
      })
      .select("*")
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setItems((arr) => [rowToBrief(data), ...arr]);
    toast.success("ทำสำเนาบรีฟแล้ว");
  };

  const editing = editingId ? items.find((x) => x.id === editingId) : null;

  if (editing) {
    return (
      <BriefEditor
        brief={editing}
        onBack={() => setEditingId(null)}
        onUpdate={(b) => setItems((arr) => arr.map((x) => (x.id === b.id ? b : x)))}
      />
    );
  }

  if (quickCapture) {
    return (
      <QuickCapturePanel
        onCancel={() => setQuickCapture(false)}
        onSaved={(b) => {
          setItems((arr) => [b, ...arr]);
          setQuickCapture(false);
          setEditingId(b.id);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> Smart Brief
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            สร้างใบบรีฟมืออาชีพได้ในไม่กี่นาที — ส่งลิงก์ให้ลูกค้ากรอกเอง หรือกรอกร่วมกันตอนคุยก็ได้
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button variant="outline" size="sm" onClick={createBlank} className="rounded-xl">
            บรีฟเปล่า
          </Button>
          <Button onClick={create} className="rounded-xl gap-1.5">
            <Plus className="h-4 w-4" /> สร้างบรีฟใหม่
          </Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={create}
          className="rounded-2xl border border-primary/40 bg-primary/5 p-4 text-left hover:border-primary transition-colors"
        >
          <p className="text-sm font-semibold text-primary">สร้างบรีฟใหม่ (AI Quick Capture)</p>
          <p className="text-xs text-muted-foreground mt-1">
            อัปโหลดแคปแชท/รูปอ้างอิง → AI สกัดข้อมูลบรีฟให้อัตโนมัติ เหมาะเมื่อคุยกับลูกค้าแล้ว
          </p>
        </button>
        <button
          type="button"
          onClick={createBlank}
          className="rounded-2xl border border-border bg-card p-4 text-left hover:border-primary/40 transition-colors"
        >
          <p className="text-sm font-semibold">บรีฟเปล่า (กรอกเอง)</p>
          <p className="text-xs text-muted-foreground mt-1">
            เริ่มจากฟอร์มว่าง กรอกทีละส่วนเอง เหมาะเมื่อมีบรีฟครบแล้วหรืออยากควบคุมทุกฟิลด์
          </p>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลด…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center space-y-2">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="font-medium">ยังไม่มีบรีฟ</p>
          <p className="text-xs text-muted-foreground">กดปุ่ม "สร้างบรีฟใหม่" เพื่อเริ่มต้น</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {items.map((b) => (
            <BriefRow
              key={b.id}
              brief={b}
              onEdit={() => setEditingId(b.id)}
              onDelete={() => remove(b.id)}
              onRename={(t) => rename(b.id, t)}
              onDuplicate={() => duplicate(b)}
            />
          ))}
        </div>
      )}

      <PageFooterActions feature="smart-brief" label="Smart Brief" />
    </div>
  );
}

function BriefRow({
  brief,
  onEdit,
  onDelete,
  onRename,
  onDuplicate,
}: {
  brief: DesignBrief;
  onEdit: () => void;
  onDelete: () => void;
  onRename: (title: string) => Promise<boolean>;
  onDuplicate: () => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [title, setTitle] = React.useState(brief.title);
  React.useEffect(() => {
    setTitle(brief.title);
  }, [brief.title]);

  const commit = async () => {
    if (title.trim() === brief.title) {
      setEditing(false);
      return;
    }
    const ok = await onRename(title);
    if (ok) setEditing(false);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {editing ? (
            <div className="flex items-center gap-1">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commit();
                  if (e.key === "Escape") {
                    setTitle(brief.title);
                    setEditing(false);
                  }
                }}
                autoFocus
                className="h-8 max-w-[260px]"
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-emerald-600"
                onClick={commit}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => {
                  setTitle(brief.title);
                  setEditing(false);
                }}
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onEdit}
              className="font-medium truncate hover:underline text-left hover:text-primary"
              title="คลิกเพื่อเปิดบรีฟ"
            >
              {brief.title}
            </button>
          )}
          <Badge className={`${STATUS_TONE[brief.status]} border-0 text-[10px]`}>
            {STATUS_LABEL[brief.status]}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {brief.client_info.client_name || "ยังไม่ระบุลูกค้า"} · อัปเดต{" "}
          {new Date(brief.updated_at).toLocaleDateString("th-TH")}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        {!editing && (
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)} title="เปลี่ยนชื่อ">
            <Pencil className="h-4 w-4" />
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={onDuplicate} title="ทำสำเนา">
          <CopyIcon className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={onEdit}>
          เปิด
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onDelete}
          className="text-destructive"
          title="ลบ"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// Editor
// ============================================================
function BriefEditor({
  brief,
  onBack,
  onUpdate,
}: {
  brief: DesignBrief;
  onBack: () => void;
  onUpdate: (b: DesignBrief) => void;
}) {
  const { user, profile } = useAuth();
  const [b, setB] = React.useState<DesignBrief>(brief);
  const [savedAt, setSavedAt] = React.useState<Date | null>(
    brief.updated_at ? new Date(brief.updated_at) : null,
  );
  const [dirty, setDirty] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [aiOpen, setAiOpen] = React.useState(false);
  const [confirmSelfOpen, setConfirmSelfOpen] = React.useState(false);
  const [pdfOpen, setPdfOpen] = React.useState(false);
  const [pdfAutoPrint, setPdfAutoPrint] = React.useState(false);
  // Unsaved-changes confirm flow when triggering PDF preview/download
  const [pdfConfirmOpen, setPdfConfirmOpen] = React.useState(false);
  const [pdfPendingAction, setPdfPendingAction] = React.useState<"preview" | "download" | null>(
    null,
  );

  React.useEffect(() => {
    setB(brief);
    setDirty(false);
  }, [brief.id]);

  const patch = (p: Partial<DesignBrief>) => {
    setB((cur) => ({ ...cur, ...p }));
    setDirty(true);
  };
  const patchSection = <K extends keyof DesignBrief>(key: K, p: Partial<DesignBrief[K]>) => {
    setB((cur) => ({ ...cur, [key]: { ...(cur[key] as any), ...p } }));
    setDirty(true);
  };

  const save = React.useCallback(
    async (overrideStatus?: DesignBrief["status"]): Promise<boolean> => {
      setSaving(true);
      const { error, data } = await supabase
        .from("design_briefs")
        .update({
          title: b.title,
          status: overrideStatus ?? b.status,
          client_info: b.client_info as any,
          project_overview: b.project_overview as any,
          audience: b.audience as any,
          design_direction: {
            ...b.design_direction,
            design_links: b.design_links ?? [],
          } as any,
          tech_specs: b.tech_specs as any,
          timeline_budget: b.timeline_budget as any,
          notes: b.notes,
          references: b.references as any,
        })
        .eq("id", b.id)
        .select("*")
        .single();
      setSaving(false);
      if (error) {
        toast.error(error.message);
        return false;
      }
      if (data) {
        const next = rowToBrief(data);
        setB(next);
        setSavedAt(new Date());
        setDirty(false);
        onUpdate(next);
        toast.success("บันทึกบรีฟแล้ว");
      }
      return true;
    },
    [b, onUpdate],
  );

  const completeness = briefCompleteness(b);
  const locked = b.status === "confirmed";
  const canAnalyze = !!savedAt && !dirty && completeness >= 50;

  const sendLinkToClient = async () => {
    if (dirty) {
      const ok = await save("awaiting_confirm");
      if (!ok) return;
    } else if (b.status === "draft" || b.status === "awaiting_client") {
      await save("awaiting_confirm");
    }
    const url = briefShareUrl(b.share_token, { review: true });
    await navigator.clipboard.writeText(url);
    toast.success("คัดลอกลิงก์ตรวจสอบแล้ว — ส่งให้ลูกค้ากดยืนยันได้เลย", {
      description: url,
      action: { label: "เปิดดู", onClick: () => window.open(url, "_blank") },
    });
  };

  const openPdfPreview = () => {
    if (dirty) {
      setPdfPendingAction("preview");
      setPdfConfirmOpen(true);
      return;
    }
    setPdfAutoPrint(false);
    setPdfOpen(true);
  };
  const downloadPdf = () => {
    if (dirty) {
      setPdfPendingAction("download");
      setPdfConfirmOpen(true);
      return;
    }
    setPdfAutoPrint(true);
    setPdfOpen(true);
  };
  const runPendingPdfAction = (action: "preview" | "download") => {
    setPdfAutoPrint(action === "download");
    setPdfOpen(true);
  };
  const handleConfirmSaveThenPdf = async () => {
    const action = pdfPendingAction;
    setPdfConfirmOpen(false);
    if (!action) return;
    const ok = await save();
    if (ok) runPendingPdfAction(action);
  };
  const handleDiscardAndPdf = () => {
    const action = pdfPendingAction;
    setPdfConfirmOpen(false);
    if (!action) return;
    // Use current unsaved state for preview/print (won't be persisted).
    runPendingPdfAction(action);
  };

  // ── "ทำใบเสนอราคาต่อ" — map brief → quotation draft, hand off via sessionStorage,
  //    then navigate to the Quotations tab where the editor opens automatically.
  const continueToQuotation = () => {
    const scopeItems = (b.project_overview.scope_items ?? []).filter((x) => x.name?.trim());
    const briefNoteLines: string[] = [];
    if (b.project_overview.goal) briefNoteLines.push(`เป้าหมาย: ${b.project_overview.goal}`);
    if (b.project_overview.problem) briefNoteLines.push(`โจทย์: ${b.project_overview.problem}`);
    if (b.timeline_budget.budget)
      briefNoteLines.push(`งบที่ลูกค้าให้: ${b.timeline_budget.budget}`);
    const handoff = {
      briefId: b.id,
      projectName: b.project_overview.project_name || b.title,
      clientName: b.client_info.client_name || "",
      clientPhone: b.client_info.contact_phone || "",
      clientEmail: b.client_info.contact_email || "",
      clientLineId: b.client_info.contact_line || "",
      startDate: b.timeline_budget.draft_date || undefined,
      endDate: b.timeline_budget.deadline || undefined,
      revisionsCount:
        typeof b.timeline_budget.revisions === "number" ? b.timeline_budget.revisions : undefined,
      items: scopeItems.map((it) => ({
        name: it.name,
        description: it.note || undefined,
        quantity: Number(it.quantity) > 0 ? Number(it.quantity) : 1,
        unitPrice: 0,
      })),
      notes: briefNoteLines.join("\n"),
      // Snapshot of brief state — used to decide whether to refresh existing linked quotation
      briefUpdatedAt: b.updated_at,
    };
    try {
      sessionStorage.setItem("so1o.openQuotationFromBrief", JSON.stringify(handoff));
    } catch {
      /* ignore quota errors */
    }
    toast.success("ดึงข้อมูลบรีฟไปสร้างใบเสนอราคา...");
    window.location.href = "/dashboard?tab=finance&sub=quotations";
  };

  const mergePaletteIntoLiked = (hexes: string[]) => {
    if (!hexes.length) return;
    const cur = b.design_direction.liked_color_chips ?? [];
    const set = new Set(cur);
    hexes.forEach((h) => set.add(h));
    patchSection("design_direction", { liked_color_chips: Array.from(set) });
  };

  const toggleMood = (m: string) => {
    const cur = b.design_direction.moods ?? [];
    patchSection("design_direction", {
      moods: cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m],
    });
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Top action bar */}
        <div className="flex items-center justify-between gap-3 flex-wrap no-print">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-1" /> กลับ
            </Button>
            <Input
              value={b.title}
              onChange={(e) => patch({ title: e.target.value })}
              className="max-w-xs font-medium"
              placeholder="ชื่อบรีฟ"
              disabled={locked}
            />
            <Badge className={`${STATUS_TONE[b.status]} border-0 text-[10px]`}>
              {STATUS_LABEL[b.status]}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {!locked && (
              <Button
                size="sm"
                variant={dirty ? "default" : "outline"}
                onClick={() => save()}
                disabled={saving || !dirty}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                บันทึก
              </Button>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAiOpen(true)}
                    disabled={!canAnalyze}
                  >
                    <Brain className="h-4 w-4 mr-1" /> AI วิเคราะห์
                  </Button>
                </span>
              </TooltipTrigger>
              {!canAnalyze && (
                <TooltipContent>
                  <p className="text-xs max-w-[220px]">
                    {dirty
                      ? "กดบันทึกก่อนเพื่อให้ AI วิเคราะห์ข้อมูลล่าสุด"
                      : completeness < 50
                        ? `กรอกบรีฟให้ครบอย่างน้อย 50% (ตอนนี้ ${completeness}%)`
                        : "บันทึกบรีฟก่อนจึงจะวิเคราะห์ได้"}
                  </p>
                </TooltipContent>
              )}
            </Tooltip>
            <Button size="sm" variant="outline" onClick={openPdfPreview}>
              <Eye className="h-4 w-4 mr-1" /> ดูพรีวิว PDF
            </Button>
            <Button size="sm" onClick={downloadPdf} className="bg-primary hover:bg-primary/90">
              <Download className="h-4 w-4 mr-1" /> บันทึก PDF
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={continueToQuotation}
              title="สร้างใบเสนอราคาจากบรีฟนี้"
            >
              <Receipt className="h-4 w-4 mr-1" /> ทำใบเสนอราคาต่อ
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 no-print">
          <div className="flex-1">
            <Progress value={completeness} className="h-1.5" />
            <p className="text-[10px] text-muted-foreground mt-1">กรอกข้อมูลแล้ว {completeness}%</p>
          </div>
          {dirty ? (
            <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
              ● มีการแก้ไขที่ยังไม่บันทึก
            </div>
          ) : savedAt ? (
            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Check className="h-3 w-3" /> บันทึกแล้ว {savedAt.toLocaleTimeString("th-TH")}
            </div>
          ) : null}
        </div>

        {locked && (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2 no-print">
            <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              ✓ ยืนยันแล้วเมื่อ {new Date(b.confirmed_at!).toLocaleString("th-TH")} โดย{" "}
              <strong>{b.confirmed_by_name}</strong>
              {b.confirmed_signature && (
                <span className="italic font-[cursive] ml-1">— {b.confirmed_signature}</span>
              )}{" "}
              — บรีฟถูกล็อกเพื่อใช้เป็นหลักฐาน
            </span>
          </div>
        )}

        <div className="grid gap-4 no-print">
          {/* Project Overview */}
          <Section title="1. ภาพรวมโปรเจกต์">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="ชื่อโปรเจกต์ / หัวข้องาน" full required>
                <Input
                  value={b.project_overview.project_name ?? ""}
                  onChange={(e) =>
                    patchSection("project_overview", { project_name: e.target.value })
                  }
                  placeholder="เช่น รีแบรนด์ร้านกาแฟ Aroma"
                  maxLength={120}
                  disabled={locked}
                  className={mergeFieldClass("", b.project_overview.project_name)}
                />
              </Field>
              <Field label="ประเภทงาน">
                <Select
                  value={b.project_overview.project_type ?? ""}
                  onValueChange={(v) =>
                    patchSection("project_overview", {
                      project_type: v,
                      project_type_custom:
                        v === "อื่นๆ" ? b.project_overview.project_type_custom : undefined,
                    })
                  }
                  disabled={locked}
                >
                  <SelectTrigger className={mergeFieldClass("", b.project_overview.project_type)}>
                    <SelectValue placeholder="เลือกประเภทงาน" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {b.project_overview.project_type === "อื่นๆ" && (
                  <Input
                    className={mergeFieldClass("mt-1.5", b.project_overview.project_type_custom)}
                    value={b.project_overview.project_type_custom ?? ""}
                    onChange={(e) =>
                      patchSection("project_overview", { project_type_custom: e.target.value })
                    }
                    placeholder="ระบุประเภทงานเอง"
                    maxLength={80}
                    disabled={locked}
                  />
                )}
              </Field>
              <Field label="เป้าหมายของงาน">
                <Input
                  value={b.project_overview.goal ?? ""}
                  onChange={(e) => patchSection("project_overview", { goal: e.target.value })}
                  placeholder="เช่น เพิ่มยอดขาย / สร้างการจดจำแบรนด์"
                  disabled={locked}
                />
              </Field>
              <Field label="เกี่ยวกับธุรกิจ" full>
                <Textarea
                  rows={2}
                  value={b.project_overview.about_business ?? ""}
                  onChange={(e) =>
                    patchSection("project_overview", { about_business: e.target.value })
                  }
                  placeholder="ขายอะไร ใครคือลูกค้าหลัก จุดเด่นคืออะไร"
                  disabled={locked}
                />
              </Field>
              <Field label="ปัญหาที่อยากแก้" full>
                <Textarea
                  rows={2}
                  value={b.project_overview.problem ?? ""}
                  onChange={(e) => patchSection("project_overview", { problem: e.target.value })}
                  disabled={locked}
                />
              </Field>
              <Field label="เนื้องาน & สโคป (รายการที่ต้องส่งมอบ)" full>
                <ScopeItemsField
                  value={b.project_overview.scope_items ?? []}
                  onChange={(next) => patchSection("project_overview", { scope_items: next })}
                  disabled={locked}
                />
              </Field>
            </div>
          </Section>

          {/* Client */}
          <Section title="2. ข้อมูลลูกค้า">
            <div className="space-y-3">
              <ClientPicker
                value={b.client_info}
                onPick={(info) => patchSection("client_info", info)}
                disabled={locked}
              />
              {b.client_info.client_id && (
                <p className="text-[10px] text-muted-foreground">
                  ✓ ดึงข้อมูลจากรายชื่อลูกค้า — แก้ไขด้านล่างได้ตามต้องการ (จะไม่กระทบรายชื่อหลัก)
                </p>
              )}
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="ชื่อลูกค้า">
                  <Input
                    value={b.client_info.client_name ?? ""}
                    onChange={(e) => patchSection("client_info", { client_name: e.target.value })}
                    disabled={locked}
                  />
                </Field>
                <Field label="ชื่อแบรนด์">
                  <Input
                    value={b.client_info.brand_name ?? ""}
                    onChange={(e) => patchSection("client_info", { brand_name: e.target.value })}
                    disabled={locked}
                  />
                </Field>
                <Field label="อีเมล">
                  <Input
                    type="email"
                    value={b.client_info.contact_email ?? ""}
                    onChange={(e) => patchSection("client_info", { contact_email: e.target.value })}
                    disabled={locked}
                  />
                </Field>
                <Field label="เบอร์โทร">
                  <Input
                    value={b.client_info.contact_phone ?? ""}
                    onChange={(e) => patchSection("client_info", { contact_phone: e.target.value })}
                    disabled={locked}
                  />
                </Field>
                <Field label="LINE" full>
                  <Input
                    value={b.client_info.contact_line ?? ""}
                    onChange={(e) => patchSection("client_info", { contact_line: e.target.value })}
                    disabled={locked}
                  />
                </Field>
              </div>
              <ClientBrandAssetsField
                value={b.client_info}
                onChange={(p) => patchSection("client_info", p)}
                onMergePalette={mergePaletteIntoLiked}
                userId={user?.id ?? null}
                disabled={locked}
              />

              <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
                <div>
                  <p className="text-xs font-semibold">📁 ผลงาน / กราฟิกเดิมของลูกค้า</p>
                  <p className="text-[10px] text-muted-foreground">
                    ใส่ภาพงานเก่าที่ลูกค้าเคยทำ (โพสต์โซเชียล, แพ็กเกจจิ้ง, ป้าย ฯลฯ)
                    เพื่อให้ออกแบบต่อยอดได้ถูกทิศ — แยกจาก "รูปอ้างอิงภายนอก"
                  </p>
                </div>
                <ReferenceUploader
                  refs={b.client_info.past_works ?? []}
                  onChange={(next) => patchSection("client_info", { past_works: next })}
                  userId={user?.id ?? null}
                  disabled={locked}
                  max={8}
                />
              </div>
            </div>
          </Section>

          {/* Audience */}
          <Section title="3. กลุ่มเป้าหมาย">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="เพศ">
                <Input
                  value={b.audience.gender ?? ""}
                  onChange={(e) => patchSection("audience", { gender: e.target.value })}
                  placeholder="ชาย / หญิง / ทุกเพศ"
                  disabled={locked}
                />
              </Field>
              <Field label="ช่วงอายุ">
                <Input
                  value={b.audience.age_range ?? ""}
                  onChange={(e) => patchSection("audience", { age_range: e.target.value })}
                  placeholder="เช่น 25-35"
                  disabled={locked}
                />
              </Field>
              <Field label="ไลฟ์สไตล์" full>
                <Input
                  value={b.audience.lifestyle ?? ""}
                  onChange={(e) => patchSection("audience", { lifestyle: e.target.value })}
                  disabled={locked}
                />
              </Field>
              <Field label="ความสนใจ" full>
                <Input
                  value={b.audience.interests ?? ""}
                  onChange={(e) => patchSection("audience", { interests: e.target.value })}
                  disabled={locked}
                />
              </Field>
            </div>
          </Section>

          {/* Design Direction */}
          <Section title="4. แนวทางออกแบบ">
            <div className="space-y-3">
              <Field label="Mood & Tone (เลือกได้หลายอัน)">
                <div className="flex flex-wrap gap-1.5">
                  {MOOD_OPTIONS.map((m) => {
                    const on = (b.design_direction.moods ?? []).includes(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        disabled={locked}
                        onClick={() => toggleMood(m)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition ${on ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 hover:bg-muted border-border"}`}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              </Field>
              <Field label="🎨 สีที่ชอบ (กดสวอชเพื่อคัดลอก hex)" full>
                <ColorChipsField
                  value={b.design_direction.liked_color_chips ?? []}
                  onChange={(next) => patchSection("design_direction", { liked_color_chips: next })}
                  disabled={locked}
                  placeholder="ยังไม่ได้เลือกสี"
                  label="ชอบ"
                />
              </Field>
              <Field label="🚫 สีต้องห้าม" full>
                <ColorChipsField
                  value={b.design_direction.forbidden_color_chips ?? []}
                  onChange={(next) =>
                    patchSection("design_direction", { forbidden_color_chips: next })
                  }
                  disabled={locked}
                  placeholder="ไม่มีสีต้องห้าม"
                  label="ต้องห้าม"
                />
              </Field>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="คำอธิบายสีเพิ่มเติม">
                  <Input
                    value={b.design_direction.liked_colors ?? ""}
                    onChange={(e) =>
                      patchSection("design_direction", { liked_colors: e.target.value })
                    }
                    placeholder="เช่น โทนพาสเทล, สีเอิร์ธโทน"
                    disabled={locked}
                  />
                </Field>
                <Field label="ฟอนต์ที่ชอบ">
                  <Input
                    value={b.design_direction.liked_fonts ?? ""}
                    onChange={(e) =>
                      patchSection("design_direction", { liked_fonts: e.target.value })
                    }
                    disabled={locked}
                  />
                </Field>
                <Field label="แรงบันดาลใจ / Reference Link" full>
                  <Input
                    value={b.design_direction.inspiration ?? ""}
                    onChange={(e) =>
                      patchSection("design_direction", { inspiration: e.target.value })
                    }
                    disabled={locked}
                  />
                </Field>
              </div>
            </div>
          </Section>

          {/* Reference Gallery */}
          <Section title="5. รูปอ้างอิงภายนอก / Mood Board">
            <div className="space-y-3">
              <p className="text-[11px] text-muted-foreground -mt-1">
                งานคนอื่น/ภาพแรงบันดาลใจที่ลูกค้าชอบ (ไม่ใช่งานเดิมของลูกค้า)
              </p>
              <ReferenceUploader
                refs={b.references}
                onChange={(next) => patch({ references: next })}
                userId={user?.id ?? null}
                disabled={locked}
              />
              <AiImageToBriefButton
                brief={b}
                disabled={locked}
                onApply={(s) => {
                  const merged = { ...b.design_direction };
                  if (s.moods.length) {
                    const cur = new Set(merged.moods ?? []);
                    s.moods.forEach((m) => cur.add(m));
                    merged.moods = Array.from(cur);
                  }
                  if (s.liked_color_chips.length) {
                    const cur = new Set(merged.liked_color_chips ?? []);
                    s.liked_color_chips.forEach((c) => cur.add(c));
                    merged.liked_color_chips = Array.from(cur);
                  }
                  if (s.liked_colors) {
                    merged.liked_colors = [merged.liked_colors, s.liked_colors]
                      .filter(Boolean)
                      .join(" • ");
                  }
                  if (s.inspiration) {
                    merged.inspiration = [merged.inspiration, s.inspiration]
                      .filter(Boolean)
                      .join(" • ");
                  }
                  patch({ design_direction: merged });
                  if (s.project_type && !b.project_overview.project_type) {
                    patchSection("project_overview", { project_type: s.project_type });
                  }
                  if (s.key_takeaways) {
                    const stamp = new Date().toLocaleString("th-TH", {
                      dateStyle: "short",
                      timeStyle: "short",
                    });
                    patch({
                      notes: `${b.notes ? b.notes + "\n\n" : ""}[AI วิเคราะห์รูป ${stamp}]\n${s.key_takeaways}`,
                    });
                  }
                }}
              />
            </div>
          </Section>

          <Section title="ลิงก์ไฟล์งาน (Figma / Canva / Adobe)">
            <DesignLinksField
              value={b.design_links ?? []}
              onChange={(next) => patch({ design_links: next })}
              disabled={locked}
            />
          </Section>

          {/* Timeline & Budget */}
          <Section title="6. ไทม์ไลน์และงบประมาณ">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="วันส่งร่างแรก">
                <Input
                  type="date"
                  value={b.timeline_budget.draft_date ?? ""}
                  onChange={(e) => patchSection("timeline_budget", { draft_date: e.target.value })}
                  disabled={locked}
                />
              </Field>
              <Field label="วันปิดงาน">
                <Input
                  type="date"
                  value={b.timeline_budget.deadline ?? ""}
                  onChange={(e) => patchSection("timeline_budget", { deadline: e.target.value })}
                  disabled={locked}
                />
              </Field>
              <Field label="จำนวนรอบแก้ที่อนุญาต">
                <Input
                  type="number"
                  min={0}
                  value={b.timeline_budget.revisions ?? ""}
                  onChange={(e) =>
                    patchSection("timeline_budget", { revisions: Number(e.target.value) || 0 })
                  }
                  disabled={locked}
                />
              </Field>
              <Field label="งบประมาณ">
                <Input
                  value={b.timeline_budget.budget ?? ""}
                  onChange={(e) => patchSection("timeline_budget", { budget: e.target.value })}
                  placeholder="เช่น 5,000-10,000 บาท"
                  disabled={locked}
                />
              </Field>
            </div>
          </Section>

          {/* Private Note */}
          <Section title="7. หมายเหตุเพิ่มเติม (โน้ตส่วนตัวของเรา)">
            <p className="text-[11px] text-muted-foreground mb-2 -mt-1">
              ไว้ใส่เอกสาร/โน้ตส่วนตัวของเรา ไม่ใช่แชทลูกค้า · จะไม่ขึ้นในบรีฟที่ส่งให้ลูกค้า
              แต่จะแสดงใน PDF section ใหม่ของเราเอง
            </p>
            <Textarea
              rows={4}
              value={b.notes}
              onChange={(e) => patch({ notes: e.target.value })}
              placeholder="เช่น โน้ตจดสดตอนคุยลูกค้า / เงื่อนไขพิเศษ / สิ่งที่ต้องเช็คเพิ่ม"
              disabled={locked}
            />
          </Section>
        </div>

        <BriefPdfPreviewDialog
          brief={b}
          open={pdfOpen}
          onOpenChange={(o) => {
            setPdfOpen(o);
            if (!o) setPdfAutoPrint(false);
          }}
          autoPrint={pdfAutoPrint}
          owner={
            profile
              ? {
                  display_name: profile.display_name,
                  brand_name: profile.brand_name,
                  logo_url: profile.logo_url,
                  avatar_url: profile.avatar_url,
                  tagline: profile.tagline,
                  email: profile.email,
                  phone: profile.phone,
                  social_link: profile.social_link,
                }
              : undefined
          }
        />

        <AlertDialog open={pdfConfirmOpen} onOpenChange={setPdfConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>มีการแก้ไขที่ยังไม่บันทึก</AlertDialogTitle>
              <AlertDialogDescription>
                ตอนนี้บรีฟมีการแก้ไขที่ยังไม่ได้บันทึก หากเปิด PDF เลย
                เนื้อหาที่แก้ไขจะแสดงผลในพรีวิวแต่จะ
                <strong className="text-foreground"> ไม่ถูกบันทึกลงบรีฟ</strong>{" "}
                แนะนำให้กดบันทึกก่อนเพื่อให้ไฟล์ PDF ตรงกับข้อมูลล่าสุด
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
              <Button variant="outline" onClick={handleDiscardAndPdf}>
                เปิดเลยโดยไม่บันทึก
              </Button>
              <AlertDialogAction onClick={handleConfirmSaveThenPdf}>
                บันทึก แล้วเปิด PDF
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AiAnalysisSheet
          open={aiOpen}
          onOpenChange={setAiOpen}
          brief={b}
          onSaved={(an) => {
            patch({ ai_analysis: an });
          }}
        />
      </div>
    </TooltipProvider>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function Field({
  label,
  children,
  full,
  required,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
  required?: boolean;
}) {
  return (
    <div className={`space-y-1 ${full ? "sm:col-span-2" : ""}`}>
      <Label
        className={`text-xs ${required ? "after:content-['*'] after:text-destructive after:ml-0.5" : ""}`}
      >
        {label}
      </Label>
      {children}
    </div>
  );
}
