/**
 * Home layouts that never crop a work (design rules B1, mock Main.dc.html).
 *
 * Bento ("All"): a block is 2–4 columns, a column stacks 1–2 works. Pattern repeats
 * [1,2,2] [1,1,1,1] [2,2,1] [1,1,1]. Column widths are solved so every column of a block ends
 * at the same height:  S = Σ(1/ratio),  width ∝ (H − gaps) / S.
 * The first screen shows 14 works, each further load adds 17 (= one full round of the pattern),
 * so blocks that are already on screen never change.
 */
export const BENTO_FIRST = 14;
export const BENTO_STEP = 17;

const PATTERNS = [[1, 2, 2], [1, 1, 1, 1], [2, 2, 1], [1, 1, 1]];
/** Inner width of the white card at 1440px, the width the mock solves for. */
const TRACK = 1168;
const GAP = 20;

export type BentoCell<T> = { item: T; ratio: number; isNew: boolean };
export type BentoBlock<T> = { cols: Array<{ width: string; delay: number; cells: BentoCell<T>[] }> };

export function bentoBlocks<T>(items: readonly T[], ratioOf: (item: T) => number): BentoBlock<T>[] {
  const blocks: BentoBlock<T>[] = [];
  let next = 0;
  for (let b = 0; next < items.length; b++) {
    let pattern = PATTERNS[b % PATTERNS.length];
    const need = pattern.reduce((a, n) => a + n, 0);
    const left = items.length - next;
    if (left < need) pattern = Array<number>(Math.min(left, 4)).fill(1);

    const cols = pattern
      .map((count) => {
        const cells: BentoCell<T>[] = [];
        for (let q = 0; q < count && next < items.length; q++, next++) {
          cells.push({ item: items[next], ratio: ratioOf(items[next]) || 1, isNew: next >= BENTO_FIRST });
        }
        return cells;
      })
      .filter((cells) => cells.length > 0);

    const sums = cols.map((cells) => cells.reduce((a, c) => a + 1 / c.ratio, 0));
    let sumInv = 0;
    let sumGap = 0;
    cols.forEach((cells, i) => {
      sumInv += 1 / sums[i];
      sumGap += (cells.length - 1) / sums[i];
    });
    const gaps = (cols.length - 1) * GAP;
    let height = (TRACK - gaps + GAP * sumGap) / sumInv;
    if (cols.length < 3) height = Math.min(height, 520); // a short last block must not grow huge
    const avail = TRACK - gaps;

    blocks.push({
      cols: cols.map((cells, i) => ({
        cells,
        delay: i * 0.08,
        width: `calc((100% - ${gaps}px) * ${(((height - (cells.length - 1) * GAP) / sums[i]) / avail).toFixed(5)})`,
      })),
    });
  }
  return blocks;
}

/**
 * One category: masonry on a 10px row grid. Wide landscape works (ratio ≥ 1.55) span two columns.
 * Rows are rounded up and the picture frame keeps its exact ratio inside the cell, so nothing is cropped.
 */
export const MASONRY_ROW = 10;
export const MASONRY_GAP = 20;

export function masonrySpan(ratio: number, columnWidth: number, columns: number) {
  const r = ratio || 1;
  const cols = Math.min(r >= 1.55 ? 2 : 1, columns);
  const height = (cols * columnWidth + (cols - 1) * MASONRY_GAP) / r;
  return { cols, rows: Math.ceil((height + MASONRY_GAP) / MASONRY_ROW) };
}
