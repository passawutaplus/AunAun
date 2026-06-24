import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Brain, Sparkles, ThumbsUp, Database, Check, X, Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import { AiComparisonSandbox } from "./AiComparisonSandbox";

type Sample = {
  id: string;
  feature: string;
  user_prompt: string;
  ai_response: string;
  corrected_response: string | null;
  user_rating: number | null;
  status: string;
  tokens_used: number | null;
  created_at: string;
};

type Personality = {
  id: string;
  creativity: number;
  formality: number;
  detail_level: number;
  forbidden_keywords: string[];
  system_prompt_override: string | null;
};

const db = supabase as any;

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Brain;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <Card className="glass">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Icon className="h-3.5 w-3.5 text-primary" />
          {label}
        </div>
        <div className="text-2xl font-bold mt-1 num">{value}</div>
        {sub && <div className="text-[10px] text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}

export function AiControlCenterSection() {
  const qc = useQueryClient();

  const samples = useQuery({
    queryKey: ["ai_training_samples"],
    queryFn: async () => {
      const { data, error } = await db
        .from("ai_training_samples")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Sample[];
    },
    refetchInterval: 30000,
  });

  const kb = useQuery({
    queryKey: ["ai_knowledge_base_count"],
    queryFn: async () => {
      const { count } = await db
        .from("ai_knowledge_base")
        .select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const personality = useQuery({
    queryKey: ["ai_personality"],
    queryFn: async () => {
      const { data, error } = await db
        .from("ai_personality_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Personality;
    },
  });

  const list = samples.data ?? [];
  const positive = list.filter((s) => s.user_rating === 1).length;
  const negative = list.filter((s) => s.user_rating === -1).length;
  const rated = positive + negative;
  const satisfaction = rated > 0 ? Math.round((positive / rated) * 100) : 0;
  const totalTokens = list.reduce((sum, s) => sum + (s.tokens_used ?? 0), 0);

  const [editing, setEditing] = React.useState<Record<string, string>>({});

  const approve = async (s: Sample) => {
    const text = editing[s.id] ?? s.corrected_response ?? s.ai_response;
    try {
      const { error: kbErr } = await db.from("ai_knowledge_base").insert({
        source_sample_id: s.id,
        feature: s.feature,
        prompt: s.user_prompt,
        ideal_response: text,
        tags: [s.feature],
      });
      if (kbErr) throw kbErr;
      await db.from("ai_training_samples").update({ status: "approved" }).eq("id", s.id);
      toast.success("เพิ่มเข้า Knowledge Base แล้ว 🧠");
      qc.invalidateQueries({ queryKey: ["ai_training_samples"] });
      qc.invalidateQueries({ queryKey: ["ai_knowledge_base_count"] });
    } catch (e) {
      toast.error("บันทึกไม่สำเร็จ");
    }
  };

  const discard = async (id: string) => {
    await db.from("ai_training_samples").update({ status: "discarded" }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["ai_training_samples"] });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" /> So1o AI Control Center
          </h2>
          <p className="text-xs text-muted-foreground">
            เทรน AI ให้มีบุคลิกของ So1o · คัดเลือกคำตอบที่ดีเข้า Knowledge Base
          </p>
        </div>
        <Button
          size="sm"
          className="gap-1 bg-primary animate-pulse"
          onClick={() => {
            qc.invalidateQueries({ queryKey: ["ai_training_samples"] });
            qc.invalidateQueries({ queryKey: ["ai_knowledge_base_count"] });
            toast.success("Sync แล้ว");
          }}
        >
          <Zap className="h-3.5 w-3.5" /> Sync Brain
        </Button>
      </div>

      {/* Scorecard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          icon={Database}
          label="Knowledge Base"
          value={kb.data ?? "—"}
          sub="ตัวอย่างที่ approve"
        />
        <MetricCard
          icon={ThumbsUp}
          label="Satisfaction"
          value={`${satisfaction}%`}
          sub={`${rated} ratings`}
        />
        <MetricCard icon={Sparkles} label="Total Samples" value={list.length} sub="50 ล่าสุด" />
        <MetricCard
          icon={Brain}
          label="Tokens Used"
          value={totalTokens.toLocaleString()}
          sub="ใน batch ปัจจุบัน"
        />
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-4">
        {/* Training Queue */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Training Queue · คัดคำตอบเข้าสมอง</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[600px] overflow-auto">
            {samples.isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {!samples.isLoading && list.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">
                ยังไม่มีข้อมูล AI สำหรับคัดกรอง · ผู้ใช้ต้องคุยกับ AI แล้วกดให้คะแนนก่อน
              </p>
            )}
            {list.map((s) => (
              <div key={s.id} className="rounded-xl border p-3 space-y-2">
                <div className="flex items-center gap-2 text-[10px]">
                  <Badge variant="outline">{s.feature}</Badge>
                  {s.user_rating === 1 && (
                    <Badge className="bg-emerald-500/15 text-emerald-700">👍</Badge>
                  )}
                  {s.user_rating === -1 && <Badge className="bg-red-500/15 text-red-700">👎</Badge>}
                  <Badge variant="secondary">{s.status}</Badge>
                  <span className="text-muted-foreground ml-auto">
                    {new Date(s.created_at).toLocaleString("th-TH")}
                  </span>
                </div>
                <div className="text-xs">
                  <div className="font-medium text-muted-foreground">Prompt:</div>
                  <div className="line-clamp-2">{s.user_prompt}</div>
                </div>
                <div className="text-xs">
                  <div className="font-medium text-muted-foreground">AI Response:</div>
                  <div className="line-clamp-3 whitespace-pre-wrap">{s.ai_response}</div>
                </div>
                {s.corrected_response && (
                  <div className="text-xs bg-amber-500/5 border border-amber-500/20 rounded p-2">
                    <div className="font-medium text-amber-700">User correction:</div>
                    <div className="whitespace-pre-wrap">{s.corrected_response}</div>
                  </div>
                )}
                <Textarea
                  rows={2}
                  placeholder="แก้คำตอบก่อน approve (optional)"
                  value={editing[s.id] ?? ""}
                  onChange={(e) => setEditing((p) => ({ ...p, [s.id]: e.target.value }))}
                  className="text-xs"
                />
                <div className="flex justify-end gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs gap-1"
                    onClick={() => discard(s.id)}
                  >
                    <X className="h-3 w-3" /> Discard
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs gap-1 bg-primary"
                    onClick={() => approve(s)}
                  >
                    <Check className="h-3 w-3" /> Approve for Brain
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Personality Tuner */}
        {personality.data && (
          <PersonalityTuner
            data={personality.data}
            onSaved={() => qc.invalidateQueries({ queryKey: ["ai_personality"] })}
          />
        )}
      </div>

      {/* AI Comparison Sandbox */}
      <AiComparisonSandbox />
    </div>
  );
}

function PersonalityTuner({ data, onSaved }: { data: Personality; onSaved: () => void }) {
  const [creativity, setCreativity] = React.useState(data.creativity);
  const [formality, setFormality] = React.useState(data.formality);
  const [detail, setDetail] = React.useState(data.detail_level);
  const [keywords, setKeywords] = React.useState(data.forbidden_keywords.join(", "));
  const [override, setOverride] = React.useState(data.system_prompt_override ?? "");
  const [saving, setSaving] = React.useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await db
        .from("ai_personality_settings")
        .update({
          creativity,
          formality,
          detail_level: detail,
          forbidden_keywords: keywords
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          system_prompt_override: override || null,
        })
        .eq("id", data.id);
      if (error) throw error;
      toast.success("บันทึกบุคลิก AI แล้ว");
      onSaved();
    } catch (e) {
      toast.error("บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="h-fit">
      <CardHeader className="py-3">
        <CardTitle className="text-sm">Personality Tuner</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span>Creativity</span>
            <span className="num">{creativity.toFixed(2)}</span>
          </div>
          <Slider
            value={[creativity]}
            min={0}
            max={1}
            step={0.05}
            onValueChange={(v) => setCreativity(v[0])}
          />
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span>Formality</span>
            <span className="num">{formality.toFixed(2)}</span>
          </div>
          <Slider
            value={[formality]}
            min={0}
            max={1}
            step={0.05}
            onValueChange={(v) => setFormality(v[0])}
          />
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span>Detail Level</span>
            <span className="num">{detail.toFixed(2)}</span>
          </div>
          <Slider
            value={[detail]}
            min={0}
            max={1}
            step={0.05}
            onValueChange={(v) => setDetail(v[0])}
          />
        </div>
        <div>
          <label className="text-xs font-medium">Forbidden Keywords</label>
          <Input
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="คั่นด้วย , "
            className="mt-1 text-xs"
          />
        </div>
        <div>
          <label className="text-xs font-medium">System Prompt Override</label>
          <Textarea
            rows={4}
            value={override}
            onChange={(e) => setOverride(e.target.value)}
            placeholder="ใส่ master prompt ของ So1o (ถ้าเว้นว่างจะใช้ค่าเริ่มต้น)"
            className="mt-1 text-xs"
          />
        </div>
        <Button size="sm" className="w-full bg-primary" disabled={saving} onClick={save}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "บันทึก Personality"}
        </Button>
      </CardContent>
    </Card>
  );
}
