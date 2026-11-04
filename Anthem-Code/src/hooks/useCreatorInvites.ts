import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { InviteApiError, inviteCall, type InviteLang, type InviteStatus } from "@/lib/creatorInvite";
import { demoAction, demoDetail, demoRows, isAdminDemo } from "@/lib/creatorInviteAdminDemo";

export interface AdminInviteRow {
  id: string;
  display_name: string;
  discipline: string | null;
  country: string | null;
  contact_email: string | null;
  social_handle: string | null;
  language: InviteLang;
  send_mode: "email_now" | "scheduled" | "manual_dm";
  status: InviteStatus;
  revoked: boolean;
  unsubscribed: boolean;
  review_sent_at: string | null;
  sent_at: string | null;
  submitted_at: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface AdminInviteDetail {
  invitation: Record<string, unknown> & AdminInviteRow & {
    personal_note: string | null;
    interest_url: string | null;
    auto_reminder: boolean;
    scheduled_at: string | null;
    reminder_sent_at: string | null;
    sent_channel: string | null;
    opened_at: string | null;
    started_at: string | null;
    submit_mode: "full" | "quick" | null;
    approved_at: string | null;
    change_request_note: string | null;
    declined_at: string | null;
    decline_note: string | null;
    delete_after: string | null;
    published_at: string | null;
    user_id: string | null;
    self_signup_at: string | null;
    account_created_at: string | null;
    review_expires_at: string | null;
    unsubscribed_at: string | null;
    revoked_at: string | null;
  };
  submission: { data: unknown; staff_draft: unknown; updated_at: string; submitted_at: string | null } | null;
  media: { id: string; slot: string; mime: string; size_bytes: number; scan_status: string; scan_note: string | null; created_at: string }[];
  consents: { kind: string; scope: string | null; text_version: string; granted_at: string }[];
  events: { kind: string; actor_type: string; actor: string | null; detail: Record<string, unknown>; created_at: string }[];
  emails: { kind: string; status: string; not_before: string; sent_at: string | null; attempts: number; last_error: string | null }[];
}

const rpc = (fn: string, args?: Record<string, unknown>) =>
  (supabase.rpc as unknown as (f: string, a?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>)(fn, args);

export const ADMIN_INVITE_ERRORS: Record<string, string> = {
  email_required_for_send_mode: "ส่งอีเมล/ตั้งเวลาได้เฉพาะเมื่อใส่อีเมล — ถ้าเป็น handle ให้เลือกส่งเองทาง DM",
  scheduled_at_required: "เลือกเวลาส่งในอนาคต",
  invalid: "ข้อมูลไม่ครบหรือไม่ถูกต้อง",
  needs_artist_approval: "ต้องรอศิลปินกดอนุมัติก่อนเผยแพร่",
  email_has_account: "อีเมลนี้มีบัญชี SAMECOR อยู่แล้ว — ให้ศิลปินใช้ “สมัครเอง” ผ่านลิงก์คำเชิญเพื่อผูกบัญชี แล้วค่อยเผยแพร่",
  email_required: "ยังไม่มีอีเมลของศิลปิน",
  start_draft_first: "กด “เริ่มทำ Draft” ก่อนส่งลิงก์ตรวจ",
  nothing_submitted: "ศิลปินยังไม่ได้ส่งข้อมูล",
  wrong_status: "สถานะตอนนี้ทำรายการนี้ไม่ได้",
  invalid_draft: "ข้อมูล Draft ไม่ถูกต้อง",
  publish_failed: "เผยแพร่ไม่สำเร็จ ดู audit log",
  forbidden: "ต้องเป็นแอดมิน",
};

export function adminInviteErrorText(e: unknown): string {
  const code = e instanceof InviteApiError ? e.code : "server_error";
  return ADMIN_INVITE_ERRORS[code] ?? `ทำรายการไม่สำเร็จ (${code})`;
}

export function useAdminInvites() {
  return useQuery({
    queryKey: ["admin-creator-invites"],
    queryFn: async () => {
      if (isAdminDemo()) return demoRows();
      const { data, error } = await rpc("admin_creator_invites_list");
      if (error) throw new Error(error.message);
      return (data ?? []) as AdminInviteRow[];
    },
  });
}

export function useAdminInvite(id: string | undefined) {
  return useQuery({
    queryKey: ["admin-creator-invite", id],
    enabled: !!id,
    queryFn: async () => {
      if (isAdminDemo()) return demoDetail(id);
      const { data, error } = await rpc("admin_creator_invite_detail", { _id: id });
      if (error) throw new Error(error.message);
      return data as AdminInviteDetail | null;
    },
  });
}

export function useAdminInviteMediaUrls(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["admin-creator-invite-media", id],
    enabled: !!id && enabled,
    staleTime: 30 * 60_000,
    queryFn: async () =>
      isAdminDemo()
        ? (demoAction({ action: "media_urls" }).urls as Record<string, string>)
        : (await inviteCall<{ urls: Record<string, string> }>("creator-invite-admin", { action: "media_urls", id })).urls,
  });
}

export function useAdminInviteAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) =>
      isAdminDemo() ? demoAction(body) : inviteCall<Record<string, unknown>>("creator-invite-admin", body),
    onSuccess: (_d, body) => {
      void qc.invalidateQueries({ queryKey: ["admin-creator-invites"] });
      if (typeof body.id === "string") void qc.invalidateQueries({ queryKey: ["admin-creator-invite", body.id] });
    },
    onError: (e) => toast.error(adminInviteErrorText(e)),
  });
}
