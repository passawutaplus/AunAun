import { Briefcase, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const FILTER_ALL = "all";

export const SALARY_PRESETS = [
  { id: "u20", label: "Under ฿20k", min: 0, max: 19999 },
  { id: "20-40", label: "฿20k – ฿40k", min: 20000, max: 40000 },
  { id: "40-60", label: "฿40k – ฿60k", min: 40000, max: 60000 },
  { id: "60-100", label: "฿60k – ฿100k", min: 60000, max: 99999 },
  { id: "100+", label: "฿100k+", min: 100000, max: Number.POSITIVE_INFINITY },
] as const;

type Props = {
  search: string;
  onSearch: (v: string) => void;
  employment: string;
  onEmployment: (v: string) => void;
  locationType: string;
  onLocationType: (v: string) => void;
  placeRegion: string;
  onPlaceRegion: (v: string) => void;
  salaryId: string;
  onSalaryId: (v: string) => void;
};

const triggerClass = "h-10 w-[10.5rem] rounded-xl";

export default function JobBoardFilters({
  search,
  onSearch,
  employment,
  onEmployment,
  locationType,
  onLocationType,
  placeRegion,
  onPlaceRegion,
  salaryId,
  onSalaryId,
}: Props) {

  return (
    <section>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <Label htmlFor="job-search" className="sr-only">ค้นหาชื่อตำแหน่ง หรือบริษัท</Label>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="job-search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="ค้นหาชื่อตำแหน่ง หรือบริษัท"
            className="pl-9 h-10 rounded-xl"
          />
        </div>

        <Select value={employment || FILTER_ALL} onValueChange={(v) => onEmployment(v === FILTER_ALL ? "" : v)}>
          <SelectTrigger className={triggerClass} aria-label="Job type">
            <SelectValue placeholder="Job type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={FILTER_ALL}>Job type</SelectItem>
            <SelectItem value="fulltime">Full-time</SelectItem>
            <SelectItem value="parttime">Contract</SelectItem>
          </SelectContent>
        </Select>

        <Select value={locationType || FILTER_ALL} onValueChange={(v) => onLocationType(v === FILTER_ALL ? "" : v)}>
          <SelectTrigger className={triggerClass} aria-label="Workplace">
            <SelectValue placeholder="Workplace" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={FILTER_ALL}>Workplace</SelectItem>
            <SelectItem value="remote">WFH 100%</SelectItem>
            <SelectItem value="hybrid">Hybrid</SelectItem>
            <SelectItem value="onsite">Onsite</SelectItem>
          </SelectContent>
        </Select>

        <Select value={placeRegion || FILTER_ALL} onValueChange={(v) => onPlaceRegion(v === FILTER_ALL ? "" : v)}>
          <SelectTrigger className={triggerClass} aria-label="Location">
            <SelectValue placeholder="Location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={FILTER_ALL}>Location</SelectItem>
            <SelectItem value="bangkok">กรุงเทพ</SelectItem>
            <SelectItem value="upcountry">ต่างจังหวัด</SelectItem>
            <SelectItem value="overseas">ต่างประเทศ</SelectItem>
          </SelectContent>
        </Select>

        <Select value={salaryId || FILTER_ALL} onValueChange={(v) => onSalaryId(v === FILTER_ALL ? "" : v)}>
          <SelectTrigger className={triggerClass} aria-label="Salary">
            <SelectValue placeholder="Salary" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={FILTER_ALL}>Salary</SelectItem>
            {SALARY_PRESETS.map((preset) => (
              <SelectItem key={preset.id} value={preset.id}>{preset.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </section>
  );
}

export function JobBoardHero({ onPost }: { onPost: () => void }) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-border/50 bg-zinc-950 text-white h-[50svh] min-h-[280px] max-h-[560px]">
      <img loading="lazy" decoding="async"
        src="/job-covers/hiring-hero-designers.png"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/15" />
      <div className="relative h-full px-5 py-8 sm:px-8 sm:py-10 flex flex-col justify-end sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-2 max-w-xl">
          <p className="text-xs uppercase tracking-[0.2em] text-white/70">Aplus1</p>
          <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight">
            They are <span className="font-bold">HIRING</span>
          </h1>
          <p className="text-sm text-white/80 thai-body">ประกาศจ้างจากบริษัทที่ยืนยันนิติบุคคลแล้ว</p>
        </div>
        <Button type="button" variant="secondary" className="rounded-full shrink-0" onClick={onPost}>
          <Briefcase className="w-4 h-4 mr-1.5" />
          ลงประกาศ
        </Button>
      </div>
    </section>
  );
}
