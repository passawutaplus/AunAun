import { Box, Loader2 } from "lucide-react";
import ObjectCard from "@/components/objects/ObjectCard";
import EmptyState from "@/components/ui/EmptyState";
import { useOwnerPublishedObjects } from "@/hooks/useCreatorObjects";
import { isObjectsTableMissing } from "@/lib/objects/db";

type Props = {
  ownerId: string;
};

/** Public profile listing. Sold-out editions stay here even when the shop hides them. */
export default function ProfileObjectsSection({ ownerId }: Props) {
  const { data = [], isLoading, isError, error } = useOwnerPublishedObjects(ownerId);
  const missingTable = isError && isObjectsTableMissing(error);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        กำลังโหลด Objects...
      </div>
    );
  }

  if (isError && !missingTable) {
    return (
      <EmptyState
        icon={Box}
        title="โหลด Objects ไม่สำเร็จ"
        description="ลองใหม่อีกครั้ง"
      />
    );
  }

  if (missingTable || data.length === 0) {
    return (
      <EmptyState
        icon={Box}
        title="ยังไม่มี Objects ที่เผยแพร่"
        description="ของที่ลงขายและของที่ขายหมดแล้วจะอยู่ที่นี่"
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-x-3 gap-y-8 min-[520px]:grid-cols-2 lg:grid-cols-3">
      {data.map((item) => (
        <ObjectCard key={item.id} item={item} />
      ))}
    </div>
  );
}
