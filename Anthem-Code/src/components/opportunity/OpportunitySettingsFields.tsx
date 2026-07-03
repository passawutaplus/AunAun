import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  OPPORTUNITY_TYPE_KEYS,
  labelOpportunityType,
  type OpportunityTypeKey,
} from "@/lib/opportunity";

type Props = {
  types: OpportunityTypeKey[];
  onTypesChange: (types: OpportunityTypeKey[]) => void;
  compact?: boolean;
};

/** Project-scoped opportunity type picker (no availability section). */
const OpportunitySettingsFields = ({ types, onTypesChange, compact }: Props) => {
  const toggleType = (key: OpportunityTypeKey) => {
    onTypesChange(types.includes(key) ? types.filter((t) => t !== key) : [...types, key]);
  };

  return (
    <div className={cn("space-y-2", compact && "space-y-1.5")}>
      <Label className="text-sm font-medium">โอกาสที่เกี่ยวกับผลงานนี้</Label>
      <p className="text-xs text-muted-foreground">เลือกได้หลายข้อ — แสดงเป็นชิปบนหน้าผลงาน</p>
      <div className="flex flex-wrap gap-2">
        {OPPORTUNITY_TYPE_KEYS.map((key) => {
          const active = types.includes(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggleType(key)}
              className={cn(
                "px-3 py-2 min-h-10 rounded-full text-xs transition-colors text-left border",
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary text-foreground border-border/60 hover:bg-accent hover:border-primary/30",
              )}
            >
              {labelOpportunityType(key)}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default OpportunitySettingsFields;
