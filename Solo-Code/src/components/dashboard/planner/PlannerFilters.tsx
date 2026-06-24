import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, X } from "lucide-react";
import { Status, STATUS_META } from "./contentMeta";

export function PlannerFilters({
  filterClient,
  setFilterClient,
  filterStatus,
  setFilterStatus,
  clients,
}: {
  filterClient: string;
  setFilterClient: (v: string) => void;
  filterStatus: string;
  setFilterStatus: (v: string) => void;
  clients: { id: string; name: string }[];
}) {
  const dirty = filterClient !== "all" || filterStatus !== "all";
  return (
    <Card className="rounded-2xl border-border/60 shadow-soft">
      <CardContent className="p-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-1">
          <Filter className="h-3.5 w-3.5" />
          ตัวกรอง:
        </div>
        <Select value={filterClient} onValueChange={setFilterClient}>
          <SelectTrigger className="h-9 w-[180px] rounded-xl text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ลูกค้าทั้งหมด</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-9 w-[160px] rounded-xl text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">สถานะทั้งหมด</SelectItem>
            {(Object.keys(STATUS_META) as Status[]).map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_META[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dirty && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 rounded-xl text-xs gap-1"
            onClick={() => {
              setFilterClient("all");
              setFilterStatus("all");
            }}
          >
            <X className="h-3 w-3" />
            ล้าง
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
