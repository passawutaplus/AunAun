import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Database,
  HardDrive,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Users,
  BarChart3,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FeatureDataRow {
  feature: string;
  table_name: string;
  total_records: number;
  unique_users: number;
  avg_per_user: number;
  max_per_user: number;
}

// Free tier limits (Supabase Free Plan)
const DB_LIMIT_BYTES = 500 * 1024 * 1024; // 500 MB
const STORAGE_LIMIT_BYTES = 1024 * 1024 * 1024; // 1 GB

interface DbStats {
  total_size_bytes: number;
  tables: { table: string; size_bytes: number; row_estimate: number }[];
}

interface BucketStats {
  bucket: string;
  public: boolean;
  file_count: number;
  size_bytes: number;
}

interface StorageStats {
  buckets: BucketStats[];
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(2)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function UsageSection() {
  const [db, setDb] = React.useState<DbStats | null>(null);
  const [storage, setStorage] = React.useState<StorageStats | null>(null);
  const [features, setFeatures] = React.useState<FeatureDataRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [lastFetch, setLastFetch] = React.useState<Date | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [
        { data: dbData, error: dbErr },
        { data: stData, error: stErr },
        { data: featData, error: featErr },
      ] = await Promise.all([
        supabase.rpc("get_db_usage_stats"),
        supabase.rpc("get_storage_usage_stats"),
        supabase.rpc("get_feature_data_stats" as never),
      ]);
      if (dbErr) throw dbErr;
      if (stErr) throw stErr;
      if (featErr) throw featErr;
      setDb(dbData as unknown as DbStats);
      setStorage(stData as unknown as StorageStats);
      setFeatures((featData ?? []) as FeatureDataRow[]);
      setLastFetch(new Date());
    } catch (e) {
      console.error(e);
      toast.error("โหลดข้อมูล usage ไม่สำเร็จ", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const dbPct = db ? Math.min(100, (db.total_size_bytes / DB_LIMIT_BYTES) * 100) : 0;
  const storageTotal = storage?.buckets.reduce((s, b) => s + b.size_bytes, 0) ?? 0;
  const storagePct = Math.min(100, (storageTotal / STORAGE_LIMIT_BYTES) * 100);
  const fileCount = storage?.buckets.reduce((s, b) => s + b.file_count, 0) ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Storage & Quota</h2>
          <p className="text-xs text-muted-foreground">
            ดูว่าแอปกำลังใช้พื้นที่เท่าไหร่ — แจ้งเตือนเมื่อใกล้ถึงโควตาฟรี
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastFetch && (
            <span className="text-[10px] text-muted-foreground">
              อัปเดต {lastFetch.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={load}
            disabled={loading}
            className="h-8 gap-1.5"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            <span className="text-xs">รีเฟรช</span>
          </Button>
        </div>
      </div>

      {loading && !db && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <QuotaCard
          icon={<Database className="h-4 w-4" />}
          title="Database"
          subtitle="ขนาด schema public ทั้งหมด"
          used={db?.total_size_bytes ?? 0}
          limit={DB_LIMIT_BYTES}
          pct={dbPct}
          extraStat={`${db?.tables.length ?? 0} ตาราง`}
        />
        <QuotaCard
          icon={<HardDrive className="h-4 w-4" />}
          title="File Storage"
          subtitle="ไฟล์รูป/โลโก้ทั้งหมด"
          used={storageTotal}
          limit={STORAGE_LIMIT_BYTES}
          pct={storagePct}
          extraStat={`${fileCount} ไฟล์`}
        />
      </div>

      {/* Per-table breakdown */}
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <Database className="h-3.5 w-3.5 text-primary" />
            <h3 className="text-sm font-semibold tracking-tight">ขนาดต่อตาราง</h3>
            <Badge variant="outline" className="text-[10px]">
              {db?.tables.length ?? 0}
            </Badge>
          </div>
          <div className="space-y-1.5">
            {(db?.tables ?? []).map((t) => {
              const pct = db ? (t.size_bytes / db.total_size_bytes) * 100 : 0;
              return (
                <div key={t.table} className="grid grid-cols-12 items-center gap-2 text-xs py-1">
                  <span className="col-span-4 font-mono truncate">{t.table}</span>
                  <div className="col-span-5">
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${Math.max(2, pct)}%` }}
                      />
                    </div>
                  </div>
                  <span className="col-span-2 text-right text-muted-foreground tabular-nums">
                    {formatBytes(t.size_bytes)}
                  </span>
                  <span className="col-span-1 text-right text-[10px] text-muted-foreground tabular-nums">
                    {t.row_estimate.toLocaleString()}
                  </span>
                </div>
              );
            })}
            {db && db.tables.length === 0 && (
              <p className="text-xs text-muted-foreground py-2">ยังไม่มีข้อมูล</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Per-bucket breakdown */}
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <HardDrive className="h-3.5 w-3.5 text-primary" />
            <h3 className="text-sm font-semibold tracking-tight">Storage Buckets</h3>
            <Badge variant="outline" className="text-[10px]">
              {storage?.buckets.length ?? 0}
            </Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(storage?.buckets ?? []).map((b) => (
              <div key={b.bucket} className="border border-border rounded-lg p-3 bg-card/40">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono font-medium truncate">{b.bucket}</span>
                  <Badge
                    variant={b.public ? "secondary" : "outline"}
                    className="text-[9px] h-4 px-1.5"
                  >
                    {b.public ? "PUBLIC" : "PRIVATE"}
                  </Badge>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-base font-semibold tabular-nums">
                    {formatBytes(b.size_bytes)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{b.file_count} ไฟล์</span>
                </div>
              </div>
            ))}
            {storage && storage.buckets.length === 0 && (
              <p className="text-xs text-muted-foreground py-2 col-span-full">ยังไม่มี bucket</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ───────── Per-feature data usage (for tier pricing) ───────── */}
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 className="h-3.5 w-3.5 text-primary" />
            <h3 className="text-sm font-semibold tracking-tight">
              ข้อมูลที่ user เก็บในแต่ละฟีเจอร์
            </h3>
            <Badge variant="outline" className="text-[10px]">
              {features.length} ฟีเจอร์
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground mb-3">
            ใช้สำหรับวางแผน tier ราคา — ดูว่า user เฉลี่ยใช้กี่ records ต่อฟีเจอร์ และ heaviest user
            ใช้ไปเท่าไหร่
          </p>

          {features.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">ยังไม่มีข้อมูล</p>
          ) : (
            <div className="space-y-2">
              {/* Header row */}
              <div className="grid grid-cols-12 gap-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-2 pb-1 border-b border-border">
                <span className="col-span-4">ฟีเจอร์</span>
                <span className="col-span-2 text-right">รวม</span>
                <span className="col-span-2 text-right">ผู้ใช้</span>
                <span className="col-span-2 text-right">เฉลี่ย/คน</span>
                <span className="col-span-2 text-right">สูงสุด/คน</span>
              </div>

              {features.map((f) => {
                const max = features[0]?.total_records ?? 1;
                const pct = (Number(f.total_records) / max) * 100;
                return (
                  <div
                    key={f.table_name}
                    className="relative rounded-lg border border-border bg-card overflow-hidden"
                  >
                    <div
                      className="absolute inset-y-0 left-0 bg-primary/10"
                      style={{ width: `${pct}%` }}
                      aria-hidden
                    />
                    <div className="relative grid grid-cols-12 gap-2 items-center px-2 py-2 text-xs">
                      <div className="col-span-4 min-w-0">
                        <p className="font-medium text-card-foreground truncate">{f.feature}</p>
                        <p className="text-[10px] text-muted-foreground font-mono truncate">
                          {f.table_name}
                        </p>
                      </div>
                      <span className="col-span-2 text-right font-semibold tabular-nums text-card-foreground">
                        {Number(f.total_records).toLocaleString()}
                      </span>
                      <span className="col-span-2 text-right tabular-nums text-muted-foreground inline-flex items-center justify-end gap-1">
                        <Users className="h-3 w-3" />
                        {Number(f.unique_users).toLocaleString()}
                      </span>
                      <span className="col-span-2 text-right tabular-nums text-card-foreground">
                        {Number(f.avg_per_user).toLocaleString(undefined, {
                          maximumFractionDigits: 1,
                        })}
                      </span>
                      <span className="col-span-2 text-right tabular-nums font-semibold text-primary inline-flex items-center justify-end gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {Number(f.max_per_user).toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-3 grid grid-cols-3 gap-2 pt-3 border-t border-border">
            <div>
              <p className="text-[10px] text-muted-foreground">รวมทุกฟีเจอร์</p>
              <p className="text-sm font-bold tabular-nums">
                {features.reduce((s, f) => s + Number(f.total_records), 0).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">ฟีเจอร์ที่ใช้สูงสุด</p>
              <p className="text-sm font-bold truncate">{features[0]?.feature ?? "—"}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">heaviest user สร้าง</p>
              <p className="text-sm font-bold tabular-nums text-primary">
                {Math.max(0, ...features.map((f) => Number(f.max_per_user))).toLocaleString()} rec
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-muted/30">
        <CardContent className="p-3.5">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <strong>หมายเหตุ:</strong> โควตาที่แสดงคือ Free Tier ของ Lovable Cloud (Database 500 MB
            · File Storage 1 GB). เมื่อใกล้ถึง 80% ระบบจะเตือนเป็นสีส้ม, เกิน 95% จะเปลี่ยนเป็นแดง —
            ถึงตอนนั้นแนะนำให้อัปเกรดแพลนหรือลบข้อมูลเก่า
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function QuotaCard({
  icon,
  title,
  subtitle,
  used,
  limit,
  pct,
  extraStat,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  used: number;
  limit: number;
  pct: number;
  extraStat: string;
}) {
  const status = pct >= 95 ? "danger" : pct >= 80 ? "warn" : "ok";
  const statusColor =
    status === "danger"
      ? "text-red-600"
      : status === "warn"
        ? "text-orange-500"
        : "text-emerald-600";
  const barClass =
    status === "danger" ? "bg-red-500" : status === "warn" ? "bg-orange-400" : "bg-emerald-500";

  return (
    <Card className="border-border overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              {icon}
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
              <p className="text-[10px] text-muted-foreground">{subtitle}</p>
            </div>
          </div>
          {status === "ok" ? (
            <CheckCircle2 className={`h-4 w-4 ${statusColor}`} />
          ) : (
            <AlertTriangle className={`h-4 w-4 ${statusColor}`} />
          )}
        </div>

        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-2xl font-bold tabular-nums">{formatBytes(used)}</span>
          <span className="text-xs text-muted-foreground">/ {formatBytes(limit)}</span>
        </div>

        {/* Custom progress bar with status colors */}
        <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
          <div
            className={`h-full ${barClass} rounded-full transition-all duration-500`}
            style={{ width: `${Math.max(1, pct)}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px]">
          <span className={`font-semibold tabular-nums ${statusColor}`}>{pct.toFixed(1)}%</span>
          <span className="text-muted-foreground">{extraStat}</span>
        </div>
      </CardContent>
    </Card>
  );
}
