import { useState } from "react";
import { Link } from "react-router-dom";
import { Shield, AlertTriangle, Snowflake, Activity, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import SectionHeader from "@/components/admin/SectionHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  useAmlFlags, useAmlOverview, useFrozenAccounts, useHighRiskUsers,
  useResolveAmlFlag, useUnfreezeAccount, useFreezeAccount, type AmlFlag,
} from "@/hooks/useAmlFlags";
import { formatThaiDate } from "@/lib/format";

const KpiCard = ({ label, value, icon: Icon, accent }: {
  label: string; value: string | number; icon: React.ComponentType<{ className?: string }>; accent?: boolean;
}) => (
  <div className={`border rounded-sm p-4 ${accent ? "border-admin-accent/40 bg-admin-accent/5" : "border-admin-border bg-admin-surface"}`}>
    <div className="flex items-center justify-between">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-admin-muted">{label}</p>
      <Icon className={`w-4 h-4 ${accent ? "text-admin-accent" : "text-admin-muted"}`} />
    </div>
    <p className="mt-2 text-2xl font-semibold text-admin-fg tabular-nums">{value}</p>
  </div>
);

const Avatar = ({ url, name }: { url?: string | null; name?: string | null }) => (
  url ? <img src={url} alt="" className="w-7 h-7 rounded-full object-cover" />
      : <div className="w-7 h-7 rounded-full bg-admin-hover text-admin-muted flex items-center justify-center text-xs font-medium">{(name ?? "?")[0]}</div>
);

const SEVERITY_CLASS: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-amber-500/15 text-amber-600",
  high: "bg-orange-500/15 text-orange-600",
  critical: "bg-destructive/15 text-destructive",
};

const FLAG_LABEL: Record<string, string> = {
  velocity: "ส่งถี่ผิดปกติ",
  circular_transfer: "โอนวนระหว่างกัน",
  new_account_burst: "บัญชีใหม่รับเงินทันที",
  large_amount: "จำนวนใหญ่ผิดปกติ",
  self_network: "เครือข่ายตนเอง",
  manual: "Admin ติดธงเอง",
};

