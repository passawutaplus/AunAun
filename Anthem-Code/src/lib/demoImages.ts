/** Demo catalog imagery — generated design artifacts + portraits. */

const USERNAMES = [
  "phatsawut",
  "napatsara",
  "pimchanok",
  "wannakorn",
  "thanya",
  "chatchai",
  "atittaya",
  "ploypailin",
  "thanakorn",
  "anucha",
  "parichat",
  "jessada",
  "supatra",
  "wathanyu",
  "kritsana",
  "siriporn",
  "kittipong",
  "manatsanan",
  "nattawut",
  "phattranit",
] as const;

function catalogPath(kind: "covers" | "avatars", index: number): string {
  const i = ((index % 20) + 20) % 20;
  const pad = String(i).padStart(2, "0");
  return `/demo-catalog/${kind}/${pad}-${USERNAMES[i]}.png`;
}

export function demoImageUrl(index = 0, _w = 1200, _h = 900): string {
  return catalogPath("covers", index);
}

/** Uncropped cover path — for feed masonry. */
export function demoImageUrlNatural(index = 0, _w = 1200): string {
  return catalogPath("covers", index);
}

export function demoAvatarUrl(index = 0): string {
  return catalogPath("avatars", index);
}

export function resolveProjectImage(url: string | null | undefined, index = 0): string {
  if (url?.startsWith("/demo-catalog/") || url?.includes("/demo-catalog/")) return url;
  if (url?.startsWith("https://") || url?.startsWith("http://")) return url;
  return demoImageUrl(index);
}
