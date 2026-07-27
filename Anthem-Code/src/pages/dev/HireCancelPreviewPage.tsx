import { useState } from "react";
import { Link } from "react-router-dom";
import SeoHead from "@/components/SeoHead";
import HireCancelRequestDialog from "@/components/hiring/HireCancelRequestDialog";
import { Button } from "@/components/ui/button";
import { BRAND_NAME } from "@/lib/brandConfig";
import type { HireCancelInitiatedBy } from "@/lib/hireCancelRequest";
import { toast } from "sonner";

/** Temporary UI preview — open cancel popup without a real hire order. */
export default function HireCancelPreviewPage() {
  const [open, setOpen] = useState(true);
  const [role, setRole] = useState<HireCancelInitiatedBy>("client");

  const openAs = (next: HireCancelInitiatedBy) => {
    setRole(next);
    setOpen(true);
  };

  return (
    <main className="min-h-screen bg-app-ambient px-4 py-12">
      <SeoHead
        path="/dev/hire-cancel"
        title={`พรีวิวขอยกเลิกงาน · ${BRAND_NAME}`}
        description="ดู popup ขอยกเลิกงานจ้าง โดยไม่ต้องมีออเดอร์จริง"
      />
      <div className="mx-auto max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <h1 className="thai-display text-2xl font-semibold">พรีวิวขอยกเลิกงาน</h1>
          <p className="text-sm text-muted-foreground">
            โหมดเดโม่ — กดเปิด popup ได้ทันที ไม่บันทึกข้อมูล · เทียบกับ flow จริงในแชทออเดอร์
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button type="button" className="rounded-full" onClick={() => openAs("client")}>
            เปิดแบบผู้จ้าง
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={() => openAs("freelancer")}
          >
            เปิดแบบฟรีแลนซ์
          </Button>
          <Button type="button" variant="ghost" className="rounded-full" asChild>
            <Link to="/">กลับหน้าแรก</Link>
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          ตอนนี้: {role === "client" ? "ผู้จ้าง" : "ฟรีแลนซ์"} ·{" "}
          {open ? "popup เปิดอยู่" : "ปิดแล้ว — กดปุ่มด้านบนเพื่อเปิดใหม่"}
        </p>
      </div>

      <HireCancelRequestDialog
        open={open}
        onOpenChange={setOpen}
        mode="create"
        initiatedBy={role}
        orderAmountThb={2500}
        defaultContactPhone="0812345678"
        defaultContactEmail="demo@example.com"
        onSubmit={async () => {
          toast.message("พรีวิวเท่านั้น — ไม่ได้ส่งคำขอยกเลิกจริง");
          setOpen(false);
        }}
      />
    </main>
  );
}
