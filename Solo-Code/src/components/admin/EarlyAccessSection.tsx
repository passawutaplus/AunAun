import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "@tanstack/react-router";
import {
  Rocket,
  ExternalLink,
  Search,
  Loader2,
  Mail,
  MessageCircle,
  FlaskConical,
  Copy,
  UserX,
  MessageSquareHeart,
} from "lucide-react";
import { useAllBetaFeedback } from "@/store/betaFeedback";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getTesterSheetUrl } from "@/server/sheets-link.functions";
import { sendTestApplicationToSheet } from "@/server/sheets.functions";
import { PresenceDot } from "./PresenceDot";

const TARGET = 100;

type Application = {
  id: string;
  user_id: string;
  full_name: string;
  alias_name: string | null;
  main_field: string;
  main_field_other: string | null;
  years_experience: string;
  contact_email: string | null;
  contact_line: string | null;
  quotation_method: string[];
  pain_points: string[];
  feature_request: string | null;
  created_at: string;
};

type PendingProfile = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
};

export function EarlyAccessSection() {
  const { items: betaItems } = useAllBetaFeedback();
  const recentBeta = betaItems.filter(
    (b) => Date.now() - new Date(b.createdAt).getTime() < 7 * 86_400_000,
  ).length;
  const [apps, setApps] = React.useState<Application[]>([]);
  const [approvedCount, setApprovedCount] = React.useState(0);
  const [pending, setPending] = React.useState<PendingProfile[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [opening, setOpening] = React.useState(false);
  const [selected, setSelected] = React.useState<Application | null>(null);
  const [testing, setTesting] = React.useState(false);
  const [lastSeen, setLastSeen] = React.useState<Map<string, Date>>(new Map());

  const load = React.useCallback(async () => {
    setLoading(true);
    const [appsRes, approvedRes, usageRes, profilesRes] = await Promise.all([
      supabase.from("tester_applications").select("*").order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("user_id", { count: "exact", head: true })
        .eq("tester_approved", true),
      supabase
        .from("feature_usage_events")
        .select("user_id,created_at")
        .order("created_at", { ascending: false })
        .limit(2000),
      // Admin-only listing: returns non-sensitive profile columns server-side.
      (
        supabase.rpc as unknown as (fn: string) => Promise<{
          data: Array<{
            user_id: string;
            email: string | null;
            display_name: string | null;
            created_at: string;
            tester_approved: boolean;
          }> | null;
          error: { message: string } | null;
        }>
      )("admin_list_profiles_safe").then((res) => ({
        ...res,
        data: res.data
          ? [...res.data]
              .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""))
              .slice(0, 500)
          : res.data,
      })),
    ]);
    if (appsRes.error) {
      toast.error(appsRes.error.message);
    } else {
      setApps((appsRes.data ?? []) as Application[]);
    }
    if (!approvedRes.error) {
      // Admin no longer has cross-user SELECT on profiles, so fall back to counting
      // approved rows from the safe RPC list when the head-count returns null.
      const safeCount = profilesRes.data
        ? (profilesRes.data as Array<{ tester_approved: boolean }>).filter((p) => p.tester_approved)
            .length
        : 0;
      setApprovedCount(approvedRes.count ?? safeCount);
    }
    if (!usageRes.error) {
      const map = new Map<string, Date>();
      (usageRes.data ?? []).forEach((u: { user_id: string; created_at: string }) => {
        if (!map.has(u.user_id)) map.set(u.user_id, new Date(u.created_at));
      });
      setLastSeen(map);
    }
    if (!profilesRes.error) {
      const appliedIds = new Set((appsRes.data ?? []).map((a: { user_id: string }) => a.user_id));
      const pendingList = (
        (profilesRes.data ?? []) as Array<PendingProfile & { tester_approved: boolean }>
      )
        .filter((p) => !p.tester_approved && !appliedIds.has(p.user_id))
        .map(({ user_id, email, display_name, created_at }) => ({
          user_id,
          email,
          display_name,
          created_at,
        }));
      setPending(pendingList);
    }
    setLoading(false);
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  // Realtime: refresh whenever a new application or profile-approval event happens
  React.useEffect(() => {
    const channel = supabase
      .channel("early-access-monitor")
      .on("postgres_changes", { event: "*", schema: "public", table: "tester_applications" }, () =>
        load(),
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, () =>
        load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const openSheet = async () => {
    setOpening(true);
    try {
      const res = await getTesterSheetUrl();
      window.open(res.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "เปิดลิงก์ไม่สำเร็จ");
    } finally {
      setOpening(false);
    }
  };

  const sendTest = async () => {
    setTesting(true);
    try {
      const res = await sendTestApplicationToSheet();
      if (res?.ok) {
        toast.success("ส่งแถวทดสอบไปยัง Google Sheet แล้ว — ตรวจสอบที่ชีต So1o Early Access");
      } else {
        toast.error(res?.error || "ส่งทดสอบไม่สำเร็จ");
      }
    } catch (e) {
      const msg =
        e instanceof Response
          ? `ส่งทดสอบไม่สำเร็จ (${e.status})`
          : e instanceof Error
            ? e.message
            : "ส่งทดสอบไม่สำเร็จ";
      toast.error(msg);
    } finally {
      setTesting(false);
    }
  };

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return apps;
    return apps.filter(
      (a) =>
        a.full_name.toLowerCase().includes(q) ||
        (a.alias_name ?? "").toLowerCase().includes(q) ||
        (a.contact_email ?? "").toLowerCase().includes(q) ||
        (a.contact_line ?? "").toLowerCase().includes(q) ||
        a.main_field.toLowerCase().includes(q),
    );
  }, [apps, search]);

  const totalApps = apps.length;
  // Cap progress at TARGET (100); use approved status from profiles as the source of truth
  const approved = Math.min(TARGET, approvedCount);
  const pct = Math.min(100, Math.round((approved / TARGET) * 100));
  const slotsLeft = Math.max(0, TARGET - approved);

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Rocket className="h-4 w-4 text-primary" />
                <h2 className="text-base sm:text-lg font-semibold tracking-tight">
                  Early Access — กลุ่มบุกเบิก
                </h2>
                <Badge variant="secondary" className="text-[10px]">
                  จำกัด {TARGET} คน
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                มอนิเตอร์ผู้สมัคร Tester รุ่นแรก · อัปเดตอัตโนมัติแบบเรียลไทม์
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              <Button onClick={sendTest} disabled={testing} variant="outline" className="gap-2">
                {testing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FlaskConical className="h-4 w-4" />
                )}
                ส่งแบบสอบถามทดสอบ
              </Button>
              <Button onClick={openSheet} disabled={opening} className="gap-2">
                {opening ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
                เปิด Google Sheet คำตอบ
              </Button>
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-end justify-between mb-2">
              <div>
                <div className="text-3xl sm:text-4xl font-bold tracking-tight">
                  {approved}
                  <span className="text-base font-medium text-muted-foreground">/{TARGET}</span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  อนุมัติแล้ว · เหลือ {slotsLeft} ที่นั่ง · สมัครทั้งหมด {totalApps}
                </div>
              </div>
              <div className="text-xs font-medium text-muted-foreground">{pct}%</div>
            </div>

            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <MessageSquareHeart className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm">ฟีดแบ็กจากเทสเตอร์</CardTitle>
              <Badge variant="outline" className="text-[10px]">
                {betaItems.length} รายการ
              </Badge>
              {recentBeta > 0 && (
                <Badge className="text-[10px] bg-[#FF5F05] text-white">
                  ใหม่ {recentBeta} / 7 วัน
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              ดูและจัดการฟีดแบ็กทั้งหมดได้ที่เมนูตั๋ว & ฟีดแบ็ก
            </p>
          </div>
          <Button asChild size="sm" variant="outline" className="h-8 shrink-0">
            <Link to="/admin" search={{ section: "tickets", q: undefined }}>
              ไปดูฟีดแบ็ก
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <UserX className="h-4 w-4 text-amber-600" />
            <CardTitle className="text-sm">รอกรอกแบบสอบถาม</CardTitle>
            <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/40">
              {pending.length}
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            สมัครบัญชีแล้วแต่ยังไม่ได้กรอกแบบสอบถาม Tester — ส่งลิงก์เชิญให้กรอกได้เลย
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลด...
            </div>
          ) : pending.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              ไม่มีผู้ใช้ที่ค้างกรอก 🎉
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>อีเมล</TableHead>
                    <TableHead>ชื่อ</TableHead>
                    <TableHead>วันที่สมัคร</TableHead>
                    <TableHead className="text-right">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending.map((p) => {
                    const surveyUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/apply-tester`;
                    const mailto = `mailto:${p.email ?? ""}?subject=${encodeURIComponent(
                      "เชิญกรอกแบบสอบถาม So1o Early Access",
                    )}&body=${encodeURIComponent(
                      `สวัสดีค่ะ ขอบคุณที่สมัครใช้งาน So1o\n\nรบกวนกรอกแบบสอบถามสั้นๆ เพื่อรับสิทธิ์ Early Access ที่ลิงก์ด้านล่างนี้:\n${surveyUrl}\n\nขอบคุณค่ะ\nทีม So1o`,
                    )}`;
                    return (
                      <TableRow key={p.user_id}>
                        <TableCell className="text-xs">
                          <span className="inline-flex items-center gap-2">
                            <PresenceDot lastSeen={lastSeen.get(p.user_id) ?? null} />
                            {p.email ?? "—"}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">{p.display_name ?? "—"}</TableCell>
                        <TableCell className="text-[11px] text-muted-foreground">
                          {new Date(p.created_at).toLocaleDateString("th-TH", {
                            day: "2-digit",
                            month: "short",
                            year: "2-digit",
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px] gap-1"
                              onClick={() => {
                                navigator.clipboard.writeText(surveyUrl);
                                toast.success("คัดลอกลิงก์แบบสอบถามแล้ว");
                              }}
                            >
                              <Copy className="h-3 w-3" /> คัดลอกลิงก์
                            </Button>
                            {p.email && (
                              <Button
                                asChild
                                size="sm"
                                variant="default"
                                className="h-7 text-[11px] gap-1"
                              >
                                <a href={mailto}>
                                  <Mail className="h-3 w-3" /> ส่งอีเมล
                                </a>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-sm">รายชื่อผู้สมัคร</CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาชื่อ / สายงาน / contact"
                className="pl-8 h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลด...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">ยังไม่มีผู้สมัคร</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">#</TableHead>
                    <TableHead>ชื่อ</TableHead>
                    <TableHead>สายงาน</TableHead>
                    <TableHead>ประสบการณ์</TableHead>
                    <TableHead>ติดต่อ</TableHead>
                    <TableHead>วันที่สมัคร</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((a, idx) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <PresenceDot lastSeen={lastSeen.get(a.user_id) ?? null} />
                          <div>
                            <div className="font-medium text-sm">{a.full_name}</div>
                            {a.alias_name && (
                              <div className="text-[11px] text-muted-foreground">
                                @{a.alias_name}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {a.main_field === "อื่นๆ" && a.main_field_other
                          ? a.main_field_other
                          : a.main_field}
                      </TableCell>
                      <TableCell className="text-xs">{a.years_experience}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5 text-[11px]">
                          {a.contact_email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" /> {a.contact_email}
                            </span>
                          )}
                          {a.contact_line && (
                            <span className="flex items-center gap-1">
                              <MessageCircle className="h-3 w-3" /> {a.contact_line}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-[11px] text-muted-foreground">
                        {new Date(a.created_at).toLocaleDateString("th-TH", {
                          day: "2-digit",
                          month: "short",
                          year: "2-digit",
                        })}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => setSelected(a)}
                        >
                          ดู
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selected && (
        <Card className="border-primary/40">
          <CardHeader className="pb-3 flex-row items-center justify-between">
            <CardTitle className="text-sm">รายละเอียด: {selected.full_name}</CardTitle>
            <Button size="sm" variant="ghost" onClick={() => setSelected(null)}>
              ปิด
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Field label="วิธีออกใบเสนอราคา" value={selected.quotation_method.join(", ") || "-"} />
            <Field label="Pain Points" value={selected.pain_points.join(", ") || "-"} />
            <Field label="ฟีเจอร์ที่ต้องการ" value={selected.feature_request || "-"} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground mb-0.5">{label}</div>
      <div className="text-sm whitespace-pre-wrap">{value}</div>
    </div>
  );
}
