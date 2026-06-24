import { createFileRoute } from "@tanstack/react-router";
import { safeHref } from "@/lib/security";
import { RouteError } from "@/components/RouteError";
import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2, MessageSquare, ExternalLink, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  PLATFORM_META,
  STATUS_META,
  type Platform,
  type Status,
} from "@/components/dashboard/planner/contentMeta";

type ShareLink = {
  id: string;
  user_id: string;
  share_token: string;
  month: string;
  client_id: string | null;
  expires_at: string | null;
};

type PlannerRow = {
  id: string;
  client_id: string;
  title: string;
  post_date: string;
  post_time: string;
  platforms: string[];
  custom_platforms: string[] | null;
  status: string;
  link: string | null;
  caption: string | null;
  image_url: string | null;
  approval_status: string | null;
  client_feedback: string | null;
};

export const Route = createFileRoute("/planner/$token")({
  head: () => ({
    meta: [{ title: "Content Planner — So1o" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  errorComponent: ({ error }) => <RouteError error={error} />,
  component: PublicPlannerPage,
});

function PublicPlannerPage() {
  const { token } = Route.useParams();
  const [link, setLink] = React.useState<ShareLink | null>(null);
  const [posts, setPosts] = React.useState<PlannerRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [feedbackOpenId, setFeedbackOpenId] = React.useState<string | null>(null);
  const [feedbackText, setFeedbackText] = React.useState("");
  const [submitting, setSubmitting] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    const { data: l, error: lErr } = await supabase
      .rpc("get_planner_share_by_token", { _token: token })
      .maybeSingle();
    if (lErr || !l) {
      setLoading(false);
      return;
    }
    setLink(l as ShareLink);

    const { data, error } = await supabase.rpc("get_planner_posts_by_token", { _token: token });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    setPosts((data ?? []) as PlannerRow[]);
    setLoading(false);
  }, [token]);

  React.useEffect(() => {
    load();
  }, [load]);

  const submitApproval = async (postId: string, status: "approved" | "changes_requested") => {
    setSubmitting(postId);
    try {
      const { error } = await supabase.rpc(
        "submit_post_approval" as never,
        {
          _share_token: token,
          _post_id: postId,
          _status: status,
          _feedback: status === "changes_requested" ? feedbackText : "",
        } as never,
      );
      if (error) throw error;
      setPosts((arr) =>
        arr.map((p) =>
          p.id === postId
            ? {
                ...p,
                approval_status: status,
                client_feedback: status === "changes_requested" ? feedbackText : p.client_feedback,
              }
            : p,
        ),
      );
      setFeedbackOpenId(null);
      setFeedbackText("");
      toast.success(status === "approved" ? "อนุมัติแล้ว ขอบคุณครับ" : "ส่งคำขอแก้ไขแล้ว");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ส่งไม่สำเร็จ");
    } finally {
      setSubmitting(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!link) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-xl font-semibold mb-2">ลิงก์ไม่ถูกต้องหรือหมดอายุ</h1>
          <p className="text-sm text-muted-foreground">กรุณาขอลิงก์ใหม่จากผู้สร้างเนื้อหา</p>
        </div>
      </div>
    );
  }

  const monthLabel = new Date(link.month + "-01").toLocaleDateString("th-TH", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <Toaster />
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Calendar className="h-3.5 w-3.5" /> ปฏิทินคอนเทนต์เดือน
          </div>
          <h1 className="text-2xl font-bold">{monthLabel}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            ตรวจคอนเทนต์ทั้งเดือน — กดอนุมัติหรือขอแก้ไขได้เลย
          </p>
        </div>

        {posts.length === 0 && (
          <Card className="rounded-2xl">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              ยังไม่มีโพสต์ในเดือนนี้
            </CardContent>
          </Card>
        )}

        {posts.map((p) => {
          const SM = STATUS_META[p.status as Status] ?? STATUS_META.draft;
          const isApproved = p.approval_status === "approved";
          const isChanges = p.approval_status === "changes_requested";
          return (
            <Card key={p.id} className="rounded-2xl shadow-soft border-border/60">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1">
                      <span>{p.post_date}</span>
                      <span>·</span>
                      <span>{p.post_time}</span>
                    </div>
                    <CardTitle className="text-base">{p.title}</CardTitle>
                  </div>
                  <span
                    className={`text-[10px] font-medium rounded-md px-2 py-0.5 ${SM.className}`}
                  >
                    {SM.label}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-1.5">
                  {(p.platforms as Platform[])
                    .filter((x) => x !== "other")
                    .map((pl) => {
                      const M = PLATFORM_META[pl];
                      if (!M) return null;
                      const Icon = M.icon;
                      return (
                        <span
                          key={pl}
                          className={`inline-flex items-center justify-center h-5 w-5 rounded-md ${M.bgClass}`}
                        >
                          <Icon className="h-3 w-3" />
                        </span>
                      );
                    })}
                  {(p.custom_platforms ?? []).map((c) => (
                    <span key={c} className="text-[10px] rounded-md bg-muted px-1.5 py-0.5">
                      {c}
                    </span>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {p.image_url && (
                  <img
                    src={p.image_url}
                    alt=""
                    className="w-full max-h-[400px] object-cover rounded-xl border"
                  />
                )}
                {p.caption && (
                  <p className="text-sm whitespace-pre-wrap text-foreground/90">{p.caption}</p>
                )}
                {p.link && safeHref(p.link) && (
                  <a
                    href={safeHref(p.link)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary inline-flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" /> เปิดลิงก์อ้างอิง
                  </a>
                )}

                {p.client_feedback && (
                  <div className="rounded-xl bg-muted/60 p-2.5 text-xs">
                    <div className="text-[10px] font-semibold text-muted-foreground mb-1">
                      ฟีดแบคก่อนหน้า:
                    </div>
                    <p className="whitespace-pre-wrap">{p.client_feedback}</p>
                  </div>
                )}

                {isApproved ? (
                  <div className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                    <CheckCircle2 className="h-4 w-4" /> คุณอนุมัติโพสต์นี้แล้ว
                  </div>
                ) : feedbackOpenId === p.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="ระบุสิ่งที่อยากให้แก้..."
                      rows={3}
                      maxLength={1000}
                      className="rounded-xl text-sm"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="rounded-xl flex-1"
                        disabled={!feedbackText.trim() || submitting === p.id}
                        onClick={() => submitApproval(p.id, "changes_requested")}
                      >
                        {submitting === p.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          "ส่งคำขอแก้ไข"
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-xl"
                        onClick={() => {
                          setFeedbackOpenId(null);
                          setFeedbackText("");
                        }}
                      >
                        ยกเลิก
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="rounded-xl flex-1 bg-emerald-600 hover:bg-emerald-700"
                      disabled={submitting === p.id}
                      onClick={() => submitApproval(p.id, "approved")}
                    >
                      {submitting === p.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-1" /> อนุมัติ
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl flex-1"
                      onClick={() => {
                        setFeedbackOpenId(p.id);
                        setFeedbackText(p.client_feedback ?? "");
                      }}
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      ขอแก้ไข
                    </Button>
                  </div>
                )}
                {isChanges && feedbackOpenId !== p.id && (
                  <p className="text-[11px] text-orange-600">⏳ รอผู้ออกแบบแก้ไขให้ใหม่</p>
                )}
              </CardContent>
            </Card>
          );
        })}

        <p className="text-center text-[10px] text-muted-foreground pt-4">
          Powered by So1o Freelancer Management
        </p>
      </div>
    </div>
  );
}
