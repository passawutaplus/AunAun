import { proxiedImageUrl } from "@/lib/imageProxy";
import type { Block, Media, TextStyle } from "./model";
import TextBox, { type TextMenu } from "./TextBox";

export const HINT = "JPG · PNG · GIF · MP4 · ≤ 20 MB";

/** What the editor shows for a picture: the local copy when it was picked here, else a resized copy. */
export const mediaSrc = (m: Media | undefined, width = 1600) => (m ? m.preview ?? proxiedImageUrl(m.url, width) : "");

export const ImageAddIcon = ({ size }: { size: number }) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth={size > 30 ? 1 : 1.3} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.5 12.5v5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2h7" />
    <circle cx="8.5" cy="9.5" r="1.5" />
    <path d="M4 17.5l4.5-4 3.5 3 2.5-2 5.5 4.5" />
    <path d="M18 3v6M15 6h6" />
  </svg>
);

const X = ({ w = 1.5 }: { w?: number }) => (
  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth={w} strokeLinecap="round">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export function Progress({ name, progress }: { name: string; progress: number }) {
  return (
    <div className="up-prog" role="progressbar" aria-label={`กำลังอัปโหลด ${name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
      <span className="up-prog-track">
        <span className="up-prog-bar" style={{ width: `${progress}%` }} />
      </span>
      <span className="up-prog-pct">{progress}%</span>
    </div>
  );
}

export function ErrorRow({ name, error, onRetry, onRemove }: { name: string; error: string; onRetry: () => void; onRemove: () => void }) {
  return (
    <div className="up-err" role="alert">
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#B8321F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7.5v5.5M12 16.5h.01" />
      </svg>
      <span className="up-err-tx">
        <span className="up-err-name">{name}</span>
        <span className="up-err-msg">{error}</span>
      </span>
      <button type="button" className="up-round40" aria-label="ลองใหม่" title="Retry" onClick={onRetry}>
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 11a8 8 0 0 0-14.5-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.5 4.5L20 16M20 20v-4h-4" />
        </svg>
      </button>
      <button type="button" className="up-round40" aria-label="เอาไฟล์นี้ออก" title="Remove" onClick={onRemove}>
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.5" strokeLinecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
}

type Props = {
  blocks: Block[];
  media: Record<string, Media>;
  coverId: string | null;
  menu: TextMenu;
  setMenu: (m: TextMenu) => void;
  addAt: number | null;
  setAddAt: (i: number | null) => void;
  /** Opens the file picker; new files go in at `at` (null = the end). */
  onPick: (at: number | null, videoOnly?: boolean) => void;
  onAddText: (at: number) => void;
  onMove: (i: number, d: -1 | 1) => void;
  onRemove: (i: number) => void;
  onCover: (id: string) => void;
  onRetry: (id: string) => void;
  onText: (id: string, text: string) => void;
  onStyle: (id: string, style: TextStyle) => void;
};

/** Basic mode: a column of pictures, videos and texts (mock Upload "BASIC"). */
export default function BasicEditor(p: Props) {
  if (!p.blocks.length) {
    return (
      <button type="button" className="up-drop up-drop-big" onClick={() => p.onPick(null)}>
        <ImageAddIcon size={44} />
        <span className="up-drop-t">ลากรูปมาวาง</span>
        <span className="up-drop-btn">เลือกไฟล์</span>
        <span className="up-hint">{HINT}</span>
      </button>
    );
  }
  return (
    <>
      {p.blocks.map((b, i) => {
        const m = b.type === "text" ? undefined : p.media[b.id];
        const err = m?.error;
        const loading = !!m && m.progress != null;
        const isImg = !!m && m.kind === "image" && !err;
        const isCover = isImg && !loading && b.id === p.coverId;
        const open = p.addAt === i;
        return (
          <div key={b.id}>
            <div className="up-mod">
              {b.type === "text" ? (
                <TextBox
                  id={`up-t-${b.id}`}
                  text={b.text}
                  style={b.style}
                  onText={(t) => p.onText(b.id, t)}
                  onStyle={(s) => p.onStyle(b.id, s)}
                  menu={p.menu}
                  setMenu={p.setMenu}
                  left
                  grow
                  label="ข้อความประกอบ"
                />
              ) : err ? (
                <ErrorRow name={m?.name ?? ""} error={err} onRetry={() => p.onRetry(b.id)} onRemove={() => p.onRemove(i)} />
              ) : isImg ? (
                <div className="up-img" style={{ aspectRatio: String(m.size ? m.size[0] / m.size[1] : 4 / 3) }}>
                  {loading ? <Progress name={m.name} progress={m.progress ?? 0} /> : <img src={mediaSrc(m)} alt="" />}
                  {isCover ? <span className="up-cover">COVER</span> : null}
                </div>
              ) : (
                <div className="up-video">
                  {loading && m ? (
                    <Progress name={m.name} progress={m.progress ?? 0} />
                  ) : (
                    <>
                      {m?.poster ? <img src={m.poster} alt="" /> : null}
                      <svg aria-hidden="true" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.2" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M10 8.5v7l6-3.5z" />
                      </svg>
                    </>
                  )}
                </div>
              )}
              {err ? null : (
                <div className="up-mtools">
                  {isImg && !loading ? (
                    <button type="button" className="up-tb36" aria-label="ตั้งเป็นปก" title="Cover" aria-pressed={isCover} onClick={() => p.onCover(b.id)}>
                      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill={isCover ? "#282929" : "none"} stroke="#282929" strokeWidth="1.6" strokeLinejoin="round">
                        <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />
                      </svg>
                    </button>
                  ) : null}
                  <button type="button" className="up-tb36" aria-label="ย้ายขึ้น" onClick={() => p.onMove(i, -1)}>
                    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 14.5l6-6 6 6" />
                    </svg>
                  </button>
                  <button type="button" className="up-tb36" aria-label="ย้ายลง" onClick={() => p.onMove(i, 1)}>
                    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 9.5l6 6 6-6" />
                    </svg>
                  </button>
                  <button type="button" className="up-tb36" aria-label="ลบส่วนนี้" onClick={() => p.onRemove(i)}>
                    <X />
                  </button>
                </div>
              )}
            </div>
            <div className="up-addrow">
              <span className="up-addline" aria-hidden="true" />
              {open ? (
                <div className="up-addpill">
                  <button type="button" className="up-round40" aria-label="เพิ่มรูป" title="Image" onClick={() => p.onPick(i + 1)}>
                    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.4" strokeLinejoin="round">
                      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
                      <circle cx="9" cy="9.5" r="1.6" />
                      <path d="M4 17l5-4.5 4 3.5 3-2.5 4 3.5" />
                    </svg>
                  </button>
                  <button type="button" className="up-round40" aria-label="เพิ่มข้อความ" title="Text" onClick={() => p.onAddText(i + 1)}>
                    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.4" strokeLinecap="round">
                      <path d="M5 6h14M12 6v13M9 19h6" />
                    </svg>
                  </button>
                  <button type="button" className="up-round40" aria-label="เพิ่มวิดีโอ" title="Video" onClick={() => p.onPick(i + 1, true)}>
                    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.4" strokeLinejoin="round">
                      <rect x="3.5" y="5" width="17" height="14" rx="2" />
                      <path d="M10 9.2v5.6l4.6-2.8z" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button type="button" className="up-addbtn" aria-label="เพิ่มส่วนตรงนี้" onClick={() => p.setAddAt(i)}>
                  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.5">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        );
      })}
      <button type="button" className="up-drop up-drop-end" onClick={() => p.onPick(null)}>
        <ImageAddIcon size={28} />
        <span className="up-drop-t2">ลากรูปมาวาง</span>
        <span className="up-hint">{HINT}</span>
      </button>
    </>
  );
}
