import type { PaymentProvider } from "./provider";
import { assertLiveOmiseAllowed, type OmiseServerEnv } from "./provider";
import type {
  CreateChargeInput,
  CreateChargeResult,
  CreateRefundInput,
  CreateRefundResult,
  CreateTransferInput,
  CreateTransferResult,
  PaymentStatus,
} from "./types";

const OMISE_API = "https://api.omise.co";

function basicAuth(secretKey: string): string {
  const raw = `${secretKey}:`;
  const encoded =
    typeof Buffer !== "undefined"
      ? Buffer.from(raw).toString("base64")
      : btoa(raw);
  return `Basic ${encoded}`;
}

function mapChargeStatus(status: string | undefined): PaymentStatus {
  switch (status) {
    case "successful":
      return "paid";
    case "pending":
      return "pending";
    case "failed":
      return "failed";
    case "expired":
      return "expired";
    default:
      return "created";
  }
}

/**
 * Omise (Opn) provider — server-side only.
 * Client may use OMISE_PUBLIC_KEY for tokenization; never ship the secret.
 */
export function createOmiseProvider(env: OmiseServerEnv): PaymentProvider {
  if (!env.secretKey) {
    throw new Error("OMISE_SECRET_KEY is required");
  }

  async function omisePost(path: string, body: URLSearchParams, idempotencyKey: string) {
    assertLiveOmiseAllowed(env);
    const res = await fetch(`${OMISE_API}${path}`, {
      method: "POST",
      headers: {
        Authorization: basicAuth(env.secretKey),
        "Content-Type": "application/x-www-form-urlencoded",
        "Omise-Version": "2019-05-29",
        "Idempotency-Key": idempotencyKey,
      },
      body,
    });
    const json = (await res.json()) as Record<string, unknown>;
    if (!res.ok || json.object === "error") {
      const msg = typeof json.message === "string" ? json.message : "Omise request failed";
      throw new Error(msg);
    }
    return json;
  }

  return {
    id: "omise",

    async createCharge(input: CreateChargeInput): Promise<CreateChargeResult> {
      const body = new URLSearchParams();
      body.set("amount", String(input.amountSatang));
      body.set("currency", input.currency.toLowerCase());
      body.set("description", input.description);
      if (input.returnUri) body.set("return_uri", input.returnUri);

      if (input.method === "promptpay") {
        body.set("source[type]", "promptpay");
      } else if (input.method === "card") {
        // Token must be created client-side with public key, then passed via metadata.token
        const token = input.metadata.cardToken;
        if (!token) throw new Error("cardToken required for card charge");
        body.set("card", token);
      } else {
        throw new Error("bank_transfer is disabled until Omise confirms support");
      }

      for (const [k, v] of Object.entries(input.metadata)) {
        if (k === "cardToken") continue;
        body.set(`metadata[${k}]`, v);
      }

      const json = await omisePost("/charges", body, input.idempotencyKey);
      const source = json.source as { scannable_code?: { image?: { download_uri?: string } } } | undefined;
      return {
        providerChargeId: String(json.id),
        status: mapChargeStatus(typeof json.status === "string" ? json.status : undefined),
        authorizeUri: typeof json.authorize_uri === "string" ? json.authorize_uri : undefined,
        qrCodeUri: source?.scannable_code?.image?.download_uri,
        raw: json,
      };
    },

    async createTransfer(input: CreateTransferInput): Promise<CreateTransferResult> {
      const body = new URLSearchParams();
      body.set("amount", String(input.amountSatang));
      body.set("recipient", input.recipientId);
      if (input.description) body.set("metadata[description]", input.description);
      for (const [k, v] of Object.entries(input.metadata)) {
        body.set(`metadata[${k}]`, v);
      }
      const json = await omisePost("/transfers", body, input.idempotencyKey);
      const statusRaw = typeof json.status === "string" ? json.status : "pending";
      const status =
        statusRaw === "paid" || statusRaw === "sent" || statusRaw === "failed"
          ? statusRaw
          : "pending";
      return {
        providerTransferId: String(json.id),
        status,
        raw: json,
      };
    },

    async createRefund(input: CreateRefundInput): Promise<CreateRefundResult> {
      const body = new URLSearchParams();
      body.set("amount", String(input.amountSatang));
      if (input.reason) body.set("metadata[reason]", input.reason);
      const json = await omisePost(
        `/charges/${encodeURIComponent(input.providerChargeId)}/refunds`,
        body,
        input.idempotencyKey,
      );
      return {
        providerRefundId: String(json.id),
        status: json.status === "closed" ? "closed" : json.status === "failed" ? "failed" : "pending",
        amountSatang: Number(json.amount) || input.amountSatang,
      };
    },
  };
}
