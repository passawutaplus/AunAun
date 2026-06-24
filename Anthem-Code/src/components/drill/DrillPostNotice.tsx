import { Target } from "lucide-react";

type Props = {
  daily?: boolean;
};

/** Shown in project editor when posting from Design Drill flow. */
export function DrillPostNotice({ daily }: Props) {
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 flex items-start gap-3">
      <Target className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden />
      <div className="space-y-1 text-sm">
        <p className="font-medium text-foreground">โพสต์จาก Design Drill</p>
        <p className="text-muted-foreground text-xs leading-relaxed">
          เมื่อเผยแพร่ ผลงานจะขึ้นในแท็บ Design Drill
          {daily ? " (โจทย์ประจำวัน)" : ""} และโผล่ในฟีดผลงานพร้อมแท็ก Design Drill อัตโนมัติ
        </p>
      </div>
    </div>
  );
}
