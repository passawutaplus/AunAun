# Vaultr logo animation – handoff

เลือกแล้ว: **Splash = Line Trace** (พื้นแดง โลโก้ขาว) · **Loading = Liquid fill** (โลโก้แดง)

## ไฟล์
- `vaultr-splash.svg` – เปิดแอพ เล่นรอบเดียวแล้วค้างที่โลโก้เต็ม (6s timeline, จบที่ ~4.6s) โลโก้สีขาว โปร่งใส ต้องวางบนพื้น `#F05040`
- `vaultr-splash-loop.svg` – เหมือนกัน แต่วนซ้ำ ไว้ใช้ดู/พรีวิว
- `vaultr-loader.svg` – loading/download วนไม่รู้จบ รอบละ 2.8s โลโก้สี `#F05040` โปร่งใส ใช้บนพื้นสว่าง

## Spec
- สีแบรนด์ `#F05040`
- โลโก้เป็น path เดียว 3 subpath (viewBox ต้นฉบับ 0 0 709 800)
- Splash: เส้นขาวหนา 7 (มี glow blur 9 หนา 22 opacity .5) ไล่วาดทีละ subpath
  - outer hexagon 5%→40%, top piece 15%→48%, bottom piece 25%→56% ของ 6s
  - เติมสีขาว 54%→68%, เส้นจางหาย 58%→72%, โลโก้ pop scale 1→1.04→1 ที่ 56–76%
  - เทคนิค: `pathLength="1"` + `stroke-dasharray:1` + animate `stroke-dashoffset` 1→0
- Loader: ghost fill opacity .14 + ชั้นสีเต็มถูก clip ด้วย rect ที่เลื่อน translateY 820→0 (0–80%, ease cubic-bezier(.45,.05,.35,1)) แล้วจางหาย 86–100% พร้อมลอยขึ้นลง 6px

## ถ้านำไปใช้ในแอพ
- Web / React / Next: inline SVG หรือ `<img src>` ได้เลย (CSS animation อยู่ในไฟล์)
- React Native / Flutter / native: SVG แบบ CSS animation ไม่รองรับ ให้แปลงเป็น Lottie (LottieFiles/After Effects) หรือเขียน animation เองด้วย `stroke-dashoffset` / clip ตาม spec ด้านบน
- เคารพ `prefers-reduced-motion`: แสดงโลโก้เต็มนิ่งๆ แทน
