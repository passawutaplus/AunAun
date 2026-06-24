import * as React from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Building2, Loader2, Mail, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/auth/AuthProvider";
import { useSubscription } from "@/hooks/useSubscription";
import {
  useAcceptInhouseInvite,
  useCreateInhouseOrg,
  useMyInhouseOrgs,
  usePendingInhouseInvites,
} from "@/hooks/inhouse/useInhouseOrg";
import { useInhouseWorkspaces } from "@/hooks/inhouse/useInhouseWorkspace";
import { canCreateInhouseOrg, inhouseWorkspacePath } from "@/lib/inhouseAccess";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function OrgCard({ orgSlug, orgName, orgId }: { orgSlug: string; orgName: string; orgId: string }) {
  const { data: workspaces = [], isLoading } = useInhouseWorkspaces(orgId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="h-4 w-4" />
          {orgName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {workspaces.length === 0 ? (
          <p className="text-sm text-muted-foreground">ยังไม่มี workspace</p>
        ) : (
          workspaces.map((ws) => (
            <Link
              key={ws.id}
              to={inhouseWorkspacePath(orgSlug, ws.slug)}
              className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-muted"
            >
              <span>{ws.name}</span>
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function InhouseHomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tier } = useSubscription();
  const { data: orgs = [], isLoading } = useMyInhouseOrgs();
  const { data: pendingInvites = [] } = usePendingInhouseInvites();
  const acceptInvite = useAcceptInhouseInvite();
  const createOrg = useCreateInhouseOrg();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [orgName, setOrgName] = React.useState("");
  const [wsName, setWsName] = React.useState("General");

  const canCreate = canCreateInhouseOrg(tier);
  const ownedOrg = orgs.find((o) => o.owner_id === user?.id);

  const handleCreate = async () => {
    if (!orgName.trim()) return;
    try {
      const orgId = await createOrg.mutateAsync({
        name: orgName.trim(),
        workspaceName: wsName.trim() || "General",
      });
      toast.success("สร้าง In-House workspace สำเร็จ");
      setDialogOpen(false);
      setOrgName("");

      const [{ data: org }, { data: ws }] = await Promise.all([
        supabase.from("inhouse_orgs").select("slug").eq("id", orgId).maybeSingle(),
        supabase
          .from("inhouse_workspaces")
          .select("slug")
          .eq("org_id", orgId)
          .limit(1)
          .maybeSingle(),
      ]);
      if (org?.slug && ws?.slug) {
        navigate({ to: inhouseWorkspacePath(org.slug, ws.slug) });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "สร้างไม่สำเร็จ");
    }
  };

  const handleAcceptInvite = async (token: string) => {
    try {
      await acceptInvite.mutateAsync(token);
      toast.success("เข้าร่วมทีมแล้ว");
      navigate({ to: "/inhouse" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "รับคำเชิญไม่สำเร็จ");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">In-House Co-working</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            พื้นที่ทำงานร่วมกันสำหรับทีม — Kanban, To-do, Chat และ Monitor
          </p>
        </div>
        <Link to="/dashboard" className="shrink-0 text-sm text-primary underline">
          ← My Desk
        </Link>
      </div>

      {pendingInvites.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="h-4 w-4" />
              คำเชิญรอตอบรับ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingInvites.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">{inv.org_name}</p>
                  <p className="text-xs capitalize text-muted-foreground">บทบาท: {inv.role}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleAcceptInvite(inv.token)}
                  disabled={acceptInvite.isPending}
                >
                  ยอมรับ
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {canCreate && !ownedOrg && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <Building2 className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium">ตั้งค่า In-House Workspace</p>
              <p className="mt-1 text-sm text-muted-foreground">
                สร้าง org ของทีมและ workspace แรกเพื่อเริ่มเชิญสมาชิก
              </p>
            </div>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              สร้าง Workspace
            </Button>
          </CardContent>
        </Card>
      )}

      {!canCreate && orgs.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            คุณยังไม่ได้อยู่ใน In-House workspace — รอรับคำเชิญจาก owner หรือ{" "}
            <Link to="/pricing" className="text-primary underline">
              อัปเกรด In-House
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {orgs.map((org) => (
          <OrgCard key={org.id} orgId={org.id} orgSlug={org.slug} orgName={org.name} />
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>สร้าง In-House Org</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="org-name">ชื่อทีม / บริษัท</Label>
              <Input
                id="org-name"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="เช่น Studio ABC"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ws-name">Workspace แรก</Label>
              <Input
                id="ws-name"
                value={wsName}
                onChange={(e) => setWsName(e.target.value)}
                placeholder="General"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleCreate} disabled={createOrg.isPending || !orgName.trim()}>
              {createOrg.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "สร้าง"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
