import { useMyPendingFormationInvites, useRespondFormationInvite } from "@/hooks/useStudioFormation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Building2, Check, X, Loader2 } from "lucide-react";
import RequireAuth from "@/components/RequireAuth";

const StudioInvitesInner = () => {
  const { data: invites = [], isLoading } = useMyPendingFormationInvites();
  const respond = useRespondFormationInvite();

  return (
    <div className="min-h-screen bg-app-ambient pb-24 lg:pb-12">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
        <div className="flex items-center gap-3">
          <Building2 className="w-7 h-7 text-primary shrink-0" />
          <div>
            <h1 className="text-2xl font-medium tracking-tight thai-display">คำเชิญร่วม Studio</h1>
            <p className="text-sm text-muted-foreground thai-body">
              ตอบรับเพื่อร่วมก่อตั้งสตูดิโอ — ต้องตอบรับครบทุกคนถึงสร้างสำเร็จ
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-6 h-6 animate-spin inline text-muted-foreground" />
          </div>
        ) : invites.length === 0 ? (
          <div className="glass-panel rounded-2xl text-center py-12">
            <p className="text-muted-foreground">ยังไม่มีคำเชิญใหม่</p>
          </div>
        ) : (
          invites.map(({ request, founder, invites: all }) => {
            const accepted = all.filter((i) => i.status === "accepted").length;
            const total = all.length;
            return (
              <div key={request.id} className="glass-panel rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={(founder as any)?.avatar_url ?? undefined} />
                    <AvatarFallback>{(founder as any)?.display_name?.[0] ?? "?"}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      <span className="text-foreground font-medium">{(founder as any)?.display_name}</span> เชิญคุณร่วมตั้ง
                    </p>
                    <p className="text-lg font-medium tracking-tight">{request.proposed_name}</p>
                    {request.proposed_tagline && (
                      <p className="text-xs text-muted-foreground">{request.proposed_tagline}</p>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                    <span>สมาชิกที่ตอบรับ</span>
                    <span>
                      {accepted}/{total} คนตอบรับแล้ว
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {all.map((i: any) => (
                      <div
                        key={i.invitee_id}
                        className={`flex items-center gap-2 pl-1 pr-2 py-1 rounded-full text-xs ${
                          i.status === "accepted"
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                            : i.status === "declined"
                            ? "bg-destructive/10 text-destructive"
                            : "glass-chip"
                        }`}
                      >
                        <Avatar className="w-5 h-5">
                          <AvatarImage src={i.profile?.avatar_url ?? undefined} />
                          <AvatarFallback>{i.profile?.display_name?.[0] ?? "?"}</AvatarFallback>
                        </Avatar>
                        <span>{i.profile?.display_name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    disabled={respond.isPending}
                    onClick={() => respond.mutate({ formationId: request.id, accept: false })}
                    className="rounded-xl"
                  >
                    <X className="w-4 h-4 mr-1.5" /> ปฏิเสธ
                  </Button>
                  <Button
                    disabled={respond.isPending}
                    onClick={() => respond.mutate({ formationId: request.id, accept: true })}
                    className="flex-1 rounded-xl bg-gradient-brand text-white border-0"
                  >
                    <Check className="w-4 h-4 mr-1.5" /> ตอบรับ
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

const StudioInvitesPage = () => (
  <RequireAuth>
    <StudioInvitesInner />
  </RequireAuth>
);

export default StudioInvitesPage;
