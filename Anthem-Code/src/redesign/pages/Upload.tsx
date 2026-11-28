import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { takeSharedMedia } from "@/lib/sharedMedia";
import { isUuid } from "@/lib/uuid";
import { isVideoFile, PROJECT_VIDEO_ACCEPT } from "@/lib/videoAccept";
import { getWorkCatalogIds, getWorkEditExtras, saveWork, setWorkCatalogs, type WorkEditExtras, type WorkWrite } from "@/server/mutations/upload";
import { getWork, type WorkRow } from "@/server/queries/work";
import logoUrl from "../assets/logo.svg";
import { SC_CATEGORIES } from "../lib/categories";
import { loginHref } from "../lib/loginHref";
import { ensureTextFonts } from "../lib/textFonts";
import ScLoader from "../main/ScLoader";
import { useMyCatalogs, useMyProfile } from "../profile/useMyProfile";
import { SC_LINKS } from "../routes";
import LoadError from "../shell/LoadError";
import BasicEditor, { mediaSrc } from "../upload/BasicEditor";
import { AiField, CatalogField, LicenseField, ToolsField } from "../upload/MetaFields";
import {
  basicCoverId,
  cellsOf,
  coverMediaId,
  DEFAULT_TEXT_STYLE,
  emptyDraft,
  fromWork,
  hasContent,
  isTextCell,
  readiness,
  readyImageIds,
  slotKey,
  templateCoverKey,
  toWorkFields,
  type Draft,
  type LayoutName,
  type Media,
  type Mode,
  type TextStyle,
} from "../upload/model";
import TemplateEditor, { type TplPanel } from "../upload/TemplateEditor";
import type { TextMenu } from "../upload/TextBox";
import { ConfirmDialog, LeaveDialog, previewItems, PublishedDialog, UploadPreview } from "../upload/UploadOverlays";
import { useDraftHistory } from "../upload/useDraftHistory";
import { useWorkUploads } from "../upload/useWorkUploads";
import "../styles/fonts.css";
import "../styles/tokens.css";
import "../styles/reset.css";
import "../styles/work-body.css";
import "../styles/upload.css";

type Status = "new" | "Draft" | "Published" | "Private";

/** Works this tab created and is still editing: their /portfolio/:id/edit URL must not load them again. */
const liveCreated = new Set<string>();

const bid = () => `b${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
const hhmm = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const fpOf = (mode: Mode, d: Draft, media: Record<string, Media>) => JSON.stringify(toWorkFields(mode, d, media));
const sameIds = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x) => b.includes(x));
const SAVE_FAILED = "บันทึกไม่สำเร็จ ลองอีกครั้ง";
const AUTOSAVE_MS = 1500;
/** Pictures + every video the old editor takes (MOV from iPhone, WebM…); videos become MP4 on upload. */
const ACCEPT_ALL = `image/*,${PROJECT_VIDEO_ACCEPT}`;
const isPicture = (f: File) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name);

/** `/portfolio/new` and `/portfolio/:id/edit` — post or edit a work (mock Upload.dc.html). */
export default function UploadPage() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  if (loading) return <div className="up-wait" aria-busy="true" />;
  if (!user) return <Navigate to={loginHref(location.pathname + location.search)} replace />;
  const editId = id && !liveCreated.has(id) ? id : null;
  return <UploadLoader key={editId ?? "new"} uid={user.id} editId={editId} />;
}

type Opened = { id: string; row: WorkRow; extras: WorkEditExtras | null; catalogIds: string[] };

const loadingWork = (
  <div className="up-wait">
    <ScLoader label="กำลังโหลดผลงาน" />
  </div>
);

