import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  FEATURE_SECTIONS,
  MODERATED_TASKS,
  RESEARCH_INTRO,
  RESEARCH_PERSONAS,
} from "@/data/uxResearchGuide";
import {
  type SubmitUxResearchInput,
  type UxResearchScores,
  useSubmitUxResearchFeedback,
} from "@/hooks/useUxResearchFeedback";

const SCALE_QUESTIONS: { key: keyof UxResearchScores; label: string }[] = [
  { key: "first_impression", label: "First impression — เข้าใจว่าเว็บทำอะไรภายใน 10 วินาที" },
  { key: "thai_copy", label: "ภาษาไทยและคำศัพท์อ่านเข้าใจง่าย" },
  { key: "navigation", label: "Navigation ใช้งานง่าย ไม่หลง" },
  { key: "next_step", label: "รู้ขั้นตอนถัดไปหลัง login" },
  { key: "px_system", label: "เข้าใจระบบ PX / Welcome PX" },
  { key: "hire_collab", label: "แยกจ้างงาน vs ขอคอลแลปได้ชัด" },
  { key: "mobile_ux", label: "Mobile UX ใช้งานสะดวก" },
  { key: "overall", label: "โดยรวมประสบการณ์ทดสอบ" },
];

const DEVICE_OPTIONS = [
  { id: "desktop", label: RESEARCH_INTRO.devices[0] },
  { id: "mobile", label: RESEARCH_INTRO.devices[1] },
  { id: "tablet", label: RESEARCH_INTRO.devices[2] },
] as const;

const RATING_LABELS: Record<number, string> = {
  5: "ดีมาก",
  4: "ดี",
  3: "ปานกลาง",
  2: "พอใช้",
  1: "ต้องปรับปรุง",
};

type Props = {
  onSuccess?: () => void;
};

