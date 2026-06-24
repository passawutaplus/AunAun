import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClipboardList, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { CHECKLIST_TEMPLATES, type ChecklistTemplateKey } from "./checklistTemplates";

const ITEMS_PREFIX = "feedback_checklist_items_";
const CHECKS_PREFIX = "feedback_checklist_";
const TEMPLATE_KEY = "feedback_checklist_template";

function loadItems(template: ChecklistTemplateKey): string[] {
  if (typeof window === "undefined") return CHECKLIST_TEMPLATES[template].items;
  try {
    const raw = window.localStorage.getItem(ITEMS_PREFIX + template);
    if (raw) return JSON.parse(raw) as string[];
  } catch {
    /* ignore */
  }
  return [...CHECKLIST_TEMPLATES[template].items];
}

export function PreSubmitChecklist() {
  const [template, setTemplate] = React.useState<ChecklistTemplateKey>(() => {
    if (typeof window === "undefined") return "print";
    const saved = window.localStorage.getItem(TEMPLATE_KEY) as ChecklistTemplateKey | null;
    return saved && CHECKLIST_TEMPLATES[saved] ? saved : "print";
  });

  const [items, setItems] = React.useState<string[]>(() => loadItems("print"));
  const [checked, setChecked] = React.useState<Record<string, boolean>>({});
  const [newItem, setNewItem] = React.useState("");
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const [editingValue, setEditingValue] = React.useState("");

  // Load items + checks when template switches
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(TEMPLATE_KEY, template);
    setItems(loadItems(template));
    try {
      const raw = window.localStorage.getItem(CHECKS_PREFIX + template);
      setChecked(raw ? JSON.parse(raw) : {});
    } catch {
      setChecked({});
    }
    setEditingIndex(null);
    setNewItem("");
  }, [template]);

  // Persist items per template
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(ITEMS_PREFIX + template, JSON.stringify(items));
  }, [items, template]);

  // Persist checks per template
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CHECKS_PREFIX + template, JSON.stringify(checked));
  }, [checked, template]);

  const doneCount = items.filter((_, i) => checked[`chk-${i}`]).length;
  const percent = items.length === 0 ? 0 : Math.round((doneCount / items.length) * 100);

  const addItem = () => {
    const v = newItem.trim();
    if (!v) return;
    setItems((arr) => [...arr, v]);
    setNewItem("");
  };

  const startEdit = (i: number) => {
    setEditingIndex(i);
    setEditingValue(items[i]);
  };

  const saveEdit = () => {
    if (editingIndex === null) return;
    const v = editingValue.trim();
    if (!v) return;
    setItems((arr) => arr.map((x, idx) => (idx === editingIndex ? v : x)));
    setEditingIndex(null);
  };

  const removeItem = (i: number) => {
    setItems((arr) => arr.filter((_, idx) => idx !== i));
    // shift checks down
    setChecked((c) => {
      const next: Record<string, boolean> = {};
      let w = 0;
      for (let r = 0; r < items.length; r++) {
        if (r === i) continue;
        if (c[`chk-${r}`]) next[`chk-${w}`] = true;
        w++;
      }
      return next;
    });
    if (editingIndex === i) setEditingIndex(null);
  };

  return (
    <Card className="animate-fade-up rounded-2xl border-border/60 shadow-soft">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" /> Checklist ก่อนส่งงาน
          </CardTitle>
          <Select value={template} onValueChange={(v) => setTemplate(v as ChecklistTemplateKey)}>
            <SelectTrigger className="h-8 w-[180px] rounded-xl text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(CHECKLIST_TEMPLATES) as ChecklistTemplateKey[]).map((k) => (
                <SelectItem key={k} value={k} className="text-xs">
                  {CHECKLIST_TEMPLATES[k].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="mt-3 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>ความคืบหน้า</span>
            <span className="font-semibold text-foreground">
              {doneCount}/{items.length} ({percent}%)
            </span>
          </div>
          <Progress value={percent} className="h-1.5" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {items.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">
              ยังไม่มีรายการ — เพิ่มรายการแรกของคุณด้านล่างได้เลย
            </p>
          )}
          {items.map((item, i) => {
            const id = `chk-${i}`;
            const isEditing = editingIndex === i;
            return (
              <div
                key={`${template}-${id}`}
                className="flex items-center gap-2 rounded-lg border border-border/60 bg-card p-2.5 hover:border-primary/40 transition-colors group"
              >
                <Checkbox
                  id={id}
                  checked={!!checked[id]}
                  onCheckedChange={(v) => setChecked((c) => ({ ...c, [id]: !!v }))}
                />
                {isEditing ? (
                  <>
                    <Input
                      autoFocus
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit();
                        if (e.key === "Escape") setEditingIndex(null);
                      }}
                      className="h-8 flex-1 text-sm"
                    />
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEdit}>
                      <Check className="h-3.5 w-3.5 text-success" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => setEditingIndex(null)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </>
                ) : (
                  <>
                    <label
                      htmlFor={id}
                      className={`flex-1 text-sm cursor-pointer ${
                        checked[id] ? "line-through text-muted-foreground" : ""
                      }`}
                    >
                      {item}
                    </label>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => startEdit(i)}
                      title="แก้ไข"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeItem(i)}
                      title="ลบ"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addItem();
            }}
            placeholder="เพิ่มรายการเช็คลิสใหม่..."
            className="h-9 text-sm"
          />
          <Button
            type="button"
            onClick={addItem}
            disabled={!newItem.trim()}
            className="h-9 gap-1.5 rounded-xl"
          >
            <Plus className="h-4 w-4" /> เพิ่ม
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
