# Brand Icons — theSVG

Anthem ใช้ [theSVG](https://thesvg.org/) เป็นแหล่งโลโกแบรนด์สำหรับส่วน **เครื่องมือที่ใช้** (ToolsGrid, ToolPicker) ในโปรเจกต์

## ลิงก์อ้างอิง

| ทรัพยากร | URL |
|---------|-----|
| เว็บไซต์ / ค้นหาไอคอน | https://thesvg.org |
| GitHub | https://github.com/glincker/thesvg |
| Registry API (manifest ทั้งหมด) | https://thesvg.org/api/registry.json |
| เปรียบเทียบ icon library | https://thesvg.org/compare |

## URL pattern

```html
<!-- จาก thesvg.org -->
<img src="https://thesvg.org/icons/{slug}/default.svg" width="24" alt="Brand" />

<!-- jsDelivr (ทางเลือก production) -->
<img src="https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/{slug}/default.svg" width="24" alt="Brand" />
```

Variant ที่ใช้ได้ (ขึ้นกับแต่ละแบรนด์): `default`, `mono`, `color`, `wordmark`, `light`, `dark`

## โค้ดใน Anthem

| ไฟล์ | บทบาท |
|------|--------|
| [`src/lib/toolIcons.ts`](../src/lib/toolIcons.ts) | Catalog เครื่องมือ + slug mapping + `toolIconUrl()` |
| [`src/components/ToolIcon.tsx`](../src/components/ToolIcon.tsx) | แสดง `<img>` + fallback อักษรย่อเมื่อโหลดไม่สำเร็จ |
| [`src/components/ToolsGrid.tsx`](../src/components/ToolsGrid.tsx) | Grid ใน project detail |
| [`src/components/tools/ToolPicker.tsx`](../src/components/tools/ToolPicker.tsx) | เลือกเครื่องมือตอนสร้าง/แก้โปรเจกต์ |

## วิธีค้นหา slug

```bash
# ค้นหาใน registry
curl -s "https://thesvg.org/api/registry.json" \
  | jq '.icons[] | select(.title | test("Figma"; "i")) | {slug, title}'

# ตรวจว่า SVG มีจริง
curl -sI "https://thesvg.org/icons/figma/default.svg" | head -1
```

## เพิ่มเครื่องมือใหม่

1. หา slug บน https://thesvg.org
2. เพิ่ม entry ใน `TOOL_CATALOG` ใน [`toolIcons.ts`](../src/lib/toolIcons.ts):

```ts
{ label: "New Tool", slug: "new-tool", aliases: ["alias"], desc: "คำอธิบายสั้น" },
```

3. (ถ้าใช้บ่อย) เพิ่ม label ใน `COMMON_TOOLS`
4. ทดสอบใน ToolPicker / หน้า project detail

## เครื่องมือที่ยังไม่มีบน theSVG

Catalog ยังเก็บชื่อเหล่านี้ไว้ — ใช้ไฟล์ใน [`public/tool-icons/`](../public/tool-icons/) ก่อน แล้ว fallback ไป theSVG / อักษรย่อ:

| เครื่องมือ | ไฟล์ local |
|-----------|------------|
| Procreate | `procreate.png` (จาก Procreate CDN) |
| InVision | `invision.svg` (Simple Icons) |
| Zeplin | `zeplin.svg` (Zeplin brand) |
| ZBrush | `zbrush.svg` (styled) |
| Spline | `spline.webp` (Homarr dashboard-icons) |
| Final Cut Pro | `final-cut-pro.svg` (styled) |
| Logic Pro | `logic-pro.svg` (styled) |
| Ableton | `ableton-live.svg` (styled) |
| FL Studio | `fl-studio.png` (Homarr dashboard-icons) |
| GarageBand | `garageband.svg` (styled) |

เพิ่มไฟล์ใหม่ → ลง `public/tool-icons/` แล้ว map ใน `LOCAL_TOOL_ICONS` ที่ [`toolIcons.ts`](../src/lib/toolIcons.ts)

ถ้าต้องการโลโกอย่างเป็นทางการ 100% ให้แทนที่ไฟล์ styled ด้วย asset จาก press kit หรือ submit ที่ https://thesvg.org/submit