function toggleValue(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export default function UxResearchFeedbackForm({ onSuccess }: Props) {
  const submit = useSubmitUxResearchFeedback();

  const [reviewerName, setReviewerName] = useState("");
  const [persona, setPersona] = useState("");
  const [devices, setDevices] = useState<string[]>([]);
  const [tasksDone, setTasksDone] = useState<string[]>([]);
  const [sectionsDone, setSectionsDone] = useState<string[]>([]);
  const [scores, setScores] = useState<Partial<UxResearchScores>>({});
  const [good, setGood] = useState(["", "", ""]);
  const [fix, setFix] = useState(["", "", ""]);
  const [other, setOther] = useState("");

  const personaOptions = useMemo(
    () => [
      { id: "guest", label: "Guest (ไม่ login)" },
      ...RESEARCH_PERSONAS.map((p) => ({ id: p.id, label: `${p.label} — ${p.account}` })),
    ],
    [],
  );

  const allScoresFilled = SCALE_QUESTIONS.every((q) => {
    const v = scores[q.key];
    return typeof v === "number" && v >= 1 && v <= 5;
  });

  const canSubmit =
    reviewerName.trim().length >= 2 &&
    persona !== "" &&
    devices.length > 0 &&
    allScoresFilled &&
    !submit.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const payload: SubmitUxResearchInput = {
      reviewer_name: reviewerName.trim(),
      persona,
      devices,
      tasks_done: tasksDone,
      sections_done: sectionsDone,
      scores: scores as UxResearchScores,
      answers: {
        good: good.map((v) => v.trim()) as [string, string, string],
        fix: fix.map((v) => v.trim()) as [string, string, string],
        other: other.trim() || undefined,
      },
    };

    try {
      await submit.mutateAsync(payload);
      onSuccess?.();
    } catch {
      // hook shows toast
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 thai-body">
      <section className="space-y-4 rounded-2xl border border-border p-4">
        <h2 className="font-semibold text-sm">ข้อมูล reviewer</h2>
        <div className="space-y-2">
          <Label htmlFor="reviewer-name">ชื่อที่ทีมเรียกคุณ *</Label>
          <Input
            id="reviewer-name"
            value={reviewerName}
            onChange={(e) => setReviewerName(e.target.value)}
            placeholder="เช่น น้องมิ้นท์"
            maxLength={80}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Persona ที่เล่น *</Label>
          <Select value={persona} onValueChange={setPersona}>
            <SelectTrigger>
              <SelectValue placeholder="เลือก persona" />
            </SelectTrigger>
            <SelectContent>
              {personaOptions.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>อุปกรณ์ที่ใช้ทดสอบ *</Label>
          <div className="space-y-2">
            {DEVICE_OPTIONS.map((device) => (
              <label key={device.id} className="flex items-start gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={devices.includes(device.id)}
                  onCheckedChange={() => setDevices((prev) => toggleValue(prev, device.id))}
                />
                <span>{device.label}</span>
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border p-4">
        <h2 className="font-semibold text-sm">สิ่งที่ทำแล้ว (ติ๊กเท่าที่ทำ)</h2>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            Moderated tasks T1–T11
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {MODERATED_TASKS.map((task) => (
              <label key={task.id} className="flex items-start gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={tasksDone.includes(task.id)}
                  onCheckedChange={() => setTasksDone((prev) => toggleValue(prev, task.id))}
                />
                <span>
                  <span className="font-medium">{task.id}</span> — {task.title}
                </span>
              </label>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            Feature sections A–W
          </p>
          <div className="grid gap-2 grid-cols-4 sm:grid-cols-6 md:grid-cols-8">
            {FEATURE_SECTIONS.map((section) => (
              <label
                key={section.id}
                className="flex items-center gap-2 text-sm cursor-pointer rounded-lg border border-border/60 px-2 py-1.5"
              >
                <Checkbox
                  checked={sectionsDone.includes(section.id)}
                  onCheckedChange={() => setSectionsDone((prev) => toggleValue(prev, section.id))}
                />
                <span className="font-medium">{section.id}</span>
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border p-4">
        <h2 className="font-semibold text-sm">คะแนน 1–5 *</h2>
        <div className="space-y-4">
          {SCALE_QUESTIONS.map((question) => (
            <div key={question.key} className="space-y-2">
              <p className="text-sm">{question.label}</p>
              <div className="flex flex-wrap gap-2">
                {[5, 4, 3, 2, 1].map((value) => {
                  const selected = scores[question.key] === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setScores((prev) => ({ ...prev, [question.key]: value }))}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors",
                        selected
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border/60 hover:bg-muted/60",
                      )}
                    >
                      <span
                        className={cn(
                          "inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-semibold",
                          selected ? "bg-primary text-primary-foreground" : "bg-muted",
                        )}
                      >
                        {value}
                      </span>
                      {RATING_LABELS[value]}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border p-4">
        <h2 className="font-semibold text-sm">ข้อความเปิด</h2>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">3 อย่างที่ดี</p>
          {good.map((value, index) => (
            <Textarea
              key={`good-${index}`}
              value={value}
              onChange={(e) =>
                setGood((prev) => prev.map((v, i) => (i === index ? e.target.value : v)))
              }
              placeholder={`สิ่งที่ดี #${index + 1}`}
              rows={2}
              maxLength={500}
              className="resize-none text-sm"
            />
          ))}
        </div>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">3 อย่างที่ต้องแก้</p>
          {fix.map((value, index) => (
            <Textarea
              key={`fix-${index}`}
              value={value}
              onChange={(e) =>
                setFix((prev) => prev.map((v, i) => (i === index ? e.target.value : v)))
              }
              placeholder={`ต้องแก้ #${index + 1}`}
              rows={2}
              maxLength={500}
              className="resize-none text-sm"
            />
          ))}
        </div>
        <div className="space-y-2">
          <Label htmlFor="other-notes">อื่น ๆ (ไม่บังคับ)</Label>
          <Textarea
            id="other-notes"
            value={other}
            onChange={(e) => setOther(e.target.value)}
            placeholder="ข้อเสนอเพิ่มเติม"
            rows={3}
            maxLength={1000}
            className="resize-none text-sm"
          />
        </div>
      </section>

      <Button type="submit" className="w-full rounded-full" disabled={!canSubmit}>
        {submit.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        ส่งผลการทดสอบ
      </Button>
    </form>
  );
}
