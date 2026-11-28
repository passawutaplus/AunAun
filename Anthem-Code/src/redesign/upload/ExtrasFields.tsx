import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { TaggedUserSummary } from "@/lib/communityTaggedUsers";
import { fetchTaggableCollabCandidates, MAX_PORTFOLIO_COLLAB_USERS } from "@/lib/portfolioCollabInvites";
import { createProjectLinkAsset, fileExtension, PROJECT_ASSET_ALLOWED_EXTENSIONS, PROJECT_ASSETS_MAX, type ProjectAsset, type ProjectAssetScanStatus } from "@/lib/projectAssets";
import { applyScanResult, evaluateExternalLinkUrl, evaluateProjectAssetOnAdd } from "@/lib/projectAssetScan";
import { safeHttpUrl } from "@/lib/safeUrl";
import type { WorkCredits } from "@/server/mutations/upload";

/**
 * Upload's CREDITS (old PortfolioCollabUserPicker) and FILES & LINKS (old ProjectAssetsEditor), in the Upload look.
 * Styles: upload.css `.up-ppl*`, `.up-att*` (+ `.up-tool*`, `.up-opt*` of MetaFields).
 */

const label = (u: TaggedUserSummary) => (u.username ? `@${u.username}` : u.display_name);

function Face({ u }: { u: TaggedUserSummary }) {
  return u.avatar_url ? (
    <img className="up-ppl-av" src={u.avatar_url} alt="" width={24} height={24} loading="lazy" />
  ) : (
    <span className="up-ppl-av up-ppl-av0" aria-hidden="true">
      {(u.display_name || u.username || "?").slice(0, 1).toUpperCase()}
    </span>
  );
}

