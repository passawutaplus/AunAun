import { COOKIE_CATALOG, type CookieCatalogRow } from "@/components/legal/CookieCatalog";

const CATEGORY_LABEL: Record<CookieCatalogRow["category"], string> = {
  essential: "จำเป็น",
  functional: "เชิงฟังก์ชัน",
  analytics: "วิเคราะห์",
};

const CookieTable = () => (
  <div className="overflow-x-auto rounded-xl border border-border/60 not-prose">
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border/60 bg-muted/40 text-left text-xs">
          <th className="p-3 font-medium">ชื่อ</th>
          <th className="p-3 font-medium">ผู้ให้บริการ</th>
          <th className="p-3 font-medium">ประเภท</th>
          <th className="p-3 font-medium">วัตถุประสงค์</th>
          <th className="p-3 font-medium">ระยะเวลา</th>
        </tr>
      </thead>
      <tbody>
        {COOKIE_CATALOG.map((row) => (
          <tr key={row.name} className="border-b border-border/40 last:border-0 text-xs">
            <td className="p-3 font-mono align-top">{row.name}</td>
            <td className="p-3 align-top">{row.provider}</td>
            <td className="p-3 align-top whitespace-nowrap">{CATEGORY_LABEL[row.category]}</td>
            <td className="p-3 text-muted-foreground align-top">{row.purpose}</td>
            <td className="p-3 text-muted-foreground align-top whitespace-nowrap">{row.duration}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default CookieTable;
