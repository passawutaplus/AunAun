import { Package, Shapes } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { ConnectItem } from "@/hooks/useProjectConnections";

type Props = {
  items: ConnectItem[];
  loading: boolean;
  selected: Set<string>;
  onToggle: (key: string) => void;
  projectId?: string;
  disabled?: boolean;
};

/** Pick which of the owner's packages / objects this work is a reference for. Saved when the work is published. */
export function ProjectConnectProducts({ items, loading, selected, onToggle, projectId, disabled }: Props) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground">แพ็กเกจและสินค้าของฉัน</p>
      {loading ? (
        <p className="text-xs text-muted-foreground">กำลังโหลด…</p>
      ) : items.length === 0 ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          ยังไม่มีสินค้าหรือแพ็กเกจ เมื่อสร้างแล้วกลับมาเชื่อมผลงานนี้ได้ที่นี่
        </p>
      ) : (
        <ul className="space-y-1">
          {items.map((item) => {
            const checked = selected.has(item.key);
            const full = !checked && !item.refs.includes(projectId ?? "") && item.refs.length >= item.max;
            const Icon = item.kind === "service" ? Package : Shapes;
            return (
              <li key={item.key}>
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-muted/50",
                    (disabled || full) && "cursor-not-allowed opacity-50 hover:bg-transparent",
                  )}
                >
                  <Checkbox
                    checked={checked}
                    disabled={disabled || full}
                    onCheckedChange={() => onToggle(item.key)}
                    aria-label={`เชื่อมกับ ${item.title}`}
                  />
                  {item.coverUrl ? (
                    <img src={item.coverUrl} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-foreground">{item.title || "ไม่มีชื่อ"}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {item.kind === "service" ? "แพ็กเกจ" : "Object"}
                      {item.published ? "" : " · แบบร่าง"}
                      {full ? ` · อ้างอิงครบ ${item.max} ชิ้นแล้ว` : ""}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-[11px] leading-snug text-muted-foreground">
        เชื่อมให้เมื่อกดเผยแพร่ผลงาน · ผลงานนี้จะขึ้นเป็นตัวอย่างในหน้าสินค้าที่เลือก
      </p>
    </div>
  );
}
