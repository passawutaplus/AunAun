import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Props = {
  id: string;
  value: string;
  options: readonly string[];
  placeholder: string;
  /** Label for the empty choice; omit to hide it (required fields). */
  noneLabel?: string;
  noneValue: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  onValueChange: (value: string) => void;
};

/** Province / district / subdistrict picker you can type into — the lists are long (77 provinces, 50 Bangkok districts). */
export default function AddressCombobox({
  id,
  value,
  options,
  placeholder,
  noneLabel,
  noneValue,
  disabled,
  invalid,
  className,
  onValueChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const pick = (next: string) => {
    onValueChange(next);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid}
          disabled={disabled}
          className={cn(
            "flex h-10 w-full items-center justify-between gap-2 border px-3 text-left text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>{value || placeholder}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[220px] p-0" align="start">
        <Command>
          <CommandInput placeholder="พิมพ์ค้นหา…" />
          <CommandList className="max-h-64">
            <CommandEmpty>ไม่พบ</CommandEmpty>
            {noneLabel ? (
              <CommandItem value={`__${noneLabel}`} onSelect={() => pick(noneValue)}>
                <span className="text-muted-foreground">{noneLabel}</span>
              </CommandItem>
            ) : null}
            {options.map((o) => (
              <CommandItem key={o} value={o} onSelect={() => pick(o)}>
                <Check className={cn("mr-2 h-4 w-4", o === value ? "opacity-100" : "opacity-0")} />
                {o}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
