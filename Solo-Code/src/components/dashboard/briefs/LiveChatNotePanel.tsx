import * as React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, MessageSquareText, Sparkles, Plus, X } from "lucide-react";
import { toast } from "sonner";
import type { BriefScopeItem } from "@/lib/briefSchema";

type Props = {
  initialNote?: string;
  disabled?: boolean;
  onApply: (payload: { scopeItems: BriefScopeItem[]; appendNote: string }) => void;
};

/**
 * Mode 1: Live Chat Note — จดสด 2 คอลัมน์
 * Left: textarea ที่บอสพิมพ์จดระหว่างคุยกับลูกค้า
 * Right: auto-extract เป็น scope items (regex) + preview
 * ปุ่ม "ดึงเข้าบรีฟ" ผลักเข้า project_overview.scope_items + append เข้า notes
 */
export function LiveChatNotePanel({ initialNote = "", disabled, onApply }: Props) {
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState(initialNote);

  const items = React.useMemo(() => extractScope(text), [text]);

  const apply = () => {
    if (!text.trim()) {
      toast.error("ยังไม่มีข้อความให้สรุป");
      return;
    }
    onApply({ scopeItems: items, appendNote: text.trim() });
    toast.success(`ดึงเข้าบรีฟแล้ว — ${items.length} รายการ`);
    setOpen(false);
  };

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden no-print">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition"
      >
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-primary/10 text-primary p-1.5">
            <MessageSquareText className="h-4 w-4" />
          </span>
          <div className="text-left">
            <h3 className="text-sm font-semibold">Live Chat Note — จดสดระหว่างคุยลูกค้า</h3>
            <p className="text-[11px] text-muted-foreground">
              พิมพ์ฝั่งซ้าย ระบบจะสรุปสโคปฝั่งขวาให้อัตโนมัติ
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              {items.length} รายการ
            </Badge>
          )}
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-border p-4 space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            {/* Left — raw chat note */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
                <span>📝 จดบทสนทนาที่นี่</span>
                <span className="text-muted-foreground/70">{text.length} ตัวอักษร</span>
              </label>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={disabled}
                rows={14}
                placeholder={`ตัวอย่าง:
- ลูกค้าอยากได้โลโก้ร้านกาแฟ
- เมนูบอร์ด A3 จำนวน 2 อัน
- นามบัตร 100 ใบ
- งบ 5,000 บาท
- ส่งร่างภายใน 1 สัปดาห์`}
                className="text-xs leading-relaxed font-mono resize-y"
              />
              <p className="text-[10px] text-muted-foreground">
                เคล็ดลับ: ขึ้นต้นบรรทัดด้วย <code className="bg-muted px-1 rounded">-</code> หรือ{" "}
                <code className="bg-muted px-1 rounded">•</code> ระบบจะจับเป็น scope item อัตโนมัติ
              </p>
            </div>

            {/* Right — extracted scope preview */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-primary" /> สโคปงานที่ดึงได้
              </label>
              <div className="rounded-xl border border-border bg-background min-h-[280px] p-3 space-y-1.5 overflow-auto">
                {items.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground italic text-center py-12">
                    ยังไม่มีรายการ — เริ่มพิมพ์ฝั่งซ้ายดูสิ
                  </p>
                ) : (
                  items.map((it, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 rounded-lg bg-muted/40 px-2.5 py-1.5 text-xs"
                    >
                      <Plus className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{it.name}</div>
                        {it.quantity > 1 && (
                          <div className="text-[10px] text-muted-foreground">x{it.quantity}</div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">
                {items.length > 0
                  ? `ดึงเข้าบรีฟแล้วจะถูกเพิ่มในข้อ 1 (เนื้องาน & สโคป) และข้อ 8 (หมายเหตุ)`
                  : "เมื่อพร้อม กดปุ่ม 'ดึงเข้าบรีฟ' ด้านล่าง"}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1 border-t border-border">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setText("")}
              disabled={disabled || !text}
            >
              <X className="h-3.5 w-3.5 mr-1" /> ล้าง
            </Button>
            <Button size="sm" onClick={apply} disabled={disabled || !text.trim()}>
              <Sparkles className="h-3.5 w-3.5 mr-1" /> ดึงเข้าบรีฟ ({items.length})
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * จับ scope items จากข้อความ — รองรับ "- xxx", "• xxx", "1. xxx", "* xxx"
 * และดึงตัวเลขท้ายบรรทัดเป็น quantity (เช่น "นามบัตร 100 ใบ" → qty 100)
 */
function extractScope(text: string): BriefScopeItem[] {
  if (!text.trim()) return [];
  const lines = text.split(/\r?\n/);
  const out: BriefScopeItem[] = [];
  const seen = new Set<string>();

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    // ตัด prefix: - / • / * / 1. / 1)
    const m = line.match(/^(?:[-•*]|\d+[.)])\s*(.+)$/);
    if (!m) continue;
    const body = m[1].trim();
    if (body.length < 2) continue;

    // ดึงจำนวน: "xxx 100 ใบ" / "xxx x2" / "xxx จำนวน 3"
    let qty = 1;
    let name = body;
    const qm =
      body.match(/^(.+?)\s*x\s*(\d+)\s*$/i) ||
      body.match(/^(.+?)\s*(?:จำนวน\s*)?(\d+)\s*(?:ใบ|อัน|ชิ้น|รูป|set|ชุด|page|หน้า)?\s*$/i);
    if (qm) {
      name = qm[1].trim().replace(/[:：,，]\s*$/, "");
      qty = Math.max(1, Math.min(9999, parseInt(qm[2], 10)));
    }

    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name, quantity: qty });
    if (out.length >= 30) break;
  }
  return out;
}
