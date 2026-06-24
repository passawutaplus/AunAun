import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, FileText, Save, Loader2, X } from "lucide-react";
import type { AiBriefExtractResult } from "@/lib/briefExtractTypes";
import { FORMAT_OPTIONS } from "@/lib/briefSchema";
import {
  FieldConfidenceBadge,
  fieldConfidence,
} from "@/components/dashboard/briefs/FieldConfidenceBadge";

type SectionKey =
  | "client"
  | "proposition"
  | "goal"
  | "deliverables"
  | "element_design"
  | "reference"
  | "style"
  | "timeline"
  | "budget"
  | "note";

const SECTIONS: { key: SectionKey; label: string; desc: string }[] = [
  { key: "client", label: "Client", desc: "ข้อมูลลูกค้า" },
  { key: "proposition", label: "Proposition", desc: "โจทย์ + pain point" },
  { key: "goal", label: "Goal", desc: "เป้าหมายของโปรเจกต์" },
  { key: "deliverables", label: "Deliverables", desc: "ชิ้นงานที่ต้องส่ง" },
  { key: "element_design", label: "Element Design", desc: "สิ่งที่ลูกค้าให้ใช้ออกแบบ" },
  { key: "reference", label: "Reference", desc: "ตัวอย่างงานอ้างอิง" },
  { key: "style", label: "Style", desc: "ชื่อสไตล์งาน" },
  { key: "timeline", label: "Timeline", desc: "วันส่งงาน" },
  { key: "budget", label: "Budget", desc: "งบประมาณ" },
  { key: "note", label: "Note", desc: "หมายเหตุสำคัญ" },
];

export function StructuredBriefReview({
  result,
  onChange,
  transcript,
  qualityIssues,
  onSave,
  saving,
  saveLabel = "บันทึกเป็นบรีฟ",
  extraActions,
}: {
  result: AiBriefExtractResult;
  onChange: <K extends keyof AiBriefExtractResult>(k: K, v: AiBriefExtractResult[K]) => void;
  transcript?: string;
  qualityIssues?: string[];
  onSave: () => void;
  saving?: boolean;
  saveLabel?: string;
  extraActions?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <FileText className="h-4 w-4 text-primary" /> Structured Brief
        </h3>
        <p className="text-[10px] text-muted-foreground">แก้ไขได้ก่อนกดบันทึก</p>
      </div>

      {qualityIssues && qualityIssues.length > 0 && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/20 p-3 text-xs space-y-1">
          <p className="font-medium text-amber-800 dark:text-amber-200">
            ผลลัพธ์ไม่ชัดเจนพอ — โปรดตรวจสอบก่อนบันทึก
          </p>
          {qualityIssues.map((issue) => (
            <p key={issue} className="text-muted-foreground">
              · {issue}
            </p>
          ))}
        </div>
      )}

      {SECTIONS.map((s) => (
        <SectionEditor
          key={s.key}
          label={s.label}
          desc={s.desc}
          section={s.key}
          result={result}
          onChange={onChange}
          transcript={transcript}
        />
      ))}

      <div className="flex flex-col sm:flex-row gap-2">
        <Button onClick={onSave} disabled={saving} className="flex-1 h-10 rounded-xl gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saveLabel}
        </Button>
        {extraActions}
      </div>
    </div>
  );
}

