import { useMemo, useState } from "react";
import { Download, Database, ShieldAlert, Lightbulb } from "lucide-react";
import { Link } from "react-router-dom";
import SectionHeader from "@/components/admin/SectionHeader";
import KpiCard from "@/components/admin/KpiCard";
import { Button } from "@/components/ui/button";
import { InlineLoader } from "@/components/ui/BanterLoader";
import { DATA_HUB_PACKS, DATA_TABLE_LABELS_TH, type DataHubPackId } from "@/lib/admin/dataExport";
import {
  summarizePack,
  useAdminExportPack,
  useDownloadAdminExportPack,
} from "@/hooks/admin/useAdminDataExport";
import { toast } from "sonner";

const RANGES = [
  { key: 7, label: "7 วัน" },
  { key: 30, label: "30 วัน" },
  { key: 90, label: "90 วัน" },
  { key: 365, label: "1 ปี" },
] as const;

export default function AdminDataHubPage() {
  const [days, setDays] = useState(30);
  const [pack, setPack] = useState<DataHubPackId>("full");
  const [pdpaOk, setPdpaOk] = useState(false);
  const { data, isLoading, isFetching, refetch, error } = useAdminExportPack(days, pack);
  const download = useDownloadAdminExportPack();

  const summary = useMemo(() => summarizePack(data), [data]);
  const totalRows = summary.reduce((n, s) => n + s.count, 0);

  const onExport = async () => {
    if (!pdpaOk) {
      toast.error("ยืนยัน PDPA ก่อนส่งออก");
      return;
    }
    try {
      await download.mutateAsync({ days, pack });
      toast.success("ดาวน์โหลด ZIP แล้ว — เปิด CSV ด้วย Excel จะอ่านไทยได้");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ส่งออกไม่สำเร็จ");
    }
  };

  return (
    <div>
      <SectionHeader
        eyebrow="คลังข้อมูล"
        title="Data Hub — ข้อมูลดิบ"
        description="รวบรวมการเคลื่อนไหวของผู้ใช้เพื่อวิเคราะห์ธุรกิจและการตลาด ส่งออกเป็น CSV ใน ZIP (รองรับภาษาไทยใน Excel)"
        actions={
          <div className="flex flex-wrap gap-1">
            {RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setDays(r.key)}
                className={`px-3 py-1.5 text-xs font-mono uppercase rounded-sm border ${
                  days === r.key
                    ? "bg-admin-fg text-admin-bg border-admin-fg"
                    : "border-admin-border text-admin-muted hover:text-admin-fg"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="mb-4 border border-admin-border bg-admin-surface rounded-sm p-3 flex gap-2 text-sm text-admin-muted">
        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
        <p>
          ไฟล์ส่งออกอาจมีอีเมล / ชื่อติดต่อจากคำขอจ้าง — ใช้เฉพาะทีมภายใน ตาม PDPA
          และนโยบายคุกกี้ analytics · CSV ใช้ UTF-8 พร้อม BOM เพื่อให้ Excel แสดงภาษาไทยถูกต้อง
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-5">
        {DATA_HUB_PACKS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPack(p.id)}
            className={`text-left border rounded-sm p-3 transition-colors ${
              pack === p.id
                ? "border-admin-fg bg-admin-fg/5"
                : "border-admin-border bg-admin-surface hover:border-admin-fg/40"
            }`}
          >
            <p className="font-medium text-admin-fg text-sm">{p.label}</p>
            <p className="text-xs text-admin-muted mt-1">{p.hint}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <KpiCard label="แถวใน pack" value={isLoading ? "…" : totalRows} icon={Database} accent />
        <KpiCard label="ตาราง" value={isLoading ? "…" : summary.length} icon={Database} />
        <KpiCard label="ช่วงวัน" value={days} />
        <KpiCard label="Pack" value={pack} />
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <label className="inline-flex items-center gap-2 text-xs text-admin-muted">
          <input
            type="checkbox"
            checked={pdpaOk}
            onChange={(e) => setPdpaOk(e.target.checked)}
            className="rounded-sm border-admin-border"
          />
          ยืนยันว่าจะใช้ข้อมูลตาม PDPA / ไม่แชร์ภายนอกโดยไม่ได้รับอนุญาต
        </label>
        <Button
          type="button"
          size="sm"
          className="rounded-sm"
          disabled={!pdpaOk || download.isPending || isLoading}
          onClick={() => void onExport()}
        >
          <Download className="w-3.5 h-3.5 mr-1.5" />
          {download.isPending ? "กำลังส่งออก…" : "ส่งออก ZIP (CSV ภาษาไทย)"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-sm border-admin-border"
          disabled={isFetching}
          onClick={() => void refetch()}
        >
          รีเฟรชพรีวิว
        </Button>
        <Button type="button" size="sm" variant="outline" className="rounded-sm border-admin-border" asChild>
          <Link to="/admin/insights">
            <Lightbulb className="w-3.5 h-3.5 mr-1.5" />
            ดู Insights ผลงาน
          </Link>
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-destructive mb-4">{(error as Error).message}</p>
      ) : null}

      {isLoading ? (
        <InlineLoader labelClassName="text-admin-muted" />
      ) : (
        <div className="border border-admin-border bg-admin-surface rounded-sm overflow-hidden">
          <div className="px-3 py-2 border-b border-admin-border font-mono text-[10px] uppercase tracking-[0.2em] text-admin-muted">
            พรีวิวจำนวนแถว · สร้างเมื่อ {String(data?.generated_at ?? "—")}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-admin-muted border-b border-admin-border">
                <th className="px-3 py-2 font-mono text-[10px] uppercase">ตาราง</th>
                <th className="px-3 py-2 font-mono text-[10px] uppercase">แถว</th>
              </tr>
            </thead>
            <tbody>
              {summary.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-3 py-6 text-admin-muted">
                    ยังไม่มีข้อมูลในช่วงนี้ — หรือยังไม่มีอีเวนต์จากผู้ใช้ (ต้องยินยอมคุกกี้ analytics)
                  </td>
                </tr>
              ) : (
                summary.map((row) => (
                  <tr key={row.key} className="border-b border-admin-border/60 last:border-0">
                    <td className="px-3 py-2 text-admin-fg">
                      <span className="font-medium">{DATA_TABLE_LABELS_TH[row.key] ?? row.key}</span>
                      <span className="ml-2 font-mono text-xs text-admin-muted">{row.key}</span>
                    </td>
                    <td className="px-3 py-2 tabular-nums text-admin-fg">{row.count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
