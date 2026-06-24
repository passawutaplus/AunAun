import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const FREELANCE_FIELDS = [
  { value: "graphic_design", label: "กราฟิกดีไซน์ / Branding" },
  { value: "ui_ux", label: "UI / UX Design" },
  { value: "motion", label: "โมชั่นกราฟิก / แอนิเมชัน" },
  { value: "writing", label: "เขียน / คอนเทนต์ / คอปปี้" },
  { value: "photo_video", label: "ถ่ายภาพ / วิดีโอ" },
  { value: "web_dev", label: "เว็บ / โค้ด / โปรแกรมเมอร์" },
  { value: "illustration", label: "วาดภาพประกอบ / ศิลปะ" },
  { value: "marketing", label: "การตลาด / โฆษณา" },
  { value: "other", label: "อื่นๆ" },
];

export function FreelanceFieldSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-11 rounded-lg input-so1o">
        <SelectValue placeholder="เลือกสายงานของคุณ" />
      </SelectTrigger>
      <SelectContent>
        {FREELANCE_FIELDS.map((f) => (
          <SelectItem key={f.value} value={f.value}>
            {f.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
