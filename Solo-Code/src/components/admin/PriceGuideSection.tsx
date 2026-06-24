import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Save, Trash2, RefreshCw, ThumbsUp, ThumbsDown, Sparkles } from "lucide-react";
import {
  JOB_TYPE_OPTIONS,
  MARKET_PRESETS,
  type JobType,
  fmt,
} from "@/components/price-guide/priceLogic";

interface Override {
  job_type: string;
  min_price: number;
  max_price: number;
  note: string | null;
  updated_at: string;
}

interface EventRow {
  id: string;
  user_id: string;
  job_type: string;
  days: number;
  quantity: number;
  complexity: string;
  recommended_price: number;
  applied: boolean;
  reasoning: string | null;
  created_at: string;
}

interface FeedbackRow {
  id: string;
  user_id: string;
  job_type: string | null;
  rating: "up" | "down";
  reason: string | null;
  created_at: string;
}

export function PriceGuideSection() {
  const { user } = useAuth();
  const [overrides, setOverrides] = React.useState<Override[]>([]);
  const [events, setEvents] = React.useState<EventRow[]>([]);
  const [feedback, setFeedback] = React.useState<FeedbackRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filterJob, setFilterJob] = React.useState<string>("all");

  // form for new/update override
  const [formJob, setFormJob] = React.useState<JobType>("logo");
  const [formMin, setFormMin] = React.useState<string>("");
  const [formMax, setFormMax] = React.useState<string>("");
  const [formNote, setFormNote] = React.useState<string>("");

  const refresh = React.useCallback(async () => {
    setLoading(true);
    const [ovRes, evRes, fbRes] = await Promise.all([
      supabase.from("price_guide_overrides").select("*").order("job_type"),
      supabase
        .from("price_guide_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("price_guide_feedback")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    setOverrides((ovRes.data as Override[]) ?? []);
    setEvents((evRes.data as EventRow[]) ?? []);
    setFeedback((fbRes.data as FeedbackRow[]) ?? []);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  // load existing override into form when job changes
  React.useEffect(() => {
    const existing = overrides.find((o) => o.job_type === formJob);
    if (existing) {
      setFormMin(String(existing.min_price));
      setFormMax(String(existing.max_price));
      setFormNote(existing.note ?? "");
    } else {
      const preset = MARKET_PRESETS[formJob];
      setFormMin(String(preset.min));
      setFormMax(String(preset.max));
      setFormNote("");
    }
  }, [formJob, overrides]);

  async function saveOverride() {
    const min = Number(formMin);
    const max = Number(formMax);
    if (!min || !max || min >= max) {
      toast.error("กรอกช่วงราคาให้ถูกต้อง (min < max)");
      return;
    }
    const { error } = await supabase.from("price_guide_overrides").upsert(
      {
        job_type: formJob,
        min_price: min,
        max_price: max,
        note: formNote.trim() || null,
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "job_type" },
    );
    if (error) {
      toast.error("บันทึกไม่สำเร็จ: " + error.message);
      return;
    }
    toast.success("บันทึก override แล้ว");
    refresh();
  }

  async function deleteOverride(jobType: string) {
    if (!confirm(`ลบ override สำหรับ ${jobType}?`)) return;
    const { error } = await supabase.from("price_guide_overrides").delete().eq("job_type", jobType);
    if (error) {
      toast.error("ลบไม่สำเร็จ: " + error.message);
      return;
    }
    toast.success("ลบแล้ว");
    refresh();
  }

  const filteredEvents =
    filterJob === "all" ? events : events.filter((e) => e.job_type === filterJob);
  const upCount = feedback.filter((f) => f.rating === "up").length;
  const downCount = feedback.filter((f) => f.rating === "down").length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Price Guide Manager
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            ปรับช่วงราคาตลาดที่ AI ใช้ + ดู event log และฟีดแบ็กจากผู้ใช้
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} /> รีเฟรช
        </Button>
      </div>

      {/* Override editor */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Market Average Override</CardTitle>
          <p className="text-xs text-muted-foreground">
            กำหนดเองว่าควรใช้ช่วงราคาตลาดเท่าไหร่ — จะถูกใช้แทนค่าที่ระบบรวบรวมจาก user ทันที
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <div>
              <Label className="text-xs">ประเภทงาน</Label>
              <Select value={formJob} onValueChange={(v) => setFormJob(v as JobType)}>
                <SelectTrigger className="h-9 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {JOB_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">ราคาต่ำสุด (฿)</Label>
              <Input
                type="number"
                value={formMin}
                onChange={(e) => setFormMin(e.target.value)}
                className="h-9 mt-1 num"
              />
            </div>
            <div>
              <Label className="text-xs">ราคาสูงสุด (฿)</Label>
              <Input
                type="number"
                value={formMax}
                onChange={(e) => setFormMax(e.target.value)}
                className="h-9 mt-1 num"
              />
            </div>
            <div>
              <Label className="text-xs">หมายเหตุ</Label>
              <Input
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                className="h-9 mt-1"
                placeholder="เช่น ปรับตามตลาด Q1/26"
              />
            </div>
          </div>
          <Button onClick={saveOverride} size="sm" className="bg-gradient-primary">
            <Save className="h-4 w-4 mr-1.5" /> บันทึก override
          </Button>

          {overrides.length > 0 && (
            <div className="pt-3 border-t border-border/40">
              <p className="text-xs font-medium mb-2">Override ที่ตั้งไว้ ({overrides.length})</p>
              <div className="space-y-1.5">
                {overrides.map((o) => (
                  <div
                    key={o.job_type}
                    className="flex items-center gap-2 text-xs p-2 rounded-lg bg-muted/40"
                  >
                    <Badge variant="secondary" className="shrink-0">
                      {o.job_type}
                    </Badge>
                    <span className="num">
                      ฿{fmt(Number(o.min_price))} – ฿{fmt(Number(o.max_price))}
                    </span>
                    {o.note && <span className="text-muted-foreground truncate">— {o.note}</span>}
                    <div className="flex-1" />
                    <button
                      onClick={() => deleteOverride(o.job_type)}
                      className="text-destructive hover:text-destructive/80"
                      aria-label="ลบ"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feedback summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">User Feedback ({feedback.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3 text-sm">
            <Badge className="bg-success/15 text-success border-success/30 gap-1.5">
              <ThumbsUp className="h-3.5 w-3.5" /> {upCount}
            </Badge>
            <Badge className="bg-destructive/15 text-destructive border-destructive/30 gap-1.5">
              <ThumbsDown className="h-3.5 w-3.5" /> {downCount}
            </Badge>
          </div>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {feedback.slice(0, 30).map((f) => (
              <div key={f.id} className="text-xs p-2 rounded-lg bg-muted/30 flex gap-2">
                {f.rating === "up" ? (
                  <ThumbsUp className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
                ) : (
                  <ThumbsDown className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {f.job_type ?? "—"}
                    </Badge>
                    <span className="text-muted-foreground text-[10px]">
                      {new Date(f.created_at).toLocaleString("th-TH", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                  {f.reason && <p className="mt-1 text-foreground/80">{f.reason}</p>}
                </div>
              </div>
            ))}
            {feedback.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">ยังไม่มีฟีดแบ็ก</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Events log */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Event Log ({filteredEvents.length})</CardTitle>
          <Select value={filterJob} onValueChange={setFilterJob}>
            <SelectTrigger className="h-8 w-[180px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทั้งหมด</SelectItem>
              {JOB_TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5 max-h-96 overflow-y-auto">
            {filteredEvents.map((e) => (
              <div
                key={e.id}
                className="text-xs p-2 rounded-lg bg-muted/30 grid grid-cols-12 gap-2 items-center"
              >
                <Badge variant="outline" className="col-span-2 justify-center">
                  {e.job_type}
                </Badge>
                <span className="col-span-2 num text-muted-foreground">
                  {e.days}วัน × {e.quantity}
                </span>
                <span className="col-span-2 text-muted-foreground">{e.complexity}</span>
                <span className="col-span-3 num font-semibold text-primary">
                  ฿{fmt(Number(e.recommended_price))}
                </span>
                <span className="col-span-3 text-muted-foreground text-[10px] text-right">
                  {new Date(e.created_at).toLocaleDateString("th-TH")}
                </span>
              </div>
            ))}
            {filteredEvents.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">ไม่มีข้อมูล</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
