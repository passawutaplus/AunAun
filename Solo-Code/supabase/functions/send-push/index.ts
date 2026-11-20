// Delivers one shared.notifications row to every device the recipient registered: web push for the
// browser, installed PWA and old Android app builds; APNs for the iOS app (rows with shell 'ios', migration
// 20261118120000_ios_push_tokens.sql); FCM for the Android app from 1.2.0 ('fcm:' endpoints, migration
// 20261120100000_android_fcm_tokens.sql). Called by the notifications_dispatch_push trigger
// (migration 20261028090000_push_notifications.sql) with { notification_id }.
//
// Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:…), PUSH_DISPATCH_SECRET,
// for iOS APNS_KEY_ID, APNS_TEAM_ID, APNS_PRIVATE_KEY (see ../_shared/apns.ts),
// and for Android FCM_SERVICE_ACCOUNT (see ../_shared/fcm.ts).
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import { apnsConfigFromEnv, sendApns } from "../_shared/apns.ts";
import { fcmConfigFromEnv, sendFcm } from "../_shared/fcm.ts";

const SITE = "https://samecor.com";
const BADGE = `${SITE}/icons/notification-badge.png`;
const FALLBACK_ICON = `${SITE}/icons/icon-192.png`;
/** Kinds that are internal / admin bookkeeping — stay in the in-app list, never buzz a phone. */
const SKIP_KINDS = /^(admin_|asset_scan_)/;

type NotificationRow = {
  id: string;
  user_id: string;
  app: string;
  kind: string;
  title: string | null;
  body: string | null;
  link: string | null;
  metadata: Record<string, unknown> | null;
};

type PushAction = { action: string; title: string; url?: string };

