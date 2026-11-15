import { useRef, useState } from "react";
import { Copy, Download } from "lucide-react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import LineMarkIcon from "@/components/icons/LineMarkIcon";
import { Eyebrow, Title } from "@/components/support/SupportShell";
import { Button } from "@/components/ui/button";
import { BRAND_LINE_CONTACT_URL } from "@/lib/brandConfig";
import { copyText } from "@/lib/copyText";
import { useT } from "@/lib/i18n";
import { SUPPORT } from "@/lib/i18n/support";
import { formatThb } from "@/lib/support/catalog";
import { supportQrPayload, type SupportPayee } from "@/lib/support/payment";

const INK = "#282929";
const GREY = "#F2F2F0";
const RED = "#EE3D29";
/** QR pixels in the saved image. */
const SAVE_QR = 720;

type Props = {
  payee: SupportPayee;
  amountThb: number;
  /** Order or pledge reference, printed on the card and the saved image. */
  refNo: string;
  demo?: boolean;
  /** Use h2 when the page already has its own h1. */
  headingAs?: "h1" | "h2";
};

function isTouchDevice(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches === true;
}

/** Draws a phone-friendly payment image: amount, QR, payee and reference. */
function paintSaveImage(qr: HTMLCanvasElement, p: { amount: string; name: string; bankLine: string; refNo: string }): HTMLCanvasElement {
  const w = 1080;
  const h = 1520;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  if (!g) return c;
  const font = getComputedStyle(document.body).fontFamily || "sans-serif";

  g.fillStyle = GREY;
  g.fillRect(0, 0, w, h);

  g.fillStyle = INK;
  g.font = `700 40px ${font}`;
  g.textBaseline = "alphabetic";
  g.fillText("samecor", 80, 120);
  const mark = g.measureText("samecor").width;
  g.fillStyle = RED;
  g.fillText(".", 80 + mark, 120);

  g.fillStyle = INK;
  g.font = `italic 700 120px ${font}`;
  g.fillText(p.amount, 80, 290);

  const card = { x: 80, y: 360, w: w - 160, h: 1040 };
  g.fillStyle = "#FFFFFF";
  g.beginPath();
  g.roundRect(card.x, card.y, card.w, card.h, 48);
  g.fill();

  g.fillStyle = INK;
  g.font = `400 30px ${font}`;
  g.fillText("PROMPTPAY", card.x + 60, card.y + 90);
  g.drawImage(qr, (w - SAVE_QR) / 2, card.y + 120, SAVE_QR, SAVE_QR);

  g.font = `400 40px ${font}`;
  g.fillText(p.name, card.x + 60, card.y + 935);
  g.fillStyle = "#5F5E5A";
  g.font = `300 32px ${font}`;
  g.fillText(p.bankLine, card.x + 60, card.y + 990);

  g.font = `300 30px ${font}`;
  g.fillText(`Ref ${p.refNo}`, 80, h - 60);
  return c;
}

/** Brand payment card (design A, owner 2026-11-15): QR with the amount built in, the payee, and what to do next. */
export default function PromptPayCard({ payee, amountThb, refNo, demo = false, headingAs = "h2" }: Props) {
  const t = useT(SUPPORT);
  const qrCanvas = useRef<HTMLCanvasElement>(null);
  const [saving, setSaving] = useState(false);
  const payload = supportQrPayload(payee, amountThb);
  const amount = formatThb(amountThb);
  const bankLine = payee.accountNo ? `${payee.bank} · ${payee.accountNo}` : payee.bank;

  const copyAccount = async () => {
    if (!payee.accountNo) return;
    try {
      await copyText(payee.accountNo.replace(/\D/g, ""));
      toast.success(t("copied"));
    } catch {
      toast.error(t("copyFailed"));
    }
  };

  const saveQr = async () => {
    const qr = qrCanvas.current;
    if (!qr || saving) return;
    setSaving(true);
    try {
      const image = paintSaveImage(qr, { amount, name: payee.accountName, bankLine, refNo });
      const blob = await new Promise<Blob | null>((resolve) => image.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("no image");
      const file = new File([blob], `samecor-${refNo}.png`, { type: "image/png" });
      if (isTouchDevice() && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file] });
        } catch (err) {
          if ((err as { name?: string })?.name !== "AbortError") throw err;
        }
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      toast.error(t("saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (!payload) return null;

  return (
    <section aria-labelledby="pay-amount">
      <Eyebrow>Scan to pay</Eyebrow>
      <Title as={headingAs} className="mt-2">
        <span id="pay-amount">
          <em>{amount}</em>
        </span>
      </Title>
      <p className="mt-2 text-[15px] text-muted-foreground thai-body">{t("scanAnyBank")}</p>

      <div className="mt-5 rounded-3xl bg-card p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-[0.14em]">PromptPay</span>
          <span className="text-xs text-muted-foreground">Thai QR</span>
        </div>
        <div className="mx-auto mt-4 w-full max-w-[15rem] rounded-2xl bg-white p-3">
          <QRCodeSVG
            value={payload}
            level="M"
            marginSize={0}
            bgColor="#FFFFFF"
            fgColor={INK}
            title={`PromptPay QR ${amount}`}
            className="h-auto w-full"
            size={240}
          />
        </div>
        <QRCodeCanvas ref={qrCanvas} value={payload} level="M" marginSize={2} size={SAVE_QR} className="hidden" aria-hidden />

        <div className="mt-5 border-t border-border pt-4 text-sm thai-body">
          <p className="font-normal">{payee.accountName}</p>
          <div className="mt-0.5 flex items-center justify-between gap-3 text-muted-foreground">
            <span>
              {payee.bank}
              {payee.accountNo ? (
                <>
                  {" · "}
                  <span className="select-all tabular-nums text-foreground">{payee.accountNo}</span>
                </>
              ) : null}
            </span>
            {payee.accountNo ? (
              <button
                type="button"
                onClick={copyAccount}
                aria-label={t("copyAccount")}
                className="-m-2 inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted"
              >
                <Copy className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button size="lg" onClick={saveQr} disabled={saving} className="gap-2">
          <Download className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          {t("saveQr")}
        </Button>
        <Button asChild size="lg" variant="outline" className="gap-2">
          <a href={BRAND_LINE_CONTACT_URL} target="_blank" rel="noopener noreferrer">
            <LineMarkIcon className="h-4 w-4" />
            {t("sendSlip")}
          </a>
        </Button>
      </div>

      <p className="mt-3 text-[13px] text-muted-foreground thai-body md:hidden">{t("sameDevice")}</p>
      <p className="mt-1 text-[13px] text-muted-foreground thai-body">{demo ? t("payDemoNote") : t("payAfterLine")}</p>
      <p className="mt-3 text-xs tabular-nums text-muted-foreground">Ref {refNo}</p>
    </section>
  );
}
