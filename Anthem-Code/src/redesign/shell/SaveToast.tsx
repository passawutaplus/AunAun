import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  useCollections,
  useCreateCollection,
  useProjectCollectionIds,
  useToggleCollectionItem,
  type CollectionWithCovers,
} from "@/hooks/useCollections";
import { proxiedImageUrl } from "@/lib/imageProxy";
import { onEscape } from "./panels";
import "../styles/save-toast.css";

type Props = {
  work: { id: string; title: string };
  leaving: boolean;
  onClose: () => void;
};

const tileBg = (url: string | undefined): CSSProperties | undefined =>
  url ? { backgroundImage: `url(${JSON.stringify(proxiedImageUrl(url, 256))})` } : undefined;

/**
 * "Saved" popup (mock: SaveToast.dc.html, variant E — collection covers in a row). Opens after a work
 * is saved (project_bookmarks); each cover puts the work in or out of that collection (collections).
 */
export default function SaveToast({ work, leaving, onClose }: Props) {
  const { user } = useAuth();
  const uid = user?.id;
  const { data: collections = [] } = useCollections(uid);
  const { data: inIds = [] } = useProjectCollectionIds(work.id, uid);
  const toggleItem = useToggleCollectionItem();
  const create = useCreateCollection();

  const [pop, setPop] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const cardRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setPop(true), 20);
    cardRef.current?.focus({ preventScroll: true });
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => onEscape(() => (adding ? setAdding(false) : onClose())), [adding, onClose]);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  const picked = new Set(inIds);
  const names = collections.filter((c) => picked.has(c.id)).map((c) => c.name);
  const msg = names.length ? `บันทึกใน ${names.join(", ")}` : "บันทึกแล้ว";
  const nm = name.trim();

  const toggle = (c: CollectionWithCovers) =>
    toggleItem.mutate({ collectionId: c.id, projectId: work.id, remove: picked.has(c.id) });

  const submit = async () => {
    if (!uid || !nm || create.isPending) return;
    const row = await create.mutateAsync({ ownerId: uid, name: nm, isPublic: false }).catch(() => null);
    if (row?.id) toggleItem.mutate({ collectionId: row.id as string, projectId: work.id });
    setAdding(false);
    setName("");
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void submit();
    }
  };

  const shown = pop && !leaving;

  return (
    <>
      <div aria-hidden="true" className="sv-veil" data-on={shown ? "" : undefined} onClick={onClose} />
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-label="บันทึกแล้ว เลือกคอลเลคชั่น"
        tabIndex={-1}
        className="sv-card"
        data-on={shown ? "" : undefined}
      >
        <div className="sv-head">
          <span className="sv-msg">
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="#282929" stroke="#282929" strokeWidth="1.5" strokeLinejoin="round">
              <path d="M6 3h12v18l-6-4.5L6 21z" />
            </svg>
            <span className="sv-msg-t">{msg}</span>
          </span>
          <button type="button" className="sv-x" aria-label="ปิด" onClick={onClose}>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {collections.length ? (
          <div className="sv-scr" role="group" aria-label="เลือกคอลเลคชั่น">
            {collections.map((c) => {
              const on = picked.has(c.id);
              return (
                <button key={c.id} type="button" className="sv-tile" aria-pressed={on} onClick={() => toggle(c)}>
                  <span className="sv-mos" data-on={on ? "" : undefined}>
                    <span className="sv-a" style={tileBg(c.covers[0])} />
                    <span style={tileBg(c.covers[1])} />
                    <span style={tileBg(c.covers[2])} />
                    {on ? (
                      <span aria-hidden="true" className="sv-check">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12.5l4.5 4.5L19 7.5" />
                        </svg>
                      </span>
                    ) : null}
                  </span>
                  <span className="sv-name">
                    <span className="sv-name-t">{c.name}</span>
                    {c.is_public ? null : (
                      <svg role="img" aria-label="ส่วนตัว" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#A3A3A0" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="5" y="11" width="14" height="9.5" rx="2" />
                        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                      </svg>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

        {adding ? (
          <div className="sv-add">
            <input
              ref={inputRef}
              aria-label="ชื่อคอลเลคชั่นใหม่"
              className="sv-in"
              type="text"
              value={name}
              maxLength={80}
              placeholder="ตั้งชื่อคอลเลคชั่น"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={onKey}
            />
            <button type="button" className="sv-create" data-on={nm ? "" : undefined} onClick={() => void submit()}>
              สร้าง
            </button>
          </div>
        ) : null}

        <div className="sv-foot">
          <button type="button" className="sv-ghost" onClick={() => setAdding(true)}>
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            คอลเลคชั่นใหม่
          </button>
          <button type="button" className="sv-done" onClick={onClose}>
            เสร็จ
          </button>
        </div>
      </div>
    </>
  );
}
