import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import RequireAuth from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, FileSignature, Plus, Trash2, Crown, Loader2, FileText,
} from "lucide-react";
import { toast } from "sonner";

interface ContractRow {
  id: string;
  title: string;
  type: "project" | "fulltime";
  status: "draft" | "finalized";
  created_at: string;
  updated_at: string;
}

const ContractsListInner = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["contracts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("id,title,type,status,created_at,updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ContractRow[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contracts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("ลบแล้ว");
      qc.invalidateQueries({ queryKey: ["contracts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/40 backdrop-blur-md bg-background/60 sticky top-0 z-20">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 min-w-0">
              <FileSignature className="h-5 w-5 text-primary" />
              <h1 className="font-semibold tracking-tight">ร่างสัญญาของฉัน</h1>
              <Badge variant="outline" className="gap-1 text-[10px] border-primary/30 text-primary">
                <Crown className="h-3 w-3" /> PRO
              </Badge>
            </div>
          </div>
          <Button asChild size="sm" className="gap-1.5 bg-primary hover:bg-primary/90">
            <Link to="/contracts/new">
              <Plus className="h-4 w-4" /> สร้างใหม่
            </Link>
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-3xl">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border/60 rounded-xl">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground mb-4">ยังไม่มีร่างสัญญา</p>
            <Button asChild className="gap-1.5">
              <Link to="/contracts/new">
                <Plus className="h-4 w-4" /> สร้างร่างแรกของคุณ
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/40 hover:bg-card/60 px-4 py-3 transition"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{r.title}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {r.type === "project" ? "Freelance" : "Full-time"}
                    </Badge>
                    <Badge variant={r.status === "finalized" ? "default" : "secondary"} className="text-[10px]">
                      {r.status === "finalized" ? "เสร็จสมบูรณ์" : "ร่าง"}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    อัปเดต {new Date(r.updated_at).toLocaleString("th-TH")}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (confirm("ลบร่างนี้?")) del.mutate(r.id);
                  }}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default function ContractsListPage() {
  return (
    <RequireAuth>
      <ContractsListInner />
    </RequireAuth>
  );
}
