import { beforeEach, describe, expect, it, vi } from "vitest";

type Result = { data: unknown; error: unknown };

const h = vi.hoisted(() => ({
  tables: {} as Record<string, Result>,
  listed: [] as { id: string | null; name: string }[],
  removed: [] as { bucket: string; paths: string[] }[],
  userId: "" as string | null,
}));

vi.mock("@/integrations/supabase/client", () => {
  const builder = (table: string) => {
    const b = {
      select: () => b,
      eq: () => b,
      limit: () => b,
      maybeSingle: () => Promise.resolve(h.tables[table]),
      then: (resolve: (r: Result) => unknown) => Promise.resolve(h.tables[table]).then(resolve),
    };
    return b;
  };
  return {
    supabase: {
      auth: {
        getSession: () =>
          Promise.resolve({ data: { session: h.userId ? { user: { id: h.userId } } : null } }),
      },
      from: (table: string) => builder(table),
      storage: {
        from: (bucket: string) => ({
          list: () => Promise.resolve({ data: h.listed, error: null }),
          remove: (paths: string[]) => {
            h.removed.push({ bucket, paths });
            return Promise.resolve({ data: [], error: null });
          },
        }),
      },
    },
  };
});

import {
  collectProjectFileRefs,
  removeUnreferencedProjectFiles,
  snapshotProjectFiles,
} from "@/lib/projectMediaCleanup";

const USER = "e4318e64-9eb1-4f29-9c44-af9082801abe";
const OTHER = "82039b6d-cdf4-4c46-958a-d770d849382c";
const FOLDER = "53c933d1-5de4-4de3-aa5f-2e7f8e5d8479";
const WORK = "744845a7-0000-4000-8000-000000000001";
const BASE = "https://x.supabase.co/storage/v1/object/public/project-media";
const cover = `anthem/${USER}/${FOLDER}/fca66cd1-024a-4145-b4d6-44af5025234d.webp`;
const block = `anthem/${USER}/${FOLDER}/11111111-2222-4333-8444-555555555555.png`;
const attachment = `${USER}/${FOLDER}/assets/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee-brief (1).pdf`;

const row = {
  cover_url: `${BASE}/${cover}`,
  gallery_urls: [`${BASE}/${cover}?width=800`],
  video_urls: [],
  content_blocks: [{ type: "image", items: [{ url: `${BASE}/${block}` }] }],
  context_images: {},
  flex_grid_layout: null,
  project_assets: [{ storage_path: attachment, label: "Brief" }],
};

beforeEach(() => {
  h.tables = {};
  h.listed = [];
  h.removed = [];
  h.userId = USER;
});

describe("collectProjectFileRefs", () => {
  it("finds the user's files in urls, nested blocks and attachment paths", () => {
    const refs = collectProjectFileRefs(row, USER);
    expect([...refs.media].sort()).toEqual([block, cover].sort());
    expect([...refs.assets]).toEqual([attachment]);
  });

  it("ignores other users' files and folders that are not a work folder", () => {
    const refs = collectProjectFileRefs(
      {
        cover_url: `${BASE}/anthem/${OTHER}/${FOLDER}/a.webp`,
        gallery_urls: [
          `${BASE}/anthem/${USER}/avatar/a.webp`,
          `${BASE}/anthem/${USER}/community-${FOLDER}/a.webp`,
          `${BASE}/anthem/chat/${FOLDER}/a.webp`,
          "https://example.com/a.webp",
        ],
      },
      USER,
    );
    expect(refs.media.size).toBe(0);
    expect(refs.assets.size).toBe(0);
  });

  it("returns nothing for a user id that is not a uuid", () => {
    expect(collectProjectFileRefs(row, ".*").media.size).toBe(0);
  });
});

describe("snapshotProjectFiles", () => {
  it("adds files left in the work's own folder and skips sub-folders", async () => {
    h.tables.projects = { data: row, error: null };
    h.listed = [
      { id: "1", name: "old-cover.webp" },
      { id: null, name: "assets" },
    ];
    const snap = await snapshotProjectFiles(WORK);
    expect(snap?.userId).toBe(USER);
    expect(snap?.media.has(`anthem/${USER}/${WORK}/old-cover.webp`)).toBe(true);
    expect(snap?.media.has(`anthem/${USER}/${WORK}/assets`)).toBe(false);
    expect(snap?.media.has(cover)).toBe(true);
  });

  it("returns null when signed out or the row cannot be read", async () => {
    h.tables.projects = { data: row, error: null };
    h.userId = null;
    expect(await snapshotProjectFiles(WORK)).toBeNull();
    h.userId = USER;
    h.tables.projects = { data: null, error: { message: "nope" } };
    expect(await snapshotProjectFiles(WORK)).toBeNull();
  });
});

describe("removeUnreferencedProjectFiles", () => {
  const snapshot = () => ({ userId: USER, ...collectProjectFileRefs(row, USER) });

  it("removes media and attachments nothing else uses", async () => {
    h.tables.projects = { data: [], error: null };
    h.tables.community_posts = { data: [], error: null };
    await removeUnreferencedProjectFiles(snapshot());
    expect(h.removed).toEqual([
      { bucket: "project-media", paths: expect.arrayContaining([cover, block, `${cover}.w640.webp`, `${block}.w640.webp`]) },
      { bucket: "project-assets", paths: [attachment] },
    ]);
    expect(h.removed[0].paths).toHaveLength(4);
  });

  it("keeps a file a community post still shows", async () => {
    h.tables.projects = { data: [], error: null };
    h.tables.community_posts = { data: [{ gallery_urls: [`${BASE}/${cover}`], video_urls: [] }], error: null };
    await removeUnreferencedProjectFiles(snapshot());
    expect(h.removed[0]).toEqual({ bucket: "project-media", paths: [block, `${block}.w640.webp`] });
  });

  it("keeps a file another work still uses", async () => {
    h.tables.projects = { data: [{ content_blocks: [{ url: `${BASE}/${block}` }] }], error: null };
    h.tables.community_posts = { data: [], error: null };
    await removeUnreferencedProjectFiles(snapshot());
    expect(h.removed[0]).toEqual({ bucket: "project-media", paths: [cover, `${cover}.w640.webp`] });
  });

  it("keeps a small copy whose original is still shown, and does not list one twice", async () => {
    h.tables.projects = { data: [], error: null };
    h.tables.community_posts = { data: [{ gallery_urls: [`${BASE}/${cover}`], video_urls: [] }], error: null };
    const snap = snapshot();
    // The folder sweep found the small copies as plain files.
    snap.media.add(`${cover}.w640.webp`);
    snap.media.add(`${block}.w640.webp`);
    await removeUnreferencedProjectFiles(snap);
    expect(h.removed[0]).toEqual({ bucket: "project-media", paths: [block, `${block}.w640.webp`] });
  });

  it("removes nothing when the reference check fails", async () => {
    h.tables.projects = { data: null, error: { message: "timeout" } };
    h.tables.community_posts = { data: [], error: null };
    await removeUnreferencedProjectFiles(snapshot());
    expect(h.removed).toEqual([]);
  });
});
