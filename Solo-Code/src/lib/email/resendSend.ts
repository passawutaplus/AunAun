export type ResendSendParams = {
  to: string;
  from: string;
  subject: string;
  html: string;
  text?: string;
  idempotencyKey?: string;
};

export type ResendSendResult =
  | { ok: true; id?: string }
  | { ok: false; status?: number; message: string; retryable: boolean };

const RESEND_API_URL = "https://api.resend.com/emails";

export async function sendResendEmail(
  params: ResendSendParams,
  apiKey = process.env.RESEND_API_KEY,
): Promise<ResendSendResult> {
  if (!apiKey) {
    return { ok: false, message: "RESEND_API_KEY not configured", retryable: false };
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  if (params.idempotencyKey) {
    headers["Idempotency-Key"] = params.idempotencyKey;
  }

  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      from: params.from,
      to: [params.to],
      subject: params.subject,
      html: params.html,
      ...(params.text ? { text: params.text } : {}),
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (res.ok) {
    const id = typeof body?.id === "string" ? body.id : undefined;
    return { ok: true, id };
  }

  const message =
    (typeof body?.message === "string" && body.message) ||
    (typeof body?.error === "string" && body.error) ||
    `Resend API error (${res.status})`;

  return {
    ok: false,
    status: res.status,
    message,
    retryable: res.status === 429 || res.status >= 500,
  };
}

export function isResendRateLimited(result: ResendSendResult): boolean {
  return !result.ok && result.status === 429;
}

export function isResendForbidden(result: ResendSendResult): boolean {
  return !result.ok && (result.status === 403 || result.status === 422);
}
