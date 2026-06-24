import * as React from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ChevronsUpDown, UserPlus, Check, User as UserIcon, X } from "lucide-react";
import { useClients, type SavedClient, type SavedClientInput } from "@/store/clients";
import { ClientFormDialog } from "@/components/dashboard/clients/ClientFormDialog";
import type { StagedClientFile } from "@/components/dashboard/clients/ClientDocumentsField";
import type { BriefClientInfo } from "@/lib/briefSchema";
import { toast } from "sonner";

interface Props {
  value: BriefClientInfo;
  onPick: (info: BriefClientInfo) => void;
  disabled?: boolean;
}

function clientToBriefInfo(c: SavedClient): BriefClientInfo {
  return {
    client_id: c.id,
    client_name: c.name,
    brand_name: c.industry || "",
    contact_email: c.email || "",
    contact_phone: c.phone || "",
    contact_line: c.lineId || "",
  };
}

export function ClientPicker({ value, onPick, disabled }: Props) {
  const { list, add, uploadFile, getSignedUrl } = useClients();
  const [open, setOpen] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState<"new" | null>(null);
  const [creating, setCreating] = React.useState(false);

  const selected = value.client_id ? list.find((c) => c.id === value.client_id) : undefined;
  const label = selected?.name || value.client_name || "เลือกลูกค้าจากรายชื่อ…";

  const handleCreate = async (payload: SavedClientInput, staged: StagedClientFile[]) => {
    if (creating) return;
    setCreating(true);
    try {
      const created = await add(payload);
      for (const sf of staged) {
        try {
          await uploadFile(created.id, sf.file, sf.docCategory);
        } catch {
          /* ignore */
        }
      }
      onPick(clientToBriefInfo(created));
      setDialogOpen(null);
      toast.success("เพิ่มลูกค้าใหม่และเชื่อมกับบรีฟแล้ว");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const handleClear = () => {
    onPick({
      client_id: undefined,
      client_name: "",
      brand_name: "",
      contact_email: "",
      contact_phone: "",
      contact_line: "",
    });
    toast.info("ล้างการเลือกลูกค้าแล้ว");
  };

  return (
    <>
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              disabled={disabled}
              className="flex-1 justify-between font-normal"
            >
              <span className="flex items-center gap-2 truncate">
                <UserIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate">{label}</span>
              </span>
              <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[320px] p-0" align="start">
            <Command>
              <CommandInput placeholder="ค้นหาชื่อลูกค้า…" />
              <CommandList>
                <CommandEmpty>ไม่พบลูกค้า</CommandEmpty>
                <CommandGroup>
                  {list.map((c) => (
                    <CommandItem
                      key={c.id}
                      value={
                        c.name +
                        " " +
                        (c.industry || "") +
                        " " +
                        (c.contactName || "")
                      }
                      onSelect={() => {
                        onPick(clientToBriefInfo(c));
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={`mr-2 h-4 w-4 ${value.client_id === c.id ? "opacity-100" : "opacity-0"}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{c.name}</div>
                        {c.type === "company" && c.contactName ? (
                          <div className="text-[10px] text-muted-foreground truncate">
                            ติดต่อ: {c.contactName}
                          </div>
                        ) : c.industry ? (
                          <div className="text-[10px] text-muted-foreground truncate">
                            {c.industry}
                          </div>
                        ) : null}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={disabled}
          onClick={() => setDialogOpen("new")}
          title="เพิ่มลูกค้าใหม่"
        >
          <UserPlus className="h-4 w-4" />
        </Button>
        {(value.client_id || value.client_name) && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={disabled}
            onClick={handleClear}
            title="ล้างการเลือกลูกค้า"
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <ClientFormDialog
        editing={dialogOpen}
        onClose={() => setDialogOpen(null)}
        onCreate={handleCreate}
        onUpdate={() => {}}
        getSignedUrl={getSignedUrl}
      />
    </>
  );
}
