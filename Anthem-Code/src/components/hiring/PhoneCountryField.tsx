import { useMemo, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  composeHiringPhone,
  findPhoneCountry,
  parseHiringPhone,
  phoneCountryFlag,
  PHONE_COUNTRIES,
} from "@/lib/phoneCountry";
import { cn } from "@/lib/utils";

type Props = {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
};

export default function PhoneCountryField({
  id,
  value,
  onChange,
  placeholder = "812345678",
}: Props) {
  const parsed = parseHiringPhone(value);
  const country = findPhoneCountry(parsed.iso);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^\+/, "");
    if (!q) return PHONE_COUNTRIES;
    return PHONE_COUNTRIES.filter((c) => {
      const hay = `${c.name} ${c.dial} ${c.iso} +${c.dial}`.toLowerCase();
      return hay.includes(q);
    });
  }, [query]);

  return (
    <div className="mt-1 flex gap-2">
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setQuery("");
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="เลือกรหัสประเทศ"
            className={cn(
              "flex h-10 w-[7.25rem] shrink-0 items-center justify-between rounded-xl border border-input bg-card px-2.5 text-sm",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            )}
          >
            <span className="truncate">
              {phoneCountryFlag(country.iso)} +{country.dial}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <div className="border-b border-border/60 p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหาประเทศหรือรหัส"
                className="h-9 rounded-xl pl-8 text-sm"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">ไม่พบรหัสประเทศ</p>
            ) : (
              filtered.map((c) => {
                const selected = c.iso === country.iso;
                return (
                  <button
                    key={c.iso}
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-accent",
                      selected && "bg-accent",
                    )}
                    onClick={() => {
                      onChange(composeHiringPhone(c.iso, parsed.national));
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    <span className="w-6 text-base leading-none">{phoneCountryFlag(c.iso)}</span>
                    <span className="min-w-0 flex-1 truncate">{c.name}</span>
                    <span className="tabular-nums text-muted-foreground">+{c.dial}</span>
                    {selected ? <Check className="h-3.5 w-3.5 text-primary" /> : <span className="w-3.5" />}
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
      <Input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        className="rounded-xl"
        value={parsed.national}
        placeholder={placeholder}
        onChange={(e) => onChange(composeHiringPhone(country.iso, e.target.value))}
      />
    </div>
  );
}
