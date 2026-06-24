import { Checkbox } from "@/components/ui/checkbox";
import { useLegalChecklist } from "@/store/legalUsageRights";
import type { ChecklistItem } from "@/data/legalScenarios";

export function LegalChecklist({
  checklistId,
  items,
}: {
  checklistId: string;
  items: ChecklistItem[];
}) {
  const { checked, toggle } = useLegalChecklist(checklistId);
  const done = checked.length;
  const total = items.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>เช็กลิสต์ก่อนส่งงาน</span>
        <span>
          {done}/{total}
        </span>
      </div>
      <div className="space-y-2">
        {items.map((item) => {
          const isChecked = checked.includes(item.id);
          return (
            <label
              key={item.id}
              className="flex items-start gap-2.5 rounded-lg border px-3 py-2 cursor-pointer hover:bg-muted/40"
            >
              <Checkbox
                checked={isChecked}
                onCheckedChange={() => void toggle(item.id)}
                className="mt-0.5"
              />
              <div className="min-w-0">
                <p className="text-xs font-medium">{item.label}</p>
                {item.hint && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">{item.hint}</p>
                )}
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
