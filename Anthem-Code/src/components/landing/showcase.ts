/** AI-generated example images and clips (public/landing/works). Never credited to or linked as a member's work. */
export type LandingWork = {
  id: string;
  title: string;
  category: string;
  src: string;
  /** Width/height for the gallery, so tiles keep their place while loading. Unknown for member works. */
  ratio?: string;
  /** Larger image for the viewer. */
  full?: string;
  video?: string;
  href?: string;
};

type Item = [id: string, title: string, ratio: string];

const examples = (category: string, items: Item[]): LandingWork[] =>
  items.map(([id, title, ratio]) => ({ id, title, category, ratio, src: `/landing/works/${id}.jpg` }));

const clips = (category: string, items: Item[]): LandingWork[] =>
  examples(category, items).map((w) => ({ ...w, video: `/landing/works/${w.id}.mp4` }));

export const SHOWCASE: LandingWork[] = [
  ...examples("Illustration / Art", [
    ["market", "ตลาดโคมไฟ", "3/4"],
    ["koi", "Twin Koi", "2/3"],
    ["charcoal", "นางรำ", "3/4"],
    ["riso", "Pink Elephant", "1/1"],
    ["orchid", "กล้วยไม้ป่า", "3/4"],
    ["panel", "Afternoon Reader", "4/3"],
    ["ceramic", "ช่างปั้นหม้อ", "3/4"],
    ["collage", "Cut Paper Bloom", "3/4"],
    ["house", "Hillside House", "16/9"],
    ["painting", "นาขั้นบันได", "16/9"],
  ]),
  ...examples("Photography", [
    ["silk", "Orange Silk", "3/4"],
    ["tuktuk", "ตุ๊กตุ๊กคืนฝนตก", "3/4"],
    ["concrete", "Concrete Rhythm", "2/3"],
    ["fisherman", "ลุงชาวเล", "1/1"],
    ["ridge", "ทะเลหมอก", "16/9"],
    ["mango", "ข้าวเหนียวมะม่วง", "1/1"],
    ["louvers", "White Curve", "3/4"],
    ["jasmine", "มาลัยมะลิ", "3/4"],
    ["stair", "Stairwell Light", "2/3"],
    ["ring", "Hammered Silver", "4/3"],
  ]),
  ...examples("Graphic / Branding", [
    ["poster", "Red Circles", "3/4"],
    ["tea", "ใบชา Packaging", "4/3"],
    ["books", "Shape Series", "4/3"],
    ["coffee", "Sun Roast Coffee", "3/4"],
    ["gig", "Sunset Gig Poster", "2/3"],
    ["lotus", "ลายบัว", "1/1"],
    ["stationery", "Studio Stationery", "4/3"],
    ["wave", "คลื่นอันดามัน", "3/4"],
    ["vinyl", "Moon Record", "1/1"],
    ["tote", "ฝูงปลา Tote", "3/4"],
  ]),
  ...examples("3D", [
    ["chrome", "Liquid Chrome", "1/1"],
    ["toy", "น้องใบไม้", "1/1"],
    ["clay", "ตึกแถวดินปั้น", "4/3"],
    ["lowpoly", "Low-Poly Island", "1/1"],
    ["teaset", "Pastel Tea Set", "3/4"],
    ["felt", "ตุ๊กตุ๊กผ้าสักหลาด", "1/1"],
    ["room", "Quiet Room", "3/4"],
    ["tiger", "เสือกระดาษ", "4/3"],
    ["granny", "คุณยาย Character Sheet", "3/4"],
    ["terracotta", "Twisted Form", "2/3"],
  ]),
  ...examples("UI/UX", [
    ["ui-editorial", "The Next Chapter", "16/9"],
    ["ui-habit", "Habit Tracker", "3/4"],
    ["ui-home", "Smart Home Dashboard", "4/3"],
    ["ui-fashion", "Silk Dress Store", "4/3"],
    ["ui-bank", "แอปการเงิน Good Money", "1/1"],
    ["ui-edit", "Video Editor", "3/2"],
    ["ui-hotel", "Tropical Sanctuary", "2/3"],
    ["ui-kanban", "บอร์ดงานทีม", "3/2"],
    ["ui-retro", "Game Launcher", "21/9"],
    ["ui-zen", "แอปสมาธิ Zen", "4/3"],
  ]),
  ...clips("Video / Film", [
    ["vid-silk", "Orange Drift", "9/16"],
    ["vid-ink", "Ink Bloom", "9/16"],
    ["vid-shadow", "เงาใบมะพร้าว", "16/9"],
    ["vid-bicycle", "Evening Ride", "16/9"],
    ["vid-waves", "Midnight Shore", "1/1"],
    ["vid-claycat", "แมวบนหลังคา", "4/3"],
    ["vid-bauhaus", "Circles in Motion", "1/1"],
    ["vid-shapes", "จังหวะรูปทรง", "3/4"],
    ["vid-tiles", "Tile Wave", "4/3"],
    ["vid-terraces", "เมฆเหนือนาขั้นบันได", "16/9"],
  ]),
];

export const SHOWCASE_CATEGORIES = [...new Set(SHOWCASE.map((w) => w.category))];

export const SHOWCASE_HERO = ["market", "silk", "poster", "chrome", "ceramic"].map((id) => SHOWCASE.find((w) => w.id === id)!);

export const SHOWCASE_WIDE = ["painting", "house", "motion"].map((id) => `/landing/works/${id}.jpg`);

export const PER_CATEGORY = 10;
// How many tiles each category gets under All, in SHOWCASE_CATEGORIES order. 15 in total.
const ALL_SPLIT = [3, 3, 3, 2, 2, 2];

// Hand-picked member works: Tra+veler, light bends and silence glows. New posts stay off this page until added here.
const FEATURED_MEMBER_WORKS = new Set(["3a08479e-ec0b-40bd-b54c-cb1a2724460a", "acfff42e-8539-4979-a7a3-7ca439e26f68"]);

/** Weaves member works into the examples: one after every third example of the same category. */
export function buildShowcase(members: LandingWork[]) {
  const byCategory = Object.fromEntries(
    SHOWCASE_CATEGORIES.map((category) => {
      const own = members.filter((w) => w.category === category && FEATURED_MEMBER_WORKS.has(w.id));
      const mixed = SHOWCASE.filter((w) => w.category === category).flatMap((w, i) =>
        i % 3 === 1 && own[(i - 1) / 3] ? [w, own[(i - 1) / 3]] : [w],
      );
      return [category, mixed.slice(0, PER_CATEGORY)];
    }),
  );
  const all = [0, 1, 2].flatMap((round) =>
    SHOWCASE_CATEGORIES.flatMap((category, i) => (round < ALL_SPLIT[i] ? [byCategory[category][round]] : [])),
  );
  return { all, byCategory };
}