const X = () => (
  <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export function CreditsField({
  uid,
  credits,
  added,
  onAdd,
  onUnadd,
  onCancelPending,
}: {
  uid: string;
  credits: WorkCredits;
  /** Picked here, invited when the work is saved. */
  added: TaggedUserSummary[];
  onAdd: (u: TaggedUserSummary) => void;
  onUnadd: (userId: string) => void;
  onCancelPending: (u: TaggedUserSummary) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  // Mutual follows who allow tags ("who can tag me" — the database decides).
  const cand = useQuery({ queryKey: ["sc-tag-candidates", uid], queryFn: () => fetchTaggableCollabCandidates(uid), enabled: open, staleTime: 60_000 });
  const taken = useMemo(
    () => new Set([...credits.accepted, ...credits.pending, ...credits.declined, ...added].map((u) => u.user_id)),
    [credits, added],
  );
  const total = credits.accepted.length + credits.pending.length + added.length;
  const full = total >= MAX_PORTFOLIO_COLLAB_USERS;
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const all = (cand.data ?? []).filter((u) => !taken.has(u.user_id));
    return s ? all.filter((u) => u.display_name.toLowerCase().includes(s) || (u.username ?? "").toLowerCase().includes(s)) : all;
  }, [cand.data, taken, q]);
  const any = total > 0 || credits.declined.length > 0;

  return (
    <div className="up-f" role="group" aria-labelledby="up-ppl-l">
      <span id="up-ppl-l" className="up-lab">
        CREDITS
      </span>
      {any ? (
        <ul className="up-tools" aria-label="คนที่แท็กในงานนี้">
          {credits.accepted.map((u) => (
            <li key={u.user_id} className="up-tool up-ppl">
              <Face u={u} />
              {label(u)}
              <span className="up-ppl-st">ในงานแล้ว</span>
            </li>
          ))}
          {credits.pending.map((u) => (
            <li key={u.user_id} className="up-tool up-ppl">
              <Face u={u} />
              {label(u)}
              <span className="up-ppl-st">รอตอบ</span>
              <button type="button" className="up-tool-x" aria-label={`ยกเลิกแท็ก ${u.display_name}`} title="ยกเลิกแท็ก (เขายังไม่ตอบ)" onClick={() => onCancelPending(u)}>
                <X />
              </button>
            </li>
          ))}
          {added.map((u) => (
            <li key={u.user_id} className="up-tool up-ppl">
              <Face u={u} />
              {label(u)}
              <button type="button" className="up-tool-x" aria-label={`เอา ${u.display_name} ออก`} onClick={() => onUnadd(u.user_id)}>
                <X />
              </button>
            </li>
          ))}
          {credits.declined.map((u) => (
            <li key={u.user_id} className="up-tool up-ppl up-ppl-no" title="ไม่รับแท็กในงานนี้ ชื่อจะไม่ขึ้นนะ">
              <Face u={u} />
              {label(u)}
              <span className="up-ppl-st">ไม่รับแท็ก</span>
            </li>
          ))}
        </ul>
      ) : null}
      <button type="button" className="up-opt up-ppl-add" aria-expanded={open} disabled={full && !open} onClick={() => setOpen((v) => !v)}>
        {full ? `ครบ ${MAX_PORTFOLIO_COLLAB_USERS} คนแล้ว` : "+ แท็กเพื่อนร่วมงาน"}
      </button>
      {open ? (
        <div className="up-ppl-box">
          <input className="up-fld" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาชื่อ" aria-label="ค้นหาเพื่อนที่จะแท็ก" />
          {cand.isPending ? (
            <p className="up-fhint">กำลังโหลด…</p>
          ) : cand.isError ? (
            <p className="up-fhint">โหลดรายชื่อไม่ขึ้น ลองใหม่อีกทีนะ</p>
          ) : !list.length ? (
            <p className="up-fhint">{(cand.data ?? []).length ? "ไม่เจอชื่อนี้นะ" : "แท็กได้เฉพาะคนที่ติดตามกันทั้งคู่ และเปิดรับแท็กนะ"}</p>
          ) : (
            <ul className="up-ppl-list">
              {list.slice(0, 30).map((u) => (
                <li key={u.user_id}>
                  <button type="button" className="up-ppl-pick" disabled={full} onClick={() => onAdd(u)}>
                    <Face u={u} />
                    <span className="up-ppl-n">{u.display_name}</span>
                    {u.username ? <span className="up-ppl-u">@{u.username}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
      <p className="up-fhint">เขากดรับแล้ว ชื่อถึงจะขึ้นในงานนะ</p>
    </div>
  );
}

// ---------- FILES & LINKS ----------

const FILE_ACCEPT = [...PROJECT_ASSET_ALLOWED_EXTENSIONS].map((e) => `.${e}`).join(",");
const STATUS: Record<ProjectAssetScanStatus, string> = { pending: "กำลังตรวจ", clean: "ผ่าน", blocked: "ไม่ผ่าน" };

/** A link as the old editor took it: http(s) only, checked in the browser (can only block), then pending until the server scan. */
function linkAsset(raw: string, existing: readonly ProjectAsset[]): { asset?: ProjectAsset; error?: string } {
  const t = raw.trim();
  if (!t) return {};
  const safe = safeHttpUrl(t.startsWith("http") ? t : `https://${t}`);
  if (!safe) return { error: "ใส่ได้เฉพาะลิงก์ http / https นะ" };
  if (existing.length >= PROJECT_ASSETS_MAX) return { error: `ใส่ได้ไม่เกิน ${PROJECT_ASSETS_MAX} รายการนะ` };
  const safety = evaluateExternalLinkUrl(safe);
  if (safety.scan_status === "blocked") return { error: safety.scan_reason ?? "ลิงก์นี้ไม่ผ่านการตรวจ" };
  if (existing.some((a) => a.kind === "link" && (a.url ?? "").replace(/\/$/, "") === safe.replace(/\/$/, ""))) return { error: "ใส่ลิงก์นี้ไปแล้วนะ" };
  let host = safe;
  try {
    host = new URL(safe).hostname;
  } catch {
    /* keep */
  }
  const draft = createProjectLinkAsset(host, safe);
  const checked = applyScanResult(draft, evaluateProjectAssetOnAdd(draft));
  if (checked.scan_status === "blocked") return { error: checked.scan_reason ?? "ลิงก์นี้ไม่ผ่านการตรวจ" };
  return { asset: { ...checked, scan_status: "pending", scan_reason: null, scanned_at: null } };
}

const mb = (n?: number) => (!n ? "" : n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / (1024 * 1024)).toFixed(1)} MB`);

export function AttachmentsField({
  assets,
  verdicts,
  upload,
  onAdd,
  onRemove,
}: {
  assets: ProjectAsset[];
  /** Server verdicts that came back after a save (the list on screen keeps what was sent). */
  verdicts: Record<string, { status: ProjectAssetScanStatus; reason: string | null }>;
  upload: (file: File) => Promise<ProjectAsset>;
  onAdd: (a: ProjectAsset) => void;
  onRemove: (id: string) => void;
}) {
  const [url, setUrl] = useState("");
  const [err, setErr] = useState("");
  const [sending, setSending] = useState<string[]>([]);
  const fileIn = useRef<HTMLInputElement>(null);
  const full = assets.length + sending.length >= PROJECT_ASSETS_MAX;

  const addLink = (quiet = false) => {
    const r = linkAsset(url, assets);
    if (r.error) {
      if (!quiet) setErr(r.error);
      return;
    }
    if (r.asset) onAdd(r.asset);
    setUrl("");
    setErr("");
  };

  const pickFile = async (file: File | undefined) => {
    if (!file || full) return;
    if (!PROJECT_ASSET_ALLOWED_EXTENSIONS.has(fileExtension(file.name))) {
      setErr("ไฟล์แบบนี้แนบไม่ได้นะ");
      return;
    }
    setErr("");
    setSending((s) => [...s, file.name]);
    try {
      const a = await upload(file);
      onAdd(a);
      if (a.scan_status === "blocked") setErr(a.scan_reason ?? "ไฟล์นี้ไม่ผ่านการตรวจ");
    } catch (e) {
      setErr(e instanceof Error && e.message ? e.message : "แนบไฟล์ไม่สำเร็จ ลองใหม่นะ");
    } finally {
      setSending((s) => {
        const i = s.indexOf(file.name);
        return i < 0 ? s : [...s.slice(0, i), ...s.slice(i + 1)];
      });
    }
  };

  return (
    <div className="up-f" role="group" aria-labelledby="up-att-l">
      <span id="up-att-l" className="up-lab">
        FILES &amp; LINKS
      </span>
      {assets.length || sending.length ? (
        <ul className="up-att-list" aria-label="ไฟล์แนบและลิงก์">
          {assets.map((a) => {
            const v = verdicts[a.id];
            const st = v?.status ?? a.scan_status;
            const reason = v ? v.reason : a.scan_reason;
            const name = a.label || a.file_name || a.url || "";
            const meta = a.kind === "file" ? [fileExtension(a.file_name ?? "").toUpperCase(), mb(a.size_bytes)].filter(Boolean).join(" · ") : a.url ? safeHost(a.url) : "";
            return (
              <li key={a.id} className={st === "blocked" ? "up-att up-att-no" : "up-att"}>
                <span className="up-att-ic" aria-hidden="true">
                  {a.kind === "file" ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                      <path d="M14 3v5h5" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1" />
                      <path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" />
                    </svg>
                  )}
                </span>
                <span className="up-att-t">
                  <span className="up-att-n">{name}</span>
                  <span className="up-att-m">
                    {meta ? `${meta} · ` : ""}
                    <span className={`up-att-st up-att-st-${st}`} title={st === "blocked" && reason ? reason : undefined}>
                      {STATUS[st]}
                    </span>
                  </span>
                </span>
                <button type="button" className="up-tool-x" aria-label={`เอา ${name} ออก`} onClick={() => onRemove(a.id)}>
                  <X />
                </button>
              </li>
            );
          })}
          {sending.map((n, i) => (
            <li key={`up-${n}-${i}`} className="up-att up-att-busy" aria-busy="true">
              <span className="up-att-t">
                <span className="up-att-n">{n}</span>
                <span className="up-att-m">กำลังแนบ…</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="up-att-row">
        <input
          id="up-att-url"
          className="up-fld"
          type="url"
          inputMode="url"
          value={url}
          disabled={full}
          onChange={(e) => {
            setUrl(e.target.value);
            if (err) setErr("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addLink();
            }
          }}
          onBlur={() => addLink(true)}
          placeholder="วางลิงก์ เช่น behance.net/…"
          aria-label="ลิงก์"
        />
        <button type="button" className="up-opt up-att-file" disabled={full} onClick={() => fileIn.current?.click()}>
          + แนบไฟล์
        </button>
        <input
          ref={fileIn}
          type="file"
          accept={FILE_ACCEPT}
          className="up-att-in"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            void pickFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      {err ? (
        <p className="up-fhint up-att-err" role="alert">
          {err}
        </p>
      ) : (
        <p className="up-fhint">PDF · ZIP · รูป · ฟอนต์ · ≤ 25 MB · ตรวจให้หลังบันทึกนะ</p>
      )}
    </div>
  );
}

function safeHost(u: string) {
  try {
    return new URL(u).hostname;
  } catch {
    return u;
  }
}
