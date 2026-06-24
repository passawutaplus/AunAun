import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CheckCircle2,
  Clock,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { FeedbackJob, Revision, RevisionStatus, STATUS_META } from "./types";
import { AddRevisionForm } from "./AddRevisionForm";
import { ImageLightbox } from "./ImageLightbox";

// Vertical revision timeline with scope-creep alerts and image lightbox.
export function JobCard({
  job,
  clientName,
  onUpdate,
  onDelete,
}: {
  job: FeedbackJob;
  clientName: string;
  onUpdate: (j: FeedbackJob) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = React.useState(true);
  const [confirmDel, setConfirmDel] = React.useState(false);
  const [lightbox, setLightbox] = React.useState<{ images: string[]; index: number } | null>(null);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const wasClosedRef = React.useRef(job.closed);

  const lastRound = job.revisions.reduce((m, r) => Math.max(m, r.round), 0);
  const nextRound = lastRound + 1;
  const lastStatus = job.revisions[job.revisions.length - 1]?.status;
  const quota = job.revisionQuota ?? 0;
  const hasQuota = quota > 0;
  const usedCount = job.revisions.length;
  const isOverQuota = hasQuota && usedCount > quota;

  // Confetti when the job is marked as closed
  React.useEffect(() => {
    if (job.closed && !wasClosedRef.current) {
      void fireCelebration(cardRef.current);
    }
    wasClosedRef.current = job.closed;
  }, [job.closed]);

  const addRevision = (rev: Omit<Revision, "id" | "createdAt">) => {
    const newRev: Revision = {
      ...rev,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    const closed = rev.status === "final" ? true : job.closed;
    onUpdate({ ...job, revisions: [...job.revisions, newRev], closed });
  };

  const updateRevisionStatus = (revId: string, status: RevisionStatus) => {
    const revisions = job.revisions.map((r) => (r.id === revId ? { ...r, status } : r));
    const closed = revisions.some((r) => r.status === "final");
    onUpdate({ ...job, revisions, closed });
  };

  const reopen = () => onUpdate({ ...job, closed: false });

  const copyClientMessage = async (round: number) => {
    const msg = `สวัสดีครับ/ค่ะ 🙏\n\nงาน "${job.title}" ตอนนี้เข้าสู่การแก้ไขครั้งที่ ${round} แล้ว ซึ่งเกินจากที่ตกลงกันไว้ในใบเสนอราคา (${quota} ครั้ง)\n\nจึงขอแจ้งว่าการแก้ไขรอบถัดไปจะมีค่าใช้จ่ายเพิ่มเติมตามขอบเขตงาน โดยจะแจ้งราคาให้พิจารณาก่อนเริ่มทุกครั้งครับ/ค่ะ\n\nขอบคุณที่ไว้วางใจครับ/ค่ะ ✨`;
    try {
      await navigator.clipboard.writeText(msg);
      toast.success("คัดลอกข้อความแล้ว — วางส่งให้ลูกค้าได้เลย");
    } catch {
      toast.error("คัดลอกไม่สำเร็จ");
    }
  };

  return (
    <div ref={cardRef} className="relative">
      <Card className="rounded-2xl border-border/60 shadow-soft">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base truncate">{job.title}</CardTitle>
                {job.closed ? (
                  <Badge className="bg-success/15 text-success rounded-md gap-1">
                    <CheckCircle2 className="h-3 w-3" /> ปิดงานแล้ว
                  </Badge>
                ) : (
                  <Badge className="bg-warning/20 text-warning-foreground rounded-md gap-1">
                    <Clock className="h-3 w-3" /> กำลังดำเนินการ
                  </Badge>
                )}
                {hasQuota && (
                  <Badge
                    className={`rounded-md gap-1 ${
                      isOverQuota
                        ? "bg-destructive text-destructive-foreground"
                        : usedCount === quota
                          ? "bg-warning/30 text-warning-foreground"
                          : "bg-success/15 text-success"
                    }`}
                  >
                    {isOverQuota && <AlertTriangle className="h-3 w-3" />}
                    แก้ไข {usedCount}/{quota}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {clientName} • {usedCount} รอบการแก้ไข
                {lastStatus && ` • ล่าสุด: ${STATUS_META[lastStatus].label}`}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-lg"
                onClick={() => setOpen((o) => !o)}
                aria-label={open ? "ย่อ" : "ขยาย"}
              >
                {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-lg text-destructive hover:text-destructive"
                onClick={() => setConfirmDel(true)}
                aria-label="ลบ"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {open && (
          <CardContent className="space-y-4">
            {job.revisions.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                ยังไม่มีการแก้ไข — เริ่มบันทึกครั้งแรกได้เลย
              </p>
            )}

            {/* Vertical timeline of revisions */}
            {job.revisions.length > 0 && (
              <div className="relative pl-6 space-y-4">
                {/* timeline spine */}
                <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-border" aria-hidden />
                {job.revisions.map((r) => {
                  const over = hasQuota && r.round > quota;
                  return (
                    <div key={r.id} className="relative">
                      {/* timeline dot */}
                      <div
                        className={`absolute -left-[18px] top-3 h-4 w-4 rounded-full border-2 border-background ${
                          over
                            ? "bg-destructive"
                            : r.status === "final"
                              ? "bg-success"
                              : r.status === "completed"
                                ? "bg-primary"
                                : "bg-warning"
                        }`}
                        aria-hidden
                      />
                      <div
                        className={`rounded-2xl border p-4 space-y-3 ${
                          over
                            ? "border-destructive/40 bg-destructive/5"
                            : "border-border/60 bg-card"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              className={`rounded-md gap-1 ${
                                over
                                  ? "bg-destructive text-destructive-foreground"
                                  : "bg-secondary text-secondary-foreground"
                              }`}
                            >
                              {over && <AlertTriangle className="h-3 w-3" />}
                              แก้ไขครั้งที่ {r.round}
                            </Badge>
                            <span className="text-[11px] text-muted-foreground">
                              {new Date(r.createdAt).toLocaleString("th-TH", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <Select
                            value={r.status}
                            onValueChange={(v) => updateRevisionStatus(r.id, v as RevisionStatus)}
                          >
                            <SelectTrigger className="h-7 w-[140px] rounded-lg text-[11px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(Object.keys(STATUS_META) as RevisionStatus[]).map((s) => (
                                <SelectItem key={s} value={s} className="text-xs">
                                  {STATUS_META[s].label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {over && (
                          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 space-y-2">
                            <p className="text-xs text-destructive font-medium flex items-start gap-2">
                              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                              <span>
                                เกินโควต้าการแก้ไข ({quota} ครั้ง) —
                                แนะนำแจ้งลูกค้าเพื่อคิดค่าใช้จ่ายเพิ่ม
                              </span>
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 rounded-lg text-[11px] gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
                              onClick={() => copyClientMessage(r.round)}
                            >
                              <Copy className="h-3 w-3" /> คัดลอกข้อความแจ้งลูกค้า
                            </Button>
                          </div>
                        )}

                        {/* Split layout: images left, notes right (md+) */}
                        <div
                          className={`grid gap-3 ${
                            r.images.length > 0 ? "md:grid-cols-[1fr_1.2fr]" : "grid-cols-1"
                          }`}
                        >
                          {r.images.length > 0 && (
                            <div className="grid grid-cols-2 gap-2">
                              {r.images.map((src, i) => (
                                <button
                                  type="button"
                                  key={i}
                                  onClick={() => setLightbox({ images: r.images, index: i })}
                                  className="rounded-lg overflow-hidden border border-border/60 hover:border-primary/50 transition-colors group"
                                >
                                  <img
                                    src={src}
                                    alt={`รอบ ${r.round} รูป ${i + 1}`}
                                    className="w-full aspect-square object-cover group-hover:scale-105 transition-transform"
                                    loading="lazy"
                                    decoding="async"
                                  />
                                </button>
                              ))}
                            </div>
                          )}
                          <div className="space-y-2 min-w-0">
                            <p className="text-sm whitespace-pre-wrap leading-relaxed break-words">
                              {r.notes}
                            </p>
                            <div
                              className={`text-[11px] inline-flex items-center rounded-md px-2 py-0.5 ${STATUS_META[r.status].className}`}
                            >
                              {STATUS_META[r.status].label}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {job.closed ? (
              <div className="rounded-2xl border-2 border-dashed border-success/30 bg-success/5 p-4 text-center space-y-2">
                <CheckCircle2 className="h-6 w-6 text-success mx-auto" />
                <p className="text-sm font-medium">งานนี้ปิดเรียบร้อยแล้ว</p>
                <p className="text-xs text-muted-foreground">
                  ใช้ทั้งหมด {usedCount} รอบการแก้ไข
                  {hasQuota && ` (โควต้า ${quota})`}
                </p>
                <Button size="sm" variant="outline" className="rounded-xl mt-2" onClick={reopen}>
                  เปิดงานใหม่
                </Button>
              </div>
            ) : (
              <AddRevisionForm nextRound={nextRound} onAdd={addRevision} />
            )}
          </CardContent>
        )}

        <AlertDialog open={confirmDel} onOpenChange={setConfirmDel}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>ลบงาน "{job.title}"?</AlertDialogTitle>
              <AlertDialogDescription>
                ประวัติฟีดแบคและรอบการแก้ไขทั้งหมดจะหายไปด้วย — กระทำไม่สามารถย้อนกลับได้
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  onDelete();
                  setConfirmDel(false);
                }}
              >
                ลบงานนี้
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>

      <ImageLightbox
        images={lightbox?.images ?? []}
        index={lightbox?.index ?? null}
        onClose={() => setLightbox(null)}
        onIndexChange={(i) => setLightbox((l) => (l ? { ...l, index: i } : l))}
      />
    </div>
  );
}

// Confetti celebration when a job transitions to closed
async function fireCelebration(target: HTMLElement | null) {
  try {
    const mod = await import("canvas-confetti");
    const confetti = mod.default;
    const rect = target?.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    const vw = window.innerWidth || 1;
    const y = rect ? (rect.top + rect.height / 2) / vh : 0.5;
    const leftX = rect ? Math.max(0.02, rect.left / vw) : 0.1;
    const rightX = rect ? Math.min(0.98, rect.right / vw) : 0.9;

    const duration = 2000;
    const end = Date.now() + duration;
    const colors = ["#FF5F05", "#FF9F67", "#22c55e", "#f59e0b", "#a855f7"];

    const tick = () => {
      const remaining = end - Date.now();
      if (remaining <= 0) return;
      const particleCount = 6;
      confetti({
        particleCount,
        startVelocity: 38,
        spread: 60,
        angle: 60,
        origin: { x: leftX, y },
        colors,
        ticks: 120,
        scalar: 0.9,
        disableForReducedMotion: true,
      });
      confetti({
        particleCount,
        startVelocity: 38,
        spread: 60,
        angle: 120,
        origin: { x: rightX, y },
        colors,
        ticks: 120,
        scalar: 0.9,
        disableForReducedMotion: true,
      });
      requestAnimationFrame(tick);
    };
    tick();
  } catch {
    // silent — celebration is non-essential
  }
}
