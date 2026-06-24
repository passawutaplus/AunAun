/** Verified working Unsplash IDs for demo seed (checked 2026-06). */
export const UNSPLASH_ART = [
  "1618005182384-a83a8bd57fbe",
  "1561070791-2526d30994b5",
  "1503387762-592deb58ef4e",
  "1460925895917-afdab827c52f",
  "1486312338219-ce68d2c6f44d",
  "1556761175-b413da4baf72",
  "1551288049-bebda4e38f71",
  "1553877522-43269d4ea984",
  "1551434678-e076c223a692",
  "1522071820081-009f0129c71c",
  "1552664730-d307ca884978",
  "1600880292203-757bb62b4baf",
  "1498050108023-c5249f4df085",
  "1517248135467-4c7edcad34c4",
  "1551650975-87deedd944c3",
  "1516321318423-f06f85e504b3",
  "1563986768609-322da13575f3",
  "1558618666-fcd25c85cd64",
  "1519389950473-47ba0277781c",
  "1555949963-aa79dcee981c",
];

export function unsplashArt(i, w = 1200, h = 900) {
  const id = UNSPLASH_ART[((i % UNSPLASH_ART.length) + UNSPLASH_ART.length) % UNSPLASH_ART.length];
  return `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&q=80&auto=format`;
}

export function unsplashGallery(i) {
  return [unsplashArt(i), unsplashArt(i + 7), unsplashArt(i + 13)];
}

/** SQL array literal for migrations */
export function unsplashArtSqlArray() {
  return `ARRAY[\n      ${UNSPLASH_ART.map((id) => `'${id}'`).join(",\n      ")}\n    ]`;
}
