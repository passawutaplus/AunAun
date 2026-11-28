import { useMemo, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import { DEFAULT_SIMILAR_ASPECTS, SIMILAR_ASPECTS, useSimilarImages, type SimilarAspect } from "@/hooks/useSimilarImages";
import { isProxyableImageUrl, proxiedImageUrl } from "@/lib/imageProxy";
import { useTiles } from "../explore/useTiles";
import { similarHref } from "../explore/explore";
import Masonry from "../main/Masonry";
import ScLoader from "../main/ScLoader";
import { useSaveFlow } from "../main/useSaveFlow";
import type { TileWork } from "../main/WorkTile";
import { useWork } from "../work/useWork";
import "../styles/fonts.css";
import "../styles/tokens.css";
import "../styles/reset.css";
import "../styles/main.css";
import "../styles/explore.css";

/** A match this close is "ใกล้เคียงมาก" (old page). */
const STRONG = 0.3;

/**
 * `/similar/:projectId?src=<picture>` (old URL; `?img=N` still works) — pictures by other people that
 * look like one picture of this work, in the new look: the picture on top, the four kinds of likeness
 * as toggles, then the matches. Not in the mock: owner asked 2026-11-28. Matching is the old engine.
 */
export default function SimilarPage() {
  const { projectId = "" } = useParams<{ projectId: string }>();
  const location = useLocation();
  const [params] = useSearchParams();
  const srcParam = params.get("src") ?? "";
  // Only pictures from our own storage can be the source (the picture is read into a canvas).
  const src = srcParam && isProxyableImageUrl(srcParam) ? srcParam : undefined;
  const img = Math.max(0, Number(params.get("img")) || 0);
  const [aspects, setAspects] = useState<SimilarAspect[]>(DEFAULT_SIMILAR_ASPECTS);

  // Looking for similar pictures is not a visit to the work: no view counted.
  const { work, owner, media } = useWork(projectId, { countView: false });
  const row = work.data;
  const pictures = useMemo(() => media.filter((m) => m.kind === "image"), [media]);
  const source = src ?? pictures[img]?.url ?? pictures[0]?.url ?? "";
  const sourceRatio = pictures.find((p) => p.url === source)?.ratio ?? null;

  const q = useSimilarImages(projectId, aspects, img, src);
  const ownerId = row?.owner_id ?? null;
  const results = useMemo(() => (q.data ?? []).filter((s) => !ownerId || s.owner_id !== ownerId), [q.data, ownerId]);
  const strongRows = useMemo(() => results.filter((s) => s.similarity >= STRONG), [results]);
  const otherRows = useMemo(() => results.filter((s) => s.similarity < STRONG), [results]);
  const toRow = (s: (typeof results)[number]) => ({ id: s.project_id, title: s.title, cover_url: null, owner_id: s.owner_id, picture: s.image_url, ratio: null });
  const strong = useTiles(useMemo(() => strongRows.map(toRow), [strongRows]));
  const others = useTiles(useMemo(() => otherRows.map(toRow), [otherRows]));
  const linkState = useMemo(() => ({ backgroundLocation: location, scList: [...strong, ...others].map((t) => t.id) }), [location, strong, others]);
  const saves = useSaveFlow();
  const toggleSave = (w: TileWork, el: HTMLElement) => saves.toggle({ id: w.id, title: w.title }, el);

  const flip = (a: SimilarAspect) =>
    setAspects((cur) => (cur.includes(a) ? (cur.length > 1 ? cur.filter((x) => x !== a) : cur) : [...cur, a]));

  const title = row?.title?.trim() || "";
  const artist = owner.data?.display_name?.trim() || owner.data?.username || "";
  return (
    <main className="sc-main mn ex-m">
      <div className="ex-head">
        <span className="ex-kick">SIMILAR</span>
        <h1>ภาพคล้าย</h1>
        {row ? (
          <Link to={`/showcase/${projectId}`} className="ex-from">
            จาก “{title || "Untitled"}”{artist ? ` · ${artist}` : ""}
          </Link>
        ) : null}
        {source ? (
          <span className="ex-src" style={{ aspectRatio: String(sourceRatio ?? 1) }}>
            <img src={proxiedImageUrl(source, 640)} alt="" style={sourceRatio ? undefined : { objectFit: "contain" }} />
          </span>
        ) : null}
        {pictures.length > 1 ? (
          <div className="ex-thumbs" role="group" aria-label="ค้นจากภาพอื่นในงานนี้">
            {pictures.map((p, i) => (
              <Link
                key={p.url}
                to={similarHref(projectId, p.url)}
                replace
                className="ex-thumb"
                aria-label={`ภาพที่ ${i + 1}`}
                aria-current={p.url === source ? "true" : undefined}
              >
                <img src={proxiedImageUrl(p.url, 160)} alt="" />
              </Link>
            ))}
          </div>
        ) : null}
        <div className="ex-aspects" role="group" aria-label="คล้ายกันด้าน">
          {SIMILAR_ASPECTS.map((a) => (
            <button key={a.key} type="button" className="ex-aspect" aria-pressed={aspects.includes(a.key)} title={a.hint} onClick={() => flip(a.key)}>
              {a.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mn-card ex-card">
        {q.isPending ? (
          <ScLoader label="กำลังหาภาพคล้าย" />
        ) : strong.length || others.length ? (
          <>
            {strong.length ? (
              <section className="ex-sec">
                <h2 className="ex-h2">ใกล้เคียงมาก</h2>
                <Masonry works={strong} label="ใกล้เคียงมาก" savedIds={saves.ids} onToggleSave={toggleSave} linkState={linkState} />
              </section>
            ) : null}
            {others.length ? (
              <section className="ex-sec">
                <h2 className="ex-h2">{strong.length ? "อาจสนใจ" : "ใกล้เคียง"}</h2>
                <Masonry works={others} label="อาจสนใจ" savedIds={saves.ids} onToggleSave={toggleSave} linkState={linkState} />
              </section>
            ) : null}
          </>
        ) : (
          <p className="mn-none">ยังไม่พบภาพที่ใกล้เคียงพอ · ลองเปิดด้านอื่นเพิ่ม</p>
        )}
      </div>
      {saves.element}
    </main>
  );
}
