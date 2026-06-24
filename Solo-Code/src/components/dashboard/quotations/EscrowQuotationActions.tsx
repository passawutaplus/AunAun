import { ShieldCheck, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  escrowPayUrl,
  useCreateEscrowFromQuotation,
  useMyEscrows,
} from "@/hooks/useMarketplaceEscrow";
import { computeTotals, type Quotation } from "@/store/quotations";
import { toast } from "sonner";

type Props = {
  quotation: Quotation;
};

export function EscrowQuotationActions({ quotation }: Props) {
  const create = useCreateEscrowFromQuotation();
  const { data: escrows = [] } = useMyEscrows();
  const existing = escrows.find((e) => e.quotation_id === quotation.id);
  const grandTotal = Math.round(computeTotals(quotation).grandTotal);

  const copyLink = (token: string) => {
    const url = escrowPayUrl(token);
    void navigator.clipboard?.writeText(url).then(
      () => toast.success("คัดลอกลิงก์แล้ว"),
      () => toast.error("คัดลอกไม่สำเร็จ"),
    );
  };

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Escrow — เก็บเงินลูกค้า (ทางเลือก)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground text-xs">
          ลูกค้าจ่าย ฿{grandTotal.toLocaleString("th-TH")} · เงินพักในระบบจนอนุมัติงาน · ค่าธรรมเนียม Free 5% / Pro 2.5%
        </p>
        <p className="text-muted-foreground text-[11px]">
          Escrow เป็นทางเลือกเพื่อความมั่นใจ — โอนตรงหรือ Job Tracker ไม่ผ่านเรา แพลตฟอร์มไม่รับประกันการคืนเงิน
        </p>
        {existing ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs rounded-full bg-muted px-2 py-1">{existing.status}</span>
            <Button type="button" size="sm" variant="outline" onClick={() => copyLink(existing.portal_token)}>
              <Copy className="h-3.5 w-3.5 mr-1" />
              คัดลอกลิงก์ชำระ
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            size="sm"
            disabled={create.isPending || grandTotal <= 0}
            onClick={() =>
              create.mutate({ quotationId: quotation.id, amountThb: grandTotal })
            }
          >
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            สร้างลิงก์ Escrow
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
