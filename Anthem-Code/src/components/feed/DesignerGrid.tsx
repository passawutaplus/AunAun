import { useMemo } from "react";
import { SearchX } from "lucide-react";
import { useDesigners, type DesignerCardData } from "@/hooks/useDesigners";
import DesignerCard from "./DesignerCard";
import { StaggerGrid } from "@/components/motion/StaggerGrid";
import { fuzzyMatchAll } from "@/lib/fuzzyMatch";
import type { DesignerSort } from "./DesignerToolbar";
import EmptyState from "@/components/ui/EmptyState";

interface Props {
  onHire: (recipientId: string, recipientName: string) => void;
  onCollab: (recipientId: string, recipientName: string) => void;
  search?: string;
  sort?: DesignerSort;
  categories?: string[];
  tools?: string[];
}

const scoreSort = (d: DesignerCardData, sort: DesignerSort): number => {
  switch (sort) {
    case "projects": return d.projects.length;
    case "views": return d.projects.reduce((s, p) => s + (p.views ?? 0), 0);
    case "newest":
    default: {
      const t = d.projects[0]?.created_at ?? (d.profile as any).updated_at ?? "";
      return t ? new Date(t).getTime() : 0;
    }
  }
};

const DesignerGrid = ({
  onHire, onCollab, search = "", sort = "newest",
  categories = [], tools = [],
}: Props) => {
  const { data = [], isLoading } = useDesigners();

  const filtered = useMemo(() => {
    let rows = data;

    if (search.trim()) {
      rows = rows.filter((d) => fuzzyMatchAll(search, d.searchHaystack));
    }
    if (categories.length > 0) {
      const set = new Set(categories.map((c) => c.toLowerCase()));
      rows = rows.filter((d) =>
        d.projects.some((p) => p.category && set.has(p.category.toLowerCase()))
      );
    }
    if (tools.length > 0) {
      const set = new Set(tools.map((t) => t.toLowerCase()));
      rows = rows.filter((d) =>
        d.projects.some((p) => (p.tools ?? []).some((t) => set.has(t.toLowerCase())))
      );
    }

    return [...rows].sort((a, b) => scoreSort(b, sort) - scoreSort(a, sort));
  }, [data, search, categories, tools, sort]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-64 rounded-2xl glass-panel animate-pulse" />
        ))}
      </div>
    );
  }

  if (!filtered.length) {
    return (
      <EmptyState
        icon={SearchX}
        title={search ? "ไม่พบดีไซเนอร์" : "ยังไม่มีดีไซเนอร์ในฟีด"}
        description={
          search
            ? `ลองคำอื่น เช่น logo, ux, branding — ไม่มีผลลัพธ์สำหรับ "${search}"`
            : "เมื่อมีครีเอเตอร์เผยแพร่ผลงาน รายชื่อจะปรากฏที่นี่"
        }
      />
    );
  }

  return (
    <StaggerGrid className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
      {filtered.map((d) => (
        <DesignerCard key={d.profile.id} data={d} onHire={onHire} onCollab={onCollab} search={search} />
      ))}
    </StaggerGrid>
  );
};

export default DesignerGrid;
