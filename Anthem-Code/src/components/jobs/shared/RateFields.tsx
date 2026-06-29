import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export type BudgetType = "fixed" | "hourly" | "monthly";

interface Props {
  budgetType: BudgetType;
  onBudgetTypeChange: (v: BudgetType) => void;
  budgetMin: string;
  budgetMax: string;
  onBudgetMinChange: (v: string) => void;
  onBudgetMaxChange: (v: string) => void;
  minLabel?: string;
  maxLabel?: string;
}

const RateFields = ({
  budgetType,
  onBudgetTypeChange,
  budgetMin,
  budgetMax,
  onBudgetMinChange,
  onBudgetMaxChange,
  minLabel = "ต่ำสุด (฿)",
  maxLabel = "สูงสุด (฿)",
}: Props) => (
  <div className="space-y-2">
    <div>
      <Label className="text-xs">เรทราคา</Label>
      <Select value={budgetType} onValueChange={(v) => onBudgetTypeChange(v as BudgetType)}>
        <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="fixed">ต่อโปรเจกต์ / ตามตกลง</SelectItem>
          <SelectItem value="hourly">รายชั่วโมง</SelectItem>
          <SelectItem value="monthly">รายเดือน</SelectItem>
        </SelectContent>
      </Select>
    </div>
    <div className="grid grid-cols-2 gap-2">
      <div>
        <Label htmlFor="job-budget-min" className="text-xs">{minLabel}</Label>
        <Input
          id="job-budget-min"
          name="budgetMin"
          type="number"
          inputMode="numeric"
          aria-label={minLabel}
          value={budgetMin}
          onChange={(e) => onBudgetMinChange(e.target.value)}
          className="rounded-xl"
        />
      </div>
      <div>
        <Label htmlFor="job-budget-max" className="text-xs">{maxLabel}</Label>
        <Input
          id="job-budget-max"
          name="budgetMax"
          type="number"
          inputMode="numeric"
          aria-label={maxLabel}
          value={budgetMax}
          onChange={(e) => onBudgetMaxChange(e.target.value)}
          className="rounded-xl"
        />
      </div>
    </div>
  </div>
);

export default RateFields;
