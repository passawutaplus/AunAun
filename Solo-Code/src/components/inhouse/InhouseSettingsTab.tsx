import * as React from "react";
import { Copy, Loader2, Plus, Trash2, UserPlus } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  useCreateInhouseInvite,
  useInhouseInvites,
  useInhouseOrgMembers,
  useRemoveInhouseMember,
  useUpdateInhouseOrg,
} from "@/hooks/inhouse/useInhouseOrg";
import {
  useArchiveInhouseWorkspace,
  useCreateInhouseWorkspace,
  useInhouseWorkspaces,
  useUpdateInhouseWorkspace,
} from "@/hooks/inhouse/useInhouseWorkspace";
import type { InhouseOrg } from "@/lib/inhouse/types";
import { toast } from "sonner";
import { InhouseSharedAssetsCard } from "@/components/inhouse/InhousePhase2Extras";
import { InhouseDocumentBrandingSection } from "@/components/inhouse/InhouseDocumentBrandingSection";
import { useAuth } from "@/auth/AuthProvider";

interface Props {
  org: InhouseOrg;
}

export function InhouseSettingsTab({ org }: Props) {
  const { user } = useAuth();
  const { data: members = [] } = useInhouseOrgMembers(org.id);
  const { data: workspaces = [] } = useInhouseWorkspaces(org.id);
  const { data: invites = [] } = useInhouseInvites(org.id);
  const updateOrg = useUpdateInhouseOrg();
  const createInvite = useCreateInhouseInvite();
  const removeMember = useRemoveInhouseMember();
  const createWorkspace = useCreateInhouseWorkspace();
  const updateWorkspace = useUpdateInhouseWorkspace();
  const archiveWorkspace = useArchiveInhouseWorkspace();

  const [orgName, setOrgName] = React.useState(org.name);
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState<string>("member");
  const [lastInviteUrl, setLastInviteUrl] = React.useState("");
  const [wsOpen, setWsOpen] = React.useState(false);
  const [newWsName, setNewWsName] = React.useState("");

  React.useEffect(() => {
    setOrgName(org.name);
  }, [org.name]);

  const activeMembers = members.filter((m) => m.status === "active");
  const myMember = members.find((m) => m.user_id === user?.id);
  const canEditBranding = myMember?.role === "owner" || myMember?.role === "admin";

  const saveOrgName = async () => {
    try {
      await updateOrg.mutateAsync({ id: org.id, name: orgName.trim() });
      toast.success("บันทึกแล้ว");
    } catch {
      toast.error("บันทึกไม่สำเร็จ");
    }
  };

  const handleInvite = async () => {
    try {
      const inv = (await createInvite.mutateAsync({
        orgId: org.id,
        email: inviteEmail.trim() || undefined,
        role: inviteRole as "member" | "admin" | "viewer",
        workspaceIds: workspaces.map((w) => w.id),
      })) as { token: string };
      const url = `${window.location.origin}/inhouse/invite/${inv.token}`;
      setLastInviteUrl(url);
      await navigator.clipboard.writeText(url);
      toast.success("คัดลอกลิงก์เชิญแล้ว");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "เชิญไม่สำเร็จ");
    }
  };

  const handleCreateWs = async () => {
    if (!newWsName.trim()) return;
    try {
      await createWorkspace.mutateAsync({ orgId: org.id, name: newWsName.trim() });
      setNewWsName("");
      setWsOpen(false);
      toast.success("สร้าง workspace แล้ว");
    } catch {
      toast.error("สร้างไม่สำเร็จ");
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-xl font-semibold">In-House Settings</h1>
        <p className="text-sm text-muted-foreground">{org.name}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">องค์กร</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>ชื่อทีม</Label>
            <div className="flex gap-2">
              <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} />
              <Button onClick={saveOrgName} disabled={updateOrg.isPending}>
                บันทึก
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Seats: {activeMembers.length} / {org.seat_limit} ·{" "}
            <Link to="/dashboard" search={{ tab: "settings" }} className="text-primary underline">
              จัดการ Subscription
            </Link>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">สมาชิก</CardTitle>
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <UserPlus className="mr-1 h-4 w-4" />
            เชิญ
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {activeMembers.map((m) => (
            <div key={m.id} className="flex items-center gap-2 rounded-lg border px-3 py-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={m.profile?.avatar_url ?? undefined} />
                <AvatarFallback>{(m.profile?.display_name ?? "?").slice(0, 1)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{m.profile?.display_name ?? m.profile?.email}</p>
                <Badge variant="secondary" className="text-[10px] capitalize">
                  {m.role}
                </Badge>
              </div>
              {m.role !== "owner" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={async () => {
                    try {
                      await removeMember.mutateAsync({ memberId: m.id, orgId: org.id });
                      toast.success("นำออกจากทีมแล้ว");
                    } catch {
                      toast.error("ลบไม่สำเร็จ");
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          {invites.length > 0 && (
            <p className="pt-2 text-xs text-muted-foreground">{invites.length} คำเชิญรอตอบรับ</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Workspaces</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setWsOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            ใหม่
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {workspaces.map((ws) => (
            <div key={ws.id} className="flex items-center gap-2 rounded-lg border px-3 py-2">
              <Input
                defaultValue={ws.name}
                className="h-8"
                onBlur={async (e) => {
                  const v = e.target.value.trim();
                  if (v && v !== ws.name) {
                    await updateWorkspace.mutateAsync({ id: ws.id, orgId: org.id, name: v });
                  }
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={async () => {
                  if (confirm("Archive workspace นี้?")) {
                    await archiveWorkspace.mutateAsync({ id: ws.id, orgId: org.id });
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เชิญสมาชิก</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>อีเมล (ไม่บังคับ)</Label>
              <Input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="member@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>บทบาท</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {lastInviteUrl && (
              <div className="flex items-center gap-2 rounded-lg bg-muted p-2 text-xs break-all">
                {lastInviteUrl}
                <Button
                  size="icon"
                  variant="ghost"
                  className="shrink-0"
                  onClick={() => navigator.clipboard.writeText(lastInviteUrl)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              ปิด
            </Button>
            <Button onClick={handleInvite} disabled={createInvite.isPending}>
              {createInvite.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "สร้างลิงก์เชิญ"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={wsOpen} onOpenChange={setWsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Workspace ใหม่</DialogTitle>
          </DialogHeader>
          <Input
            value={newWsName}
            onChange={(e) => setNewWsName(e.target.value)}
            placeholder="ชื่อโปรเจกต์"
          />
          <DialogFooter>
            <Button onClick={handleCreateWs} disabled={createWorkspace.isPending}>
              สร้าง
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InhouseDocumentBrandingSection org={org} canEdit={canEditBranding} />

      <InhouseSharedAssetsCard />
    </div>
  );
}
