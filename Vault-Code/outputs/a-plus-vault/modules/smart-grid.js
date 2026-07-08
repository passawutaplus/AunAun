/**
 * Deterministic Smart Grid layout engine (no AI).
 * Presets: balanced, masonry, editorial, hero_support, contact
 */

export function packSmartGrid(items, options = {}) {
  const preset = options.preset || "balanced";
  const gap = Number(options.gap) || 16;
  const padding = Number(options.padding) || 24;
  const width = Number(options.width) || 1200;
  const list = Array.isArray(items) ? items : [];
  if (!list.length) return [];

  switch (preset) {
    case "masonry":
      return packMasonry(list, width, gap, padding);
    case "editorial":
      return packEditorial(list, width, gap, padding);
    case "hero_support":
      return packHeroSupport(list, width, gap, padding);
    case "contact":
      return packContact(list, width, gap, padding);
    case "balanced":
    default:
      return packBalanced(list, width, gap, padding);
  }
}

function packBalanced(list, width, gap, padding) {
  const cols = list.length <= 2 ? list.length : list.length <= 6 ? 3 : 4;
  const inner = width - padding * 2 - gap * (cols - 1);
  const colW = inner / cols;
  return list.map((item, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const aspect = Math.max(0.55, Math.min(1.6, Number(item.aspect) || 1));
    const h = colW / aspect;
    return {
      id: item.id,
      x: padding + col * (colW + gap),
      y: padding + row * (Math.max(180, colW / 0.85) + gap),
      w: colW,
      h: Math.max(140, h)
    };
  });
}

function packMasonry(list, width, gap, padding) {
  const cols = 3;
  const inner = width - padding * 2 - gap * (cols - 1);
  const colW = inner / cols;
  const colY = Array(cols).fill(padding);
  return list.map((item) => {
    const aspect = Math.max(0.5, Math.min(1.8, Number(item.aspect) || 1));
    const h = Math.max(140, colW / aspect);
    let col = 0;
    for (let c = 1; c < cols; c++) if (colY[c] < colY[col]) col = c;
    const cell = {
      id: item.id,
      x: padding + col * (colW + gap),
      y: colY[col],
      w: colW,
      h
    };
    colY[col] += h + gap;
    return cell;
  });
}

function packEditorial(list, width, gap, padding) {
  if (!list.length) return [];
  const hero = list[0];
  const rest = list.slice(1);
  const heroW = (width - padding * 2) * 0.62;
  const heroH = Math.max(240, heroW / Math.max(0.6, Number(hero.aspect) || 1));
  const cells = [
    {
      id: hero.id,
      x: padding,
      y: padding,
      w: heroW,
      h: heroH
    }
  ];
  const sideX = padding + heroW + gap;
  const sideW = width - padding - sideX;
  let y = padding;
  rest.slice(0, 4).forEach((item) => {
    const h = Math.max(120, sideW / Math.max(0.7, Number(item.aspect) || 1.1));
    cells.push({ id: item.id, x: sideX, y, w: sideW, h: Math.min(h, heroH / 2 - gap / 2) });
    y += cells[cells.length - 1].h + gap;
  });
  const below = rest.slice(4);
  if (below.length) {
    const baseY = padding + heroH + gap;
    const packed = packBalanced(below, width, gap, padding).map((c) =>
      Object.assign({}, c, { y: c.y - padding + baseY })
    );
    cells.push(...packed);
  }
  return cells;
}

function packHeroSupport(list, width, gap, padding) {
  if (!list.length) return [];
  const hero = list[0];
  const support = list.slice(1);
  const heroW = width - padding * 2;
  const heroH = Math.max(280, heroW / Math.max(0.75, Number(hero.aspect) || 1.2) * 0.55);
  const cells = [{ id: hero.id, x: padding, y: padding, w: heroW, h: heroH }];
  const packed = packContact(support, width, gap, padding).map((c) =>
    Object.assign({}, c, { y: c.y - padding + padding + heroH + gap })
  );
  return cells.concat(packed);
}

function packContact(list, width, gap, padding) {
  const cols = Math.min(6, Math.max(3, Math.ceil(Math.sqrt(list.length))));
  const inner = width - padding * 2 - gap * (cols - 1);
  const size = inner / cols;
  return list.map((item, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return {
      id: item.id,
      x: padding + col * (size + gap),
      y: padding + row * (size + gap),
      w: size,
      h: size
    };
  });
}

export function reflowBoardObjects(objects, preset, options = {}) {
  const itemObjects = (objects || []).filter((o) => o.kind === "item" && o.itemId);
  const others = (objects || []).filter((o) => !(o.kind === "item" && o.itemId));
  const packed = packSmartGrid(
    itemObjects.map((o) => ({ id: o.itemId, aspect: o.w && o.h ? o.w / o.h : 1 })),
    { preset, gap: options.gap, padding: options.padding, width: options.width }
  );
  const byItem = new Map(packed.map((c) => [c.id, c]));
  const nextItems = itemObjects.map((o, i) => {
    const cell = byItem.get(o.itemId);
    if (!cell) return Object.assign({}, o, { sortOrder: i });
    return Object.assign({}, o, {
      x: cell.x,
      y: cell.y,
      w: cell.w,
      h: cell.h,
      sortOrder: i,
      zIndex: i
    });
  });
  const baseY =
    nextItems.reduce((max, o) => Math.max(max, o.y + o.h), options.padding || 24) + (options.gap || 16);
  const nextOthers = others.map((o, i) =>
    Object.assign({}, o, {
      y: typeof o.y === "number" ? o.y : baseY + i * 40,
      sortOrder: nextItems.length + i
    })
  );
  return nextItems.concat(nextOthers);
}
