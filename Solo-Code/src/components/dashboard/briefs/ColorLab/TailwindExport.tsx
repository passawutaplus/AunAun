import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Code2, Copy, Download } from "lucide-react";
import { tints, shades, tones } from "@/lib/colorVariations";
import { toast } from "sonner";

interface Props {
  hex: string;
}

function buildConfig(hex: string, prefix: string): string {
  const t = tints(hex, 10);
  const s = shades(hex, 10);
  const n = tones(hex, 10);
  const lines: string[] = [];
  lines.push(`          '${prefix}': '${hex}',`);
  t.forEach((c, i) => lines.push(`          '${prefix}-tint-${i + 1}': '${c}',`));
  s.forEach((c, i) => lines.push(`          '${prefix}-shade-${i + 1}': '${c}',`));
  n.forEach((c, i) => lines.push(`          '${prefix}-tone-${i + 1}': '${c}',`));
  return [
    "// tailwind.config.js",
    "module.exports = {",
    "  theme: {",
    "    extend: {",
    "      colors: {",
    ...lines,
    "      },",
    "    },",
    "  },",
    "};",
    "",
  ].join("\n");
}

export function TailwindExport({ hex }: Props) {
  const [open, setOpen] = React.useState(false);
  const [prefix, setPrefix] = React.useState("brand");
  const code = React.useMemo(() => buildConfig(hex, prefix.trim() || "brand"), [hex, prefix]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("คัดลอกโค้ด Tailwind config แล้ว");
    } catch {
      toast.error("ก๊อปปี้ไม่สำเร็จ");
    }
  };

  const download = () => {
    const blob = new Blob([code], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tailwind.config.js";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-1.5 rounded-xl h-10">
          <Code2 className="h-4 w-4 text-primary" /> Export Tailwind
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Tailwind Config Export</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <label htmlFor="tw-prefix" className="text-xs text-muted-foreground">
              Token prefix
            </label>
            <Input
              id="tw-prefix"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value.replace(/[^a-zA-Z0-9-]/g, ""))}
              className="h-8 max-w-[160px] font-mono text-xs"
            />
          </div>
          <pre className="max-h-[60vh] overflow-auto rounded-lg bg-muted/40 p-3 text-[11px] font-mono leading-relaxed">
            {code}
          </pre>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={download} className="gap-1.5">
            <Download className="h-4 w-4" /> Download .js
          </Button>
          <Button onClick={copy} className="gap-1.5">
            <Copy className="h-4 w-4" /> Copy โค้ด
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
