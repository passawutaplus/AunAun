import { useEffect, useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { parseInboxPhone } from "@/lib/inboxPhone";
import { cn } from "@/lib/utils";

const EMPTY = "-";

type Props = {
  phone?: string | null;
  disabled?: boolean;
  onSave: (phone: string | null) => Promise<void> | void;
};

export function InboxPhoneField({ phone, disabled, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(phone ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(phone ?? "");
  }, [phone, editing]);

  const startEdit = () => {
    setDraft(phone ?? "");
    setError(null);
    setEditing(true);
  };

  const cancel = () => {
    setDraft(phone ?? "");
    setError(null);
    setEditing(false);
  };

  const save = async () => {
    const parsed = parseInboxPhone(draft);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(parsed.value);
      setEditing(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "บันทึกเบอร์ไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1">
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            autoFocus
            value={draft}
            disabled={saving || disabled}
            placeholder="0812345678"
            aria-label="เบอร์โทรลูกค้า"
            aria-invalid={!!error}
            onChange={(e) => {
              setDraft(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void save();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                cancel();
              }
            }}
            className={cn(
              "h-8 min-w-0 flex-1 rounded-md border bg-background px-2 text-sm tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
              error ? "border-destructive" : "border-border",
            )}
          />
          <button
            type="button"
            aria-label="บันทึกเบอร์โทร"
            title="บันทึก"
            disabled={saving || disabled}
            onClick={() => void save()}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-primary hover:bg-primary/10 disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="ยกเลิก"
            title="ยกเลิก"
            disabled={saving}
            onClick={cancel}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-1">
      {phone?.trim() ? (
        <a
          href={`tel:${phone}`}
          className="truncate tabular-nums hover:text-[hsl(var(--chat-hire))]"
        >
          {phone}
        </a>
      ) : (
        <span className="text-muted-foreground">{EMPTY}</span>
      )}
      <button
        type="button"
        aria-label={phone?.trim() ? "แก้ไขเบอร์โทร" : "ใส่เบอร์โทร"}
        title={phone?.trim() ? "แก้ไขเบอร์โทร" : "ใส่เบอร์โทร"}
        disabled={disabled}
        onClick={startEdit}
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
