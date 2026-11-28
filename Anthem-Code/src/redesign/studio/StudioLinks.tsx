import { LINK_TITLE_MAX, LINK_URL_MAX, LINKS_MAX, newLinkId, type LinkRow } from "./links";

/** Other links (Behance, TikTok, shop…): a name and a URL per row. */
export default function StudioLinks({ value, onChange }: { value: LinkRow[]; onChange: (v: LinkRow[]) => void }) {
  const patch = (i: number, p: Partial<LinkRow>) => onChange(value.map((r, j) => (j === i ? { ...r, ...p } : r)));
  return (
    <div className="sc-links">
      {value.map((r, i) => (
        <div key={r.id} className="sc-link-row">
          <input aria-label="ชื่อลิงก์" className="ms-pfi" type="text" value={r.title} maxLength={LINK_TITLE_MAX} placeholder="ชื่อ เช่น Behance" onChange={(e) => patch(i, { title: e.target.value })} />
          <input aria-label="URL" className="ms-pfi" type="url" value={r.url} maxLength={LINK_URL_MAX} placeholder="https://" onChange={(e) => patch(i, { url: e.target.value })} />
          <button type="button" className="ms-cbtn sc-link-x" aria-label={`ลบลิงก์ ${r.title}`.trim()} onClick={() => onChange(value.filter((_, j) => j !== i))}>
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      ))}
      {value.length < LINKS_MAX ? (
        <button type="button" className="ms-cpill sc-link-add" onClick={() => onChange([...value, { id: newLinkId(), title: "", url: "" }])}>
          + เพิ่มลิงก์
        </button>
      ) : null}
    </div>
  );
}
