import { useEffect, useMemo, useState } from "react";
import { adminInviteBase } from "@/lib/creatorInviteAdminDemo";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Copy, ExternalLink, Loader2, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import StatusPill from "@/components/admin/StatusPill";
import InviteProfilePreview from "@/components/invite/InviteProfilePreview";
import InviteProjectPreview from "@/components/invite/InviteProjectPreview";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminDraftEditor from "@/components/admin/invite/AdminDraftEditor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useAdminInvite,
  useAdminInviteAction,
  useAdminInviteMediaUrls,
} from "@/hooks/useCreatorInvites";
import {
  normalizeSubmission,
  type InviteMedia,
  type InviteSubmission,
} from "@/lib/creatorInvite";
import { inviteCopy } from "@/lib/creatorInviteCopy";
import {
  INVITE_STATUS_LABEL,
  INVITE_TIMELINE,
  eventLabel,
  inviteStatusTone,
  outreachTemplate,
  type TemplateId,
} from "@/lib/creatorInviteAdmin";
import { cn } from "@/lib/utils";

const when = (iso: string | null | undefined, f = "d MMM yyyy HH:mm") =>
  iso ? format(new Date(iso), f, { locale: th }) : "—";

async function copy(text: string, label = "คัดลอกแล้ว") {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(label);
  } catch {
    toast.error("คัดลอกไม่ได้ — เลือกข้อความแล้วคัดลอกเอง");
  }
}

function Card({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn("rounded-sm border border-admin-border p-4", className)}
    >
      <h2 className="mb-3 text-sm font-semibold text-admin-fg">{title}</h2>
      {children}
    </section>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <>
      <dt className="text-admin-muted">{k}</dt>
      <dd className="min-w-0 break-words text-admin-fg">{v}</dd>
    </>
  );
}