type PushPayload = {
  title: string;
  body: string;
  icon: string;
  badge: string;
  image?: string;
  url: string;
  tag: string;
  renotify: boolean;
  actions: PushAction[];
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const absolute = (link: string | null | undefined) => {
  if (!link) return `${SITE}/notifications`;
  if (/^https?:\/\//.test(link)) return link.replace(/^https?:\/\/(an1hem\.app|aplus1\.app)/, SITE);
  return `${SITE}${link.startsWith("/") ? "" : "/"}${link}`;
};

const httpsOrUndefined = (url: unknown) =>
  typeof url === "string" && url.startsWith("https://") ? url : undefined;

/** Notification icons must be raster: DiceBear default avatars come as SVG, ask for PNG instead. */
const rasterAvatar = (url: string | undefined) =>
  url?.includes("api.dicebear.com/") ? url.replace(/\/svg(\?|$)/, "/png$1") : url;

/** 2–3 recommended works → one 2:1 image composed by the website (api/push-collage.js). */
const collageUrl = (ids: string[]) => `${SITE}/api/push-collage?ids=${ids.slice(0, 3).join(",")}`;

const truncate = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text;

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const expected = Deno.env.get("PUSH_DISPATCH_SECRET") ?? "";
  if (!expected || req.headers.get("x-internal-secret")?.trim() !== expected) {
    return json({ error: "unauthorized" }, 401);
  }

  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidReady = !!publicKey && !!privateKey;
  const apns = apnsConfigFromEnv();
  const fcm = fcmConfigFromEnv();
  if (!vapidReady && !apns && !fcm) return json({ error: "push_not_configured" }, 500);
  if (publicKey && privateKey) {
    webpush.setVapidDetails(
      Deno.env.get("VAPID_SUBJECT") ?? "mailto:support@samecor.com",
      publicKey,
      privateKey,
    );
  }

  let notificationId: string;
  try {
    notificationId = String((await req.json()).notification_id ?? "");
  } catch {
    return json({ error: "invalid_body" }, 400);
  }
  if (!/^[0-9a-f-]{36}$/i.test(notificationId)) return json({ error: "invalid_body" }, 400);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const shared = admin.schema("shared");

  const { data: row } = await shared
    .from("notifications")
    .select("id, user_id, app, kind, title, body, link, metadata")
    .eq("id", notificationId)
    .maybeSingle<NotificationRow>();
  if (!row || row.app !== "anthem" || SKIP_KINDS.test(row.kind)) return json({ skipped: true });

  const { data: subs } = await shared
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, shell, failure_count")
    .eq("user_id", row.user_id);
  if (!subs?.length) return json({ sent: 0 });

  const payload = await buildPayload(admin, row);
  // Opened from the Android app's notification → keep the app-only rules (see src/lib/appShell.ts).
  const bodyFor = (shell: string | null) => {
    if (shell !== "android") return JSON.stringify(payload);
    const tag = (href: string) => {
      const u = new URL(href);
      u.searchParams.set("source", "android");
      return u.toString();
    };
    return JSON.stringify({
      ...payload,
      url: tag(payload.url),
      actions: payload.actions.map((a) => (a.url ? { ...a, url: tag(a.url) } : a)),
    });
  };

  const markSent = (id: string) =>
    shared
      .from("push_subscriptions")
      .update({ last_success_at: new Date().toISOString(), failure_count: 0 })
      .eq("id", id);
  const markFailed = (id: string, failures: number, gone: boolean) =>
    gone || failures >= 4
      ? shared.from("push_subscriptions").delete().eq("id", id)
      : shared
          .from("push_subscriptions")
          .update({ failure_count: failures + 1 })
          .eq("id", id);

  let sent = 0;
  await Promise.all(
    subs.map(async (sub) => {
      if (sub.endpoint.startsWith("fcm:")) {
        if (!fcm) return;
        try {
          const result = await sendFcm(fcm, sub.endpoint.slice("fcm:".length), {
            title: payload.title,
            body: payload.body,
            url: payload.url,
            tag: payload.tag,
            image: payload.image,
            highPriority: row.kind === "chat.message",
          });
          if (result.ok) {
            sent += 1;
            await markSent(sub.id);
          } else {
            console.warn("[send-push] fcm", result.status, result.reason);
            await markFailed(sub.id, sub.failure_count ?? 0, result.gone);
          }
        } catch (err) {
          console.warn("[send-push] fcm error", err instanceof Error ? err.message : err);
          await markFailed(sub.id, sub.failure_count ?? 0, false);
        }
        return;
      }
      if (sub.shell === "ios") {
        if (!apns || !sub.endpoint.startsWith("apns:")) return;
        try {
          const result = await sendApns(apns, sub.endpoint.slice("apns:".length), {
            title: payload.title,
            body: payload.body,
            url: payload.url,
            collapseId: payload.tag,
            highPriority: row.kind === "chat.message",
          });
          if (result.ok) {
            sent += 1;
            await markSent(sub.id);
          } else {
            console.warn("[send-push] apns", result.status, result.reason);
            await markFailed(sub.id, sub.failure_count ?? 0, result.gone);
          }
        } catch (err) {
          console.warn("[send-push] apns error", err instanceof Error ? err.message : err);
          await markFailed(sub.id, sub.failure_count ?? 0, false);
        }
        return;
      }
      if (!vapidReady) return;
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          bodyFor(sub.shell),
          { TTL: 60 * 60 * 24, urgency: row.kind === "chat.message" ? "high" : "normal" },
        );
        sent += 1;
        await shared
          .from("push_subscriptions")
          .update({ last_success_at: new Date().toISOString(), failure_count: 0 })
          .eq("id", sub.id);
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        // 404 / 410: the device unsubscribed or the app was uninstalled.
        if (status === 404 || status === 410 || (sub.failure_count ?? 0) >= 4) {
          await shared.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          await shared
            .from("push_subscriptions")
            .update({ failure_count: (sub.failure_count ?? 0) + 1 })
            .eq("id", sub.id);
        }
      }
    }),
  );

  return json({ sent });
});

