import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, ShieldOff, ShieldPlus, Loader2, Trash2, ExternalLink } from "lucide-react";
import { PresenceDot } from "./PresenceDot";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";
import { type AdminMetrics } from "./useAdminMetrics";
import { deleteUser } from "@/server/admin.functions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { MemberCodeCopy } from "@/components/MemberCodeCopy";
import { OPS_HUB_URL } from "@/lib/productLinks";
import {
  formatMemberCode,
  memberCodeMatchesUserId,
} from "@/lib/userDisplayId";

export function UsersSection({
  m,
  initialQuery = "",
}: {
  m: AdminMetrics;
  initialQuery?: string;
}) {
  const { user } = useAuth();
  const [search, setSearch] = React.useState(initialQuery);

  React.useEffect(() => {
    if (initialQuery) setSearch(initialQuery);
  }, [initialQuery]);

  const filtered = React.useMemo(() => {
    const q = search.trim();
    if (!q) return m.profiles;
    const lower = q.toLowerCase();
    return m.profiles.filter((p) => {
      if (memberCodeMatchesUserId(q, p.user_id)) return true;
      if (formatMemberCode(p.user_id).toLowerCase().includes(lower)) return true;
      if (p.user_id.toLowerCase().startsWith(lower)) return true;
      return (
        (p.email ?? "").toLowerCase().includes(lower) ||
        (p.display_name ?? "").toLowerCase().includes(lower) ||
        (p.brand_name ?? "").toLowerCase().includes(lower)
      );
    });
  }, [m.profiles, search]);

  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [forceMap, setForceMap] = React.useState<Record<string, boolean>>({});

  // user activity map
  const activityCount = React.useMemo(() => {
    const map = new Map<string, { quotes: number; income: number }>();
    m.profiles.forEach((p) => map.set(p.user_id, { quotes: 0, income: 0 }));
    m.quotations.forEach((q) => {
      const v = map.get(q.user_id);
      if (v) v.quotes += 1;
    });
    m.incomes.forEach((i) => {
      const v = map.get(i.user_id);
      if (v) v.income += Number(i.gross || 0);
    });
    return map;
  }, [m]);

  const toggleAdmin = async (targetUserId: string, isAdmin: boolean) => {
    if (targetUserId === user?.id) {
      toast.error("ไม่สามารถแก้ไขสิทธิ์ตัวเองได้");
      return;
    }
    setPendingId(targetUserId);
    try {
      if (isAdmin) {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", targetUserId)
          .eq("role", "admin");
        if (error) throw error;
        toast.success("ถอดสิทธิ์ admin แล้ว");
      } else {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: targetUserId, role: "admin" });
        if (error) throw error;
        toast.success("เลื่อนเป็น admin แล้ว");
      }
      await m.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPendingId(null);
    }
  };

  const handleDelete = async (targetUserId: string, label: string) => {
    if (targetUserId === user?.id) {
      toast.error("ไม่สามารถลบบัญชีตัวเองได้");
      return;
    }
    setDeletingId(targetUserId);
    const force = !!forceMap[targetUserId];
    try {
      const res = await deleteUser({ data: { target_user_id: targetUserId, force } });
      if (!res?.ok) {
        const isEmpty = res && typeof res === "object" && Object.keys(res).length === 0;
        const msg =
          res?.error ||
          (isEmpty ? "เซสชันหมดอายุ กรุณาออกแล้วเข้าสู่ระบบใหม่" : "ลบไม่สำเร็จ (ไม่ทราบสาเหตุ)");
        console.error("[deleteUser] server returned:", res);
        toast.error(msg);
        if (Array.isArray((res as any)?.warnings) && (res as any).warnings.length > 0) {
          toast.warning(`มี ${(res as any).warnings.length} รายการที่ล้มเหลว — ดู console`);
        }
        return;
      }
      if (res.warnings && res.warnings.length > 0) {
        console.warn("[deleteUser] warnings:", res.warnings);
        toast.warning(`สำเร็จแต่มี ${res.warnings.length} เตือน — ดู console`);
      }
      if (res.mode === "force_purged") {
        const authNote = (res as any).auth_deleted
          ? "ลบจาก Auth สำเร็จ"
          : "ยังลบจาก Auth ไม่สำเร็จ — ดู console";
        toast.success(`Purge ทันที ${label} สำเร็จ · ${authNote}`);
      } else {
        const purgeDate = res.purge_after
          ? new Date(res.purge_after).toLocaleDateString("th-TH", {
              month: "short",
              day: "numeric",
            })
          : "อีก 7 วัน";
        toast.success(`ปิดใช้งาน ${label} แล้ว · จะ purge อัตโนมัติ ${purgeDate}`);
      }
      setForceMap((m) => ({ ...m, [targetUserId]: false }));
      await m.refresh();
    } catch (e) {
      let msg = "ลบไม่สำเร็จ";
      if (e instanceof Response) {
        try {
          const text = await e.text();
          msg = text || `ลบไม่สำเร็จ (${e.status})`;
        } catch {
          msg = `ลบไม่สำเร็จ (${e.status})`;
        }
        if (e.status === 401) msg = "หมดอายุการเข้าสู่ระบบ กรุณาเข้าใหม่";
      } else if (e instanceof Error) {
        msg = e.message;
      }
      console.error("[deleteUser] error:", e);
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Users & Growth</h2>
        <p className="text-xs text-muted-foreground">ดูสมาชิก กิจกรรม และจัดการสิทธิ์</p>
      </div>

      <Card className="border-border">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-semibold">รายชื่อสมาชิก</h3>
              <p className="text-xs text-muted-foreground">
                {filtered.length} จาก {m.profiles.length} คน · admin {m.adminIds.size}
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="อีเมล / ชื่อ / ร้าน / รหัส S…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>
          </div>

          <div className="rounded-lg border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">อีเมล</TableHead>
                  <TableHead className="text-xs">ชื่อ / แบรนด์</TableHead>
                  <TableHead className="text-xs">รหัสสมาชิก</TableHead>
                  <TableHead className="text-xs text-right">ใบเสนอ</TableHead>
                  <TableHead className="text-xs text-right">รายได้</TableHead>
                  <TableHead className="text-xs text-center">AI วันนี้</TableHead>
                  <TableHead className="text-xs text-right">AI รวม</TableHead>
                  <TableHead className="text-xs">ใช้งานล่าสุด</TableHead>
                  <TableHead className="text-xs">Role</TableHead>
                  <TableHead className="text-xs">สมัคร</TableHead>
                  <TableHead className="text-xs text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {m.loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={11}
                      className="text-center text-xs text-muted-foreground py-6"
                    >
                      กำลังโหลด...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={11}
                      className="text-center text-xs text-muted-foreground py-6"
                    >
                      ไม่พบสมาชิก
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((p) => {
                    const isAdmin = m.adminIds.has(p.user_id);
                    const isSelf = p.user_id === user?.id;
                    const isPending = pendingId === p.user_id;
                    const isDeleting = deletingId === p.user_id;
                    const isInactive = p.is_active === false;
                    const act = activityCount.get(p.user_id);
                    return (
                      <TableRow key={p.id} className={isInactive ? "opacity-60" : undefined}>
                        <TableCell className="text-xs font-medium">
                          <span className="inline-flex items-center gap-2">
                            <PresenceDot lastSeen={m.lastSeen.get(p.user_id) ?? null} />
                            {p.email ?? "—"}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div>{p.display_name ?? "—"}</div>
                          {p.brand_name && (
                            <div className="text-[10px] text-muted-foreground">{p.brand_name}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          <MemberCodeCopy userId={p.user_id} size="sm" />
                        </TableCell>
                        <TableCell className="text-xs text-right num">{act?.quotes ?? 0}</TableCell>
                        <TableCell className="text-xs text-right num">
                          {act?.income ? `฿${Math.round(act.income).toLocaleString()}` : "—"}
                        </TableCell>

                        <TableCell className="text-xs text-center">
                          {(() => {
                            const used = m.aiUsageToday.get(p.user_id) ?? 0;
                            const full = used >= 5;
                            return (
                              <Badge
                                variant={full ? "destructive" : used > 0 ? "default" : "outline"}
                                className="text-[10px] tabular-nums"
                              >
                                {used}/5
                              </Badge>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="text-xs text-right num">
                          {m.aiUsageTotal.get(p.user_id) ?? 0}
                        </TableCell>
                        <TableCell className="text-xs">
                          <LastActiveCell ts={p.last_active_at} />
                        </TableCell>
                        <TableCell>
                          {isInactive ? (
                            <Badge variant="secondary" className="text-[10px]">
                              inactive
                            </Badge>
                          ) : isAdmin ? (
                            <Badge className="bg-foreground text-background text-[10px]">
                              admin
                            </Badge>
                          ) : p.tester_approved ? (
                            <Badge
                              variant="secondary"
                              className="text-[10px] bg-emerald-500/15 text-emerald-700"
                            >
                              tester
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] text-amber-600 border-amber-500/40"
                            >
                              รอกรอกแบบสอบถาม
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(p.created_at).toLocaleDateString("th-TH", {
                            month: "short",
                            day: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-[11px] gap-1"
                              asChild
                            >
                              <a
                                href={`${OPS_HUB_URL}/users/${p.user_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="เปิด Ops Hub User 360"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </Button>
                            <Button
                              size="sm"
                              variant={isAdmin ? "outline" : "default"}
                              className="h-7 text-[11px] gap-1"
                              disabled={isSelf || isPending || isDeleting}
                              onClick={() => toggleAdmin(p.user_id, isAdmin)}
                              title={isSelf ? "ไม่สามารถแก้ไขสิทธิ์ตัวเองได้" : ""}
                            >
                              {isPending ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : isAdmin ? (
                                <>
                                  <ShieldOff className="h-3 w-3" /> ถอด
                                </>
                              ) : (
                                <>
                                  <ShieldPlus className="h-3 w-3" /> เลื่อน
                                </>
                              )}
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-[11px] gap-1 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                  disabled={isSelf || isDeleting || isPending || isInactive}
                                  title={
                                    isSelf
                                      ? "ไม่สามารถปิดใช้ตัวเองได้"
                                      : isInactive
                                        ? "ผู้ใช้นี้ inactive แล้ว"
                                        : "ปิดใช้งานผู้ใช้"
                                  }
                                >
                                  {isDeleting ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3 w-3" />
                                  )}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>ยืนยันการลบผู้ใช้</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    ต้องการปิดใช้งานบัญชี{" "}
                                    <strong>{p.email ?? p.display_name ?? p.user_id}</strong>{" "}
                                    ใช่ไหม?
                                    <br />
                                    ระบบจะทำเครื่องหมาย inactive ทันที ถอดสิทธิ์ใช้งาน และตั้งคิว
                                    purge ข้อมูล/ไฟล์อัตโนมัติใน 7 วัน เพื่อลดปัญหา FK หรือ session
                                    ค้าง
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <label className="flex items-start gap-2 text-xs px-1 py-2 rounded-md bg-muted/40 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    className="mt-0.5"
                                    checked={!!forceMap[p.user_id]}
                                    onChange={(e) =>
                                      setForceMap((m) => ({ ...m, [p.user_id]: e.target.checked }))
                                    }
                                  />
                                  <span>
                                    <strong className="text-destructive">
                                      ลบทันที (ข้าม 7 วัน)
                                    </strong>
                                    <br />
                                    <span className="text-[10px] text-muted-foreground">
                                      ลบข้อมูล public + storage + auth.users ตอนนี้เลย —
                                      ใช้เฉพาะกรณีจำเป็น
                                    </span>
                                  </span>
                                </label>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() =>
                                      handleDelete(p.user_id, p.email ?? p.display_name ?? "user")
                                    }
                                  >
                                    {forceMap[p.user_id] ? "Purge ทันที" : "ปิดใช้งาน"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LastActiveCell({ ts }: { ts: string | null }) {
  if (!ts)
    return (
      <span className="text-muted-foreground" title="ยังไม่เคยใช้งาน">
        — ไม่เคย
      </span>
    );
  const date = new Date(ts);
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  const label = days < 1 ? "วันนี้" : days === 1 ? "เมื่อวาน" : `${days} วันก่อน`;

  // Color band by recency
  let cls = "text-muted-foreground";
  let dot = "";
  if (days < 1) {
    cls = "inline-flex items-center gap-1 font-medium text-success";
    dot = "bg-success";
  } else if (days < 7) {
    cls = "inline-flex items-center gap-1 font-medium text-primary";
    dot = "bg-primary";
  } else if (days < 30) {
    cls = "inline-flex items-center gap-1 font-medium text-warning";
    dot = "bg-warning";
  } else {
    cls = "inline-flex items-center gap-1 font-medium text-destructive";
    dot = "bg-destructive";
  }

  const tooltip = `อัปเดตล่าสุด: ${date.toLocaleString("th-TH", { dateStyle: "long", timeStyle: "short" })}`;

  return (
    <span className={cls} title={tooltip}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />}
      {label}
    </span>
  );
}