export default function AdminAmlPage() {
  const overview = useAmlOverview();
  const openFlags = useAmlFlags("open");
  const frozen = useFrozenAccounts();
  const highRisk = useHighRiskUsers();
  const resolve = useResolveAmlFlag();
  const freeze = useFreezeAccount();
  const unfreeze = useUnfreezeAccount();

  const [reviewFlag, setReviewFlag] = useState<AmlFlag | null>(null);
  const [note, setNote] = useState("");
  const [freezeUser, setFreezeUser] = useState<{ id: string; name: string } | null>(null);
  const [freezeReason, setFreezeReason] = useState("");

  const handleResolve = (action: "dismiss" | "escalate" | "freeze") => {
    if (!reviewFlag) return;
    resolve.mutate({ id: reviewFlag.id, action, note }, {
      onSuccess: () => {
        toast.success("บันทึกการตรวจสอบแล้ว");
        setReviewFlag(null);
        setNote("");
      },
      onError: (e: Error) => toast.error(e.message),
    });
  };

  const handleFreeze = () => {
    if (!freezeUser || !freezeReason.trim()) {
      toast.error("กรุณาระบุเหตุผล");
      return;
    }
    freeze.mutate({ userId: freezeUser.id, reason: freezeReason }, {
      onSuccess: () => {
        toast.success(`ระงับบัญชี ${freezeUser.name} แล้ว`);
        setFreezeUser(null);
        setFreezeReason("");
      },
      onError: (e: Error) => toast.error(e.message),
    });
  };

  const o = overview.data ?? {};

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="security"
        title="AML & ป้องกันการฟอกเงิน"
        description="ติดตามธงผิดปกติ บัญชีถูกระงับ และผู้ใช้ความเสี่ยงสูง"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="ธงเปิดอยู่" value={o.flags_open ?? 0} icon={AlertTriangle} accent />
        <KpiCard label="ระดับวิกฤต" value={o.flags_critical ?? 0} icon={Shield} />
        <KpiCard label="บัญชีถูกระงับ" value={o.frozen_accounts ?? 0} icon={Snowflake} />
        <KpiCard label="ความเสี่ยงสูง" value={o.high_risk_users ?? 0} icon={Activity} />
      </div>

      <Tabs defaultValue="flags">
        <TabsList>
          <TabsTrigger value="flags">ธงผิดปกติ ({openFlags.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="frozen">บัญชีถูกระงับ ({frozen.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="risk">ความเสี่ยงสูง ({highRisk.data?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="flags" className="mt-4">
          <div className="border border-admin-border rounded-sm overflow-hidden bg-admin-surface">
            <table className="w-full text-sm">
              <thead className="bg-admin-hover/40 text-[11px] uppercase tracking-wider text-admin-muted">
                <tr>
                  <th className="text-left font-normal px-3 py-2">ผู้ใช้</th>
                  <th className="text-left font-normal px-3 py-2">ประเภท</th>
                  <th className="text-left font-normal px-3 py-2">ระดับ</th>
                  <th className="text-left font-normal px-3 py-2">รายละเอียด</th>
                  <th className="text-right font-normal px-3 py-2">วันที่</th>
                  <th className="text-right font-normal px-3 py-2">การกระทำ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-border">
                {(openFlags.data ?? []).map((f) => (
                  <tr key={f.id} className="hover:bg-admin-hover/30">
                    <td className="px-3 py-2">
                      <Link to={`/u/${f.user_id}`} target="_blank" className="flex items-center gap-2 hover:text-admin-accent">
                        <Avatar url={f.profile?.avatar_url} name={f.profile?.display_name} />
                        <span className="truncate max-w-[160px]">{f.profile?.display_name ?? f.user_id.slice(0, 8)}</span>
                        <ExternalLink className="w-3 h-3 opacity-50" />
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-xs">{FLAG_LABEL[f.flag_type] ?? f.flag_type}</td>
                    <td className="px-3 py-2">
                      <Badge className={`${SEVERITY_CLASS[f.severity]} border-0 text-[10px]`}>{f.severity}</Badge>
                    </td>
                    <td className="px-3 py-2 text-xs text-admin-muted max-w-[280px] truncate" title={JSON.stringify(f.details)}>
                      {Object.entries(f.details).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(" · ") || "—"}
                    </td>
                    <td className="px-3 py-2 text-xs text-admin-muted text-right whitespace-nowrap">{formatThaiDate(f.created_at)}</td>
                    <td className="px-3 py-2 text-right">
                      <Button size="sm" variant="outline" onClick={() => setReviewFlag(f)}>ตรวจสอบ</Button>
                    </td>
                  </tr>
                ))}
                {(openFlags.data ?? []).length === 0 && (
                  <tr><td colSpan={6} className="text-center py-8 text-admin-muted text-sm">ไม่มีธงที่ต้องตรวจสอบ</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="frozen" className="mt-4">
          <div className="border border-admin-border rounded-sm overflow-hidden bg-admin-surface">
            <table className="w-full text-sm">
              <thead className="bg-admin-hover/40 text-[11px] uppercase tracking-wider text-admin-muted">
                <tr>
                  <th className="text-left font-normal px-3 py-2">ผู้ใช้</th>
                  <th className="text-left font-normal px-3 py-2">สถานะ</th>
                  <th className="text-left font-normal px-3 py-2">เหตุผล</th>
                  <th className="text-right font-normal px-3 py-2">ระงับเมื่อ</th>
                  <th className="text-right font-normal px-3 py-2">การกระทำ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-border">
                {(frozen.data ?? []).map((u: any) => (
                  <tr key={u.id} className="hover:bg-admin-hover/30">
                    <td className="px-3 py-2">
                      <Link to={`/u/${u.id}`} target="_blank" className="flex items-center gap-2 hover:text-admin-accent">
                        <Avatar url={u.avatar_url} name={u.display_name} />
                        <span className="truncate max-w-[160px]">{u.display_name}</span>
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <Badge className={`${u.account_status === "frozen" ? "bg-destructive/15 text-destructive" : "bg-amber-500/15 text-amber-600"} border-0 text-[10px]`}>
                        {u.account_status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-xs text-admin-muted max-w-[320px] truncate" title={u.frozen_reason}>{u.frozen_reason || "—"}</td>
                    <td className="px-3 py-2 text-xs text-admin-muted text-right whitespace-nowrap">{u.frozen_at ? formatThaiDate(u.frozen_at) : "—"}</td>
                    <td className="px-3 py-2 text-right">
                      <Button size="sm" variant="outline" onClick={() => unfreeze.mutate(u.id, { onSuccess: () => toast.success("ปลดล็อกแล้ว") })}>
                        ปลดล็อก
                      </Button>
                    </td>
                  </tr>
                ))}
                {(frozen.data ?? []).length === 0 && (
                  <tr><td colSpan={5} className="text-center py-8 text-admin-muted text-sm">ไม่มีบัญชีถูกระงับ</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="risk" className="mt-4">
          <div className="border border-admin-border rounded-sm overflow-hidden bg-admin-surface">
            <table className="w-full text-sm">
              <thead className="bg-admin-hover/40 text-[11px] uppercase tracking-wider text-admin-muted">
                <tr>
                  <th className="text-left font-normal px-3 py-2">ผู้ใช้</th>
                  <th className="text-left font-normal px-3 py-2">Risk Score</th>
                  <th className="text-left font-normal px-3 py-2">KYC</th>
                  <th className="text-left font-normal px-3 py-2">สถานะ</th>
                  <th className="text-right font-normal px-3 py-2">การกระทำ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-border">
                {(highRisk.data ?? []).map((u: any) => (
                  <tr key={u.id} className="hover:bg-admin-hover/30">
                    <td className="px-3 py-2">
                      <Link to={`/u/${u.id}`} target="_blank" className="flex items-center gap-2 hover:text-admin-accent">
                        <Avatar url={u.avatar_url} name={u.display_name} />
                        <span className="truncate max-w-[160px]">{u.display_name}</span>
                      </Link>
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      <span className={u.risk_score >= 80 ? "text-destructive font-semibold" : u.risk_score >= 60 ? "text-orange-600 font-medium" : "text-amber-600"}>
                        {u.risk_score}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs">{u.is_verified ? "✓ ยืนยันแล้ว" : "—"}</td>
                    <td className="px-3 py-2 text-xs">{u.account_status}</td>
                    <td className="px-3 py-2 text-right">
                      {u.account_status === "active" && (
                        <Button size="sm" variant="outline" onClick={() => setFreezeUser({ id: u.id, name: u.display_name })}>
                          ระงับบัญชี
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {(highRisk.data ?? []).length === 0 && (
                  <tr><td colSpan={5} className="text-center py-8 text-admin-muted text-sm">ไม่มีผู้ใช้ความเสี่ยงสูง</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Review flag dialog */}
      <Dialog open={!!reviewFlag} onOpenChange={(o) => !o && setReviewFlag(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ตรวจสอบธง: {reviewFlag && FLAG_LABEL[reviewFlag.flag_type]}</DialogTitle>
          </DialogHeader>
          {reviewFlag && (
            <div className="space-y-3">
              <div className="text-xs bg-muted/50 rounded p-3 font-mono whitespace-pre-wrap break-all">
                {JSON.stringify(reviewFlag.details, null, 2)}
              </div>
              <Textarea placeholder="บันทึกของ Admin (ทางเลือก)" value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => handleResolve("dismiss")} disabled={resolve.isPending}>ไม่เป็นไร (Dismiss)</Button>
            <Button variant="outline" className="border-amber-500 text-amber-600" onClick={() => handleResolve("escalate")} disabled={resolve.isPending}>ยกระดับ (Under Review)</Button>
            <Button variant="destructive" onClick={() => handleResolve("freeze")} disabled={resolve.isPending}>ระงับบัญชี</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Freeze user dialog */}
      <Dialog open={!!freezeUser} onOpenChange={(o) => !o && setFreezeUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ระงับบัญชี {freezeUser?.name}</DialogTitle>
          </DialogHeader>
          <Textarea placeholder="เหตุผลในการระงับ (จำเป็น)" value={freezeReason} onChange={(e) => setFreezeReason(e.target.value)} rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setFreezeUser(null)}>ยกเลิก</Button>
            <Button variant="destructive" onClick={handleFreeze} disabled={freeze.isPending}>ยืนยันระงับ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
