import { downloadBlob, toCsvForExcel, withCsvBom } from "@/lib/csv";

/** UTF-8 filename / content flag in ZIP general-purpose bit field */
const ZIP_UTF8_FLAG = 0x0800;

/** Minimal ZIP (store method) — no third-party dependency. */
function crc32(buf: Uint8Array): number {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}

function u16(n: number): Uint8Array {
  const b = new Uint8Array(2);
  new DataView(b.buffer).setUint16(0, n, true);
  return b;
}

function u32(n: number): Uint8Array {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n >>> 0, true);
  return b;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const len = parts.reduce((a, p) => a + p.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

export function createZipBlob(files: { name: string; content: string }[]): Blob {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const data = encoder.encode(file.content);
    const crc = crc32(data);
    const localHeader = concat([
      u32(0x04034b50),
      u16(20),
      u16(ZIP_UTF8_FLAG),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(nameBytes.length),
      u16(0),
      nameBytes,
    ]);
    localParts.push(localHeader, data);

    const central = concat([
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(ZIP_UTF8_FLAG),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(nameBytes.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      nameBytes,
    ]);
    centralParts.push(central);
    offset += localHeader.length + data.length;
  }

  const centralDir = concat(centralParts);
  const end = concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(centralDir.length),
    u32(offset),
    u16(0),
  ]);

  return new Blob([concat([...localParts, centralDir, end])], { type: "application/zip" });
}

const META_KEYS = new Set(["generated_at", "days", "pack", "row_limit"]);

/** Thai labels for table filenames / docs in export packs */
export const DATA_TABLE_LABELS_TH: Record<string, string> = {
  users: "ผู้ใช้",
  projects: "ผลงาน",
  project_views: "วิวผลงาน",
  hiring_requests: "คำขอจ้าง",
  collab_requests: "คำขอคอลแลป",
  job_posts: "ประกาศงาน",
  job_applications: "สมัครงาน",
  likes: "ไลก์",
  comments: "คอมเมนต์",
  follows: "ติดตาม",
  product_events: "อีเวนต์ผลิตภัณฑ์",
  platform_events: "อีเวนต์แพลตฟอร์ม",
  ecosystem_links: "ลิงก์ข้ามแอป",
  feedback: "ฟีดแบ็ก",
  top_views: "ผลงานคนดูเยอะ",
  bottom_views: "ผลงานคนดูน้อย",
  rising: "ผลงานกำลังพุ่ง",
  high_view_low_conversion: "วิวสูงแต่ไม่แปลง",
  opportunity_gaps: "ช่องว่างโอกาสจ้าง",
  category_stats: "สถิติตามหมวด",
  projects_ranked: "จัดอันดับผลงาน",
};

export function packTablesToCsvFiles(
  pack: Record<string, unknown>,
): { name: string; content: string }[] {
  const files: { name: string; content: string }[] = [];
  files.push({
    name: "_meta.json",
    content: JSON.stringify(
      {
        generated_at: pack.generated_at,
        days: pack.days,
        pack: pack.pack,
        row_limit: pack.row_limit,
        encoding: "UTF-8 with BOM (Excel)",
        note_th: "เปิดไฟล์ .csv ด้วย Excel ได้ตรงภาษาไทย — มี BOM อยู่แล้ว",
        tables_th: DATA_TABLE_LABELS_TH,
      },
      null,
      2,
    ),
  });

  for (const [key, value] of Object.entries(pack)) {
    if (META_KEYS.has(key)) continue;
    if (!Array.isArray(value)) continue;
    const rows = value as Record<string, unknown>[];
    const label = DATA_TABLE_LABELS_TH[key] ?? key;
    const fileBase = `${key}_${label}`;
    if (rows.length === 0) {
      files.push({ name: `${fileBase}.csv`, content: withCsvBom("") });
      continue;
    }
    const normalized = rows.map((row) => {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(row)) {
        out[k] = v !== null && typeof v === "object" ? JSON.stringify(v) : v;
      }
      return out;
    });
    files.push({ name: `${fileBase}.csv`, content: toCsvForExcel(normalized) });
  }
  return files;
}

export function downloadDataPackZip(pack: Record<string, unknown>, filename: string) {
  const files = packTablesToCsvFiles(pack);
  const blob = createZipBlob(files);
  downloadBlob(filename.endsWith(".zip") ? filename : `${filename}.zip`, blob);
}

export const DATA_HUB_PACKS = [
  {
    id: "full" as const,
    label: "ข้อมูลดิบทั้งหมด",
    hint: "ผู้ใช้ ผลงาน funnel engagement และอีเวนต์",
  },
  {
    id: "growth" as const,
    label: "เติบโต (Growth)",
    hint: "ผู้ใช้ ผลงาน วิว และอีเวนต์",
  },
  {
    id: "opportunity" as const,
    label: "โอกาสงาน",
    hint: "จ้าง คอลแลป ประกาศงาน สมัครงาน",
  },
  {
    id: "engagement" as const,
    label: "การมีส่วนร่วม",
    hint: "ผลงาน วิว ไลก์ คอมเมนต์ ติดตาม",
  },
  {
    id: "events" as const,
    label: "อีเวนต์อย่างเดียว",
    hint: "product_events + platform_events",
  },
  {
    id: "marketing" as const,
    label: "การตลาด",
    hint: "ผู้ใช้ ลีด funnel ลิงก์ข้ามแอป ฟีดแบ็ก",
  },
  {
    id: "content" as const,
    label: "ผลงาน (คนดูเยอะ/น้อย)",
    hint: "top/bottom views, หมวด, วิวสูงแต่ไม่แปลง",
  },
];

export type DataHubPackId = (typeof DATA_HUB_PACKS)[number]["id"];
