import { WORK_DISCIPLINE_OPTIONS } from "@/data/workDisciplineOptions";
import { ChipMultiSelectWithOther } from "@/components/ui/ChipMultiSelectWithOther";

type Props = {
  value: string[];
  onChange: (v: string[]) => void;
};

export default function WorkDisciplineEditor({ value, onChange }: Props) {
  return (
    <ChipMultiSelectWithOther
      options={WORK_DISCIPLINE_OPTIONS}
      selected={value}
      onChange={onChange}
      knownIds={WORK_DISCIPLINE_OPTIONS.map((o) => o.id)}
      otherPlaceholder="พิมพ์สายงานอื่นแล้วกด Enter"
    />
  );
}
