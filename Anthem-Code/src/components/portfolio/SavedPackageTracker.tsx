import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, FileText, GitCompare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  BOOKMARK_STATUSES,
  useUpdateBookmarkTracking,
  type BookmarkStatus,
  type BookmarkTracking,
} from "@/hooks/useCreatorServiceBookmarks";

const STATUS_DOT: Record<BookmarkStatus, string> = {
  interested: "bg-sky-400",
  contacted: "bg-amber-400",
  waiting_quote: "bg-violet-400",
  hired: "bg-emerald-500",
};

type Props = {
  serviceId: string;
  /** Own packages cannot be hired. */
  isOwnPackage: boolean;
  tracking: BookmarkTracking;
  /** Folder names already in use, offered as suggestions. */
  folders: string[];
  compareChecked: boolean;
  compareDisabled: boolean;
  onToggleCompare: () => void;
};

/** Private status, note and folder for one saved package, plus a quick quote request and the compare tick. */
export default function SavedPackageTracker({
  serviceId,
  isOwnPackage,
  tracking,
  folders,
  compareChecked,
  compareDisabled,
  onToggleCompare,
}: Props) {
  const update = useUpdateBookmarkTracking();
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(tracking.note);
  const [folder, setFolder] = useState(tracking.folder);

  useEffect(() => {
    if (!editing) {
      setNote(tracking.note);
      setFolder(tracking.folder);
    }
  }, [tracking.note, tracking.folder, editing]);

  const save = () => {
    update.mutate({ serviceId, patch: { note: note.trim(), folder: folder.trim() } });
    setEditing(false);
  };

  const statusDot = STATUS_DOT[tracking.status];

  return (
    <div className="divide-y divide-border/60 border border-t-0 border-border/70 bg-card">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <Select
          value={tracking.status}
          onValueChange={(v) => update.mutate({ serviceId, patch: { status: v as BookmarkStatus } })}
        >
          <SelectTrigger
            aria-label="สถานะ"
            className="h-8 w-auto min-w-0 flex-1 justify-between gap-1.5 rounded-full border-border/60 bg-muted/40 px-3 text-xs font-medium sm:flex-none"
          >
            <span className={cn("h-2 w-2 shrink-0 rounded-full", statusDot)} aria-hidden />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BOOKMARK_STATUSES.map((st) => (
              <SelectItem key={st.value} value={st.value}>
                {st.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            aria-label="เลือกเพื่อเปรียบเทียบ"
            aria-pressed={compareChecked}
            title="เปรียบเทียบ"
            disabled={compareDisabled && !compareChecked}
            onClick={onToggleCompare}
            className={cn(
              "flex h-8 items-center gap-1 rounded-full border px-2 text-xs sm:px-2.5 transition-colors disabled:cursor-not-allowed disabled:opacity-40",
              compareChecked
                ? "border-foreground bg-foreground text-background"
                : "border-border/60 text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {compareChecked ? <Check className="h-3.5 w-3.5" aria-hidden /> : <GitCompare className="h-3.5 w-3.5" aria-hidden />}
            <span className="hidden sm:inline">เทียบ</span>
          </button>
          {!isOwnPackage ? (
            <Button
              asChild
              size="sm"
              variant="outline"
              className="h-8 w-8 rounded-full border-border/60 p-0"
            >
              <Link to={`/service/${serviceId}?hire=1`} aria-label="ขอใบเสนอราคา" title="ขอใบเสนอราคา">
                <Send className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      {editing ? (
        <div className="space-y-2 px-3 py-2.5">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="โน้ตส่วนตัว (เห็นแค่คุณ) เช่น งบ ข้อสงสัย สิ่งที่ต้องถาม"
            aria-label="โน้ตส่วนตัว"
            className="text-sm"
          />
          <Input
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            maxLength={40}
            list={`folders-${serviceId}`}
            placeholder="โฟลเดอร์ เช่น โปรเจกต์ A"
            aria-label="โฟลเดอร์"
            className="h-9 text-sm"
          />
          <datalist id={`folders-${serviceId}`}>
            {folders.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" className="rounded-full" onClick={() => setEditing(false)}>
              ยกเลิก
            </Button>
            <Button type="button" size="sm" className="rounded-full" disabled={update.isPending} onClick={save}>
              บันทึก
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-xs text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
        >
          <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="min-w-0 flex-1">
            {tracking.folder ? <span className="mr-1.5 inline-block max-w-full truncate rounded-full bg-muted px-2 py-0.5 align-middle text-[11px] text-foreground">{tracking.folder}</span> : null}
            <span className="line-clamp-2 whitespace-pre-wrap align-middle">{tracking.note || (tracking.folder ? "เพิ่มโน้ต" : "เพิ่มโน้ตหรือโฟลเดอร์")}</span>
          </span>
        </button>
      )}
    </div>
  );
}
