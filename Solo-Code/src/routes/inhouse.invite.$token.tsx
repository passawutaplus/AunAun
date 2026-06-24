import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RouteError } from "@/components/RouteError";
import { RequireAuth } from "@/auth/RequireAuth";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useAcceptInhouseInvite } from "@/hooks/inhouse/useInhouseOrg";
import { toast } from "sonner";
import * as React from "react";

export const Route = createFileRoute("/inhouse/invite/$token")({
  errorComponent: ({ error }) => <RouteError error={error} />,
  component: () => (
    <RequireAuth>
      <InviteAcceptPage />
    </RequireAuth>
  ),
});

function InviteAcceptPage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const accept = useAcceptInhouseInvite();
  const [done, setDone] = React.useState(false);

  const handleAccept = async () => {
    try {
      await accept.mutateAsync(token);
      setDone(true);
      toast.success("เข้าร่วมทีมสำเร็จ");
      navigate({ to: "/inhouse" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "รับคำเชิญไม่สำเร็จ");
    }
  };

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
      <Toaster />
      <h1 className="text-xl font-semibold">คำเชิญ In-House</h1>
      <p className="max-w-md text-center text-sm text-muted-foreground">
        คุณได้รับเชิญเข้าร่วม workspace ทีม — กดยอมรับเพื่อเริ่มทำงานร่วมกัน
      </p>
      <Button onClick={handleAccept} disabled={accept.isPending || done}>
        {accept.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "ยอมรับคำเชิญ"}
      </Button>
    </div>
  );
}
