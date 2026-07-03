import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import OpportunitySettingsFields from "@/components/opportunity/OpportunitySettingsFields";
import type { OpportunityStatusKey, OpportunityTypeKey } from "@/lib/opportunity";

export type ProjectContextForm = {
  brief: string;
  creatorRole: string;
  processNote: string;
  deliverables: string;
  durationLabel: string;
  outcomeNote: string;
  opportunityNote: string;
  opportunityTypes: OpportunityTypeKey[];
};

type Props = {
  value: ProjectContextForm;
  onChange: (patch: Partial<ProjectContextForm>) => void;
  publishMode?: boolean;
};

const ProjectContextEditorFields = ({ value, onChange, publishMode }: Props) => (
  <section className="space-y-4 rounded-2xl border border-border bg-card/40 p-4">
    <div>
      <h3 className="text-sm font-semibold text-foreground">บริบทผลงาน</h3>
      <p className="text-xs text-muted-foreground mt-0.5">
        ทำให้ผลงานเป็น「หลักฐานงานจริง」ไม่ใช่แค่แกลเลอรี — ช่วยให้คนดูเข้าใจและคุยต่อได้
      </p>
    </div>

    <div className="space-y-2">
      <Label className="text-sm font-semibold">
        บทบาทของฉัน {publishMode ? "*" : ""}
      </Label>
      <Input
        value={value.creatorRole}
        onChange={(e) => onChange({ creatorRole: e.target.value })}
        placeholder="เช่น Art Director, Motion Designer"
        maxLength={80}
      />
    </div>

    <div className="space-y-2">
      <Label className="text-sm font-semibold">โจทย์ของงาน</Label>
      <Textarea
        value={value.brief}
        onChange={(e) => onChange({ brief: e.target.value })}
        placeholder="งานนี้แก้ปัญหาอะไร / โจทย์จากลูกค้าหรือทีม"
        rows={3}
        maxLength={1500}
      />
    </div>

    <div className="space-y-2">
      <Label className="text-sm font-semibold">วิธีคิด / Process</Label>
      <Textarea
        value={value.processNote}
        onChange={(e) => onChange({ processNote: e.target.value })}
        placeholder="ขั้นตอน แนวคิด หรือเทคนิคที่ใช้"
        rows={3}
        maxLength={2000}
      />
    </div>

    <div className="grid sm:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label className="text-sm font-semibold">สิ่งที่ส่งมอบ</Label>
        <Input
          value={value.deliverables}
          onChange={(e) => onChange({ deliverables: e.target.value })}
          placeholder="เช่น Logo set, Brand guidelines"
          maxLength={200}
        />
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-semibold">ระยะเวลา</Label>
        <Input
          value={value.durationLabel}
          onChange={(e) => onChange({ durationLabel: e.target.value })}
          placeholder="เช่น 2 สัปดาห์"
          maxLength={60}
        />
      </div>
    </div>

    <div className="space-y-2">
      <Label className="text-sm font-semibold">ผลลัพธ์ / สิ่งที่ได้เรียนรู้</Label>
      <Textarea
        value={value.outcomeNote}
        onChange={(e) => onChange({ outcomeNote: e.target.value })}
        placeholder="ผลลัพธ์ที่ได้ หรือ insight จากงานนี้"
        rows={3}
        maxLength={1500}
      />
    </div>

    <div className="border-t border-border/60 pt-4 space-y-3">
      <OpportunitySettingsFields
        compact
        types={value.opportunityTypes}
        onTypesChange={(types) => onChange({ opportunityTypes: types })}
      />
      <Textarea
        value={value.opportunityNote}
        onChange={(e) => onChange({ opportunityNote: e.target.value })}
        placeholder="เช่น เปิดรับงานสไตล์นี้ / อยากทำต่อในสายเดียวกัน"
        rows={2}
        maxLength={500}
      />
    </div>
  </section>
);

export default ProjectContextEditorFields;
