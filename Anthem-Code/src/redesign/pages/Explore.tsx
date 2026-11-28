import { useMemo } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { decodeExploreParam } from "@/lib/exploreRoutes";
import { setExploreFollow } from "@/server/mutations/explore";
import { exploreFollowValue, getExploreFollowing, getExplorePool } from "@/server/queries/explore";
import { filterExplore, type ExploreKind, type ExploreSort } from "../explore/explore";
import { useTiles } from "../explore/useTiles";
import Masonry from "../main/Masonry";
import ScLoader from "../main/ScLoader";
import { useSaveFlow } from "../main/useSaveFlow";
import type { TileWork } from "../main/WorkTile";
import { count } from "../profile/tiles";
import { SC_LINKS } from "../routes";
import "../styles/fonts.css";
import "../styles/tokens.css";
import "../styles/reset.css";
import "../styles/main.css";
import "../styles/profile.css";
import "../styles/explore.css";

const SORTS: ReadonlyArray<readonly [ExploreSort, string]> = [
  ["new", "ใหม่สุด"],
  ["views", "วิวเยอะสุด"],
  ["likes", "ถูกใจเยอะสุด"],
];
const isSort = (v: string | null): v is ExploreSort => v === "views" || v === "likes";

export const explorePoolQuery = { queryKey: ["sc-explore-pool"] as const, queryFn: getExplorePool, staleTime: 5 * 60_000 };

/**
 * `/explore/tag/:value` and `/explore/tool/:value` (old URLs) — every published work with one tag or one
 * tool, laid out like a profile (owner 2026-11-28): the tag on the left with its count and a follow button
 * (new works with it reach my notifications), the works on the right with the sorts as tabs. Not in the mock.
 */
export default function ExplorePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { value: raw } = useParams<{ value: string }>();
  const kind: ExploreKind = location.pathname.startsWith("/explore/tool") ? "tool" : "tag";
  const value = decodeExploreParam(raw).replace(/^#+/, "");
  const [params, setParams] = useSearchParams();
  const sortParam = params.get("sort");
  const sort: ExploreSort = isSort(sortParam) ? sortParam : "new";
  const { user } = useAuth();
  const qc = useQueryClient();

  const pool = useQuery(explorePoolQuery);
  const rows = useMemo(() => filterExplore(pool.data ?? [], kind, value, sort), [pool.data, kind, value, sort]);
  const tiles = useTiles(rows);
  const linkState = useMemo(() => ({ backgroundLocation: location, scList: tiles.map((t) => t.id) }), [location, tiles]);
  const saves = useSaveFlow();
  const toggleSave = (w: TileWork, el: HTMLElement) => saves.toggle({ id: w.id, title: w.title }, el);

  const followKey = ["sc-explore-follow", user?.id, kind, exploreFollowValue(value)];
  const following = useQuery({ queryKey: followKey, queryFn: () => getExploreFollowing(user!.id, kind, value), enabled: !!user && !!value });
  const follow = useMutation({
    mutationFn: (on: boolean) => setExploreFollow(user!.id, kind, value, on),
    onMutate: (on) => qc.setQueryData(followKey, on),
    onError: (_e, on) => qc.setQueryData(followKey, !on),
  });
  const isFollowing = !!following.data;

  const pickSort = (s: ExploreSort) => {
    const next = new URLSearchParams(params);
    if (s === "new") next.delete("sort");
    else next.set("sort", s);
    setParams(next, { replace: true, preventScrollReset: true });
  };

  const title = kind === "tag" ? `#${value}` : value;
  return (
    <main className="sc-main pf-m ex-m">
      <div className="pf-grid">
        <aside aria-label={title} className="pf-aside ex-aside">
          <span className="ex-kick">{kind === "tag" ? "TAG" : "TOOL"}</span>
          <h1>{title}</h1>
          <p className="ex-count">{pool.isPending ? "" : `${count(rows.length)} ผลงาน`}</p>
          {value ? (
            <button
              type="button"
              className="ex-follow"
              aria-pressed={isFollowing}
              data-on={isFollowing ? "" : undefined}
              onClick={() => {
                if (!user) navigate(`${SC_LINKS.login}?redirect=${encodeURIComponent(location.pathname)}`);
                else follow.mutate(!isFollowing);
              }}
              title={kind === "tag" ? "แจ้งเตือนเมื่อมีผลงานใหม่ในแท็กนี้" : "แจ้งเตือนเมื่อมีผลงานใหม่ที่ใช้เครื่องมือนี้"}
            >
              {isFollowing ? "ติดตามแล้ว" : "ติดตาม"}
            </button>
          ) : null}
        </aside>

        <section aria-label="ผลงาน" className="pf-card ex-card">
          <nav aria-label="เรียงผลงาน" className="pf-tabs">
            {SORTS.map(([k, label]) => (
              <button key={k} type="button" aria-pressed={sort === k} onClick={() => pickSort(k)}>
                {label}
              </button>
            ))}
          </nav>
          {pool.isPending ? (
            <ScLoader label="กำลังโหลดผลงาน" />
          ) : tiles.length ? (
            <Masonry works={tiles} label={title} savedIds={saves.ids} onToggleSave={toggleSave} linkState={linkState} />
          ) : (
            <p className="mn-none">ไม่เจอสิ่งที่ตรงกัน</p>
          )}
        </section>
      </div>
      {saves.element}
    </main>
  );
}
