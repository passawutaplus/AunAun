import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  Check,
  ChevronDown,
  FileText,
  HeartHandshake,
  History,
  Info,
  Link2,
  Loader2,
  MapPin,
  Package,
  Plus,
  ShieldCheck,
  StickyNote,
  Target,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { useCollabAgreement } from "@/hooks/useCollabAgreement";
import { supabase } from "@/integrations/supabase/client";
import {
  COLLAB_RIGHTS_PRESETS,
  diffAgreement,
  type CollabAgreement,
  type CollabAgreementStatus,
  type CollabRightsPreset,
} from "@/lib/collabAgreement";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  collabEnded?: boolean;
  publishPath?: string | null;
};

export function useMemberNames(memberIds: string[], meId: string | undefined) {
  return useQuery({
    queryKey: ["collab-agreement-members", memberIds.join(",")],
    enabled: memberIds.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles_public")
        .select("user_id, display_name, username, avatar_url")
        .in("user_id", memberIds);
      const byId = new Map((data ?? []).map((p) => [p.user_id as string, p]));
      return memberIds.map((id) => {
        const p = byId.get(id);
        const name = p?.username || p?.display_name || "ผู้ใช้";
        return { id, name, avatarUrl: (p?.avatar_url as string | null) ?? null, label: id === meId ? `${name} (คุณ)` : name };
      });
    },
  });
}

