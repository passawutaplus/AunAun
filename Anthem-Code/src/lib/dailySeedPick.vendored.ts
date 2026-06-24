/** AUTO-GENERATED — sync from Solo-Code/src/lib/dailySeedPick.ts */
export function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function pickDailyIndex(length: number, salt = ""): number {
  if (length <= 0) return 0;
  return hashSeed(`${todayISO()}${salt}`) % length;
}

export function pickDailyItems<T>(items: T[], count: number, salt = ""): T[] {
  if (items.length === 0 || count <= 0) return [];
  const start = pickDailyIndex(items.length, salt);
  const out: T[] = [];
  for (let i = 0; i < Math.min(count, items.length); i++) {
    out.push(items[(start + i) % items.length]!);
  }
  return out;
}
