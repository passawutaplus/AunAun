import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Post, PLATFORM_META, colorForClient, todayISO } from "./contentMeta";

export function ContentCalendar({
  cursor,
  setCursor,
  posts,
  clientName,
  onEditPost,
}: {
  cursor: Date;
  setCursor: (d: Date) => void;
  posts: Post[];
  clientName: (id: string) => string;
  onEditPost?: (p: Post) => void;
}) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const postsForDay = (day: number) =>
    posts.filter((p) => {
      const [y, m, d] = p.date.split("-").map(Number);
      return y === year && m === month + 1 && d === day;
    });

  const monthLabel = cursor.toLocaleDateString("th-TH", { month: "long", year: "numeric" });

  return (
    <Card className="lg:col-span-2 rounded-2xl border-border/60 shadow-soft">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarIcon className="h-4 w-4 text-primary" />
          {monthLabel}
        </CardTitle>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={() => setCursor(new Date(year, month - 1, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 rounded-lg text-xs"
            onClick={() => {
              const d = new Date();
              setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
            }}
          >
            วันนี้
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={() => setCursor(new Date(year, month + 1, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map((d) => (
            <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, idx) => {
            if (day === null) return <div key={idx} className="min-h-[58px] sm:min-h-[80px]" />;
            const dayPosts = postsForDay(day);
            const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isToday = iso === todayISO;
            return (
              <div
                key={idx}
                className={`min-h-[58px] sm:min-h-[80px] rounded-lg sm:rounded-xl border p-0.5 sm:p-1 flex flex-col gap-0.5 transition-all hover:border-primary/50 overflow-hidden ${
                  isToday ? "border-primary bg-primary-soft/40" : "border-border/60 bg-background"
                }`}
              >
                <div
                  className={`text-[10px] font-medium leading-none px-0.5 ${isToday ? "text-primary" : "text-muted-foreground"}`}
                >
                  {day}
                </div>
                <div className="flex-1 min-h-0 overflow-hidden flex flex-col gap-0.5">
                  {/* Mobile: just colored dots; Desktop: chip with title */}
                  <div className="sm:hidden flex flex-wrap gap-0.5 px-0.5">
                    {dayPosts.slice(0, 4).map((p) => (
                      <span
                        key={p.id}
                        title={`${clientName(p.clientId)} • ${p.title}`}
                        className={`h-1.5 w-1.5 rounded-full ${colorForClient(p.clientId)}`}
                      />
                    ))}
                    {dayPosts.length > 4 && (
                      <span className="text-[8px] text-primary font-medium leading-none">
                        +{dayPosts.length - 4}
                      </span>
                    )}
                  </div>
                  <div className="hidden sm:flex flex-col gap-0.5">
                    {dayPosts.slice(0, 2).map((p) => {
                      const FirstIcon = PLATFORM_META[p.platforms[0]].icon;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => onEditPost?.(p)}
                          title={`${clientName(p.clientId)} • ${p.title}`}
                          className="flex items-center gap-1 rounded-md bg-card border border-border/60 px-1 py-0.5 text-[9px] truncate text-left hover:border-primary/60 hover:bg-primary/5 transition-colors"
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full shrink-0 ${colorForClient(p.clientId)}`}
                          />
                          <FirstIcon className="h-2.5 w-2.5 shrink-0 text-muted-foreground" />
                          <span className="truncate">{p.title}</span>
                        </button>
                      );
                    })}
                    {dayPosts.length > 2 && (
                      <div className="text-[9px] text-primary font-medium px-1">
                        +{dayPosts.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
