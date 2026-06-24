import { Card, CardContent } from "@/components/ui/card";
import { type DocKind } from "@/store/quotations";
import { DOC_TYPES } from "./docTypes";

export function DocSidebar({
  docType,
  setDocType,
  counts,
}: {
  docType: DocKind;
  setDocType: (d: DocKind) => void;
  counts: Record<DocKind, number>;
}) {
  return (
    <aside className="lg:col-span-3 xl:col-span-3">
      <Card className="glass border-border shadow-soft">
        <CardContent className="p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-2 pt-1 pb-2">
            เอกสารการเงิน
          </p>
          <nav className="space-y-1">
            {DOC_TYPES.map((d) => {
              const Icon = d.icon;
              const active = docType === d.value;
              const count = counts[d.value];
              return (
                <button
                  key={d.value}
                  onClick={() => setDocType(d.value)}
                  className={`w-full text-left rounded-xl px-3 py-2.5 transition-all flex items-start gap-2.5 ${
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-foreground hover:bg-muted/60"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 mt-0.5 shrink-0 ${active ? "" : "text-muted-foreground"}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-semibold truncate">{d.label}</p>
                      <span
                        className={`text-[10px] num font-semibold rounded-full px-1.5 py-0.5 ${
                          active
                            ? "bg-primary-foreground/20 text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {count}
                      </span>
                    </div>
                    <p
                      className={`text-[10px] leading-snug mt-0.5 ${
                        active ? "text-primary-foreground/80" : "text-muted-foreground"
                      }`}
                    >
                      {d.when}
                    </p>
                  </div>
                </button>
              );
            })}
          </nav>
          <div className="mt-3 px-2 pt-3 border-t border-border/40">
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              ลำดับการทำงาน: เสนอราคา → แจ้งหนี้ → รับเงิน → ออกใบเสร็จ
            </p>
            <p className="text-[10px] text-muted-foreground/80 leading-relaxed mt-1.5">
              💡 รายได้ที่ปิดงานแล้วจะ{" "}
              <span className="font-semibold">sync เข้าหมวดภาษี & รายได้</span> อัตโนมัติ
            </p>
          </div>
        </CardContent>
      </Card>
    </aside>
  );
}
