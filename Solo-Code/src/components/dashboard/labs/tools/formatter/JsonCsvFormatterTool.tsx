import * as React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LabsWorkspaceEmpty } from "@/components/dashboard/labs/workbench/LabsWorkspaceEmpty";
import { LabsToolToolbar } from "@/components/dashboard/labs/workbench/LabsToolToolbar";
import { LabsInspectorSection } from "@/components/dashboard/labs/workbench/LabsInspectorSection";
import {
  Braces,
  ClipboardPaste,
  Copy,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { downloadBlob } from "@/lib/docZip";
import {
  CSV_SAMPLE,
  JSON_SAMPLE,
  csvToJson,
  detectFormat,
  formatJson,
  jsonToCsv,
  minifyJson,
  parseCsv,
  removeEmptyCsvRows,
  validateJson,
  type DataFormat,
} from "@/lib/labs/jsonCsv";
import { useLabsToolSetup } from "@/components/dashboard/labs/workbench/useLabsToolSetup";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function JsonCsvFormatterTool() {
  const [input, setInput] = React.useState("");
  const [output, setOutput] = React.useState("");
  const [format, setFormat] = React.useState<DataFormat>("unknown");
  const [error, setError] = React.useState<string | null>(null);
  const [errorLine, setErrorLine] = React.useState<number | undefined>();
  const [removeEmpty, setRemoveEmpty] = React.useState(true);
  const [delimiter, setDelimiter] = React.useState(",");

  React.useEffect(() => {
    if (!input.trim()) {
      setFormat("unknown");
      setOutput("");
      setError(null);
      return;
    }
    const f = detectFormat(input);
    setFormat(f);
    if (f === "json") {
      const res = formatJson(input);
      if (res.error) {
        setError(res.error.message);
        setErrorLine(res.error.line);
        setOutput("");
      } else {
        setError(null);
        setOutput(res.output);
      }
    } else if (f === "csv") {
      const { rows, delimiter: d } = parseCsv(input);
      setDelimiter(d);
      const cleaned = removeEmpty ? removeEmptyCsvRows(rows) : rows;
      setOutput(cleaned.map((r) => r.join(d)).join("\n"));
      setError(null);
    }
  }, [input, removeEmpty]);

  function runFormat() {
    if (format === "json") {
      const res = formatJson(input);
      if (res.error) {
        setError(res.error.message);
        setErrorLine(res.error.line);
        toast.error("JSON ไม่ถูกต้อง");
      } else {
        setOutput(res.output);
        toast.success("จัดรูปแบบแล้ว");
      }
    }
  }

  function runMinify() {
    const res = minifyJson(input);
    if (res.error) {
      setError(res.error.message);
      toast.error("Minify ไม่สำเร็จ");
    } else {
      setOutput(res.output);
      toast.success("ย่อแล้ว");
    }
  }

  function runValidate() {
    const res = validateJson(input);
    if (res.valid) {
      setError(null);
      toast.success("JSON ถูกต้อง");
    } else {
      setError(res.error?.message ?? "ไม่ถูกต้อง");
      setErrorLine(res.error?.line);
      toast.error("JSON ไม่ผ่าน");
    }
  }

  function runConvert() {
    if (format === "csv") {
      const res = csvToJson(input);
      if (res.error) toast.error(res.error.message);
      else {
        setOutput(res.output);
        setFormat("json");
        toast.success("แปลงเป็น JSON แล้ว");
      }
    } else {
      const res = jsonToCsv(input);
      if (res.error) toast.error(res.error.message);
      else {
        setOutput(res.output);
        setFormat("csv");
        toast.success("แปลงเป็น CSV แล้ว");
      }
    }
  }

  function copyOutput() {
    if (!output) return;
    void navigator.clipboard.writeText(output);
    toast.success("คัดลอกแล้ว");
  }

  function downloadOutput() {
    if (!output) return;
    const ext = format === "csv" ? "csv" : "json";
    const blob = new Blob([output], { type: "text/plain;charset=utf-8" });
    downloadBlob(blob, `solo-labs-data.${ext}`);
    toast.success("ดาวน์โหลดแล้ว");
  }

  const csvPreview = React.useMemo(() => {
    if (format !== "csv" || !input.trim()) return null;
    const { rows } = parseCsv(input, delimiter);
    return removeEmpty ? removeEmptyCsvRows(rows) : rows;
  }, [format, input, delimiter, removeEmpty]);

  const [mobilePane, setMobilePane] = React.useState<"input" | "output">("input");

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        setInput(text);
        toast.success("วางจากคลิปบอร์ดแล้ว");
      }
    } catch {
      toast.error("ไม่สามารถอ่านคลิปบอร์ดได้");
    }
  }

  const inspector = (
    <div className="space-y-4 min-w-0">
      <LabsInspectorSection title="ชนิดข้อมูล">
        <Badge variant="outline" className="text-xs">
          {format === "unknown" ? "ยังไม่ระบุ" : format.toUpperCase()}
        </Badge>
      </LabsInspectorSection>
      {format === "csv" && (
        <>
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="remove-empty" className="text-xs">
              ตัดแถวว่าง
            </Label>
            <Switch id="remove-empty" checked={removeEmpty} onCheckedChange={setRemoveEmpty} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">ตัวคั่น: {delimiter === "\t" ? "Tab" : delimiter}</p>
          </div>
        </>
      )}
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive">
          <div className="flex items-start gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <div>
              <p>{error}</p>
              {errorLine != null && (
                <p className="text-[10px] mt-1 opacity-80">บรรทัด {errorLine}</p>
              )}
            </div>
          </div>
        </div>
      )}
      {!error && output && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-600">
          <CheckCircle2 className="h-3.5 w-3.5" />
          พร้อมส่งออก
        </div>
      )}
    </div>
  );

  useLabsToolSetup({
    inspector,
    inspectorDeps: [format, error, errorLine, removeEmpty, delimiter, output],
    export: output
      ? { label: "ดาวน์โหลด", onExport: downloadOutput }
      : null,
    exportDeps: [Boolean(output), format],
    fileCount: input.trim() ? 1 : 0,
    lastAction: output ? "พร้อมดาวน์โหลด" : undefined,
  });

  if (!input.trim()) {
    return (
      <div className="space-y-3">
        <LabsWorkspaceEmpty
          icon={Braces}
          title="วาง JSON หรือ CSV"
          description="ตรวจ จัดรูปแบบ แปลง — ประมวลผลบนเครื่องคุณ"
          action={{
            label: "ใส่ตัวอย่าง JSON",
            icon: Sparkles,
            onClick: () => setInput(JSON_SAMPLE),
          }}
        />
        <div className="flex flex-wrap gap-2 justify-center">
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => void pasteFromClipboard()}>
            <ClipboardPaste className="h-3.5 w-3.5" />
            วางจากคลิปบอร์ด
          </Button>
          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setInput(CSV_SAMPLE)}>
            ตัวอย่าง CSV
          </Button>
        </div>
      </div>
    );
  }

  const toolbarItems = [
    { id: "format", label: "จัดรูปแบบ", onClick: runFormat },
    { id: "minify", label: "ย่อ", onClick: runMinify },
    { id: "validate", label: "ตรวจสอบ", onClick: runValidate },
    { id: "convert", label: format === "csv" ? "→ JSON" : "→ CSV", onClick: runConvert },
    { id: "copy", label: "คัดลอก", icon: Copy, onClick: copyOutput, variant: "outline" as const, disabled: !output },
    { id: "clear", label: "ล้าง", icon: Trash2, onClick: () => { setInput(""); setOutput(""); }, variant: "ghost" as const },
  ];

  const inputPane = (
    <div className="h-full flex flex-col min-h-[200px]">
      <p className="text-[10px] font-medium text-muted-foreground mb-1">ข้อมูลต้นทาง</p>
      <Textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="flex-1 min-h-[160px] font-mono text-xs resize-none"
        placeholder="วาง JSON หรือ CSV..."
      />
    </div>
  );

  const outputPane = (
    <div className="h-full flex flex-col min-h-[200px]">
      <p className="text-[10px] font-medium text-muted-foreground mb-1">ผลลัพธ์</p>
      {format === "csv" && csvPreview && csvPreview.length > 0 ? (
        <div className="flex-1 overflow-auto rounded border border-border/60 min-h-[160px]">
          <Table>
            <TableHeader>
              <TableRow>
                {csvPreview[0]?.map((h, i) => (
                  <TableHead key={i} className="text-[10px] h-8 whitespace-nowrap">
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {csvPreview.slice(1, 21).map((row, ri) => (
                <TableRow key={ri}>
                  {row.map((cell, ci) => (
                    <TableCell key={ci} className="text-[10px] py-1 whitespace-nowrap">
                      {cell}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <Textarea
          value={output}
          readOnly
          className="flex-1 min-h-[160px] font-mono text-xs resize-none bg-muted/20"
        />
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      <LabsToolToolbar items={toolbarItems} />

      <div className="md:hidden">
        <Tabs value={mobilePane} onValueChange={(v) => setMobilePane(v as "input" | "output")}>
          <TabsList className="w-full h-8">
            <TabsTrigger value="input" className="text-xs flex-1">ต้นทาง</TabsTrigger>
            <TabsTrigger value="output" className="text-xs flex-1">ผลลัพธ์</TabsTrigger>
          </TabsList>
          <TabsContent value="input" className="mt-2 rounded-lg border border-border p-2">
            {inputPane}
          </TabsContent>
          <TabsContent value="output" className="mt-2 rounded-lg border border-border p-2">
            {outputPane}
          </TabsContent>
        </Tabs>
      </div>

      <ResizablePanelGroup orientation="vertical" className="min-h-[320px] rounded-lg border border-border hidden md:flex">
        <ResizablePanel defaultSize={45} minSize={25}>
          <div className="h-full p-2">{inputPane}</div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={55} minSize={25}>
          <div className="h-full p-2">{outputPane}</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