function UploadLoader({ uid, editId }: { uid: string; editId: string | null }) {
  const q = useQuery({
    queryKey: ["sc-upload-work", editId],
    queryFn: async (): Promise<Opened | null> => {
      const [row, extras, catalogIds] = await Promise.all([getWork(editId!), getWorkEditExtras(editId!), getWorkCatalogIds(editId!)]);
      return row ? { id: editId!, row, extras, catalogIds } : null;
    },
    enabled: !!editId,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
  const admin = useIsAdmin();
  if (!editId) return <UploadEditor uid={uid} ownerId={uid} opened={null} />;
  if (q.isPending) return loadingWork;
  // Could not load (network, server): try again — not the 404.
  if (q.isError) {
    return q.isFetching ? (
      loadingWork
    ) : (
      <div className="up-wait">
        <LoadError onRetry={() => void q.refetch()} label="โหลดผลงานไม่ขึ้น ลองใหม่อีกทีนะ" />
      </div>
    );
  }
  if (!q.data) return <Navigate to="/error/404" replace />;
  const owner = q.data.row.owner_id;
  // Admins edit anyone's work, as in the old editor.
  if (owner !== uid) {
    if (admin.isPending) return loadingWork;
    if (!owner || !admin.data) return <Navigate to="/error/404" replace />;
  }
  return <UploadEditor uid={uid} ownerId={owner ?? uid} opened={q.data} />;
}

const invalidateKeys = (uid: string, id: string) => [
  ["sc-my-works", uid],
  ["sc-profile-works", uid],
  ["sc-my-catalogs", uid],
  ["sc-profile-catalogs", uid],
  ["sc-showcase"],
  ["sc-work", id],
  ["sc-work-catalog", id],
  ["project", id],
  ["my-projects"],
];

function UploadEditor({ uid, ownerId, opened }: { uid: string; ownerId: string; opened: Opened | null }) {
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();

  const [init] = useState(() => {
    if (!opened) {
      const draft = emptyDraft(bid());
      // "+ ลงงาน" from a catalog page: the new work goes into that catalog (old editor ?series=).
      const series = new URLSearchParams(location.search).get("series")?.trim();
      if (series && isUuid(series)) draft.catalogIds = [series];
      return { id: crypto.randomUUID(), status: "new" as Status, mode: "Basic" as Mode, draft, media: {} as Record<string, Media>, fp: null as string | null };
    }
    const o = fromWork({ ...opened.row, ...opened.extras }, bid);
    const draft = { ...o.draft, catalogIds: opened.catalogIds };
    const status: Status = opened.row.status === "Published" || opened.row.status === "Private" ? opened.row.status : "Draft";
    return { id: opened.id, status, mode: o.mode, draft, media: o.media, fp: fpOf(o.mode, draft, o.media) };
  });

  const [workId, setWorkId] = useState(init.id);
  // The row's owner: me, or someone else when an admin edits (their catalogs are not shown then).
  const [owner, setOwner] = useState(ownerId);
  const canCatalog = owner === uid;
  const [status, setStatus] = useState<Status>(init.status);
  const [mode, setMode] = useState<Mode>(init.mode);
  const h = useDraftHistory(() => init.draft);
  const d = h.draft;
  const up = useWorkUploads(uid, workId, init.media);
  const media = up.media;
  const profile = useMyProfile(uid).data;
  const catalogsQ = useMyCatalogs(uid).q;
  const catalogs = useMemo(() => catalogsQ.data ?? [], [catalogsQ.data]);

  const [menu, setMenu] = useState<TextMenu>(null);
  const [addAt, setAddAt] = useState<number | null>(null);
  const [tplAdd, setTplAdd] = useState<TplPanel>(null);
  const [tplSwap, setTplSwap] = useState<TplPanel>(null);
  const [tgTab, setTgTab] = useState<number | null>(null);
  const [moreOpen, setMoreOpen] = useState(() => !opened && init.draft.catalogIds.length > 0);
  const [tried, setTried] = useState(false);
  const [savedAt, setSavedAt] = useState("");
  const [pvOpen, setPvOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [agree, setAgree] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  // "new": first Publish; "edit": a work that was already out (mock copy differs).
  const [pubKind, setPubKind] = useState<"new" | "edit" | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | undefined>(undefined);
  const say = useCallback((t: string) => {
    window.clearTimeout(toastTimer.current);
    setToast(t);
    toastTimer.current = window.setTimeout(() => setToast(""), 3200);
  }, []);

  useEffect(() => ensureTextFonts(), []);

  const isEditPub = status === "Published" || status === "Private";
  const fields = useMemo(() => toWorkFields(mode, d, media), [mode, d, media]);
  const fieldsFp = useMemo(() => JSON.stringify(fields), [fields]);
  const savedFp = useRef<string | null>(init.fp);
  // CATALOG: what to write — my catalogs picked; null until my catalogs are known (or when an admin edits someone's work).
  const cats = useMemo(() => {
    if (!canCatalog || !catalogsQ.isSuccess) return null;
    const mine = new Set(catalogs.map((c) => c.id));
    return d.catalogIds.filter((c) => mine.has(c));
  }, [canCatalog, catalogsQ.isSuccess, catalogs, d.catalogIds]);
  const savedCats = useRef<string[]>(opened?.catalogIds ?? []);
  const catsDirty = !!cats && !sameIds(cats, savedCats.current.filter((c) => catalogs.some((x) => x.id === c)));
  const changed = fieldsFp !== savedFp.current || catsDirty;
  const fp = `${fieldsFp}|${cats ? cats.join(",") : "-"}`;
  const dirty = status === "new" ? hasContent(d) : changed;
  const ready = readiness(mode, d, media);
  const tryMiss = tried && !ready.ready;

  // What an async step (a save after an upload, a queued save) must read: the newest, not the render it began in.
  const live = useRef({ mode, d, status, workId, owner, cats });
  useLayoutEffect(() => {
    live.current = { mode, d, status, workId, owner, cats };
  });

  useEffect(() => {
    const id = workId;
    return () => {
      liveCreated.delete(id);
    };
  }, [workId]);

  // ---------- saving ----------

  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const persist = useCallback(
    (next: WorkWrite["status"], attest = false) => {
      const run = async () => {
        const { mode: m, d: dd, status: st, workId: id, owner: ow, cats: cc } = live.current;
        const md = up.latest();
        const f = toWorkFields(m, dd, md);
        const insert = st === "new";
        await saveWork(id, ow, { ...f, status: next }, { insert, attest });
        if (insert) liveCreated.add(id);
        live.current = { ...live.current, status: next };
        setStatus(next);
        if (cc && !sameIds(cc, savedCats.current)) {
          await setWorkCatalogs(id, cc, savedCats.current);
          savedCats.current = cc;
        }
        savedFp.current = JSON.stringify(f);
        setSavedAt(hhmm());
        if (insert) navigate(`/portfolio/${id}/edit`, { replace: true });
        for (const key of invalidateKeys(ow, id)) void qc.invalidateQueries({ queryKey: key });
      };
      const p = chain.current.then(run, run);
      chain.current = p.catch(() => undefined);
      return p;
    },
    [up, navigate, qc],
  );

  // Drafts save themselves (mock "Saved HH:MM"); a work that is already out saves only with "บันทึกการแก้ไข".
  const autosave = !isEditPub && !busy && !leaveOpen && !pubKind;
  useEffect(() => {
    if (!autosave || !changed) return;
    if (status === "new" && !(fields.title || fields.cover_url)) return;
    const t = window.setTimeout(() => {
      persist("Draft").catch(() => say(SAVE_FAILED));
    }, AUTOSAVE_MS);
    return () => window.clearTimeout(t);
    // fp re-arms the timer on every edit (changed alone stays true while typing).
  }, [autosave, changed, fp, status, fields.title, fields.cover_url, persist, say]);

  // Closing the tab with unsaved work or a running upload asks first.
  const guard = up.uploading || dirty;
  useEffect(() => {
    if (!guard) return;
    const f = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", f);
    return () => window.removeEventListener("beforeunload", f);
  }, [guard]);

  // ---------- undo / redo ----------

  const closeMenus = useCallback(() => {
    setAddAt(null);
    setTplAdd(null);
    setTplSwap(null);
    setMenu(null);
  }, []);
  const undo = useCallback(() => {
    h.undo();
    closeMenus();
  }, [h, closeMenus]);
  const redo = useCallback(() => {
    h.redo();
    closeMenus();
  }, [h, closeMenus]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const key = e.key.toLowerCase();
      if (key !== "z" && key !== "y") return;
      const t = e.target as HTMLElement | null;
      // In a field the browser's own undo works on the text (mock).
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      e.preventDefault();
      if (e.shiftKey || key === "y") redo();
      else undo();
    };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [undo, redo]);

  // ---------- files ----------

  const addFiles = useCallback(
    (files: File[], at: number | null) => {
      const items = files.map((f) => ({ id: bid(), file: f, type: (isVideoFile(f) ? "video" : "image") as "image" | "video" }));
      if (!items.length) return;
      h.update((dd) => {
        const blocks = dd.blocks.slice();
        blocks.splice(at ?? blocks.length, 0, ...items.map(({ id, type }) => ({ id, type })));
        return { ...dd, blocks };
      });
      items.forEach((it) => up.start(it.id, it.file));
      setAddAt(null);
    },
    [h, up],
  );

  const fillSlot = useCallback(
    (key: string, file: File) => {
      const mid = bid();
      h.update((dd) => ({ ...dd, fills: { ...dd.fills, [key]: mid } }));
      up.start(mid, file);
    },
    [h, up],
  );

  /** Pictures dropped or pasted in Template mode: the empty picture slots in order, then new "Full" rows (mock mode switch). */
  const addToTemplate = useCallback(
    (files: File[]) => {
      const pics = files.filter(isPicture);
      if (!pics.length) return;
      const ids = pics.map(() => bid());
      h.update((dd) => {
        const fills = { ...dd.fills };
        const rows = dd.rows.slice();
        const q = ids.slice();
        for (const r of rows) {
          cellsOf(r.layout).forEach((c, i) => {
            const k = slotKey(r.id, i);
            if (!isTextCell(c) && !fills[k] && q.length) fills[k] = q.shift()!;
          });
        }
        while (q.length) {
          const nr = { id: bid(), layout: "Full" as LayoutName };
          rows.push(nr);
          fills[slotKey(nr.id, 0)] = q.shift()!;
        }
        return { ...dd, rows, fills };
      });
      ids.forEach((id, i) => up.start(id, pics[i]));
    },
    [h, up],
  );

  const fileIn = useRef<HTMLInputElement>(null);
  const pickFor = useRef<{ at: number | null; slot?: string }>({ at: null });
  const openPicker = (accept: string, multiple: boolean) => {
    const el = fileIn.current;
    if (!el) return;
    el.accept = accept;
    el.multiple = multiple;
    el.value = "";
    el.click();
  };
  const pick = (at: number | null, videoOnly?: boolean) => {
    pickFor.current = { at };
    openPicker(videoOnly ? PROJECT_VIDEO_ACCEPT : ACCEPT_ALL, true);
  };
  const pickSlot = (key: string) => {
    pickFor.current = { at: null, slot: key };
    openPicker("image/*", false);
  };
  const onFiles = (list: FileList | null) => {
    const files = Array.from(list ?? []);
    if (!files.length) return;
    const { at, slot } = pickFor.current;
    if (slot) fillSlot(slot, files[0]);
    else addFiles(files, at);
  };

  const takeFiles = useCallback(
    (files: File[]) => {
      const ok = files.filter((f) => isPicture(f) || isVideoFile(f));
      if (!ok.length) return false;
      if (live.current.mode === "Basic") addFiles(ok, null);
      else addToTemplate(ok);
      return true;
    },
    [addFiles, addToTemplate],
  );

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []);
      if (files.length && takeFiles(files)) e.preventDefault();
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [takeFiles]);

  // Pictures shared from the Android share sheet (public/sw.js → /portfolio/new?shared=1), taken once.
  const sharedTaken = useRef(false);
  useEffect(() => {
    if (opened || sharedTaken.current) return;
    const params = new URLSearchParams(location.search);
    if (params.get("shared") !== "1") return;
    sharedTaken.current = true;
    params.delete("shared");
    const rest = params.toString();
    navigate({ pathname: location.pathname, search: rest ? `?${rest}` : "" }, { replace: true });
    void takeSharedMedia().then((files) => {
      if (files.length) takeFiles(files);
    });
  }, [opened, location.search, location.pathname, navigate, takeFiles]);

  // A block, slot or row taken away while its file is still going up: stop that upload (Publish no longer waits for it).
  const cancelUpload = up.cancel;
  useEffect(() => {
    const used = new Set(d.blocks.map((b) => b.id));
    for (const r of d.rows) {
      cellsOf(r.layout).forEach((c, i) => {
        const mid = d.fills[slotKey(r.id, i)];
        if (mid && !isTextCell(c)) used.add(mid);
      });
    }
    for (const [mid, m] of Object.entries(media)) if (m.progress != null && !used.has(mid)) cancelUpload(mid);
  }, [d.blocks, d.rows, d.fills, media, cancelUpload]);

  const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer.types).includes("Files");
  const onDragOver = (e: DragEvent) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    if (!dragging) setDragging(true);
  };
  const onDrop = (e: DragEvent) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    setDragging(false);
    takeFiles(Array.from(e.dataTransfer.files));
  };

  // ---------- editing ----------

  const setField = <K extends "title" | "desc" | "tags" | "year" | "ask" | "licenseNote">(k: K, v: string) => h.update((dd) => ({ ...dd, [k]: v }), k);
  const setMeta = (p: Partial<Pick<Draft, "tools" | "catalogIds" | "license" | "ai">>) => h.update((dd) => ({ ...dd, ...p }));
  const moveBlock = (i: number, dir: -1 | 1) =>
    h.update((dd) => {
      const j = i + dir;
      if (j < 0 || j >= dd.blocks.length) return dd;
      const blocks = dd.blocks.slice();
      [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
      return { ...dd, blocks };
    });
  const removeBlock = (i: number) => h.update((dd) => ({ ...dd, blocks: dd.blocks.filter((_, k) => k !== i) }));
  const addText = (at: number) => {
    h.update((dd) => {
      const blocks = dd.blocks.slice();
      blocks.splice(at, 0, { id: bid(), type: "text", text: "", style: DEFAULT_TEXT_STYLE });
      return { ...dd, blocks };
    });
    setAddAt(null);
  };
  const setBlockText = (id: string, text: string) =>
    h.update((dd) => ({ ...dd, blocks: dd.blocks.map((b) => (b.id === id && b.type === "text" ? { ...b, text } : b)) }), `t:${id}`);
  const setBlockStyle = (id: string, style: TextStyle) =>
    h.update((dd) => ({ ...dd, blocks: dd.blocks.map((b) => (b.id === id && b.type === "text" ? { ...b, style } : b)) }));

  const setRows = (fn: (rows: Draft["rows"]) => Draft["rows"]) => {
    h.update((dd) => ({ ...dd, rows: fn(dd.rows) }));
    setTplAdd(null);
    setTplSwap(null);
  };

  const switchMode = (t: Mode) => {
    if (t === mode) return;
    const pics = readyImageIds(d, media);
    const filled = Object.keys(d.fills).length > 0;
    // Pictures follow the switch (mock "รูปไม่หาย"): Basic → empty Template slots, Template → Basic when Basic has none.
    if (t === "Template" && !filled && pics.length) {
      h.update((dd) => {
        const fills: Record<string, string> = {};
        const rows = dd.rows.slice();
        const q = pics.slice();
        for (const r of rows) {
          cellsOf(r.layout).forEach((c, i) => {
            if (!isTextCell(c) && q.length) fills[slotKey(r.id, i)] = q.shift()!;
          });
        }
        while (q.length) {
          const nr = { id: bid(), layout: "Full" as LayoutName };
          rows.push(nr);
          fills[slotKey(nr.id, 0)] = q.shift()!;
        }
        return { ...dd, rows, fills };
      });
    }
    if (t === "Basic" && !pics.length && filled) {
      h.update((dd) => {
        const ids: string[] = [];
        for (const r of dd.rows) {
          cellsOf(r.layout).forEach((c, i) => {
            const mid = dd.fills[slotKey(r.id, i)];
            if (!isTextCell(c) && mid && !ids.includes(mid)) ids.push(mid);
          });
        }
        const have = new Set(dd.blocks.map((b) => b.id));
        return { ...dd, blocks: [...dd.blocks, ...ids.filter((x) => !have.has(x)).map((id) => ({ id, type: "image" as const }))] };
      });
    }
    setMode(t);
    closeMenus();
  };

  // ---------- publish / leave ----------

  const coverId = coverMediaId(mode, d, media);
  const cover = coverId ? media[coverId] : undefined;

  const goAway = (to?: string) => {
    if (to) navigate(to);
    else if (location.key !== "default") navigate(-1);
    else navigate(SC_LINKS.home);
  };

  const readyNow = () => readiness(live.current.mode, live.current.d, up.latest()).ready;

  const publish = async () => {
    setBusy(true);
    try {
      await up.settle();
      if (!readyNow()) {
        setConfirmOpen(false);
        setTried(true);
        return;
      }
      await persist("Published", true);
      setConfirmOpen(false);
      setPubKind("new");
    } catch {
      say(SAVE_FAILED);
    } finally {
      setBusy(false);
    }
  };

  const saveEdits = async () => {
    setBusy(true);
    try {
      await up.settle();
      if (!readyNow()) {
        setTried(true);
        return;
      }
      await persist(status === "Private" ? "Private" : "Published");
      setPubKind("edit");
    } catch {
      say(SAVE_FAILED);
    } finally {
      setBusy(false);
    }
  };

  const askPublish = () => {
    setPvOpen(false);
    if (busy) return;
    if (!ready.ready) {
      setTried(true);
      // The licence terms live under More.
      if (!ready.hasLicense) setMoreOpen(true);
      return;
    }
    if (isEditPub) {
      void saveEdits();
      return;
    }
    setAgree(false);
    setConfirmOpen(true);
  };

  const saveDraft = () => {
    if (isEditPub || !hasContent(d)) return;
    persist("Draft").catch(() => say(SAVE_FAILED));
  };

  const leaveJob = useRef<Promise<unknown> | null>(null);
  /** New work or draft with something on it: it is kept as a draft first (mock), then "บันทึกเป็นร่างแล้ว". */
  const keepAndAsk = () => {
    leaveJob.current = up.settle().then(() => persist("Draft"));
    leaveJob.current.catch(() => say(SAVE_FAILED));
    setLeaveOpen(true);
  };
  const tryLeave = () => {
    if (isEditPub) {
      if (dirty) setLeaveOpen(true);
      else goAway();
      return;
    }
    if (hasContent(d)) keepAndAsk();
    else goAway();
  };
  const leaveGo = async () => {
    if (isEditPub) {
      goAway(SC_LINKS.studioWorks);
      return;
    }
    setLeaving(true);
    try {
      await leaveJob.current;
      goAway(SC_LINKS.studioWorks);
    } catch {
      setLeaving(false);
      say(SAVE_FAILED);
    }
  };

  /** "ลงงานต่อ": a new work of mine; description, tags, tools, licence, AI, catalogs and the layout rows stay (mock `again`). */
  const again = () => {
    liveCreated.delete(workId);
    const id = crypto.randomUUID();
    const keep = { desc: d.desc, tags: d.tags, tools: d.tools, license: d.license, licenseNote: d.licenseNote, ai: d.ai };
    const next = { ...emptyDraft(bid()), rows: d.rows, slotTexts: d.slotTexts, ...keep, catalogIds: canCatalog ? d.catalogIds : [] };
    live.current = { mode, d: next, status: "new", workId: id, owner: uid, cats: canCatalog ? cats : null };
    savedFp.current = null;
    savedCats.current = [];
    setOwner(uid);
    setWorkId(id);
    setStatus("new");
    h.reset(next);
    up.replaceAll({});
    setTried(false);
    setSavedAt("");
    setPubKind(null);
    navigate(SC_LINKS.upload, { replace: true });
    window.scrollTo(0, 0);
  };

  // ---------- render ----------

  const pubLabel = isEditPub ? "บันทึกการแก้ไข" : "Publish";
  const checks: ReadonlyArray<readonly [string, boolean]> = [
    ["Image", ready.hasImage],
    ["Title", ready.hasTitle],
    ["Category", ready.hasCategory],
  ];

  return (
    <div className="up-page">
      <header className="up-hdw">
        <div className="up-hd">
          <div className="up-hd-l">
            <span className="up-logo">
              <img src={logoUrl} alt="samecor." />
            </span>
            <span className="up-div" aria-hidden="true" />
            <h1 className="up-h1">{isEditPub ? "Edit Work" : "New Work"}</h1>
          </div>
          <div className="up-hd-r">
            <div className="up-ur" role="group" aria-label="ย้อนกลับ / ทำซ้ำ">
              <button type="button" className="up-round40" aria-label="ย้อนกลับ (⌘Z)" title="Undo ⌘Z" aria-disabled={!h.canUndo} onClick={undo}>
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 14L4 9l5-5" />
                  <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
                </svg>
              </button>
              <button type="button" className="up-round40" aria-label="ทำซ้ำ (⇧⌘Z)" title="Redo ⇧⌘Z" aria-disabled={!h.canRedo} onClick={redo}>
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 14l5-5-5-5" />
                  <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
                </svg>
              </button>
            </div>
            <span className="up-div" aria-hidden="true" />
            <span className="up-saved" role="status">
              {savedAt && !isEditPub ? (
                <>
                  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 18.5h10a4 4 0 0 0 .6-7.96A6 6 0 0 0 6.1 9.6 4.5 4.5 0 0 0 7 18.5z" />
                    <path d="M9.5 13.5l2 2 3.5-3.5" />
                  </svg>
                  Saved {savedAt}
                </>
              ) : null}
            </span>
            <button type="button" className="up-close" aria-label="ปิด กลับไปหน้าก่อน" onClick={tryLeave}>
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.33" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="up-m">
        <div className="up-modes-row">
          <div className="up-modes" role="group" aria-label="โหมดการลงงาน">
            {(["Basic", "Template"] as const).map((t) => (
              <button key={t} type="button" className={mode === t ? "up-mode up-mode-on" : "up-mode"} aria-pressed={mode === t} onClick={() => switchMode(t)}>
                {t === "Basic" ? (
                  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
                    <rect x="5" y="3.5" width="14" height="8" rx="1.5" />
                    <rect x="5" y="13.5" width="14" height="7" rx="1.5" />
                  </svg>
                ) : (
                  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
                    <rect x="3.5" y="3.5" width="17" height="9" rx="1.5" />
                    <rect x="3.5" y="14.5" width="7.5" height="6" rx="1.5" />
                    <rect x="13" y="14.5" width="7.5" height="6" rx="1.5" />
                  </svg>
                )}
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="up-wrap">
          <section
            className={dragging ? "up-card up-card-drag" : "up-card"}
            aria-label="ตัวงาน"
            onDragOver={onDragOver}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
            }}
            onDrop={onDrop}
          >
            {mode === "Basic" ? (
              <BasicEditor
                blocks={d.blocks}
                media={media}
                coverId={basicCoverId(d, media)}
                menu={menu}
                setMenu={setMenu}
                addAt={addAt}
                setAddAt={setAddAt}
                onPick={pick}
                onAddText={addText}
                onMove={moveBlock}
                onRemove={removeBlock}
                onCover={(id) => h.update((dd) => ({ ...dd, coverId: id }))}
                onRetry={up.retry}
                onText={setBlockText}
                onStyle={setBlockStyle}
              />
            ) : (
              <TemplateEditor
                draft={d}
                media={media}
                coverKey={templateCoverKey(d, media)}
                menu={menu}
                setMenu={setMenu}
                adding={tplAdd}
                setAdding={setTplAdd}
                swapping={tplSwap}
                setSwapping={setTplSwap}
                tab={tgTab}
                setTab={setTgTab}
                onSwap={(ri, l) => setRows((rows) => rows.map((r, k) => (k === ri ? { id: r.id, layout: l } : r)))}
                onAddRow={(at, l) =>
                  setRows((rows) => {
                    const a = rows.slice();
                    a.splice(at, 0, { id: bid(), layout: l });
                    return a;
                  })
                }
                onMoveRow={(ri, dir) =>
                  setRows((rows) => {
                    const j = ri + dir;
                    if (j < 0 || j >= rows.length) return rows;
                    const a = rows.slice();
                    [a[ri], a[j]] = [a[j], a[ri]];
                    return a;
                  })
                }
                onRemoveRow={(ri) => setRows((rows) => rows.filter((_, k) => k !== ri))}
                onPickSlot={pickSlot}
                onClearSlot={(key) =>
                  h.update((dd) => {
                    const fills = { ...dd.fills };
                    delete fills[key];
                    return { ...dd, fills };
                  })
                }
                onRetrySlot={(key) => {
                  const mid = d.fills[key];
                  if (mid) up.retry(mid);
                }}
                onToggleFit={(key) => h.update((dd) => ({ ...dd, fit: { ...dd.fit, [key]: !dd.fit[key] } }))}
                onSlotText={(key, text) =>
                  h.update((dd) => ({ ...dd, slotTexts: { ...dd.slotTexts, [key]: { text, style: dd.slotTexts[key]?.style ?? DEFAULT_TEXT_STYLE } } }), `s:${key}`)
                }
                onSlotStyle={(key, style) => h.update((dd) => ({ ...dd, slotTexts: { ...dd.slotTexts, [key]: { text: dd.slotTexts[key]?.text ?? "", style } } }))}
              />
            )}
          </section>

          <aside className="up-side" aria-label="ข้อมูลงาน">
            <div className="up-f">
              <label htmlFor="up-title" className={tryMiss && !ready.hasTitle ? "up-lab up-lab-miss" : "up-lab"}>
                TITLE <span aria-hidden="true" className="up-req" />
              </label>
              <input
                id="up-title"
                className={tryMiss && !ready.hasTitle ? "up-fld up-fld-miss" : "up-fld"}
                type="text"
                value={d.title}
                maxLength={120}
                onChange={(e) => setField("title", e.target.value)}
                aria-required="true"
                placeholder="ชื่องาน"
              />
            </div>

            <div className="up-f">
              <label htmlFor="up-desc" className="up-lab">
                DESCRIPTION
              </label>
              <textarea id="up-desc" className="up-ta" rows={3} value={d.desc} onChange={(e) => setField("desc", e.target.value)} placeholder="ที่มา · แนวคิด · วัสดุ" />
            </div>

            <div className="up-f up-f-cat" role="group" aria-labelledby="up-field-l">
              <span id="up-field-l" className={tryMiss && !ready.hasCategory ? "up-lab up-lab-miss" : "up-lab"}>
                CATEGORY <span aria-hidden="true" className="up-req" />
              </span>
              <div className="up-chips">
                {SC_CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={d.category === c ? "up-chip up-chip-on" : "up-chip"}
                    aria-pressed={d.category === c}
                    onClick={() => h.update((dd) => ({ ...dd, category: dd.category === c ? null : c }))}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="up-f">
              <label htmlFor="up-tags" className="up-lab">
                TAGS
              </label>
              <input id="up-tags" className="up-fld" type="text" value={d.tags} onChange={(e) => setField("tags", e.target.value)} placeholder="riso, poster" />
            </div>

            <ToolsField uid={uid} tools={d.tools} onChange={(tools) => setMeta({ tools })} />

            <button type="button" className="up-more" aria-expanded={moreOpen} onClick={() => setMoreOpen((v) => !v)}>
              More
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666666" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={moreOpen ? "up-more-ar up-more-ar-on" : "up-more-ar"}>
                <path d="M6 9.5l6 6 6-6" />
              </svg>
            </button>

            {moreOpen ? (
              <div className="up-morebox">
                {/* YEAR + ASK VIEWERS shown again (owner 2026-11-28); CATALOG takes several (owner); "+ New" waits for Beam (question 47). */}
                {canCatalog ? <CatalogField catalogs={catalogs} value={d.catalogIds} onChange={(catalogIds) => setMeta({ catalogIds })} /> : null}
                <div className="up-f">
                  <label htmlFor="up-year" className="up-lab">
                    YEAR
                  </label>
                  <input id="up-year" className="up-fld up-fld-yr" type="text" inputMode="numeric" maxLength={4} value={d.year} onChange={(e) => setField("year", e.target.value.replace(/\D/g, ""))} />
                </div>
                <div className="up-f">
                  <label htmlFor="up-ask" className="up-lab">
                    ASK VIEWERS
                  </label>
                  <textarea id="up-ask" className="up-ta" rows={2} maxLength={140} value={d.ask} onChange={(e) => setField("ask", e.target.value)} placeholder="ตรงไหนดึงสายตาที่สุด?" />
                </div>
                <LicenseField
                  value={d.license}
                  note={d.licenseNote}
                  missing={tryMiss && !ready.hasLicense}
                  onChange={(license) => setMeta({ license })}
                  onNote={(v) => setField("licenseNote", v)}
                />
                <AiField value={d.ai} onChange={(ai) => setMeta({ ai })} />
              </div>
            ) : null}

            <span aria-hidden="true" className="up-hr" />

            <div className="up-checks" role="list" aria-label="สิ่งที่ต้องมีก่อนลงงาน">
              {checks.map(([label, ok]) => (
                <span key={label} role="listitem" className={ok ? "up-ck up-ck-ok" : tryMiss ? "up-ck up-ck-miss" : "up-ck"}>
                  {ok ? (
                    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                  ) : (
                    <span aria-hidden="true" className="up-ck-dot" />
                  )}
                  {label}
                  <span className="up-sr">{ok ? " ครบแล้ว" : " ยังไม่มี"}</span>
                </span>
              ))}
            </div>

            <div className="up-act">
              <button type="button" className={ready.ready ? "up-pub up-pub-on" : "up-pub"} aria-disabled={!ready.ready} aria-busy={busy} onClick={askPublish}>
                {pubLabel}
              </button>
              <div className={isEditPub ? "up-sub up-sub-1" : "up-sub"}>
                <button type="button" className="up-pv-btn" aria-label="Preview" onClick={() => setPvOpen(true)}>
                  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
                    <circle cx="12" cy="12" r="2.5" />
                  </svg>
                  <span className="up-pvt">Preview</span>
                </button>
                {isEditPub ? null : (
                  <button type="button" className="up-draft-btn" onClick={saveDraft}>
                    Save draft
                  </button>
                )}
              </div>
            </div>
          </aside>
        </div>
      </main>

      <input ref={fileIn} type="file" multiple accept={ACCEPT_ALL} className="up-file" tabIndex={-1} aria-hidden="true" onChange={(e) => onFiles(e.target.files)} />

      {leaveOpen ? <LeaveDialog isEditPub={isEditPub} busy={leaving} onGo={() => void leaveGo()} onStay={() => setLeaveOpen(false)} /> : null}
      {pvOpen ? (
        <UploadPreview
          items={previewItems(mode, d, media)}
          title={d.title}
          desc={d.desc}
          category={d.category}
          handle={profile?.username ?? ""}
          avatarUrl={profile?.avatar_url ?? null}
          pubLabel={pubLabel}
          notReady={!ready.ready}
          onClose={() => setPvOpen(false)}
          onPublish={askPublish}
        />
      ) : null}
      {confirmOpen ? (
        <ConfirmDialog
          thumb={mediaSrc(cover, 200)}
          title={d.title}
          agree={agree}
          setAgree={setAgree}
          busy={busy}
          onCancel={() => setConfirmOpen(false)}
          onDraft={() => {
            setConfirmOpen(false);
            keepAndAsk();
          }}
          onPublish={() => void publish()}
        />
      ) : null}
      {pubKind ? <PublishedDialog cover={mediaSrc(cover, 960)} isEditPub={pubKind === "edit"} title={d.title} workHref={`/showcase/${workId}`} onAgain={again} /> : null}
      {toast ? (
        <div className="up-toast" role="status">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
