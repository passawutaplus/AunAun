/** AI-generated example images (public/landing/works). Never credited to or linked as a member's work. */
export type LandingWork = { id: string; title: string; category: string; src: string; href?: string };

const example = (id: string, title: string, category: string): LandingWork => ({
  id,
  title,
  category,
  src: `/landing/works/${id}.jpg`,
});

export const SHOWCASE: LandingWork[] = [
  example("market", "Night market", "Illustration / Art"),
  example("silk", "Silk", "Photography"),
  example("poster", "Poster", "Graphic / Branding"),
  example("chrome", "Chrome form", "3D"),
  example("ceramic", "Potter, linocut", "Illustration / Art"),
  example("collage", "Collage", "Illustration / Art"),
  example("app", "Music app", "UI/UX"),
  example("toy", "Art toy", "3D"),
  example("tea", "Tea packaging", "Graphic / Branding"),
  example("motion", "Hand-painted animation", "Video / Film"),
  example("house", "Architect's sketch", "Illustration / Art"),
  example("painting", "Rice terraces", "Illustration / Art"),
];

export const SHOWCASE_WIDE = ["painting", "house", "motion"].map((id) => `/landing/works/${id}.jpg`);
