import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SectionHeader from "@/components/admin/SectionHeader";
import DataTable, { type Column } from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Row = {
  id: string;
  author_id: string;
  post_kind: string;
  title: string;
  status: string;
  reply_count: number;
  created_at: string;
};

export default function AdminCommunityPage() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin", "community-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_posts")
        .select("id, author_id, post_kind, title, status, reply_count, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const hide = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("community_posts").update({ status: "hidden" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "community-posts"] });
      toast.success("ซ่อนโพสต์แล้ว");
    },
  });

  const cols: Column<Row>[] = [
    { key: "title", header: "หัวข้อ", render: (r) => r.title },
    { key: "kind", header: "ประเภท", render: (r) => r.post_kind },
    { key: "status", header: "สถานะ", render: (r) => r.status },
    { key: "replies", header: "ตอบ", render: (r) => String(r.reply_count) },
    {
      key: "actions",
      header: "",
      render: (r) =>
        r.status === "published" ? (
          <Button size="sm" variant="outline" onClick={() => hide.mutate(r.id)}>ซ่อน</Button>
        ) : null,
    },
  ];

  return (
    <div>
      <SectionHeader title="โพสต์ชุมชน" description="Tips / Q&A ในฟีด" />
      <DataTable columns={cols} rows={data} loading={isLoading} rowKey={(r) => r.id} />
    </div>
  );
}
