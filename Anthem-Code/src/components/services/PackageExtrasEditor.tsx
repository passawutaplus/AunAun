import { CircleHelp, Plus, PlusSquare, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  PACKAGE_ADDONS_MAX,
  PACKAGE_FAQ_MAX,
  type PackageAddon,
  type PackageFaq,
} from "@/hooks/useCreatorServices";

type Props = {
  addons: PackageAddon[];
  faq: PackageFaq[];
  disabled?: boolean;
  /** Which block to render — they live in different places of the editor. */
  part: "addons" | "faq";
  onChange: (next: { addons?: PackageAddon[]; faq?: PackageFaq[] }) => void;
};

const money = (v: string) =>
  Math.max(0, Number.parseInt(v.replace(/[^\d]/g, ""), 10) || 0);

/** Optional extras of a package: paid add-ons and FAQ. */
export default function PackageExtrasEditor({
  part,
  addons,
  faq,
  disabled,
  onChange,
}: Props) {
  const setAddon = (i: number, patch: Partial<PackageAddon>) =>
    onChange({
      addons: addons.map((a, j) => (j === i ? { ...a, ...patch } : a)),
    });
  const setFaq = (i: number, patch: Partial<PackageFaq>) =>
    onChange({ faq: faq.map((f, j) => (j === i ? { ...f, ...patch } : f)) });

  return (
    <>
      {part === "addons" ? (
        <section className="space-y-3">
          <div>
            <Label className="inline-flex items-center gap-1.5">
              <PlusSquare className="h-3.5 w-3.5 text-primary" aria-hidden />
              บริการเสริม (ไม่บังคับ)
            </Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              เช่น ส่งด่วน, ไฟล์ต้นฉบับ, แก้เพิ่ม 1 รอบ — สูงสุด{" "}
              {PACKAGE_ADDONS_MAX} รายการ
            </p>
          </div>
          {addons.map((a, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={a.label}
                onChange={(e) =>
                  setAddon(i, { label: e.target.value.slice(0, 80) })
                }
                placeholder="ชื่อบริการเสริม"
                aria-label={`บริการเสริมที่ ${i + 1}`}
                className="h-9 flex-1"
                disabled={disabled}
              />
              <Input
                inputMode="numeric"
                value={a.price_thb ? String(a.price_thb) : ""}
                onChange={(e) =>
                  setAddon(i, { price_thb: money(e.target.value) })
                }
                placeholder="+ บาท"
                aria-label="ราคาบริการเสริม"
                className="h-9 w-28"
                disabled={disabled}
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-9 w-9 shrink-0"
                aria-label="ลบบริการเสริม"
                disabled={disabled}
                onClick={() =>
                  onChange({ addons: addons.filter((_, j) => j !== i) })
                }
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          ))}
          {addons.length < PACKAGE_ADDONS_MAX ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-full"
              disabled={disabled}
              onClick={() =>
                onChange({ addons: [...addons, { label: "", price_thb: 0 }] })
              }
            >
              <Plus className="mr-1 h-3.5 w-3.5" aria-hidden /> เพิ่มบริการเสริม
            </Button>
          ) : null}
        </section>
      ) : null}

      {part === "faq" ? (
        <section className="space-y-3">
          <div>
            <Label className="inline-flex items-center gap-1.5">
              <CircleHelp className="h-3.5 w-3.5 text-primary" aria-hidden />
              คำถามที่พบบ่อย (ไม่บังคับ)
            </Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              ตอบล่วงหน้า ลดการถามซ้ำในแชท — สูงสุด {PACKAGE_FAQ_MAX} ข้อ
            </p>
          </div>
          {faq.map((f, i) => (
            <div
              key={i}
              className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3"
            >
              <div className="flex items-center gap-2">
                <Input
                  value={f.q}
                  onChange={(e) =>
                    setFaq(i, { q: e.target.value.slice(0, 160) })
                  }
                  placeholder="คำถาม"
                  aria-label={`คำถามที่ ${i + 1}`}
                  className="h-9 flex-1"
                  disabled={disabled}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 shrink-0"
                  aria-label="ลบคำถาม"
                  disabled={disabled}
                  onClick={() =>
                    onChange({ faq: faq.filter((_, j) => j !== i) })
                  }
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              </div>
              <Textarea
                value={f.a}
                onChange={(e) => setFaq(i, { a: e.target.value.slice(0, 600) })}
                placeholder="คำตอบ"
                aria-label={`คำตอบข้อที่ ${i + 1}`}
                rows={2}
                disabled={disabled}
              />
            </div>
          ))}
          {faq.length < PACKAGE_FAQ_MAX ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-full"
              disabled={disabled}
              onClick={() => onChange({ faq: [...faq, { q: "", a: "" }] })}
            >
              <Plus className="mr-1 h-3.5 w-3.5" aria-hidden /> เพิ่มคำถาม
            </Button>
          ) : null}
        </section>
      ) : null}
    </>
  );
}
