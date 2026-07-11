import { ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  shortDescription: string;
  onShortDescriptionChange: (value: string) => void;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  disabled?: boolean;
};

const fieldLabel = "text-xs font-semibold text-muted-foreground";

const ProjectContextEditorFields = ({
  value,
  onChange,
  shortDescription,
  onShortDescriptionChange,
  expanded,
  onExpandedChange,
  disabled,
}: Props) => (
  <section className="space-y-3">
    <div className="space-y-1.5">
      <Label className={fieldLabel}>
        รายละเอียดแบบย่อ <span className="text-primary">*</span>
      </Label>
      <Textarea
        value={shortDescription}
        onChange={(e) => onShortDescriptionChange(e.target.value)}
        placeholder="สรุปสั้น ๆ ว่างานนี้คืออะไร ทำอะไร หรือจุดเด่นที่อยากให้จำ..."
        rows={3}
        maxLength={2000}
        required
        disabled={disabled}
        className="bg-background resize-y min-h-[80px] text-sm"
        aria-required
      />
    </div>

    <button
      type="button"
      id="project-context-toggle"
      aria-expanded={expanded}
      aria-controls="project-context-fields"
      disabled={disabled}
      onClick={() => onExpandedChange(!expanded)}
      className="flex w-full items-center justify-center gap-1.5 py-1 text-sm font-medium text-foreground hover:text-primary transition-colors disabled:opacity-50"
    >
      <span>เล่าเบื้องหลังผลงานเพิ่มเติม</span>
      <ChevronDown
        className={cn(
          "w-4 h-4 text-muted-foreground transition-transform duration-200",
          expanded && "rotate-180",
        )}
        aria-hidden
      />
    </button>

    <div
      id="project-context-fields"
      className={cn(
        "grid transition-[grid-template-rows] duration-200 ease-out",
        expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
      )}
    >
      <div className="overflow-hidden">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className={fieldLabel}>บทบาทของฉัน</Label>
            <Input
              value={value.creatorRole}
              onChange={(e) => onChange({ creatorRole: e.target.value })}
              placeholder="เช่น Art Director, Motion Designer, วาดภาพประกอบ, ออกแบบ UI, ถ่ายภาพ, ตัดต่อวิดีโอ"
              maxLength={80}
              disabled={disabled}
              className="bg-background"
            />
          </div>

          <div className="space-y-1.5">
            <Label className={fieldLabel}>โจทย์ของงาน</Label>
            <Textarea
              value={value.brief}
              onChange={(e) => onChange({ brief: e.target.value })}
              placeholder="งานนี้เริ่มจากโจทย์หรือปัญหาอะไร เช่น รีแบรนด์ร้าน, ออกแบบแคมเปญ, ทำภาพประกอบให้บทความ"
              rows={3}
              maxLength={1500}
              disabled={disabled}
              className="bg-background resize-y min-h-[88px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className={fieldLabel}>วิธีคิด / ขั้นตอนทำงาน</Label>
            <Textarea
              value={value.processNote}
              onChange={(e) => onChange({ processNote: e.target.value })}
              placeholder="เล่าว่าคุณเริ่มคิดจากอะไร ทดลองอะไร หรือเลือกวิธีนี้เพราะอะไร"
              rows={3}
              maxLength={2000}
              disabled={disabled}
              className="bg-background resize-y min-h-[88px]"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className={fieldLabel}>สิ่งที่ส่งมอบ</Label>
              <Input
                value={value.deliverables}
                onChange={(e) => onChange({ deliverables: e.target.value })}
                placeholder="เช่น โลโก้, Brand guideline, ภาพประกอบ 5 ชิ้น, UI 12 หน้าจอ, วิดีโอ 30 วินาที"
                maxLength={200}
                disabled={disabled}
                className="bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <Label className={fieldLabel}>ระยะเวลา</Label>
              <Input
                value={value.durationLabel}
                onChange={(e) => onChange({ durationLabel: e.target.value })}
                placeholder="เช่น 2 สัปดาห์, 1 เดือน, 3 วัน, โปรเจกต์ระยะยาว"
                maxLength={60}
                disabled={disabled}
                className="bg-background"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className={fieldLabel}>ผลลัพธ์ / สิ่งที่ได้เรียนรู้</Label>
            <Textarea
              value={value.outcomeNote}
              onChange={(e) => onChange({ outcomeNote: e.target.value })}
              placeholder="ผลลัพธ์ที่เกิดขึ้น หรือสิ่งที่คุณได้เรียนรู้จากงานนี้ เช่น ลูกค้านำไปใช้จริง, engagement ดีขึ้น, เข้าใจกลุ่มเป้าหมายมากขึ้น"
              rows={3}
              maxLength={1500}
              disabled={disabled}
              className="bg-background resize-y min-h-[88px]"
            />
          </div>
        </div>
      </div>
    </div>
  </section>
);
export default ProjectContextEditorFields;
