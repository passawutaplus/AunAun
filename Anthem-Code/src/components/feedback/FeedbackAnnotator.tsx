import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import {
  ArrowUpRight,
  ChevronUp,
  Highlighter,
  MessageCircle,
  Minus,
  PenLine,
  Redo2,
  Square,
  Undo2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FeedbackCommentPin } from "@/lib/feedbackTicket";

export type AnnotateTool = "pen" | "highlight" | "arrow" | "rect" | "redact" | "comment";

type Point = { x: number; y: number };

type PathAnno = {
  id: string;
  kind: "path";
  tool: "pen" | "highlight";
  points: Point[];
  color: string;
  width: number;
};
type BoxAnno = {
  id: string;
  kind: "box";
  tool: "arrow" | "rect" | "redact";
  start: Point;
  end: Point;
  color: string;
  width: number;
};
type CommentAnno = { id: string; kind: "comment"; at: Point; text: string; number: number };
type Anno = PathAnno | BoxAnno | CommentAnno;
type DrawDraft = PathAnno | BoxAnno;

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `a-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isPath(a: Anno | DrawDraft): a is PathAnno {
  return a.kind === "path";
}
function isComment(a: Anno): a is CommentAnno {
  return a.kind === "comment";
}

export type FeedbackAnnotatorHandle = {
  exportSnapshot: () => { dataUrl: string; comments: FeedbackCommentPin[] };
};

const DRAW_TOOLS: { id: AnnotateTool; label: string; icon: typeof PenLine }[] = [
  { id: "pen", label: "ปากกา", icon: PenLine },
  { id: "highlight", label: "ไฮไลต์", icon: Highlighter },
  { id: "arrow", label: "ลูกศร", icon: ArrowUpRight },
  { id: "rect", label: "กรอบ", icon: Square },
  { id: "redact", label: "ทึบดำ", icon: Minus },
  { id: "comment", label: "คอมเมนต์", icon: MessageCircle },
];

function toLocal(el: HTMLCanvasElement, clientX: number, clientY: number): Point {
  const box = el.getBoundingClientRect();
  const x = ((clientX - box.left) / box.width) * el.width;
  const y = ((clientY - box.top) / box.height) * el.height;
  return { x, y };
}

function drawArrow(ctx: CanvasRenderingContext2D, start: Point, end: Point, color: string, width: number) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dy) || 1;
  const head = Math.min(18, len * 0.25);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
  const ux = dx / len;
  const uy = dy / len;
  ctx.beginPath();
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(end.x - ux * head - uy * head * 0.45, end.y - uy * head + ux * head * 0.45);
  ctx.lineTo(end.x - ux * head + uy * head * 0.45, end.y - uy * head - ux * head * 0.45);
  ctx.closePath();
  ctx.fill();
}

function paintDraft(ctx: CanvasRenderingContext2D, shape: DrawDraft) {
  if (isPath(shape)) {
    ctx.save();
    ctx.strokeStyle = shape.color;
    ctx.lineWidth = shape.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (shape.tool === "highlight") ctx.globalAlpha = 0.35;
    ctx.beginPath();
    shape.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    ctx.restore();
    return;
  }
  if (shape.tool === "arrow") {
    drawArrow(ctx, shape.start, shape.end, shape.color, shape.width);
    return;
  }
  const x = Math.min(shape.start.x, shape.end.x);
  const y = Math.min(shape.start.y, shape.end.y);
  const w = Math.abs(shape.end.x - shape.start.x);
  const h = Math.abs(shape.end.y - shape.start.y);
  if (shape.tool === "redact") {
    ctx.fillStyle = "#111111";
    ctx.fillRect(x, y, w, h);
    return;
  }
  ctx.strokeStyle = shape.color;
  ctx.lineWidth = shape.width;
  ctx.strokeRect(x, y, w, h);
}

type Props = {
  imageDataUrl: string;
  initialComments?: FeedbackCommentPin[];
  layout?: "inline" | "full";
};

export const FeedbackAnnotator = forwardRef<FeedbackAnnotatorHandle, Props>(function FeedbackAnnotator(
  { imageDataUrl, initialComments = [], layout = "inline" },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [tool, setTool] = useState<AnnotateTool>("pen");
  const [annos, setAnnos] = useState<Anno[]>([]);
  const [past, setPast] = useState<Anno[][]>([]);
  const [future, setFuture] = useState<Anno[][]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openCommentId, setOpenCommentId] = useState<string | null>(null);
  const seedCommentsRef = useRef(initialComments);
  seedCommentsRef.current = initialComments;
  const draftRef = useRef<DrawDraft | null>(null);
  const drawingRef = useRef(false);
  const annosRef = useRef(annos);
  annosRef.current = annos;

  const commit = useCallback((next: Anno[]) => {
    setPast((p) => [...p, annosRef.current]);
    setAnnos(next);
    setFuture([]);
  }, []);

  const undo = () => {
    setPast((p) => {
      if (!p.length) return p;
      const prev = p[p.length - 1];
      setFuture((f) => [annosRef.current, ...f]);
      setAnnos(prev);
      setEditingId(null);
      return p.slice(0, -1);
    });
  };

  const redo = () => {
    setFuture((f) => {
      if (!f.length) return f;
      const [next, ...rest] = f;
      setPast((p) => [...p, annosRef.current]);
      setAnnos(next);
      setEditingId(null);
      return rest;
    });
  };

  const patchAnno = (id: string, text: string) => {
    setAnnos((prev) => prev.map((a) => (a.id === id && isComment(a) ? { ...a, text } : a)));
  };

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    for (const a of annos) {
      if (a.kind === "path" || a.kind === "box") paintDraft(ctx, a);
    }
    if (draftRef.current) paintDraft(ctx, draftRef.current);
  }, [annos]);

  const paintForExport = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) throw new Error("ยังไม่มีภาพ");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("ส่งออกภาพไม่สำเร็จ");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    for (const a of annosRef.current) {
      if (a.kind === "path" || a.kind === "box") paintDraft(ctx, a);
    }
  }, []);

  const snapshotComments = useCallback((): FeedbackCommentPin[] => {
    const canvas = canvasRef.current;
    const w = Math.max(1, canvas?.width ?? 1);
    const h = Math.max(1, canvas?.height ?? 1);
    return annosRef.current.filter(isComment).map((c) => ({
      number: c.number,
      nx: Math.min(1, Math.max(0, c.at.x / w)),
      ny: Math.min(1, Math.max(0, c.at.y / h)),
      text: c.text.trim().slice(0, 500),
    }));
  }, []);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const w = canvas.width;
      const h = canvas.height;
      const seeded = seedCommentsRef.current;
      setAnnos(
        seeded.map((c) => ({
          id: newId(),
          kind: "comment" as const,
          at: { x: c.nx * w, y: c.ny * h },
          text: c.text,
          number: c.number,
        })),
      );
      setPast([]);
      setFuture([]);
    };
    img.src = imageDataUrl;
  }, [imageDataUrl]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  useImperativeHandle(ref, () => ({
    exportSnapshot: () => {
      paintForExport();
      const canvas = canvasRef.current;
      if (!canvas) throw new Error("ยังไม่มีภาพ");
      return { dataUrl: canvas.toDataURL("image/jpeg", 0.88), comments: snapshotComments() };
    },
  }));

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const p = toLocal(canvas, e.clientX, e.clientY);
    if (tool === "comment") {
      const id = newId();
      const number = annos.filter(isComment).length + 1;
      commit([...annos, { id, kind: "comment", at: p, text: "", number }]);
      setOpenCommentId(id);
      setEditingId(id);
      return;
    }
    canvas.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    if (tool === "pen") {
      draftRef.current = { id: newId(), kind: "path", tool, points: [p], color: "#e11d48", width: 3 };
    } else if (tool === "highlight") {
      draftRef.current = { id: newId(), kind: "path", tool, points: [p], color: "#facc15", width: 16 };
    } else {
      draftRef.current = {
        id: newId(),
        kind: "box",
        tool,
        start: p,
        end: p,
        color: tool === "redact" ? "#111111" : "#f97316",
        width: 3,
      };
    }
    redraw();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !canvasRef.current || !draftRef.current) return;
    const p = toLocal(canvasRef.current, e.clientX, e.clientY);
    const draft = draftRef.current;
    if (isPath(draft)) draft.points.push(p);
    else draft.end = p;
    redraw();
  };

  const onPointerUp = () => {
    drawingRef.current = false;
    if (draftRef.current) {
      const done = draftRef.current;
      draftRef.current = null;
      commit([...annos, done]);
    }
  };

  const full = layout === "full";
  const cursor = tool === "comment" ? "pointer" : "crosshair";

  return (
    <div className={cn("space-y-2", full && "flex min-h-0 flex-1 flex-col")}>
      <div className="flex w-full flex-wrap items-center gap-1">
        {DRAW_TOOLS.map((t) => {
          const Icon = t.icon;
          const active = tool === t.id;
          return (
            <button
              key={t.id}
              type="button"
              aria-label={t.label}
              title={t.label}
              onClick={() => setTool(t.id)}
              className={cn(
                "inline-flex h-8 items-center gap-1 rounded-md border px-2 text-[11px]",
                active ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            aria-label="Undo"
            title="Undo"
            onClick={undo}
            disabled={past.length === 0}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2 text-[11px] font-medium text-muted-foreground disabled:opacity-40"
          >
            <Undo2 className="h-3.5 w-3.5" />
            Undo
          </button>
          <button
            type="button"
            aria-label="Redo"
            title="Redo"
            onClick={redo}
            disabled={future.length === 0}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2 text-[11px] font-medium text-muted-foreground disabled:opacity-40"
          >
            <Redo2 className="h-3.5 w-3.5" />
            Redo
          </button>
        </div>
      </div>
      <div
        className={cn(
          "overflow-auto rounded-lg border border-border bg-muted/40",
          full ? "min-h-0 flex-1" : "overflow-hidden",
        )}
      >
        <div className="relative mx-auto w-fit max-w-full">
          <canvas
            ref={canvasRef}
            className={cn(
              "block bg-background touch-none",
              full ? "h-auto max-h-[min(72vh,760px)] w-auto max-w-full" : "max-h-56 w-full",
            )}
            style={{ cursor }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
          {annos.filter(isComment).map((anno) => {
            const open = openCommentId === anno.id;
            return (
              <div
                key={anno.id}
                className="absolute z-[3]"
                style={{
                  left: `${(anno.at.x / (canvasRef.current?.width || 1)) * 100}%`,
                  top: `${(anno.at.y / (canvasRef.current?.height || 1)) * 100}%`,
                }}
              >
                <button
                  type="button"
                  aria-label={`คอมเมนต์ ${anno.number}`}
                  aria-expanded={open}
                  className="absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary text-[11px] font-bold text-primary-foreground shadow ring-2 ring-white"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => {
                    setOpenCommentId(open ? null : anno.id);
                    if (!open) setEditingId(anno.id);
                  }}
                >
                  {anno.number}
                </button>
                {open ? (
                  <div
                    className="absolute left-4 top-[-10px] w-48 rounded-md border border-border bg-background p-2 shadow-lg"
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="text-[11px] font-medium">คอมเมนต์ {anno.number}</p>
                      <button
                        type="button"
                        aria-label="หุบ"
                        className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setOpenCommentId(null);
                          setEditingId(null);
                        }}
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <textarea
                      autoFocus={editingId === anno.id}
                      value={anno.text}
                      placeholder="เขียนคอมเมนต์"
                      rows={3}
                      className="w-full resize-none rounded-md border border-border bg-background px-1.5 py-1 text-xs outline-none focus:border-primary"
                      onChange={(e) => patchAnno(anno.id, e.target.value)}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});
