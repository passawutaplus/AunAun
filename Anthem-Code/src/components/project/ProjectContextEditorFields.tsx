import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export type ProjectContextForm = {
  brief: string;
  creatorRole: string;
  processNote: string;
  deliverables: string;
  durationLabel: string;
  outcomeNote: string;
};
type Props = {
  value: ProjectContextForm;
  onChange: (patch: Partial<ProjectContextForm>) => void;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
};

const fieldShell = "rounded-xl border border-border/60 bg-background/60 p-3 space-y-2";

const ProjectContextEditorFields = ({ value, onChange, expanded, onExpandedChange }: Props) => (
  <section className="rounded-2xl border border-border/70 bg-card/30 overflow-hidden">
    <label
      htmlFor="project-context-toggle"
      className="flex items-start gap-3 p-4 cursor-pointer hover:bg-muted/20 transition-colors"
    >
      <Checkbox
        id="project-context-toggle"
        checked={expanded}
        onCheckedChange={(checked) => onExpandedChange(checked === true)}
        className="mt-0.5"
      />
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-semibold text-foreground">เล่าเบื้องหลังผลงาน</h3>
          <span className="text-[11px] font-medium text-primary">ไม่บังคับ</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          เติมรายละเอียดสั้น ๆ เพื่อให้คนเข้าใจโจทย์ บทบาท วิธีคิด และผลลัพธ์ของงานนี้มากขึ้น
        </p>
      </div>
    </label>

    <div
      className={cn(
        "grid transition-[grid-template-rows] duration-200 ease-out",
        expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
      )}
    >
      <div className="overflow-hidden">
        <div className="px-4 pb-5 pt-1 space-y-4 border-t border-border/50">
          <div className={fieldShell}>
            <Label className="text-sm font-medium text-foreground">บทบาทของฉัน</Label>
            <Input
              value={value.creatorRole}
              onChange={(e) => onChange({ creatorRole: e.target.value })}
              placeholder="เช่น Art Director, Motion Designer, วาดภาพประกอบ, ออกแบบ UI, ถ่ายภาพ, ตัดต่อวิดีโอ"
              maxLength={80}
              className="bg-background"
            />
          </div>

          <div className={fieldShell}>
            <Label className="text-sm font-medium text-foreground">โจทย์ของงาน</Label>
            <Textarea
              value={value.brief}
              onChange={(e) => onChange({ brief: e.target.value })}
              placeholder="งานนี้เริ่มจากโจทย์หรือปัญหาอะไร เช่น รีแบรนด์ร้าน, ออกแบบแคมเปญ, ทำภาพประกอบให้บทความ"
              rows={3}
              maxLength={1500}
              className="bg-background resize-y min-h-[88px]"
            />
          </div>

          <div className={fieldShell}>
            <Label className="text-sm font-medium text-foreground">วิธีคิด / ขั้นตอนทำงาน</Label>
            <Textarea
              value={value.processNote}
              onChange={(e) => onChange({ processNote: e.target.value })}
              placeholder="เล่าว่าคุณเริ่มคิดจากอะไร ทดลองอะไร หรือเลือกวิธีนี้เพราะอะไร"
              rows={3}
              maxLength={2000}
              className="bg-background resize-y min-h-[88px]"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className={fieldShell}>
              <Label className="text-sm font-medium text-foreground">สิ่งที่ส่งมอบ</Label>
              <Input
                value={value.deliverables}
                onChange={(e) => onChange({ deliverables: e.target.value })}
                placeholder="เช่น โลโก้, Brand guideline, ภาพประกอบ 5 ชิ้น, UI 12 หน้าจอ, วิดีโอ 30 วินาที"
                maxLength={200}
                className="bg-background"
              />
            </div>
            <div className={fieldShell}>
              <Label className="text-sm font-medium text-foreground">ระยะเวลา</Label>
              <Input
                value={value.durationLabel}
                onChange={(e) => onChange({ durationLabel: e.target.value })}
                placeholder="เช่น 2 สัปดาห์, 1 เดือน, 3 วัน, โปรเจกต์ระยะยาว"
                maxLength={60}
                className="bg-background"
              />
            </div>
          </div>

          <div className={fieldShell}>
            <Label className="text-sm font-medium text-foreground">ผลลัพธ์ / สิ่งที่ได้เรียนรู้</Label>
            <Textarea
              value={value.outcomeNote}
              onChange={(e) => onChange({ outcomeNote: e.target.value })}
              placeholder="ผลลัพธ์ที่เกิดขึ้น หรือสิ่งที่คุณได้เรียนรู้จากงานนี้ เช่น ลูกค้านำไปใช้จริง, engagement ดีขึ้น, เข้าใจกลุ่มเป้าหมายมากขึ้น"
              rows={3}
              maxLength={1500}
              className="bg-background resize-y min-h-[88px]"
            />
          </div>
        </div>
      </div>
    </div>
  </section>
);
export default ProjectContextEditorFields;