function SectionEditor({
  label,
  desc,
  section,
  result,
  onChange,
  transcript,
}: {
  label: string;
  desc: string;
  section: SectionKey;
  result: AiBriefExtractResult;
  onChange: <K extends keyof AiBriefExtractResult>(k: K, v: AiBriefExtractResult[K]) => void;
  transcript?: string;
}) {
  const isEmpty = isSectionEmpty(section, result);
  return (
    <div
      className={`rounded-xl p-3 border ${
        isEmpty ? "border-red-300 bg-red-50/60 dark:bg-red-950/20" : "border-border bg-muted/20"
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/70">
            {label}
          </p>
          <p className="text-[10px] text-muted-foreground">{desc}</p>
        </div>
        {transcript && section === "budget" && (
          <FieldConfidenceBadge confidence={fieldConfidence(result.budget, transcript)} />
        )}
        {transcript && section === "client" && (
          <FieldConfidenceBadge
            confidence={fieldConfidence(
              result.client.brand || result.client.name,
              transcript,
            )}
          />
        )}
        {isEmpty && (
          <Badge
            variant="outline"
            className="text-[9px] border-red-400 text-red-700 dark:text-red-300 gap-1"
          >
            <AlertCircle className="h-2.5 w-2.5" /> ลองถามลูกค้าเพิ่ม
          </Badge>
        )}
      </div>
      {renderField(section, result, onChange)}
    </div>
  );
}

function isSectionEmpty(key: SectionKey, r: AiBriefExtractResult): boolean {
  switch (key) {
    case "client":
      return !r.client.name && !r.client.brand && !r.client.contact;
    case "proposition":
      return !r.proposition.trim();
    case "goal":
      return !r.goal.trim();
    case "deliverables":
      return r.deliverables.length === 0;
    case "element_design":
      return !r.element_design.trim();
    case "reference":
      return !r.reference.trim();
    case "style":
      return !r.style.trim();
    case "timeline":
      return !r.timeline.start && !r.timeline.deadline;
    case "budget":
      return !r.budget.trim();
    case "note":
      return !r.note.trim();
  }
}

function renderField(
  key: SectionKey,
  r: AiBriefExtractResult,
  onChange: <K extends keyof AiBriefExtractResult>(k: K, v: AiBriefExtractResult[K]) => void,
) {
  if (key === "client") {
    return (
      <div className="grid sm:grid-cols-3 gap-2">
        <Input
          placeholder="ชื่อลูกค้า"
          value={r.client.name}
          onChange={(e) => onChange("client", { ...r.client, name: e.target.value })}
        />
        <Input
          placeholder="แบรนด์"
          value={r.client.brand}
          onChange={(e) => onChange("client", { ...r.client, brand: e.target.value })}
        />
        <Input
          placeholder="ติดต่อ (Line/เบอร์)"
          value={r.client.contact}
          onChange={(e) => onChange("client", { ...r.client, contact: e.target.value })}
        />
      </div>
    );
  }
  if (key === "deliverables") {
    return <DeliverablesEditor value={r.deliverables} onChange={(next) => onChange("deliverables", next)} />;
  }
  if (key === "timeline") {
    return (
      <div className="grid sm:grid-cols-2 gap-2">
        <Input
          placeholder="วันเริ่ม"
          value={r.timeline.start}
          onChange={(e) => onChange("timeline", { ...r.timeline, start: e.target.value })}
        />
        <Input
          placeholder="วันส่ง / Deadline"
          value={r.timeline.deadline}
          onChange={(e) => onChange("timeline", { ...r.timeline, deadline: e.target.value })}
        />
      </div>
    );
  }
  const map = {
    proposition: "โจทย์ลูกค้า / pain point",
    goal: "เป้าหมายโปรเจกต์",
    element_design: "สิ่งที่ลูกค้าให้ใช้ออกแบบ (โลโก้/สี/ฟอนต์/ชื่อ)",
    reference: "ตัวอย่างงาน / ลิงก์อ้างอิง",
    style: "ชื่อสไตล์ (Minimal / Y2K / ฯลฯ)",
    budget: "งบประมาณ",
    note: "หมายเหตุสำคัญ",
  } as const;
  const k = key as keyof typeof map;
  const longText = key === "proposition" || key === "element_design" || key === "note";
  return longText ? (
    <Textarea
      rows={2}
      placeholder={map[k]}
      value={r[k] as string}
      onChange={(e) => onChange(k, e.target.value as never)}
    />
  ) : (
    <Input
      placeholder={map[k]}
      value={r[k] as string}
      onChange={(e) => onChange(k, e.target.value as never)}
    />
  );
}

function DeliverablesEditor({
  value,
  onChange,
}: {
  value: AiBriefExtractResult["deliverables"];
  onChange: (v: AiBriefExtractResult["deliverables"]) => void;
}) {
  const add = () => onChange([...value, { name: "", quantity: 1, formats: [] }]);
  const update = (i: number, patch: Partial<AiBriefExtractResult["deliverables"][number]>) =>
    onChange(value.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const toggleFormat = (i: number, f: string) => {
    const cur = value[i].formats;
    update(i, { formats: cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f] });
  };

  return (
    <div className="space-y-2">
      {value.map((d, i) => (
        <div key={i} className="rounded-lg border border-border bg-background p-2 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Input
              value={d.name}
              onChange={(e) => update(i, { name: e.target.value })}
              placeholder="ชื่อชิ้นงาน เช่น โลโก้"
              className="h-8 text-xs flex-1"
            />
            <Input
              type="number"
              min={1}
              value={d.quantity}
              onChange={(e) =>
                update(i, { quantity: Math.max(1, parseInt(e.target.value, 10) || 1) })
              }
              className="h-8 text-xs w-16"
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-destructive"
              onClick={() => remove(i)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {FORMAT_OPTIONS.map((f) => {
              const on = d.formats.includes(f);
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => toggleFormat(i, f)}
                  className={`text-[10px] px-2 py-0.5 rounded-full border transition ${
                    on
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/30 hover:bg-muted border-border"
                  }`}
                >
                  {f}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={add} className="h-7 text-xs w-full">
        + เพิ่มชิ้นงาน
      </Button>
    </div>
  );
}