async function buildPayload(
  admin: ReturnType<typeof createClient>,
  row: NotificationRow,
): Promise<PushPayload> {
  const meta = row.metadata ?? {};
  const actorId = [meta.sender_id, meta.actor_id, meta.follower_id, meta.from_user_id].find(
    (v): v is string => typeof v === "string",
  );
  const projectIds = Array.isArray(meta.project_ids)
    ? meta.project_ids.filter((v): v is string => typeof v === "string")
    : [];
  const projectId = typeof meta.project_id === "string" ? meta.project_id : projectIds[0];

  const [actor, project] = await Promise.all([
    actorId
      ? admin
          .from("profiles")
          .select("display_name, username, avatar_url")
          .eq("user_id", actorId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    projectId
      ? admin
          .schema("anthem")
          .from("projects")
          .select("title, cover_url")
          .eq("id", projectId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const actorName =
    (actor.data as { display_name?: string; username?: string } | null)?.display_name?.trim() ||
    (actor.data as { username?: string } | null)?.username ||
    undefined;
  const icon =
    rasterAvatar(httpsOrUndefined((actor.data as { avatar_url?: string } | null)?.avatar_url)) ??
    FALLBACK_ICON;
  const image = httpsOrUndefined((project.data as { cover_url?: string } | null)?.cover_url);
  const url = absolute(row.link);
  const title = row.title?.trim() || "SAMECOR";
  const text = row.body?.trim() || "";

  if (row.kind === "chat.message") {
    const conversationId = typeof meta.conversation_id === "string" ? meta.conversation_id : row.id;
    return {
      title: actorName ?? title,
      body: truncate(text || "ส่งข้อความถึงคุณ", 140),
      icon,
      badge: BADGE,
      url,
      // One notification per chat: new messages replace the old one and buzz again.
      tag: `chat:${conversationId}`,
      renotify: true,
      actions: [
        { action: "reply", title: "ตอบกลับ" },
        { action: "open", title: "เปิดแชท" },
      ],
    };
  }

  if (row.kind === "rec.following" || row.kind === "rec.weekly") {
    const following = row.kind === "rec.following";
    return {
      title,
      body: truncate(text, 160),
      // Weekly picks come from SAMECOR itself; new work is from a person you follow.
      icon: following ? icon : FALLBACK_ICON,
      badge: BADGE,
      image: projectIds.length > 1 ? collageUrl(projectIds) : image,
      url,
      tag: row.kind,
      renotify: false,
      actions: following
        ? [
            { action: "open", title: "ดูผลงาน" },
            ...(actorId
              ? [{ action: "profile", title: "ดูโปรไฟล์", url: `${SITE}/u/${actorId}` }]
              : []),
          ]
        : [
            { action: "open", title: "ดูผลงาน" },
            {
              action: "mute-recs",
              title: "ปิดแจ้งเตือนแนะนำ",
              url: `${SITE}/settings?mute=recommendations#notifications`,
            },
          ],
    };
  }

  if (row.kind.startsWith("system.")) {
    return {
      title,
      body: truncate(text, 160),
      icon: FALLBACK_ICON,
      badge: BADGE,
      image,
      url,
      tag: row.kind === "system.milestone" ? `milestone:${projectId ?? row.id}` : `n:${row.id}`,
      renotify: false,
      actions: [{ action: "open", title: projectId ? "ดูผลงาน" : "เปิดดู" }],
    };
  }

  if (row.kind === "follow") {
    return {
      title: actorName ? `${actorName} เริ่มติดตามคุณ` : title,
      body: truncate(text || "ดูโปรไฟล์และผลงานของเขา", 140),
      icon,
      badge: BADGE,
      url,
      tag: `follow:${actorId ?? row.id}`,
      renotify: false,
      actions: [{ action: "open", title: "ดูโปรไฟล์" }],
    };
  }

  return {
    title,
    body: truncate(text, 140),
    icon,
    badge: BADGE,
    image,
    url,
    tag: projectId ? `project:${projectId}:${row.kind}` : `n:${row.id}`,
    renotify: false,
    actions: [{ action: "open", title: projectId ? "ดูผลงาน" : "เปิดดู" }],
  };
}