export default function AdminCreatorInvitationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { data, isLoading } = useAdminInvite(id);
  const action = useAdminInviteAction();
  const [links, setLinks] = useState<{
    invite_link: string | null;
    review_link: string | null;
  }>(() => ({
    invite_link:
      (location.state as { inviteLink?: string } | null)?.inviteLink ?? null,
    review_link: null,
  }));
  const [tpl, setTpl] = useState<TemplateId>("dm-th");
  const [tab, setTab] = useState("profile");
  const [confirm, setConfirm] = useState<
    "publish" | "revoke" | "delete" | null
  >(null);
  const [draft, setDraft] = useState<InviteSubmission | null>(null);
  const hasMedia = (data?.media.length ?? 0) > 0;
  const urls = useAdminInviteMediaUrls(id, hasMedia);

  const inv = data?.invitation;
  useEffect(() => {
    if (!id || !inv) return;
    void action
      .mutateAsync({ action: "links", id })
      .then((r) =>
        setLinks(
          r as { invite_link: string | null; review_link: string | null },
        ),
      )
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, inv?.review_sent_at]);

  const submission = useMemo(
    () => (data?.submission ? normalizeSubmission(data.submission.data) : null),
    [data],
  );
  const staffDraft = useMemo(
    () =>
      data?.submission?.staff_draft
        ? normalizeSubmission(data.submission.staff_draft)
        : null,
    [data],
  );
  useEffect(() => setDraft(staffDraft), [staffDraft]);

  const [addedMedia, setAddedMedia] = useState<Map<string, InviteMedia>>(
    new Map(),
  );
  const mediaMap = useMemo(() => {
    const m = new Map<string, InviteMedia>();
    for (const x of data?.media ?? []) {
      if (x.scan_status !== "clean") continue;
      m.set(x.id, {
        id: x.id,
        slot: x.slot as InviteMedia["slot"],
        mime: x.mime,
        size_bytes: x.size_bytes,
        scan_status: "clean",
        url: urls.data?.[x.id] ?? null,
      });
    }
    for (const [k, v] of addedMedia) m.set(k, v);
    return m;
  }, [data, urls.data, addedMedia]);

  if (isLoading)
    return (
      <Loader2
        className="m-10 h-5 w-5 animate-spin text-admin-muted"
        aria-label="Loading"
      />
    );
  if (!data || !inv)
    return (
      <p className="p-6 text-sm text-admin-muted">
        ไม่พบคำเชิญนี้ (อาจถูกลบข้อมูลแล้ว)
      </p>
    );

  const run = async (body: Record<string, unknown>, ok?: string) => {
    const r = await action.mutateAsync({ id, ...body });
    if (ok) toast.success(ok);
    return r;
  };
  const t = inviteCopy(inv.language);
  const status = inv.status;
  const name = submission?.about.name || inv.display_name;
  const link = links.invite_link ?? "[Invitation Link]";

  const nextStep = (() => {
    if (["draft", "sent", "opened", "started"].includes(status)) {
      return (
        <>
          <p className="text-xs text-admin-muted">
            {status === "draft"
              ? "ยังไม่ได้ส่ง"
              : status === "started"
                ? "ศิลปินเริ่มกรอกแล้ว รอส่ง"
                : "ส่งแล้ว รอศิลปินตอบ"}
            {inv.self_signup_at ? " · ศิลปินเลือกสมัครเอง (ผูกบัญชีแล้ว)" : ""}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {inv.contact_email ? (
              <Button
                size="sm"
                disabled={action.isPending}
                onClick={() =>
                  void run({ action: "send" }, "เข้าคิวส่งอีเมลคำเชิญแล้ว")
                }
              >
                ส่งอีเมลคำเชิญ
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="outline"
              disabled={action.isPending}
              onClick={() =>
                void run(
                  {
                    action: "mark_sent",
                    channel: inv.contact_email ? "email_manual" : "instagram",
                  },
                  "บันทึกว่าส่งแล้ว",
                )
              }
            >
              บันทึกว่าส่งทาง DM แล้ว
            </Button>
            {inv.contact_email && status !== "draft" ? (
              <Button
                size="sm"
                variant="outline"
                disabled={action.isPending}
                onClick={() =>
                  void run({ action: "remind" }, "เข้าคิวส่งเตือนแล้ว")
                }
              >
                ส่งเตือน
              </Button>
            ) : null}
          </div>
        </>
      );
    }
    if (status === "submitted" || status === "needs_changes") {
      return (
        <>
          <p className="text-xs text-admin-muted">
            {status === "submitted"
              ? `ศิลปินส่ง${inv.submit_mode === "quick" ? "แค่ลิงก์" : "แบบเต็ม"}แล้ว · กดรับเรื่อง ระบบจะคัดลอกข้อมูลที่ส่งมาเป็นโปรไฟล์ร่างให้ทีมแก้ได้ และล็อกฟอร์มของศิลปินไว้`
              : "ศิลปินขอแก้ไข — แก้ Draft แล้วส่งลิงก์ตรวจใหม่"}
          </p>
          {inv.change_request_note ? (
            <p className="mt-2 whitespace-pre-line rounded-sm bg-admin-surface p-2 text-sm">
              {inv.change_request_note}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {status === "submitted" ? (
              <Button
                size="sm"
                disabled={action.isPending}
                onClick={() =>
                  void run(
                    { action: "start_draft" },
                    "รับเรื่องแล้ว · จัดโปรไฟล์ร่างได้ด้านล่าง",
                  ).then(() => setTab("profile"))
                }
              >
                รับเรื่อง · เริ่มจัดโปรไฟล์
              </Button>
            ) : (
              <Button
                size="sm"
                disabled={action.isPending}
                onClick={() => void sendReview()}
              >
                ส่งลิงก์ตรวจใหม่
              </Button>
            )}
          </div>
        </>
      );
    }
    if (status === "preparing") {
      return (
        <>
          <p className="text-xs text-admin-muted">
            {inv.review_sent_at
              ? `ส่งลิงก์ตรวจแล้ว ${when(inv.review_sent_at)} · รอศิลปินอนุมัติ`
              : "แก้ Draft ด้านล่างให้พร้อม แล้วส่งลิงก์ตรวจ"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={action.isPending}
              onClick={() => void sendReview()}
            >
              {inv.review_sent_at ? "ส่งลิงก์ตรวจอีกครั้ง" : "ส่งลิงก์ตรวจ"}
            </Button>
          </div>
        </>
      );
    }
    if (status === "approved") {
      return (
        <>
          <p className="text-xs text-admin-muted">
            ศิลปินอนุมัติแล้ว {when(inv.approved_at)} ·
            เผยแพร่และสร้างบัญชีด้วยอีเมลศิลปิน + รหัสสุ่ม (ส่งทางอีเมลเท่านั้น)
          </p>
          <div className="mt-3">
            <Button
              size="sm"
              disabled={action.isPending}
              onClick={() => setConfirm("publish")}
            >
              เผยแพร่ + สร้างบัญชี
            </Button>
          </div>
        </>
      );
    }
    if (status === "published")
      return (
        <p className="text-xs text-admin-muted">
          เผยแพร่แล้ว {when(inv.published_at)}
          {inv.account_created_at
            ? " · สร้างบัญชีและส่งอีเมลรหัสชั่วคราวแล้ว"
            : " · ผูกกับบัญชีที่ศิลปินสมัครเอง"}
        </p>
      );
    if (status === "declined")
      return (
        <p className="text-xs text-admin-muted">
          ศิลปินปฏิเสธ {when(inv.declined_at)}
          {inv.decline_note ? ` · “${inv.decline_note}”` : ""} ·
          ลบข้อมูลอัตโนมัติ {when(inv.delete_after, "d MMM yyyy")}
        </p>
      );
    return (
      <p className="text-xs text-admin-muted">
        หมดอายุ/ยกเลิกแล้ว — ต่ออายุเพื่อเปิดลิงก์อีกครั้ง
      </p>
    );
  })();

  async function sendReview() {
    const r = (await run({ action: "send_review" })) as {
      review_link: string;
      emailed: boolean;
    };
    setLinks((l) => ({ ...l, review_link: r.review_link }));
    toast.success(
      r.emailed
        ? "ส่งลิงก์ตรวจทางอีเมลแล้ว"
        : "สร้างลิงก์ตรวจแล้ว — คัดลอกไปส่งเอง",
    );
  }

  async function publish() {
    setConfirm(null);
    const r = (await run({ action: "publish" })) as {
      username: string | null;
      projects: number;
      emailed: boolean;
    };
    toast.success(
      `เผยแพร่แล้ว · ${r.projects} โปรเจกต์${r.emailed ? " · ส่งอีเมลบัญชีแล้ว" : " · อีเมลส่งไม่สำเร็จ ดู audit log"}`,
    );
  }

  const editable =
    staffDraft && ["preparing", "needs_changes", "submitted"].includes(status);
  const shown = draft ?? submission;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <p className="text-xs text-admin-muted">
        <Link to={adminInviteBase()} className="hover:underline">
          Creator invitations
        </Link>{" "}
        / {inv.display_name}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-admin-fg">
          {inv.display_name}
        </h1>
        <StatusPill
          status={INVITE_STATUS_LABEL[status]}
          tone={inviteStatusTone(status)}
        />
        {inv.revoked_at ? <StatusPill status="Revoked" tone="muted" /> : null}
        {inv.unsubscribed_at ? (
          <StatusPill status="Unsubscribed" tone="muted" />
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!links.invite_link}
            onClick={() =>
              links.invite_link &&
              void copy(links.invite_link, "คัดลอกลิงก์คำเชิญแล้ว")
            }
          >
            <Copy className="mr-1.5 h-3.5 w-3.5" aria-hidden /> คัดลอกลิงก์
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="w-9 px-0"
                aria-label="จัดการคำเชิญ"
              >
                <MoreHorizontal className="h-4 w-4" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[13rem]">
              <DropdownMenuItem
                disabled={action.isPending}
                onSelect={() =>
                  void run({ action: "extend", days: 14 }, "ต่ออายุ 14 วันแล้ว")
                }
              >
                ต่ออายุ 14 วัน
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={action.isPending}
                onSelect={() =>
                  void run({ action: "regenerate_link" }).then((r) =>
                    setLinks((l) => ({
                      ...l,
                      invite_link: (r as { invite_link: string }).invite_link,
                    })),
                  )
                }
              >
                สร้างลิงก์ใหม่ (ลิงก์เดิมใช้ไม่ได้)
              </DropdownMenuItem>
              {!inv.revoked_at ? (
                <DropdownMenuItem
                  disabled={action.isPending}
                  onSelect={() => setConfirm("revoke")}
                >
                  ยกเลิกลิงก์
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => setConfirm("delete")}
              >
                ลบคำเชิญและข้อมูลทั้งหมด
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Progress at a glance */}
      <ol
        className="grid grid-cols-3 gap-x-2 gap-y-3 rounded-sm border border-admin-border p-3 sm:grid-cols-5 lg:grid-cols-9"
        aria-label="สถานะ"
      >
        {INVITE_TIMELINE.map(({ key, label }) => {
          const v = inv[key] as string | null | undefined;
          return (
            <li key={key} className="flex min-w-0 flex-col gap-1">
              <span
                className={cn(
                  "h-1 rounded-full",
                  v ? "bg-admin-accent" : "bg-admin-border",
                )}
                aria-hidden
              />
              <span
                className={cn(
                  "truncate text-[11px] font-medium",
                  v ? "text-admin-fg" : "text-admin-muted",
                )}
              >
                {label.split(/ ·| \(| →/)[0]}
              </span>
              <span className="text-[10px] text-admin-muted">
                {v ? when(v, "d MMM HH:mm") : "—"}
              </span>
            </li>
          );
        })}
      </ol>

      <Card title="ขั้นถัดไป">{nextStep}</Card>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="h-auto flex-wrap justify-start gap-1 rounded-sm border border-admin-border bg-admin-surface p-1">
          <TabsTrigger value="profile" className="rounded-sm text-xs">
            โปรไฟล์ & Draft
          </TabsTrigger>
          <TabsTrigger value="send" className="rounded-sm text-xs">
            ลิงก์ & ข้อความ
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-sm text-xs">
            ประวัติ
          </TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="mt-4">
          {/* Same layout as the artist's form: live preview left, editing right */}
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
            <div className="min-w-0 space-y-5">
              {shown ? (
                <>
                  <InviteProfilePreview
                    data={shown}
                    media={mediaMap}
                    t={t}
                    badge={staffDraft ? "Draft · ยังไม่เผยแพร่" : t.pvBadge}
                  />
                  {shown.projects.map((p, i) => (
                    <InviteProjectPreview
                      key={p.slot}
                      project={p}
                      index={i}
                      name={shown.about.name}
                      media={mediaMap}
                      t={t}
                      badge={staffDraft ? "Draft" : t.pvBadge}
                    />
                  ))}
                </>
              ) : (
                <p className="text-sm text-admin-muted">
                  ยังไม่มีข้อมูลให้พรีวิว
                </p>
              )}
            </div>
            <div className="min-w-0 space-y-5">
              {editable && draft ? (
                <AdminDraftEditor
                  invitationId={inv.id}
                  draft={draft}
                  setDraft={setDraft}
                  media={mediaMap}
                  addMedia={(m) =>
                    setAddedMedia((prev) => new Map(prev).set(m.id, m))
                  }
                  saving={action.isPending}
                  onSave={() =>
                    void run(
                      { action: "save_draft", draft },
                      "บันทึก Draft แล้ว",
                    )
                  }
                  onReset={() => setDraft(staffDraft)}
                />
              ) : null}
              {editable && draft ? (
                <details className="rounded-sm border border-admin-border p-4">
                  <summary className="cursor-pointer text-sm font-medium">
                    ข้อมูลต้นฉบับที่ศิลปินส่ง
                  </summary>
                  <div className="mt-4">
                    <Card title="ข้อมูลที่ส่ง">
                      {submission ? (
                        <>
                          <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1.5 text-sm">
                            <Row
                              k="โหมด"
                              v={
                                inv.submit_mode === "quick"
                                  ? "Quick submit"
                                  : inv.submit_mode === "full"
                                    ? "ฟอร์มเต็ม"
                                    : "ยังไม่ส่ง (ร่าง)"
                              }
                            />
                            <Row k="ชื่อ" v={submission.about.name || "—"} />
                            <Row
                              k="สาขา"
                              v={submission.about.discipline || "—"}
                            />
                            <Row k="อีเมล" v={submission.about.email || "—"} />
                            <Row k="เมือง" v={submission.about.city || "—"} />
                            <Row k="ลิงก์" v={submission.about.links || "—"} />
                            {submission.quick.portfolio_url ? (
                              <Row
                                k="พอร์ตโฟลิโอ"
                                v={
                                  <span className="flex flex-col gap-1">
                                    {submission.quick.portfolio_url
                                      .split("\n")
                                      .map((u) => u.trim())
                                      .filter(Boolean)
                                      .map((u) => (
                                        <a
                                          key={u}
                                          href={u}
                                          target="_blank"
                                          rel="noopener noreferrer nofollow"
                                          className="inline-flex items-center gap-1 break-all underline"
                                        >
                                          {u}{" "}
                                          <ExternalLink
                                            className="h-3 w-3 shrink-0"
                                            aria-hidden
                                          />
                                        </a>
                                      ))}
                                  </span>
                                }
                              />
                            ) : null}
                            <Row
                              k="ติดต่อทาง"
                              v={[
                                submission.contact_pref || "—",
                                submission.contact_handle,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            />
                            <Row k="Bio" v={submission.about.bio || "—"} />
                          </dl>
                          {submission.projects.map((p, i) => (
                            <div
                              key={p.slot}
                              className="mt-4 border-t border-admin-border pt-3 text-sm"
                            >
                              <p className="font-medium">
                                โปรเจกต์ {i + 1}: {p.title || "(ไม่มีชื่อ)"}
                              </p>
                              <p className="text-xs text-admin-muted">
                                {[
                                  p.role,
                                  p.url,
                                  p.rights
                                    ? "ยืนยันสิทธิ์ภาพ ✓"
                                    : "ยังไม่ยืนยันสิทธิ์",
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                              {p.description ? (
                                <p className="mt-1 whitespace-pre-line text-admin-fg/90">
                                  {p.description}
                                </p>
                              ) : null}
                              <div className="mt-2 flex flex-wrap gap-2">
                                {p.media.map((m) => {
                                  const u = mediaMap.get(m)?.url;
                                  return u ? (
                                    <a
                                      key={m}
                                      href={u}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <img
                                        src={u}
                                        alt=""
                                        className="h-20 w-20 rounded-sm object-cover"
                                      />
                                    </a>
                                  ) : (
                                    <span
                                      key={m}
                                      className="flex h-20 w-20 items-center justify-center rounded-sm bg-admin-surface text-[10px] text-admin-muted"
                                    >
                                      —
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                          {data.media.some((m) => m.slot === "extra") ? (
                            <div className="mt-4 border-t border-admin-border pt-3 text-sm">
                              <p className="font-medium">
                                รูปที่ศิลปินแนบมาตอนขอแก้
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {data.media
                                  .filter((m) => m.slot === "extra")
                                  .map((m) => {
                                    const u = urls.data?.[m.id];
                                    return u ? (
                                      <a
                                        key={m.id}
                                        href={u}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        <img
                                          src={u}
                                          alt=""
                                          className="h-20 w-20 rounded-sm object-cover"
                                        />
                                      </a>
                                    ) : null;
                                  })}
                              </div>
                            </div>
                          ) : null}
                          <p className="mt-3 text-xs text-admin-muted">
                            {data.media.length} ไฟล์ ·{" "}
                            {
                              data.media.filter(
                                (m) => m.scan_status === "clean",
                              ).length
                            }{" "}
                            ผ่านการตรวจ
                            {data.media.some((m) => m.scan_status === "blocked")
                              ? ` · ${data.media.filter((m) => m.scan_status === "blocked").length} ไม่ผ่าน (ถูกลบ)`
                              : ""}
                            {data.media.some((m) =>
                              m.scan_note?.includes("vt_pending"),
                            )
                              ? " · VirusTotal กำลังตรวจ"
                              : ""}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-admin-muted">
                          ศิลปินยังไม่ได้กรอกข้อมูล
                        </p>
                      )}
                    </Card>
                  </div>
                </details>
              ) : (
                <>
                  <Card title="ข้อมูลที่ส่ง">
                    {submission ? (
                      <>
                        <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1.5 text-sm">
                          <Row
                            k="โหมด"
                            v={
                              inv.submit_mode === "quick"
                                ? "Quick submit"
                                : inv.submit_mode === "full"
                                  ? "ฟอร์มเต็ม"
                                  : "ยังไม่ส่ง (ร่าง)"
                            }
                          />
                          <Row k="ชื่อ" v={submission.about.name || "—"} />
                          <Row
                            k="สาขา"
                            v={submission.about.discipline || "—"}
                          />
                          <Row k="อีเมล" v={submission.about.email || "—"} />
                          <Row k="เมือง" v={submission.about.city || "—"} />
                          <Row k="ลิงก์" v={submission.about.links || "—"} />
                          {submission.quick.portfolio_url ? (
                            <Row
                              k="พอร์ตโฟลิโอ"
                              v={
                                <span className="flex flex-col gap-1">
                                  {submission.quick.portfolio_url
                                    .split("\n")
                                    .map((u) => u.trim())
                                    .filter(Boolean)
                                    .map((u) => (
                                      <a
                                        key={u}
                                        href={u}
                                        target="_blank"
                                        rel="noopener noreferrer nofollow"
                                        className="inline-flex items-center gap-1 break-all underline"
                                      >
                                        {u}{" "}
                                        <ExternalLink
                                          className="h-3 w-3 shrink-0"
                                          aria-hidden
                                        />
                                      </a>
                                    ))}
                                </span>
                              }
                            />
                          ) : null}
                          <Row
                            k="ติดต่อทาง"
                            v={[
                              submission.contact_pref || "—",
                              submission.contact_handle,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          />
                          <Row k="Bio" v={submission.about.bio || "—"} />
                        </dl>
                        {submission.projects.map((p, i) => (
                          <div
                            key={p.slot}
                            className="mt-4 border-t border-admin-border pt-3 text-sm"
                          >
                            <p className="font-medium">
                              โปรเจกต์ {i + 1}: {p.title || "(ไม่มีชื่อ)"}
                            </p>
                            <p className="text-xs text-admin-muted">
                              {[
                                p.role,
                                p.url,
                                p.rights
                                  ? "ยืนยันสิทธิ์ภาพ ✓"
                                  : "ยังไม่ยืนยันสิทธิ์",
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                            {p.description ? (
                              <p className="mt-1 whitespace-pre-line text-admin-fg/90">
                                {p.description}
                              </p>
                            ) : null}
                            <div className="mt-2 flex flex-wrap gap-2">
                              {p.media.map((m) => {
                                const u = mediaMap.get(m)?.url;
                                return u ? (
                                  <a
                                    key={m}
                                    href={u}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <img
                                      src={u}
                                      alt=""
                                      className="h-20 w-20 rounded-sm object-cover"
                                    />
                                  </a>
                                ) : (
                                  <span
                                    key={m}
                                    className="flex h-20 w-20 items-center justify-center rounded-sm bg-admin-surface text-[10px] text-admin-muted"
                                  >
                                    —
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                        {data.media.some((m) => m.slot === "extra") ? (
                          <div className="mt-4 border-t border-admin-border pt-3 text-sm">
                            <p className="font-medium">
                              รูปที่ศิลปินแนบมาตอนขอแก้
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {data.media
                                .filter((m) => m.slot === "extra")
                                .map((m) => {
                                  const u = urls.data?.[m.id];
                                  return u ? (
                                    <a
                                      key={m.id}
                                      href={u}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <img
                                        src={u}
                                        alt=""
                                        className="h-20 w-20 rounded-sm object-cover"
                                      />
                                    </a>
                                  ) : null;
                                })}
                            </div>
                          </div>
                        ) : null}
                        <p className="mt-3 text-xs text-admin-muted">
                          {data.media.length} ไฟล์ ·{" "}
                          {
                            data.media.filter((m) => m.scan_status === "clean")
                              .length
                          }{" "}
                          ผ่านการตรวจ
                          {data.media.some((m) => m.scan_status === "blocked")
                            ? ` · ${data.media.filter((m) => m.scan_status === "blocked").length} ไม่ผ่าน (ถูกลบ)`
                            : ""}
                          {data.media.some((m) =>
                            m.scan_note?.includes("vt_pending"),
                          )
                            ? " · VirusTotal กำลังตรวจ"
                            : ""}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-admin-muted">
                        ศิลปินยังไม่ได้กรอกข้อมูล
                      </p>
                    )}
                  </Card>
                </>
              )}
            </div>
          </div>
        </TabsContent>
        <TabsContent value="send" className="mt-4 grid gap-5 md:grid-cols-2">
          <Card title="ลิงก์">
            <dl className="grid grid-cols-[5.5rem_1fr] gap-x-2 gap-y-2 text-xs">
              <Row
                k="คำเชิญ"
                v={
                  links.invite_link ? (
                    <button
                      type="button"
                      className="break-all text-left underline"
                      onClick={() => void copy(links.invite_link!)}
                    >
                      {links.invite_link
                        .replace(/^https:\/\//, "")
                        .slice(0, 34)}
                      …
                    </button>
                  ) : (
                    "—"
                  )
                }
              />
              <Row k="หมดอายุ" v={when(inv.expires_at, "d MMM yyyy")} />
              <Row
                k="ตรวจอนุมัติ"
                v={
                  links.review_link ? (
                    <button
                      type="button"
                      className="break-all text-left underline"
                      onClick={() => void copy(links.review_link!)}
                    >
                      {links.review_link
                        .replace(/^https:\/\//, "")
                        .slice(0, 34)}
                      …
                    </button>
                  ) : (
                    "ยังไม่สร้าง"
                  )
                }
              />
              {inv.review_expires_at ? (
                <Row
                  k="ลิงก์ตรวจหมด"
                  v={when(inv.review_expires_at, "d MMM yyyy")}
                />
              ) : null}
            </dl>
          </Card>
          <Card title="ข้อความ Email / DM">
            <div className="mb-2 flex flex-wrap gap-1">
              {(["dm-th", "dm-en", "email-th", "email-en"] as TemplateId[]).map(
                (k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setTpl(k)}
                    className={cn(
                      "rounded-sm border px-2 py-1 text-[11px]",
                      tpl === k
                        ? "border-admin-fg bg-admin-fg text-admin-bg"
                        : "border-admin-border",
                    )}
                  >
                    {k.replace("-", " ").toUpperCase()}
                  </button>
                ),
              )}
            </div>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-sm bg-admin-surface p-3 text-[11px] leading-relaxed">
              {outreachTemplate(tpl, name, link)}
            </pre>
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={() =>
                void copy(
                  outreachTemplate(tpl, name, link),
                  "คัดลอกข้อความแล้ว",
                )
              }
            >
              <Copy className="mr-1.5 h-3.5 w-3.5" aria-hidden /> คัดลอกข้อความ
            </Button>
            <p className="mt-2 text-[11px] text-admin-muted">
              การ์ดภาพ 1080×1350 + QR = V1.1
            </p>
          </Card>
        </TabsContent>
        <TabsContent value="history" className="mt-4 grid gap-5 md:grid-cols-2">
          <Card title="บันทึกการยินยอม">
            {data.consents.length ? (
              <dl className="grid grid-cols-[10rem_1fr] gap-x-3 gap-y-1.5 text-sm">
                {data.consents.map((c, i) => (
                  <Row
                    key={i}
                    k={
                      c.kind === "draft_permission"
                        ? "ทำ Draft ส่วนตัว"
                        : c.kind === "image_rights"
                          ? `สิทธิ์ภาพ ${c.scope ?? ""}`
                          : "อนุมัติเผยแพร่"
                    }
                    v={`✓ ${when(c.granted_at, "d MMM yyyy HH:mm:ss")} · ${c.text_version}`}
                  />
                ))}
                <Row
                  k="ติดตามการเปิดอีเมล"
                  v="ไม่ได้ขอ (Opened = ศิลปินกดเลือกเส้นทางเอง)"
                />
              </dl>
            ) : (
              <p className="text-sm text-admin-muted">ยังไม่มี</p>
            )}
          </Card>
          <Card title="อีเมลอัตโนมัติ">
            {data.emails.length ? (
              <ul className="space-y-1.5 text-xs">
                {data.emails.map((m, i) => (
                  <li key={i}>
                    <span className="font-medium">{m.kind}</span> · {m.status}
                    {m.sent_at
                      ? ` · ${when(m.sent_at)}`
                      : m.status === "pending"
                        ? ` · ส่ง ${when(m.not_before)}`
                        : ""}
                    {m.last_error ? (
                      <span className="block text-admin-muted">
                        {m.last_error}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-admin-muted">ยังไม่มี</p>
            )}
          </Card>
          <Card title="Audit log">
            <ul className="max-h-80 space-y-1.5 overflow-auto text-xs">
              {data.events.map((e, i) => (
                <li key={i}>
                  <span className="text-admin-muted">
                    {when(e.created_at, "d MMM HH:mm")}
                  </span>{" "}
                  · {eventLabel(e.kind)}
                  {e.actor
                    ? ` · โดย ${e.actor}`
                    : e.actor_type === "artist"
                      ? " · ศิลปิน"
                      : ""}
                  {typeof e.detail?.note === "string" ? (
                    <span className="block text-admin-muted">
                      “{e.detail.note}”
                    </span>
                  ) : null}
                  {typeof e.detail?.error === "string" ? (
                    <span className="block text-admin-muted">
                      {e.detail.error}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </Card>
          {inv.interest_url ? (
            <Card title="ผลงานที่ทำให้สนใจ (ภายใน)">
              <a
                href={inv.interest_url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="break-all text-xs underline"
              >
                {inv.interest_url}
              </a>
            </Card>
          ) : null}
        </TabsContent>
      </Tabs>

      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {confirm === "publish"
                ? "เผยแพร่ + สร้างบัญชี?"
                : confirm === "revoke"
                  ? "ยกเลิกลิงก์คำเชิญ?"
                  : "ลบคำเชิญนี้?"}
            </DialogTitle>
            <DialogDescription>
              {confirm === "publish"
                ? inv.user_id
                  ? "เผยแพร่ Draft ที่ศิลปินอนุมัติเข้าบัญชีที่ศิลปินสมัครเองไว้แล้ว และส่งอีเมลแจ้ง"
                  : `สร้างบัญชีด้วย ${inv.contact_email ?? submission?.about.email ?? "อีเมลศิลปิน"} + รหัสสุ่ม 20 ตัว (ส่งทางอีเมลเท่านั้น ไม่แสดงที่นี่) แล้วเผยแพร่โปรไฟล์และผลงานที่อนุมัติ`
                : confirm === "revoke"
                  ? "ลิงก์คำเชิญและลิงก์ตรวจจะใช้ไม่ได้ทันที อีเมลที่รอส่งจะถูกยกเลิก (ต่ออายุเพื่อเปิดใหม่ได้)"
                  : "ลบข้อมูล รูป และประวัติของคำเชิญนี้ถาวร ใช้เมื่อศิลปินขอลบข้อมูล"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirm(null)}>
              ยกเลิก
            </Button>
            <Button
              variant={confirm === "publish" ? "default" : "destructive"}
              disabled={action.isPending}
              onClick={() => {
                if (confirm === "publish") void publish();
                else if (confirm === "revoke")
                  void run({ action: "revoke" }, "ยกเลิกลิงก์แล้ว").then(() =>
                    setConfirm(null),
                  );
                else
                  void run({ action: "delete_data" }, "ลบแล้ว").then(() =>
                    navigate(adminInviteBase()),
                  );
              }}
            >
              {action.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
              ) : null}
              ยืนยัน
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
