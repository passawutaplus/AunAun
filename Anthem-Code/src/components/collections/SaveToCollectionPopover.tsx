import { useState } from "react";
import { Layers3, Plus, Check, Lock } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CompactLoader } from "@/components/ui/BanterLoader";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { mapWriteFlowError } from "@/lib/writeFlowErrors";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useAuthDialog } from "@/stores/authDialogStore";
import {
  useCollections,
  useProjectCollectionIds,
  useToggleCollectionItem,
} from "@/hooks/useCollections";
import CollectionFormDialog from "./CollectionFormDialog";

interface Props {
  projectId: string | undefined;
  /** Trigger element. Pass `triggerAsChild` button content; else uses default icon button. */
  children?: React.ReactNode;
  /** className applied to default trigger */
  triggerClassName?: string;
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
}

const SaveToCollectionPopover = ({ projectId, children, triggerClassName, align = "end", side = "bottom" }: Props) => {
  const { user } = useAuth();
  const openAuth = useAuthDialog((s) => s.openSignup);
  const [open, setOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const enabled = open && !!user?.id && !!projectId;
  const {
    data: collections = [],
    isLoading: collectionsLoading,
    isError: collectionsError,
    refetch: refetchCollections,
  } = useCollections(enabled ? user?.id : undefined);
  const { data: activeIds = [] } = useProjectCollectionIds(
    enabled ? projectId : undefined,
    enabled ? user?.id : undefined,
  );
  const toggle = useToggleCollectionItem();

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!user) {
      toast.info("กรุณาเข้าสู่ระบบก่อน");
      openAuth();
      return;
    }
    if (!projectId) {
      toast.info("ผลงานนี้ยังไม่ได้เผยแพร่");
      return;
    }
    setOpen((v) => !v);
  };

  const toggleItem = async (cid: string, isIn: boolean) => {
    if (!projectId) return;
    try {
      await toggle.mutateAsync({ collectionId: cid, projectId, remove: isIn });
      toast.success(isIn ? "เอาออกจากคอลเลกชันแล้ว" : "เพิ่มเข้าคอลเลกชันแล้ว");
    } catch (e: unknown) {
      toast.error(mapWriteFlowError(e, "ผิดพลาด"));
    }
  };

  const trigger = children ? (
    <span onClick={handleTriggerClick}>{children}</span>
  ) : (
    <button
      onClick={handleTriggerClick}
      aria-label="เก็บเข้าคอลเลกชัน"
      title="เก็บเข้าคอลเลกชัน"
      className={cn(
        "p-2 rounded-md hover:bg-accent transition-colors",
        triggerClassName,
      )}
    >
      <Layers3 className="w-4 h-4" />
    </button>
  );

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent
          align={align}
          side={side}
          className="w-72 p-0"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-2.5 border-b border-border/60 flex items-center justify-between">
            <p className="text-sm font-semibold">เก็บเข้าคอลเลกชัน</p>
            <Layers3 className="w-4 h-4 text-primary" />
          </div>

          <ScrollArea className="max-h-64">
            {collectionsLoading ? (
              <CompactLoader className="py-6 px-3" />
            ) : collectionsError ? (
              <div className="text-center py-6 px-3 space-y-2">
                <p className="text-xs text-muted-foreground">โหลดรายการไม่สำเร็จ</p>
                <Button size="sm" variant="outline" className="rounded-full h-7 text-xs" onClick={() => refetchCollections()}>
                  ลองใหม่
                </Button>
              </div>
            ) : collections.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6 px-3">
                ยังไม่มีคอลเลกชัน — สร้างอันแรกของคุณ
              </p>
            ) : (
              <ul className="py-1">
                {collections.map((c) => {
                  const isIn = activeIds.includes(c.id);
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => void toggleItem(c.id, isIn)}
                        disabled={toggle.isPending}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-accent text-left transition-colors"
                      >
                        <div className="w-10 h-10 rounded-md bg-muted overflow-hidden grid grid-cols-2 grid-rows-2 gap-px shrink-0">
                          {c.covers.slice(0, 4).map((u, i) => (
                            <img key={i} src={u} alt="" className="w-full h-full object-cover" />
                          ))}
                          {c.covers.length === 0 && (
                            <div className="col-span-2 row-span-2 flex items-center justify-center">
                              <Layers3 className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground line-clamp-1 flex items-center gap-1">
                            {c.name}
                            {!c.is_public && <Lock className="w-3 h-3 text-muted-foreground" />}
                          </p>
                          <p className="text-[11px] text-muted-foreground">{c.item_count} ผลงาน</p>
                        </div>
                        <div
                          className={cn(
                            "w-6 h-6 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                            isIn ? "bg-primary border-primary text-primary-foreground" : "border-border",
                          )}
                        >
                          {isIn && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </ScrollArea>

          <div className="border-t border-border/60 p-2">
            <Button
              variant="ghost"
              className="w-full justify-start text-primary hover:text-primary hover:bg-primary/10"
              onClick={() => setFormOpen(true)}
            >
              <Plus className="w-4 h-4 mr-1.5" /> สร้างคอลเลกชันใหม่
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <CollectionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onCreated={async (id) => {
          await refetchCollections();
          if (projectId) {
            await toggle.mutateAsync({ collectionId: id, projectId });
            toast.success("เพิ่มเข้าคอลเลกชันใหม่แล้ว");
          }
        }}
      />
    </>
  );
};

export default SaveToCollectionPopover;
