import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { ForumPageHeader } from "@/components/forum/ForumLayout";
import { ForumTopicRow } from "@/components/forum/ForumTopicRow";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForumSearch } from "@/hooks/useForum";

export default function ForumSearchPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const initial = params.get("q") ?? "";
  const [q, setQ] = useState(initial);
  const { data: topics = [], isLoading, isFetching } = useForumSearch(initial);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    if (term.length < 2) return;
    navigate(`/forum/search?q=${encodeURIComponent(term)}`);
  };

  return (
    <>
      <ForumPageHeader
        title="ค้นหา"
        subtitle={initial ? `ผลลัพธ์สำหรับ “${initial}”` : "พิมพ์คำค้นอย่างน้อย 2 ตัวอักษร"}
      />
      <form onSubmit={submit} className="mb-6 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
            placeholder="ค้นหัวข้อหรือเนื้อหา…"
          />
        </div>
        <Button type="submit">ค้นหา</Button>
      </form>

      {initial.length < 2 ? (
        <p className="text-sm text-muted-foreground">เริ่มพิมพ์เพื่อค้นหา</p>
      ) : isLoading || isFetching ? (
        <p className="text-sm text-muted-foreground py-6">กำลังค้นหา…</p>
      ) : topics.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6">ไม่พบผลลัพธ์</p>
      ) : (
        <div>
          {topics.map((t) => (
            <ForumTopicRow key={t.id} topic={t} />
          ))}
        </div>
      )}
    </>
  );
}
