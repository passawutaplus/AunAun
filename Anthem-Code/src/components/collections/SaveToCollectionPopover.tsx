import { useEffect, useMemo, useRef, useState } from "react";
import { Layers3, Plus, Check, Lock } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CompactLoader } from "@/components/ui/BanterLoader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { mapWriteFlowError } from "@/lib/writeFlowErrors";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useAuthDialog } from "@/stores/authDialogStore";
import {
  useCollections,
  useCreateCollection,
  useProjectCollectionIds,
  useToggleCollectionItem,
} from "@/hooks/useCollections";
import { trackProductEvent } from "@/lib/productEvents";

const lastUsedKey = (userId: string) => `collection:last-used:${userId}`;

const readLastUsed = (userId: string | undefined): string | null => {
  if (!userId) return null;
  try {
    return localStorage.getItem(lastUsedKey(userId));
  } catch {
    return null;
  }
};

const writeLastUsed = (userId: string, collectionId: string) => {
  try {
    localStorage.setItem(lastUsedKey(userId), collectionId);
  } catch {
    /* private mode / storage disabled — the shortcut is optional */
  }
};

interface Props {
  projectId: string | undefined;
  /** Trigger element. Pass `triggerAsChild` button content; else uses default icon button. */
  children?: React.ReactNode;
  /** className applied to default trigger */
  triggerClassName?: string;
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
  onOpenChange?: (open: boolean) => void;
}

const SaveToCollectionPopover = ({ projectId, children, triggerClassName, align = "end", side = "bottom", onOpenChange }: Props) => {
  const { user } = useAuth();
  const openAuth = useAuthDialog((s) => s.openSignup);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [lastUsedId, setLastUsedId] = useState<string | null>(() => readLastUsed(user?.id));
  const newNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

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
  const create = useCreateCollection();

  useEffect(() => {
    if (open) setLastUsedId(readLastUsed(user?.id));
    else {
      setCreating(false);
      setNewName("");
    }
  }, [open, user?.id]);

  useEffect(() => {
    if (creating) newNameRef.current?.focus();
  }, [creating]);

  // The collection you saved into last goes first, so a repeat save is one tap.
  const ordered = useMemo(() => {
    if (!lastUsedId) return collections;
    return [...collections].sort((a, b) => Number(b.id === lastUsedId) - Number(a.id === lastUsedId));
  }, [collections, lastUsedId]);

  const remember = (collectionId: string) => {
    if (!user?.id) return;
    writeLastUsed(user.id, collectionId);
    setLastUsedId(collectionId);
  };

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
      if (!isIn) {
        remember(cid);
        void trackProductEvent(
          "collection_save",
          { project_id: projectId, collection_id: cid },
          { debounceMs: 1_000 },
        );
      }
      toast.success(isIn ? "เอาออกจากคอลเลกชันแล้ว" : "เพิ่มเข้าคอลเลกชันแล้ว");
    } catch (e: unknown) {
      toast.error(mapWriteFlowError(e, "ผิดพลาด"));
    }
  };

  const createAndSave = async () => {
    const name = newName.trim();
    if (!name || !user?.id || create.isPending) return;
    try {
      const created = await create.mutateAsync({ ownerId: user.id, name });
      if (projectId) {
        await toggle.mutateAsync({ collectionId: created.id, projectId });
        void trackProductEvent(
          "collection_save",
          { project_id: projectId, collection_id: created.id },
          { debounceMs: 1_000 },
        );
      }
      remember(created.id);
      toast.success(`เพิ่มเข้า “${name}” แล้ว`);
      setCreating(false);
      setNewName("");
    } catch (e: unknown) {
      toast.error(mapWriteFlowError(e, "สร้างคอลเลกชันไม่สำเร็จ"));
    }
  };

  const trigger = children ? (
    <span className="flex min-w-0" onClick={handleTriggerClick}>{children}</span>
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
            ) : ordered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6 px-3">
                ยังไม่มีคอลเลกชัน — สร้างอันแรกของคุณ
              </p>
            ) : (
              <ul className="py-1">
                {ordered.map((c) => {
                  const isIn = activeIds.includes(c.id);
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => void toggleItem(c.id, isIn)}
                        disabled={toggle.isPending}
                        aria-pressed={isIn}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-accent text-left transition-colors"
                      >
                        <div className="w-10 h-10 rounded-md bg-muted overflow-hidden grid grid-cols-2 grid-rows-2 gap-px shrink-0">
                          {c.covers.slice(0, 4).map((u, i) => (
                            <img loading="lazy" decoding="async" key={i} src={u} alt="" className="w-full h-full object-cover" />
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
                          <p className="text-[11px] text-muted-foreground">
                            {c.item_count} ผลงาน{c.id === lastUsedId ? " · ใช้ล่าสุด" : ""}
                          </p>
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
            {creating ? (
              <form
                className="flex items-center gap-1.5"
                onSubmit={(e) => {
                  e.preventDefault();
                  void createAndSave();
                }}
              >
                <Input
                  ref={newNameRef}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="ชื่อคอลเลกชันใหม่"
                  aria-label="ชื่อคอลเลกชันใหม่"
                  maxLength={60}
                  className="h-9 flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.stopPropagation();
                      setCreating(false);
                      setNewName("");
                    }
                  }}
                />
                <Button type="submit" size="sm" className="h-9 rounded-full" disabled={!newName.trim() || create.isPending}>
                  {create.isPending ? "..." : "สร้าง"}
                </Button>
              </form>
            ) : (
              <Button
                variant="ghost"
                className="w-full justify-start text-primary hover:text-primary hover:bg-primary/10"
                onClick={() => setCreating(true)}
              >
                <Plus className="w-4 h-4 mr-1.5" /> สร้างคอลเลกชันใหม่
              </Button>
            )}
            {creating ? (
              <p className="px-1 pt-1.5 text-[11px] text-muted-foreground">
                เริ่มเป็นส่วนตัว — ตั้งเป็นสาธารณะได้ทีหลัง และผลงานนี้จะถูกเพิ่มเข้าให้ทันที
              </p>
            ) : null}
          </div>
        </PopoverContent>
      </Popover>

    </>
  );
};

export default SaveToCollectionPopover;
