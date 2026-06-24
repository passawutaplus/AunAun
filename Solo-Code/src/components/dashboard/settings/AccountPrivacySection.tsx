import * as React from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Download, Loader2, Shield, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { deleteOwnAccount, exportUserData } from "@/server/account.functions";
import { toast } from "sonner";

type Props = {
  onSignOut?: () => void | Promise<void>;
};

export function AccountPrivacySection({ onSignOut }: Props) {
  const exportFn = useServerFn(exportUserData);
  const deleteFn = useServerFn(deleteOwnAccount);
  const [exporting, setExporting] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [confirmText, setConfirmText] = React.useState("");
  const [advancedOpen, setAdvancedOpen] = React.useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const data = await exportFn();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `so1o-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("ดาวน์โหลดข้อมูลแล้ว");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ส่งออกข้อมูลไม่สำเร็จ");
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete() {
    if (confirmText !== "DELETE") {
      toast.error('พิมพ์ "DELETE" ให้ตรงก่อนยืนยัน');
      return;
    }
    setDeleting(true);
    try {
      const res = await deleteFn({ data: { confirm: "DELETE" } });
      if (!res.ok) throw new Error(res.error);
      toast.success(res.message ?? "ปิดบัญชีแล้ว");
      await onSignOut?.();
      window.location.href = "/";
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ลบบัญชีไม่สำเร็จ");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card className="border-border/40">
      <CardContent className="p-5 space-y-3">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
            <Shield className="h-4 w-4" />
            ความเป็นส่วนตัว (PDPA)
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            สิทธิของคุณตาม PDPA — ส่งออกข้อมูลส่วนบุคคล
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleExport}
            disabled={exporting}
            className="gap-1.5"
          >
            {exporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            ดาวน์โหลดข้อมูลของฉัน
          </Button>
          <Button asChild size="sm" variant="ghost" className="text-muted-foreground">
            <Link to="/privacy">นโยบาย PDPA</Link>
          </Button>
        </div>

        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors pt-1"
            >
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${advancedOpen ? "rotate-180" : ""}`}
              />
              ตัวเลือกขั้นสูง
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 space-y-2">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              การลบบัญชีจะปิดการใช้งานทันที และลบข้อมูลถาวรภายใน 30 วัน หากมีแผน Pro ที่ active
              กรุณายกเลิก subscription ในหน้าจัดการการชำระเงินก่อน
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 text-[11px] text-muted-foreground hover:text-destructive px-2"
                >
                  ลบบัญชีถาวร…
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>ยืนยันการลบบัญชี?</AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-3 text-sm">
                      <p>
                        การกระทำนี้ไม่สามารถย้อนกลับได้ ข้อมูลงาน ลูกค้า
                        และใบเสนอราคาจะถูกลบตามนโยบาย
                      </p>
                      <p>
                        พิมพ์ <strong className="font-mono text-foreground">DELETE</strong>{" "}
                        เพื่อยืนยัน
                      </p>
                      <Input
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder="DELETE"
                        className="font-mono"
                        autoComplete="off"
                      />
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setConfirmText("")}>ยกเลิก</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault();
                      void handleDelete();
                    }}
                    disabled={deleting || confirmText !== "DELETE"}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    {deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    ลบบัญชี
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
