import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";
import { buildContractClausesForQuotation, buildContractDocument } from "@/lib/contractTemplates";
import type { UsageRightsInput } from "@/lib/usageRightsSchema";
import type { Quotation } from "@/store/quotations";
import { EsignDisclaimer } from "@/components/legal/EsignDisclaimer";

export function ContractSignDialog({
  open,
  onOpenChange,
  quotation,
  usageRights,
  onSigned,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  quotation: Quotation;
  usageRights?: UsageRightsInput;
  onSigned?: () => void;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [agreed, setAgreed] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const clauses = buildContractClausesForQuotation(quotation, usageRights);
  const body = buildContractDocument(quotation, clauses, usageRights);

  React.useEffect(() => {
    if (!open) setAgreed(false);
  }, [open]);

  const sign = async () => {
    if (!agreed || !user || saving) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      let signerIp: string | null = null;
      try {
        const res = await fetch("https://api.ipify.org?format=json", {
          signal: AbortSignal.timeout(3000),
        });
        if (res.ok) {
          const json = (await res.json()) as { ip?: string };
          signerIp = json.ip ?? null;
        }
      } catch {
        /* best-effort */
      }
      const { error } = await supabase
        .from("quotations")
        .update({
          contract_signed_at: now,
          contract_accepted: true,
          contract_signer_ip: signerIp,
        } as never)
        .eq("id", quotation.id);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["quotations", user.id] });
      toast.success("บันทึกการยืนยันสัญญาแล้ว — สามารถเริ่ม Job Tracker ได้");
      onOpenChange(false);
      onSigned?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "บันทึกสัญญาไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>สัญญาจ้าง — {quotation.projectName}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 max-h-[50vh] rounded-lg border p-3 bg-muted/30">
          <pre className="text-xs whitespace-pre-wrap font-sans text-foreground">{body}</pre>
        </ScrollArea>
        <ul className="text-[11px] text-muted-foreground space-y-1">
          {clauses.map((c) => (
            <li key={c.id}>• {c.title}</li>
          ))}
        </ul>
        <EsignDisclaimer variant="freelancer" />
        <label className="flex items-start gap-2 text-sm cursor-pointer">
          <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(!!v)} />
          <span>ยืนยันว่าลูกค้าและผู้รับจ้างตกลงตามข้อความด้านบน (บันทึก timestamp)</span>
        </label>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ยกเลิก
          </Button>
          <Button
            disabled={!agreed || saving}
            onClick={sign}
            className="text-white"
            style={{ background: "#FF5F05" }}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            ยืนยันสัญญา
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
