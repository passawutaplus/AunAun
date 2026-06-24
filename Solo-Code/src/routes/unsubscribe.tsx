import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/unsubscribe")({
  component: UnsubscribePage,
  head: () => ({
    meta: [{ title: "ยกเลิกการรับอีเมล — So1o" }, { name: "robots", content: "noindex" }],
  }),
});

function UnsubscribePage() {
  const [state, setState] = React.useState<
    "checking" | "valid" | "already" | "invalid" | "done" | "error"
  >("checking");
  const [loading, setLoading] = React.useState(false);

  const token = React.useMemo(() => {
    if (typeof window === "undefined") return null;
    return new URL(window.location.href).searchParams.get("token");
  }, []);

  React.useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    fetch(`/email/unsubscribe?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) return setState("invalid");
        if (data.valid) setState("valid");
        else if (data.reason === "already_unsubscribed") setState("already");
        else setState("invalid");
      })
      .catch(() => setState("error"));
  }, [token]);

  const handleConfirm = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch("/email/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.success) setState("done");
      else if (data.reason === "already_unsubscribed") setState("already");
      else throw new Error("failed");
    } catch {
      toast.error("ไม่สามารถยกเลิกได้ ลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="max-w-md w-full p-8 text-center space-y-4">
        {state === "checking" && (
          <>
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">กำลังตรวจสอบ…</p>
          </>
        )}
        {state === "valid" && (
          <>
            <h1 className="text-2xl font-bold">ยืนยันการยกเลิก?</h1>
            <p className="text-sm text-muted-foreground">
              คุณจะไม่ได้รับอีเมลแจ้งเตือนจาก So1o อีก (ยกเว้นอีเมลความปลอดภัยบัญชี)
            </p>
            <Button onClick={handleConfirm} disabled={loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "ยืนยันยกเลิก"}
            </Button>
          </>
        )}
        {state === "done" && (
          <>
            <h1 className="text-2xl font-bold">✓ ยกเลิกสำเร็จ</h1>
            <p className="text-sm text-muted-foreground">เราจะไม่ส่งอีเมลให้คุณอีก</p>
            <Button asChild variant="outline">
              <Link to="/">กลับหน้าหลัก</Link>
            </Button>
          </>
        )}
        {state === "already" && (
          <>
            <h1 className="text-2xl font-bold">คุณยกเลิกไปแล้ว</h1>
            <p className="text-sm text-muted-foreground">อีเมลนี้ถูกถอนสมัครจากระบบไปก่อนหน้านี้</p>
            <Button asChild variant="outline">
              <Link to="/">กลับหน้าหลัก</Link>
            </Button>
          </>
        )}
        {(state === "invalid" || state === "error") && (
          <>
            <h1 className="text-2xl font-bold">ลิงก์ไม่ถูกต้อง</h1>
            <p className="text-sm text-muted-foreground">ลิงก์ยกเลิกอาจหมดอายุหรือถูกใช้ไปแล้ว</p>
            <Button asChild variant="outline">
              <Link to="/">กลับหน้าหลัก</Link>
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
