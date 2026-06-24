import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Plus, Trash2, CalendarDays, ChevronDown, NotebookPen, Star } from "lucide-react";
import { useDashboardJobs, type DashboardJob } from "@/store/dashboardJobs";
import { useDashboardJobTasks, type DashboardJobTask } from "@/store/dashboardJobTasks";
import { useClients } from "@/store/clients";
import { toast } from "sonner";

const DAYS_TH = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const DAY_LABELS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];

// Stable brand color from name hash → use semantic palette via class
function brandClass(brand: string): string {
  const palette = [
    "bg-primary/15 text-primary border-primary/30",
    "bg-blue-500/15 text-blue-600 border-blue-500/30",
    "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
    "bg-purple-500/15 text-purple-600 border-purple-500/30",
    "bg-pink-500/15 text-pink-600 border-pink-500/30",
    "bg-amber-500/15 text-amber-600 border-amber-500/30",
  ];
  let h = 0;
  for (let i = 0; i < brand.length; i++) h = (h * 31 + brand.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

// Get start (Sunday) of current week
function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
  return x;
}
function fmtISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type Row = { task: DashboardJobTask; job: DashboardJob; weekday: number | null };

export function JobListWidget() {
  const jobs = useDashboardJobs();
  const tasks = useDashboardJobTasks();
  const clients = useClients();
  const [adding, setAdding] = React.useState(false);
  const [newBrand, setNewBrand] = React.useState("");
  const [selectedClientId, setSelectedClientId] = React.useState<string | null>(null);
  const [showSuggest, setShowSuggest] = React.useState(false);
  const [expanded, setExpanded] = React.useState(true);

  const today = new Date();
  const todayDow = today.getDay();
  const weekStart = startOfWeek(today);
  const weekDates: string[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return fmtISO(d);
  });

  const jobById = React.useMemo(() => {
    const m = new Map<string, DashboardJob>();
    jobs.list.forEach((j) => m.set(j.id, j));
    return m;
  }, [jobs.list]);

  // All tasks for this week (by their job's dueDate)
  const rows: Row[] = React.useMemo(() => {
    return tasks.list
      .map((t) => {
        const job = jobById.get(t.jobId);
        if (!job) return null;
        let weekday: number | null = null;
        if (job.dueDate && weekDates.includes(job.dueDate)) {
          weekday = weekDates.indexOf(job.dueDate);
        }
        return { task: t, job, weekday };
      })
      .filter((x): x is Row => x !== null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks.list, jobById]);

  const weekRows = rows.filter((r) => r.weekday !== null);
  const totalWeek = weekRows.length;
  const doneWeek = weekRows.filter((r) => r.task.done).length;
  const pct = totalWeek > 0 ? Math.round((doneWeek / totalWeek) * 100) : 0;

  const countByDay = (dow: number) => weekRows.filter((r) => r.weekday === dow).length;

  const handleAdd = async (overrideName?: string) => {
    const b = (overrideName ?? newBrand).trim();
    if (!b) {
      setAdding(false);
      return;
    }
    try {
      // If user typed a name that doesn't match an existing client, auto-create a quick client
      let clientName = b;
      if (!selectedClientId) {
        const match = clients.list.find((c) => c.name.toLowerCase() === b.toLowerCase());
        if (match) {
          clientName = match.name;
        } else {
          try {
            const created = await clients.add({ name: b });
            clientName = created.name;
            toast.success(
              `เพิ่มลูกค้าใหม่ "${clientName}" แล้ว — ไปเติมรายละเอียดในแท็บลูกค้าได้เลย`,
            );
          } catch {
            // If client add fails, still proceed with brand-only
          }
        }
      } else {
        const c = clients.list.find((x) => x.id === selectedClientId);
        if (c) clientName = c.name;
      }
      await jobs.add({ brand: clientName, task: "", dueDate: fmtISO(today) });
      setNewBrand("");
      setSelectedClientId(null);
      setShowSuggest(false);
      setAdding(false);
    } catch {
      toast.error("เพิ่มแบรนด์ไม่สำเร็จ");
    }
  };

  const suggestions = React.useMemo(() => {
    const q = newBrand.trim().toLowerCase();
    const list = clients.list;
    if (!q) return list.slice(0, 6);
    return list.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 6);
  }, [clients.list, newBrand]);

  const exactMatch = React.useMemo(
    () => clients.list.some((c) => c.name.toLowerCase() === newBrand.trim().toLowerCase()),
    [clients.list, newBrand],
  );

  // Group tasks by weekday for display
  const grouped: { dow: number; rows: Row[] }[] = React.useMemo(() => {
    const out: { dow: number; rows: Row[] }[] = [];
    for (let i = 0; i < 7; i++) {
      const r = weekRows.filter((x) => x.weekday === i);
      if (r.length > 0) out.push({ dow: i, rows: r });
    }
    return out;
  }, [weekRows]);

  const noScheduled = rows.filter((r) => r.weekday === null);

  return (
    <Card className="rounded-xl border-border/60 shadow-soft h-full">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <span className="rounded-lg bg-primary-soft text-primary p-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
          </span>
          งานรายอาทิตย์
        </CardTitle>
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-xs gap-1"
          onClick={() => setAdding((v) => !v)}
        >
          <Plus className="h-3 w-3" /> เพิ่มงาน
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Week strip */}
        <div className="grid grid-cols-7 gap-1">
          {DAYS_TH.map((d, i) => {
            const isToday = i === todayDow;
            const count = countByDay(i);
            return (
              <div
                key={i}
                className={`text-center rounded-lg py-1 ${isToday ? "bg-primary-soft/60" : ""}`}
              >
                <div
                  className={`text-[10px] font-medium flex items-center justify-center gap-0.5 ${
                    isToday ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {d}
                  {isToday && <Star className="h-2.5 w-2.5 fill-primary text-primary" />}
                </div>
                <div
                  className={`text-sm font-semibold tabular-nums ${
                    count > 0
                      ? isToday
                        ? "text-primary"
                        : "text-foreground"
                      : "text-muted-foreground/75"
                  }`}
                >
                  {count}
                </div>
                {count > 0 && (
                  <div
                    className={`h-1 w-1 rounded-full mx-auto ${
                      isToday ? "bg-primary" : "bg-muted-foreground/40"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Weekly progress */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-muted-foreground">ความคืบหน้าสัปดาห์นี้</span>
            <span className="text-[11px] tabular-nums font-medium">
              {doneWeek}/{totalWeek} งาน
            </span>
          </div>
          <Progress value={pct} className="h-1" />
        </div>

        {/* Add brand form — linked with clients */}
        {adding && (
          <div className="rounded-lg border border-primary/30 bg-primary-soft/30 p-2 space-y-1.5 animate-fade-in">
            <div className="relative">
              <Input
                autoFocus
                value={newBrand}
                onChange={(e) => {
                  setNewBrand(e.target.value);
                  setSelectedClientId(null);
                  setShowSuggest(true);
                }}
                onFocus={() => setShowSuggest(true)}
                onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                  if (e.key === "Escape") {
                    setAdding(false);
                    setNewBrand("");
                    setSelectedClientId(null);
                  }
                }}
                placeholder="พิมพ์ชื่อลูกค้า / แบรนด์ เช่น Wsc, WP"
                className="h-8 text-xs"
              />
              {showSuggest && (suggestions.length > 0 || (newBrand.trim() && !exactMatch)) && (
                <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-lg border border-border bg-popover shadow-lg max-h-52 overflow-y-auto">
                  {suggestions.length > 0 && (
                    <div className="py-1">
                      <div className="px-2 py-1 text-[9px] uppercase tracking-wide text-muted-foreground">
                        ลูกค้าที่บันทึกไว้
                      </div>
                      {suggestions.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setNewBrand(c.name);
                            setSelectedClientId(c.id);
                            setShowSuggest(false);
                          }}
                          className="w-full text-left px-2 py-1.5 text-xs hover:bg-muted/60 flex items-center gap-1.5"
                        >
                          <span
                            className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${brandClass(c.name)}`}
                          >
                            {c.name.slice(0, 2).toLowerCase()}
                          </span>
                          <span className="truncate">{c.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {newBrand.trim() && !exactMatch && (
                    <div className="border-t border-border/60 py-1">
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleAdd(newBrand)}
                        className="w-full text-left px-2 py-1.5 text-xs hover:bg-primary-soft/60 text-primary font-medium flex items-center gap-1.5"
                      >
                        <Plus className="h-3 w-3" />
                        เพิ่มลูกค้าใหม่ "{newBrand.trim()}"
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            {selectedClientId && (
              <p className="text-[10px] text-success px-0.5">✓ ลิงก์กับลูกค้าที่บันทึกไว้แล้ว</p>
            )}
            <div className="flex justify-between items-center gap-1">
              <p className="text-[10px] text-muted-foreground">
                ไม่เจอชื่อ? พิมพ์แล้ว Enter จะเพิ่มลูกค้าใหม่ให้ทันที
              </p>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => {
                    setAdding(false);
                    setNewBrand("");
                    setSelectedClientId(null);
                  }}
                >
                  ยกเลิก
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs bg-gradient-primary"
                  onClick={() => handleAdd()}
                >
                  เพิ่มแบรนด์
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Task list grouped by day */}
        {jobs.list.length === 0 && !adding ? (
          <div className="text-center py-6 text-muted-foreground">
            <NotebookPen className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">วันนี้ยังว่างอยู่ครับบอส</p>
            <p className="text-[10px]">กดปุ่ม + เพิ่มงาน เพื่อเริ่ม</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {grouped.map(({ dow, rows: dayRows }) => {
              const isToday = dow === todayDow;
              return (
                <div key={dow}>
                  <div className="flex items-center gap-1 mb-1">
                    <span
                      className={`text-[11px] font-semibold ${
                        isToday ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {DAY_LABELS[dow]}
                      {isToday && " (วันนี้)"}
                    </span>
                  </div>
                  <div className="space-y-0.5 pl-1">
                    {dayRows.map((r) => (
                      <TaskRow
                        key={r.task.id}
                        row={r}
                        onUpdate={tasks.update}
                        onRemove={tasks.remove}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {noScheduled.length > 0 && (
              <div>
                <div className="text-[11px] font-semibold text-muted-foreground mb-1">
                  ไม่กำหนดวัน
                </div>
                <div className="space-y-0.5 pl-1">
                  {noScheduled.map((r) => (
                    <TaskRow
                      key={r.task.id}
                      row={r}
                      onUpdate={tasks.update}
                      onRemove={tasks.remove}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Manage brands (collapsed) */}
            <div className="pt-2 border-t border-border/40">
              <button
                onClick={() => setExpanded((v) => !v)}
                className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <ChevronDown
                  className={`h-3 w-3 transition-transform ${expanded ? "" : "-rotate-90"}`}
                />
                จัดการแบรนด์ ({jobs.list.length})
              </button>
              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-1.5 space-y-1">
                      {jobs.list.map((j) => (
                        <BrandManageRow
                          key={j.id}
                          job={j}
                          weekDates={weekDates}
                          onUpdateJob={jobs.update}
                          onRemoveJob={jobs.remove}
                          onAddTask={(title) =>
                            tasks.add({
                              jobId: j.id,
                              title,
                              sortOrder: tasks.list.filter((t) => t.jobId === j.id).length,
                            })
                          }
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TaskRow({
  row,
  onUpdate,
  onRemove,
}: {
  row: Row;
  onUpdate: (id: string, patch: Partial<DashboardJobTask>) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const { task, job } = row;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 4 }}
      transition={{ duration: 0.18 }}
      className="group flex items-center gap-1.5 rounded-md px-1 py-0.5 hover:bg-muted/40 transition-colors"
    >
      <Checkbox
        checked={task.done}
        onCheckedChange={(v) =>
          onUpdate(task.id, { done: !!v }).catch(() => toast.error("บันทึกไม่สำเร็จ"))
        }
        className="data-[state=checked]:bg-success data-[state=checked]:border-success transition-all"
      />
      <span
        className={`flex-1 text-xs truncate ${task.done ? "line-through text-muted-foreground" : ""}`}
      >
        {task.title || "(ไม่มีชื่อ)"}
      </span>
      <span
        className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${brandClass(job.brand)} shrink-0`}
      >
        {job.brand || "—"}
      </span>
      <Button
        size="icon"
        variant="ghost"
        className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0"
        onClick={() => onRemove(task.id).catch(() => toast.error("ลบไม่สำเร็จ"))}
      >
        <Trash2 className="h-2.5 w-2.5" />
      </Button>
    </motion.div>
  );
}

function BrandManageRow({
  job,
  weekDates,
  onUpdateJob,
  onRemoveJob,
  onAddTask,
}: {
  job: DashboardJob;
  weekDates: string[];
  onUpdateJob: (id: string, patch: Partial<DashboardJob>) => Promise<void>;
  onRemoveJob: (id: string) => Promise<void>;
  onAddTask: (title: string) => Promise<void>;
}) {
  const [adding, setAdding] = React.useState(false);
  const [title, setTitle] = React.useState("");

  const handleAdd = async () => {
    const t = title.trim();
    if (!t) {
      setAdding(false);
      return;
    }
    try {
      await onAddTask(t);
      setTitle("");
      setAdding(false);
    } catch {
      toast.error("เพิ่ม task ไม่สำเร็จ");
    }
  };

  return (
    <div className="flex items-center gap-1 group/brand">
      <span
        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${brandClass(job.brand)}`}
      >
        {job.brand || "—"}
      </span>
      <select
        value={job.dueDate || ""}
        onChange={(e) =>
          onUpdateJob(job.id, { dueDate: e.target.value || null }).catch(() =>
            toast.error("บันทึกไม่สำเร็จ"),
          )
        }
        className="text-[10px] h-6 px-1 rounded bg-background border border-border/60 text-muted-foreground"
      >
        <option value="">ไม่กำหนด</option>
        {weekDates.map((d, i) => (
          <option key={d} value={d}>
            {DAY_LABELS[i]}
          </option>
        ))}
      </select>
      {adding ? (
        <Input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
            if (e.key === "Escape") {
              setAdding(false);
              setTitle("");
            }
          }}
          onBlur={() => {
            if (title.trim()) handleAdd();
            else setAdding(false);
          }}
          placeholder="เพิ่ม task"
          className="h-6 px-1.5 text-[10px] flex-1"
        />
      ) : (
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-primary flex-1 justify-start"
          onClick={() => setAdding(true)}
        >
          <Plus className="h-2.5 w-2.5 mr-0.5" /> task
        </Button>
      )}
      <Button
        size="icon"
        variant="ghost"
        className="h-5 w-5 opacity-0 group-hover/brand:opacity-100 text-muted-foreground hover:text-destructive"
        onClick={() => onRemoveJob(job.id).catch(() => toast.error("ลบไม่สำเร็จ"))}
      >
        <Trash2 className="h-2.5 w-2.5" />
      </Button>
    </div>
  );
}
