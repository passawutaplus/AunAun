import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MessageSquareHeart, Trash2, Loader2, Search, RefreshCw, Star } from "lucide-react";
import { useAllBetaFeedback, type BetaFeedback } from "@/store/betaFeedback";
import { toast } from "sonner";

export function BetaFeedbackPanel() {
  const { items, isLoading, refetch, remove } = useAllBetaFeedback();
  const [query, setQuery] = React.useState("");
  const [feature, setFeature] = React.useState<string>("all");
  const [confirmDel, setConfirmDel] = React.useState<BetaFeedback | null>(null);

  const features = React.useMemo(() => {
    const s = new Set<string>();
    items.forEach((i) => s.add(i.feature));
    return Array.from(s).sort();
  }, [items]);

  const filtered = React.useMemo(() => {
    const ql = query.trim().toLowerCase();
    return items
      .filter((i) => feature === "all" || i.feature === feature)
      .filter(
        (i) =>
          !ql ||
          i.message.toLowerCase().includes(ql) ||
          (i.userName ?? "").toLowerCase().includes(ql) ||
          (i.userEmail ?? "").toLowerCase().includes(ql),
      );
  }, [items, query, feature]);

  const grouped = React.useMemo(() => {
    const m = new Map<string, BetaFeedback[]>();
    filtered.forEach((i) => {
      const arr = m.get(i.feature) ?? [];
      arr.push(i);
      m.set(i.feature, arr);
    });
    return Array.from(m.entries());
  }, [filtered]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquareHeart className="h-4 w-4 text-primary" />
            ข้อเสนอแนะจาก Tester
            <Badge variant="secondary" className="text-[10px]">
              {items.length}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหา…"
                className="pl-8 h-8 w-[180px] text-xs"
              />
            </div>
            <Select value={feature} onValueChange={setFeature}>
              <SelectTrigger className="h-8 w-[160px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกฟีเจอร์</SelectItem>
                {features.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => refetch()}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-sm text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลด...
          </div>
        ) : grouped.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground">ยังไม่มีข้อเสนอแนะ</div>
        ) : (
          <div className="divide-y divide-border/50">
            {grouped.map(([feat, list]) => (
              <div key={feat} className="px-4 py-3 sm:px-5">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-primary text-primary-foreground text-[10px]">{feat}</Badge>
                  <span className="text-[11px] text-muted-foreground">{list.length} รายการ</span>
                </div>
                <div className="space-y-2">
                  {list.map((it) => (
                    <div
                      key={it.id}
                      className="flex items-start justify-between gap-3 rounded-lg border border-border/50 bg-card p-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        {it.rating != null && (
                          <div className="flex items-center gap-0.5 mb-1">
                            {Array.from({ length: 5 }, (_, i) => (
                              <Star
                                key={i}
                                className={`h-3 w-3 ${i < it.rating! ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
                              />
                            ))}
                            <span className="text-[10px] text-muted-foreground ml-1">
                              {it.rating}/5
                            </span>
                          </div>
                        )}
                        <p className="text-sm whitespace-pre-wrap break-words">{it.message}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {it.userName || it.userEmail || "ผู้ใช้"} ·{" "}
                          {new Date(it.createdAt).toLocaleString("th-TH", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => setConfirmDel(it)}
                        title="ลบ"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ลบข้อเสนอแนะนี้?</AlertDialogTitle>
            <AlertDialogDescription>จะถูกลบถาวรจากระบบ</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (confirmDel) {
                  await remove(confirmDel.id);
                  toast.success("ลบแล้ว");
                  setConfirmDel(null);
                }
              }}
            >
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
