import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useUpdateOpenForWork } from "@/hooks/useJobs";
import { availabilityLabel } from "@/components/jobs/jobCardUtils";
import { Sparkles } from "lucide-react";

const BADGE_OPTIONS = [
  "Available for Freelance",
  "Open to Project",
  "Looking for Full-time",
  "Open for Work",
];

const OpenForWorkSection = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const update = useUpdateOpenForWork(user?.id);

  const p = profile as {
    open_for_work?: boolean;
    open_for_work_badge?: string | null;
    availability_status?: string | null;
    hourly_rate_min?: number | null;
    daily_rate_min?: number | null;
  } | undefined;

  const patch = (fields: Record<string, unknown>) => {
    if (!user) return;
    update.mutate(fields as never);
  };

  return (
    <section className="glass-panel rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary" />
        <h2 className="font-medium thai-display">เปิดรับงาน (Open for Work)</h2>
      </div>
      <p className="text-xs text-muted-foreground thai-body">
        แสดง badge บนโปรไฟล์และปรากฏในแท็บ Creators บนหน้า Jobs
      </p>

      <div className="flex items-center justify-between">
        <Label htmlFor="ofw-toggle" className="text-sm">เปิดรับงาน</Label>
        <Switch
          id="ofw-toggle"
          checked={p?.open_for_work ?? false}
          onCheckedChange={(v) => patch({ open_for_work: v })}
          disabled={update.isPending}
        />
      </div>

      {p?.open_for_work && (
        <div className="space-y-3 pt-2 border-t border-border/40">
          <div>
            <Label className="text-xs">Badge บนโปรไฟล์</Label>
            <Select
              value={p.open_for_work_badge ?? "Open for Work"}
              onValueChange={(v) => patch({ open_for_work_badge: v })}
            >
              <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {BADGE_OPTIONS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">พร้อมเริ่มงาน</Label>
            <Select
              value={p.availability_status ?? "immediate"}
              onValueChange={(v) => patch({ availability_status: v })}
            >
              <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(availabilityLabel).map(([k, label]) => (
                  <SelectItem key={k} value={k}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">เรท/ชม. (฿)</Label>
              <Input
                type="number"
                defaultValue={p.hourly_rate_min ?? ""}
                onBlur={(e) => patch({ hourly_rate_min: e.target.value ? parseInt(e.target.value) : null })}
                className="rounded-xl mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">เรท/วัน (฿)</Label>
              <Input
                type="number"
                defaultValue={p.daily_rate_min ?? ""}
                onBlur={(e) => patch({ daily_rate_min: e.target.value ? parseInt(e.target.value) : null })}
                className="rounded-xl mt-1"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default OpenForWorkSection;