export function AgreementStatusPill({ status, ackCount, total }: { status: CollabAgreementStatus; ackCount: number; total: number }) {
  const map = {
    draft: { text: "ร่าง", cls: "bg-muted text-muted-foreground" },
    pending: { text: `รอยืนยัน ${ackCount}/${total}`, cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
    agreed: { text: "ตกลงแล้ว", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  } as const;
  const s = map[status];
  return <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", s.cls)}>{s.text}</span>;
}

function Label({ icon: Icon, children, hint }: { icon: typeof Target; children: React.ReactNode; hint?: string }) {
  return (
    <p className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
      <Icon className="h-3.5 w-3.5" aria-hidden />
      <span>{children}</span>
      {hint ? <span className="text-muted-foreground/70">{hint}</span> : null}
    </p>
  );
}

function TagInput({ value, onChange, placeholder, ariaLabel }: { value: string[]; onChange: (v: string[]) => void; placeholder: string; ariaLabel: string }) {
  const [text, setText] = useState("");
  const commit = () => {
    const t = text.trim().replace(/,$/, "");
    if (t && !value.includes(t) && value.length < 12) onChange([...value, t.slice(0, 80)]);
    setText("");
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && !text && value.length) {
      onChange(value.slice(0, -1));
    }
  };
  return (
    <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-xl border border-input bg-background px-2 py-1.5 focus-within:ring-2 focus-within:ring-ring">
      {value.map((v) => (
        <span key={v} className="inline-flex items-center gap-1 rounded-full bg-primary/10 py-0.5 pl-2.5 pr-1 text-xs text-primary">
          {v}
          <button type="button" onClick={() => onChange(value.filter((x) => x !== v))} aria-label={`ลบ ${v}`} className="rounded-full p-0.5 hover:bg-primary/15">
            <X className="h-3 w-3" aria-hidden />
          </button>
        </span>
      ))}
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKey}
        onBlur={commit}
        placeholder={value.length ? "" : placeholder}
        aria-label={ariaLabel}
        className="h-7 min-w-[10rem] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}

function ListInput({ value, onChange, placeholder, ariaLabel }: { value: string[]; onChange: (v: string[]) => void; placeholder: string; ariaLabel: string }) {
  const [text, setText] = useState("");
  const add = () => {
    const t = text.trim();
    if (t) onChange([...value, t.slice(0, 300)]);
    setText("");
  };
  return (
    <div className="space-y-1.5">
      {value.map((v, i) => (
        <div key={`${v}-${i}`} className="flex items-center gap-2 rounded-lg bg-muted/40 px-2.5 py-1.5 text-sm">
          <span className="min-w-0 flex-1 break-words">{v}</span>
          <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label={`ลบ ${v}`} className="text-muted-foreground hover:text-destructive">
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          aria-label={ariaLabel}
          className="h-9 rounded-xl"
        />
        <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0 rounded-xl" onClick={add} aria-label="เพิ่ม">
          <Plus className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

/** Short collab plan: 6 fields + optional details. Replaces the 4-step pipeline sheet. */
export function CollabAgreementSheet({ open, onOpenChange, conversationId, collabEnded, publishPath }: Props) {
  const { user } = useAuth();
  const a = useCollabAgreement(conversationId, open);
  const { data: members = [] } = useMemberNames(a.memberIds, user?.id);
  const [form, setForm] = useState<CollabAgreement>(a.agreement);
  const [moreOpen, setMoreOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset the form whenever the stored plan changes underneath (other member saved).
  const storedKey = JSON.stringify(a.agreement);
  useEffect(() => {
    if (open) {
      setForm(a.agreement);
      setMoreOpen(a.agreement.links.length > 0 || a.agreement.deliverables.length > 0 || !!a.agreement.note);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storedKey, open]);

  const myName = members.find((m) => m.id === user?.id)?.name;
  const diff = useMemo(() => diffAgreement(a.agreement, form), [a.agreement, form]);
  const dirty = diff.changed.length > 0;
  const set = <K extends keyof CollabAgreement>(k: K, v: CollabAgreement[K]) => {
    setError(null);
    setForm((f) => ({ ...f, [k]: v }));
  };

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    try {
      await fn();
      if (ok) toast.success(ok);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    }
  };

  const send = () => {
    if (!form.what.trim()) {
      setError("ใส่ว่าจะทำอะไรก่อน");
      return;
    }
    void run(() => a.save(form, { send: true, actorName: myName }), "ส่งให้ทุกคนยืนยันแล้ว");
  };

  const readOnly = !!collabEnded;
  const sent = !!a.agreement.sentAt;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="space-y-1 border-b border-border px-5 py-4 text-left">
          <SheetTitle className="flex items-center gap-2">
            <HeartHandshake className="h-4 w-4 text-primary" aria-hidden />
            แผนคอลแลป
            <AgreementStatusPill status={a.status} ackCount={a.ackCount} total={a.memberIds.length} />
          </SheetTitle>
          <SheetDescription>ตกลงกันให้ชัดว่าทำอะไร ใครทำส่วนไหน และใช้งานยังไง — แล้วไปลุยกันใน Tasks</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {a.isLoading ? (
            <div className="h-60 animate-pulse rounded-2xl bg-muted/40" />
          ) : (
            <fieldset disabled={readOnly || a.busy} className="space-y-5">
              <div>
                <Label icon={Target}>ทำอะไร</Label>
                <Input
                  value={form.what}
                  onChange={(e) => set("what", e.target.value.slice(0, 160))}
                  placeholder="เช่น ปกอัลบั้ม + โปสเตอร์ 2 ชิ้น"
                  aria-label="ทำอะไร"
                  aria-invalid={!!error}
                  className="h-10 rounded-xl"
                />
                {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
              </div>

              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" aria-hidden />
                  ใครทำอะไร
                  <span title="ตอนส่งให้ยืนยัน แต่ละคนจะได้งานใน Tasks พร้อมคนรับผิดชอบ" aria-label="ตอนส่งให้ยืนยัน แต่ละคนจะได้งานใน Tasks พร้อมคนรับผิดชอบ">
                    <Info className="h-3.5 w-3.5" aria-hidden />
                  </span>
                </p>
                <div className="space-y-2">
                  {members.map((m) => (
                    <div key={m.id} className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] items-center gap-2">
                      <span className="truncate text-sm">{m.label}</span>
                      <Input
                        value={form.roles[m.id] ?? ""}
                        onChange={(e) => set("roles", { ...form.roles, [m.id]: e.target.value.slice(0, 120) })}
                        placeholder="เช่น ภาพประกอบ, จัดเลย์เอาต์"
                        aria-label={`${m.name} ทำอะไร`}
                        className="h-10 rounded-xl"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label icon={FileText} hint="ทำยังไง โทน สไตล์">บรีฟคร่าวๆ</Label>
                <Textarea
                  value={form.brief}
                  onChange={(e) => set("brief", e.target.value.slice(0, 2000))}
                  placeholder="เช่น โทนอบอุ่นยุค 70 ภาพวาดมือ คุมสีส้ม-น้ำตาล ส่งร่างแรกภายใน 1 สัปดาห์"
                  rows={3}
                  className="resize-y rounded-xl"
                  aria-label="บรีฟคร่าวๆ"
                />
              </div>

              <div>
                <Label icon={MapPin} hint="พิมพ์แล้วกด Enter เพิ่มได้หลายที่">งานนี้จะไปอยู่ที่ไหน</Label>
                <TagInput
                  value={form.destinations}
                  onChange={(v) => set("destinations", v)}
                  placeholder="เช่น IG ทั้งสองคน, Bangkok Art Book Fair, แกลลอรี่ …"
                  ariaLabel="ปลายทางของงาน"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
                <div>
                  <Label icon={CalendarDays}>เสร็จประมาณ</Label>
                  <Input
                    type="date"
                    value={form.dueAt ?? ""}
                    onChange={(e) => set("dueAt", e.target.value || null)}
                    aria-label="เสร็จประมาณ"
                    className="h-10 rounded-xl"
                  />
                </div>
                <div>
                  <Label icon={ShieldCheck}>เครดิตและสิทธิ์</Label>
                  <Select value={form.rightsPreset} onValueChange={(v) => set("rightsPreset", v as CollabRightsPreset)}>
                    <SelectTrigger className="h-10 rounded-xl" aria-label="เครดิตและสิทธิ์">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COLLAB_RIGHTS_PRESETS.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.id === "custom" ? "กำหนดเอง…" : p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.rightsPreset === "custom" ? (
                    <Textarea
                      value={form.rightsNote}
                      onChange={(e) => set("rightsNote", e.target.value.slice(0, 600))}
                      placeholder="ระบุเงื่อนไข เช่น ใช้เชิงพาณิชย์ได้ แบ่งรายได้ 50/50"
                      aria-label="เงื่อนไขสิทธิ์"
                      rows={3}
                      className="mt-2 resize-y rounded-xl text-sm"
                    />
                  ) : null}
                </div>
              </div>

              <div className="border-t border-border pt-3">
                <button
                  type="button"
                  onClick={() => setMoreOpen((v) => !v)}
                  aria-expanded={moreOpen}
                  className="flex w-full items-center justify-between py-1 text-sm text-muted-foreground hover:text-foreground"
                >
                  <span className="flex items-center gap-1.5">
                    <Plus className="h-4 w-4" aria-hidden /> เพิ่มรายละเอียด (ไม่บังคับ)
                  </span>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", moreOpen && "rotate-180")} aria-hidden />
                </button>
                {moreOpen ? (
                  <div className="mt-3 space-y-5">
                    <div>
                      <Label icon={Link2}>อ้างอิง</Label>
                      <ListInput value={form.links} onChange={(v) => set("links", v)} placeholder="วางลิงก์ แล้วกด Enter" ariaLabel="ลิงก์อ้างอิง" />
                    </div>
                    <div>
                      <Label icon={Package}>ชิ้นงานที่จะส่ง</Label>
                      <ListInput value={form.deliverables} onChange={(v) => set("deliverables", v)} placeholder="เช่น ไฟล์ปก 3000×3000 px" ariaLabel="ชิ้นงานที่จะส่ง" />
                    </div>
                    <div>
                      <Label icon={StickyNote}>โน้ต</Label>
                      <Textarea value={form.note} onChange={(e) => set("note", e.target.value.slice(0, 2000))} rows={3} className="resize-y rounded-xl" aria-label="โน้ต" />
                    </div>
                  </div>
                ) : null}
              </div>
            </fieldset>
          )}

          {a.status === "agreed" ? (
            <div className="space-y-3 rounded-2xl border border-[hsl(var(--chat-collab)/0.35)] bg-[hsl(var(--chat-collab-soft))] p-4">
              {a.closed ? (
                <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  <Check className="h-4 w-4" aria-hidden /> ปิดคอลแลปแล้ว — ขอบคุณที่ร่วมงานกัน
                </p>
              ) : (
                <>
                  <p className="text-sm">งานเสร็จแล้ว? ลงเป็นผลงานร่วมกันให้ทุกคนได้เครดิต หรือปิดคอลแลปไว้เฉยๆ ก็ได้</p>
                  <div className="flex flex-wrap gap-2">
                    {publishPath ? (
                      <Button asChild size="sm" className="rounded-full bg-[hsl(var(--chat-collab))] text-[hsl(var(--chat-collab-foreground))] hover:opacity-90">
                        <Link to={publishPath}>ลงผลงานร่วมกัน</Link>
                      </Button>
                    ) : null}
                    {!readOnly ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-full bg-card"
                        disabled={a.busy}
                        onClick={() => void run(() => a.toggleClose(myName))}
                      >
                        {a.myClosed ? "ยืนยันปิดแล้ว · ยกเลิก" : "ปิดคอลแลป (ไม่ลงผลงาน)"}
                        {a.closeCount > 0 ? <span className="ml-1 tabular-nums text-muted-foreground">{a.closeCount}/{a.memberIds.length}</span> : null}
                      </Button>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          ) : null}
        </div>

        {!readOnly ? (
          <div className="space-y-2 border-t border-border px-5 py-3">
            {sent && dirty ? (
              <p className={cn("text-xs", diff.needsReconfirm ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
                {diff.needsReconfirm
                  ? `แก้${diff.labels.filter((l) => l === "ใครทำอะไร" || l === "เครดิตและสิทธิ์").join(", ")} — ทุกคนต้องยืนยันใหม่`
                  : "จะแจ้งในแชทว่าแก้อะไร — ไม่ต้องยืนยันใหม่"}
              </p>
            ) : null}
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <History className="h-3.5 w-3.5" aria-hidden />
                {a.versions.length ? `แก้ไขแล้ว ${a.versions.length} ครั้ง` : "ยังไม่เคยบันทึก"}
              </span>
              <div className="flex gap-2">
                {!sent ? (
                  <>
                    {dirty ? (
                      <Button type="button" variant="ghost" className="rounded-full" disabled={a.busy} onClick={() => void run(() => a.save(form, { actorName: myName }), "บันทึกร่างแล้ว")}>
                        บันทึกร่าง
                      </Button>
                    ) : null}
                    <Button type="button" className="rounded-full gap-1.5" disabled={a.busy} onClick={send}>
                      {a.busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                      ส่งให้ยืนยัน
                    </Button>
                  </>
                ) : dirty ? (
                  <>
                    <Button type="button" variant="ghost" className="rounded-full" onClick={() => setForm(a.agreement)}>
                      ยกเลิก
                    </Button>
                    <Button type="button" className="rounded-full gap-1.5" disabled={a.busy} onClick={() => void run(() => a.save(form, { actorName: myName }), "บันทึกแล้ว")}>
                      {a.busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                      บันทึก
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    variant={a.myAcked ? "outline" : "default"}
                    className="rounded-full gap-1.5"
                    disabled={a.busy}
                    onClick={() => void run(() => a.toggleAck(myName))}
                  >
                    <Check className="h-4 w-4" aria-hidden />
                    {a.myAcked ? "ตกลงแล้ว · ยกเลิก" : "ตกลงตามแผนนี้"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
