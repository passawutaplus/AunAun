import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Copy, Type, FileText } from "lucide-react";
import { toast } from "sonner";

type FontPair = {
  id: string;
  label: string;
  heading: string;
  body: string;
  googleQuery: string;
  vibe: string;
};

const FONT_PAIRS: FontPair[] = [
  {
    id: "inter-noto",
    label: "Inter + Noto Sans Thai",
    heading: "'Inter', sans-serif",
    body: "'Noto Sans Thai', sans-serif",
    googleQuery: "Inter:wght@600;700|Noto+Sans+Thai:wght@400;500",
    vibe: "โมเดิร์น · อ่านง่าย · ใช้ได้ทั้ง UI และแบรนด์",
  },
  {
    id: "playfair-sarabun",
    label: "Playfair + Sarabun",
    heading: "'Playfair Display', serif",
    body: "'Sarabun', sans-serif",
    googleQuery: "Playfair+Display:wght@600;700|Sarabun:wght@400;500",
    vibe: "พรีเมียม · เน้นหัวข้อ · เหมาะแบรนด์ไลฟ์สไตล์",
  },
  {
    id: "space-ibm",
    label: "Space Grotesk + IBM Plex Sans Thai",
    heading: "'Space Grotesk', sans-serif",
    body: "'IBM Plex Sans Thai', sans-serif",
    googleQuery: "Space+Grotesk:wght@600;700|IBM+Plex+Sans+Thai:wght@400;500",
    vibe: "เทค · สตาร์ทอัพ · ดูมั่นใจ",
  },
  {
    id: "dm-kanit",
    label: "DM Sans + Kanit",
    heading: "'DM Sans', sans-serif",
    body: "'Kanit', sans-serif",
    googleQuery: "DM+Sans:wght@600;700|Kanit:wght@400;500",
    vibe: "เป็นกันเอง · สดใส · แบรนด์ consumer",
  },
];

const RATIOS = [
  { id: "1.2", label: "Minor Third (1.2)", value: 1.2 },
  { id: "1.25", label: "Major Third (1.25)", value: 1.25 },
  { id: "1.333", label: "Perfect Fourth (1.333)", value: 1.333 },
  { id: "1.414", label: "Augmented Fourth (1.414)", value: 1.414 },
  { id: "1.5", label: "Perfect Fifth (1.5)", value: 1.5 },
];

function buildScale(basePx: number, ratio: number) {
  const steps = [
    { name: "caption", exp: -1 },
    { name: "body", exp: 0 },
    { name: "h6", exp: 1 },
    { name: "h5", exp: 2 },
    { name: "h4", exp: 3 },
    { name: "h3", exp: 4 },
    { name: "h2", exp: 5 },
    { name: "h1", exp: 6 },
  ];
  return steps.map((s) => ({
    ...s,
    px: Math.round(basePx * ratio ** s.exp),
  }));
}

function loadGoogleFonts(query: string) {
  const id = "so1o-typography-lab-fonts";
  let link = document.getElementById(id) as HTMLLinkElement | null;
  const href = `https://fonts.googleapis.com/css2?family=${query}&display=swap`;
  if (!link) {
    link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }
  if (link.href !== href) link.href = href;
}

export function TypographyLab({ onSendToBrief }: { onSendToBrief?: (fontsLine: string) => void }) {
  const [pairId, setPairId] = React.useState(FONT_PAIRS[0].id);
  const [basePx, setBasePx] = React.useState(16);
  const [ratioId, setRatioId] = React.useState("1.25");

  const pair = FONT_PAIRS.find((p) => p.id === pairId) ?? FONT_PAIRS[0];
  const ratio = RATIOS.find((r) => r.id === ratioId)?.value ?? 1.25;
  const scale = React.useMemo(() => buildScale(basePx, ratio), [basePx, ratio]);

  React.useEffect(() => {
    loadGoogleFonts(pair.googleQuery);
  }, [pair.googleQuery]);

  const copyCss = async () => {
    const lines = scale.map(
      (s) =>
        `  --text-${s.name}: ${s.px}px; /* ${s.name === "body" ? "base" : s.name} */`,
    );
    const css = [
      ":root {",
      ...lines,
      `  --font-heading: ${pair.heading};`,
      `  --font-body: ${pair.body};`,
      "}",
      "",
      "h1,h2,h3,h4,h5,h6 { font-family: var(--font-heading); }",
      "body,p,li { font-family: var(--font-body); }",
    ].join("\n");
    try {
      await navigator.clipboard.writeText(css);
      toast.success("คัดลอก CSS variables แล้ว");
    } catch {
      toast.error("ก๊อปปี้ไม่สำเร็จ");
    }
  };

  return (
    <Card className="p-5 sm:p-6 glass space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-primary/10 text-primary p-2.5 shrink-0">
            <Type className="h-4 w-4" aria-hidden />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold tracking-tight">Typography Lab</h3>
              <Badge variant="outline" className="text-[10px]">
                พร้อมใช้งาน
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ทดลองฟอนต์คู่ · type scale · คัดลอก CSS ไปใช้ใน brief หรือ mockup
            </p>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" className="gap-1.5 rounded-xl" onClick={copyCss}>
          <Copy className="h-3.5 w-3.5" /> คัดลอก CSS
        </Button>
        {onSendToBrief && (
          <Button
            type="button"
            size="sm"
            className="gap-1.5 rounded-xl"
            onClick={() => {
              const link = `https://fonts.googleapis.com/css2?family=${pair.googleQuery}&display=swap`;
              const line = `${pair.label}\n${link}\nScale: ${ratioId} · body ${basePx}px`;
              onSendToBrief(line);
            }}
          >
            <FileText className="h-3.5 w-3.5" /> ส่งฟอนต์เข้าบรีฟ
          </Button>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs">ฟอนต์คู่</Label>
          <Select value={pairId} onValueChange={setPairId}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_PAIRS.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">{pair.vibe}</p>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">อัตราส่วน Type Scale</Label>
          <Select value={ratioId} onValueChange={setRatioId}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RATIOS.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs">ขนาดตัวอักษรฐาน (body)</Label>
          <span className="text-xs font-mono tabular-nums text-muted-foreground">{basePx}px</span>
        </div>
        <Slider
          value={[basePx]}
          min={14}
          max={20}
          step={1}
          onValueChange={([v]) => setBasePx(v)}
        />
      </div>

      <div className="rounded-xl border border-border bg-card/80 p-4 sm:p-5 space-y-3">
        {scale
          .slice()
          .reverse()
          .map((step) => (
            <div key={step.name} className="flex items-baseline justify-between gap-3 border-b border-border/50 pb-2 last:border-0 last:pb-0">
              <span
                style={{
                  fontFamily: step.name.startsWith("h") ? pair.heading : pair.body,
                  fontSize: step.px,
                  lineHeight: 1.2,
                }}
                className="font-semibold truncate"
              >
                {step.name === "body"
                  ? "Aa อักษรไทย Body — ข้อความยาวสำหรับอ่าน"
                  : step.name === "caption"
                    ? "Caption · คำอธิบายเล็ก"
                    : `${step.name.toUpperCase()} · หัวข้อตัวอย่าง`}
              </span>
              <code className="text-[10px] font-mono text-muted-foreground shrink-0">
                {step.px}px
              </code>
            </div>
          ))}
      </div>
    </Card>
  );
}
