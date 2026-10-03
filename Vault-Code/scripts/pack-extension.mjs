/**
 * Zips vault-extension/ into outputs/a-plus-vault/downloads/aplus-vault-extension.zip so the
 * /extension page can offer the alpha build. Output is deterministic (fixed timestamps, sorted
 * entries) so rebuilding without changes produces no diff.
 */
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { deflateRawSync, crc32 } from "node:zlib";

const SRC = "vault-extension";
const OUT = "outputs/a-plus-vault/downloads/aplus-vault-extension.zip";
const SKIP = new Set(["PUBLIC_RELEASE_CHECKLIST.md"]);
const DOS_TIME = 0;
const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;

async function walk(dir) {
  const out = [];
  for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (!SKIP.has(entry.name)) out.push(full);
  }
  return out;
}

const files = await walk(SRC);
const chunks = [];
const central = [];
let offset = 0;

for (const file of files) {
  const name = relative(SRC, file).split(sep).join("/");
  const data = await readFile(file);
  const packed = deflateRawSync(data, { level: 9 });
  const nameBuf = Buffer.from(name, "utf8");
  const crc = crc32(data) >>> 0;

  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(0x0800, 6);
  local.writeUInt16LE(8, 8);
  local.writeUInt16LE(DOS_TIME, 10);
  local.writeUInt16LE(DOS_DATE, 12);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(packed.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(nameBuf.length, 26);
  chunks.push(local, nameBuf, packed);

  const cd = Buffer.alloc(46);
  cd.writeUInt32LE(0x02014b50, 0);
  cd.writeUInt16LE(20, 4);
  cd.writeUInt16LE(20, 6);
  cd.writeUInt16LE(0x0800, 8);
  cd.writeUInt16LE(8, 10);
  cd.writeUInt16LE(DOS_TIME, 12);
  cd.writeUInt16LE(DOS_DATE, 14);
  cd.writeUInt32LE(crc, 16);
  cd.writeUInt32LE(packed.length, 20);
  cd.writeUInt32LE(data.length, 24);
  cd.writeUInt16LE(nameBuf.length, 28);
  cd.writeUInt32LE(offset, 42);
  central.push(cd, nameBuf);

  offset += local.length + nameBuf.length + packed.length;
}

const centralBuf = Buffer.concat(central);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(files.length, 8);
end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(centralBuf.length, 12);
end.writeUInt32LE(offset, 16);

await mkdir("outputs/a-plus-vault/downloads", { recursive: true });
await writeFile(OUT, Buffer.concat([...chunks, centralBuf, end]));
const manifest = JSON.parse(await readFile(join(SRC, "manifest.json"), "utf8"));
console.log(`Packed ${files.length} files → ${OUT} (extension v${manifest.version})`);
