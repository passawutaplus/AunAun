# Image Sourcing & Save System — กฎ เหตุผล และแผนงาน

> ไฟล์นี้คือ "ความจำ" ของโปรเจกต์เรื่องการนำภาพเข้าระบบ
> AI หรือนักพัฒนาต้องอ่านไฟล์นี้ก่อนแตะโค้ดส่วนที่เกี่ยวกับการดึงภาพ การเซฟ ฟีด หรือการแจ้งลบ
> บันทึกเมื่อ: 2026-10-05 · สถานะ: ใช้งาน
> ข้อมูลกฎหมายในไฟล์นี้เป็นผลการค้นคว้า ไม่ใช่คำปรึกษาทางกฎหมาย ต้องให้ทนาย IP ไทยยืนยันในจุดที่ระบุไว้

---

## 0. สรุปสั้น (TL;DR)

1. **ห้าม scrape หรือบอทเซฟภาพของคนอื่น** จาก Pinterest, Behance, Dribbble, Google Images หรือเว็บที่ไม่ได้เปิด license
2. Pinterest, Cosmos และ Are.na **ไม่ได้กวาดภาพเอง** ผู้ใช้เป็นคนกดเซฟทีละภาพ แพลตฟอร์มจึงได้รับความคุ้มครองในฐานะผู้รับฝากข้อมูลตามคำสั่งผู้ใช้ (ไทย: ม.43/4 / สหรัฐฯ: DMCA §512(c))
3. ภาพเข้าระบบได้ 3 ทางเท่านั้น: **(ก)** บอทดึงจากแหล่ง open license ผ่าน API ทางการ **(ข)** ครีเอเตอร์เชื่อมบัญชีหรือส่งงานของตัวเอง **(ค)** ผู้ใช้กด Save เอง
4. ข้อมูลมีชุดเดียว ฟีดคือ query ที่ดึง pin สาธารณะมาจัดเรียง
5. ภาพจากผู้ใช้ (user_save) ยังขึ้นฟีดสาธารณะไม่ได้ จนกว่าทนายจะยืนยัน และระบบแจ้งลบต้องพร้อมก่อน

---

## 1. Flow หลักของข้อมูล

```
ผู้ใช้กดเซฟ → pin เข้าบอร์ดของผู้ใช้
            → ถ้าบอร์ด/pin เป็นสาธารณะ → มีสิทธิ์ขึ้นฟีด (ระบบจัดอันดับเอง)
            → ถ้าเป็นส่วนตัว → เห็นแค่เจ้าของ
```

- ห้ามคัดลอกภาพไปเก็บแยกสำหรับฟีด ฟีดเป็นแค่มุมมองของ pin สาธารณะ
  - **เหตุผล:** ถ้ามีข้อมูลชุดเดียว พอโดนแจ้งลบ ภาพจะหายจากทุกที่พร้อมกัน
- ถ้าบอร์ดเป็นส่วนตัว ทุก pin ในบอร์ดนั้นเป็นส่วนตัว ถ้าบอร์ดเป็นสาธารณะ ใช้ค่า visibility ของแต่ละ pin
- เงื่อนไขขึ้นฟีด: pin เป็น public และ image ไม่ถูก block และ
  (origin เป็น `open_license` หรือ `creator`) หรือ (origin เป็น `user_save` และ `USER_SAVES_PUBLIC_ALLOWED = true`)
- `USER_SAVES_PUBLIC_ALLOWED` ค่าเริ่มต้นเป็น **false**
  - **เหตุผล:** กฎเดิมของโปรเจกต์คือ "ภาพที่ไม่ทราบสิทธิ์ต้องเป็นส่วนตัว" ซึ่งเข้มกว่า Pinterest จะผ่อนได้ต่อเมื่อทนายยืนยัน (ดูข้อ 10)
- ให้อัลกอริทึมจัดอันดับฟีด (จำนวนเซฟ, ความใหม่, คนที่ติดตาม, ภาพคล้ายกัน) **ห้ามให้ทีมงานเลือกงานของบุคคลที่สามขึ้นฟีดเอง**
  - **เหตุผล:** ในคดี Davis v. Pinterest ศาลถือว่าการใช้อัลกอริทึมวิเคราะห์ engagement ไม่ทำให้เสียความคุ้มครอง และให้น้ำหนักว่า Pinterest ไม่ได้ใช้ดุลพินิจเลือกเนื้อหาที่จะเก็บ (ดูข้อ 3.2)
- ภาพเดียวกันแสดงในฟีดครั้งเดียว
  - **เหตุผล:** Pinterest กรองภาพซ้ำแล้ว engagement ในฟีดค้นหาเพิ่ม 11% และในหน้าแรกเพิ่ม 7% (ดูข้อ 5.4)

---

## 2. กฎเด็ดขาด (ห้ามทำ) พร้อมเหตุผล

| # | ห้ามทำ | เหตุผล |
|---|---|---|
| R1 | ห้ามมี crawler, cron หรือบอทที่ไปหาภาพจากเว็บทั่วไปแล้วสร้าง pin เอง | ระบบเก็บเองไม่ใช่ "ตามคำสั่งผู้ใช้" จึงไม่เข้า ม.43/4 แม้แต่ Pinterestbot ก็ใช้แค่ทำดัชนี อัปเดตข้อมูลของ pin ที่คนสร้างแล้ว และหาลิงก์เสีย ไม่ได้สร้าง pin เอง |
| R2 | ห้ามมีบัญชี admin หรือบัญชีทีมงานที่ใช้บอทหรือคนกดเซฟงานของคนอื่น | บอทของบริษัทไม่ใช่ "ผู้ใช้" ก็คือบริษัทลงเนื้อหาเอง และ log จะเห็นชัดว่าเป็นบัญชีบอท อาจถูกมองว่าตั้งใจอำพรางการ scrape ซึ่งแย่กว่าการ scrape ตรงๆ (ผู้ใช้เคยเสนอเมื่อ 2026-10-05 และถูกปฏิเสธด้วยเหตุผลนี้) |
| R3 | ห้ามทำปุ่ม "Save all" หรือ auto-scroll ที่เลื่อนหน้าแล้วเซฟเอง | เป็นการเก็บแบบกวาด ไม่ใช่การเลือกทีละภาพ มี extension บางตัวทำแบบนี้ (เช่น Save to Moodloom) แต่เราไม่ทำ |
| R4 | ห้ามข้ามเครื่องหมาย nopin (`data-pin-nopin`, meta nopin) | เป็นสัญญาณที่เจ้าของเว็บใช้ปฏิเสธการเซฟมาตั้งแต่ปี 2012 ซึ่งเราควรเคารพ |
| R5 | ห้ามครอปลายน้ำหรือลบเครดิตออกจากภาพ | ม.53/1 ถือว่าการลบหรือเปลี่ยนข้อมูลบริหารสิทธิโดยรู้ว่าอาจเอื้อให้เกิดการละเมิด เป็นการละเมิด |
| R6 | ห้ามเอาภาพที่ผู้ใช้เซฟไปใช้ทำโฆษณาหรือการตลาดของเรา | ม.43/4(2) กำหนดว่าต้องไม่ได้รับประโยชน์ทางการเงินโดยตรงจากการละเมิด ในคดี Davis ศาลให้ Pinterest รอดเพราะโฆษณาไม่ได้ผูกกับภาพเฉพาะชิ้น |
| R7 | ห้ามใช้ API ของแพลตฟอร์มอื่นดึงงานของคนอื่นมาลงฟีด | Dribbble v2 ตัดฟีดรวมออกแล้ว, Pinterest v5 ดึงบอร์ดของคนอื่นไม่ได้, ToS ของ Are.na จำกัดการเก็บข้อมูล (ดูข้อ 4) |
| R8 | ห้ามเปิดให้ภาพ user_save ขึ้นฟีดสาธารณะก่อนที่ระบบแจ้งลบจะพร้อม | ม.43/1 และ ม.43/4 ต้องมีช่องทางรับแจ้ง มีนโยบายผู้ละเมิดซ้ำที่ทำตามจริง และต้องนำออกได้โดยไม่ชักช้า |

ถ้างานใดขัดกับกฎข้างบน ให้หยุดแล้วถามเจ้าของโปรเจกต์ก่อน

---

## 3. เหตุผลทางกฎหมาย

### 3.1 พ.ร.บ.ลิขสิทธิ์ (ฉบับที่ 5) พ.ศ. 2565 — ส่วนที่ 7 ข้อยกเว้นความรับผิดของผู้ให้บริการ

- **ม.43/1** ผู้ให้บริการจะได้รับยกเว้นความรับผิด ต้องประกาศมาตรการยกเลิกบริการแก่ผู้ใช้ที่ละเมิดซ้ำไว้ชัดแจ้ง ปฏิบัติตามจริง และให้บริการในลักษณะตาม ม.43/2–43/5
- **ม.43/4** ผู้ให้บริการรับฝากข้อมูล ต้อง:
  1. รับฝากข้อมูลตามคำสั่งของผู้ใช้ โดยไม่รู้หรือไม่มีเหตุอันควรรู้ว่ามีการละเมิด และนำออกหรือระงับการเข้าถึงโดยไม่ชักช้าเมื่อรู้หรือได้รับแจ้ง
  2. ไม่ได้รับประโยชน์ทางการเงินโดยตรงจากการละเมิด หากมีสิทธิและความสามารถในการควบคุม
  3. มีช่องทางรับแจ้ง พร้อมแสดงชื่อ ที่อยู่ เบอร์โทร อีเมล ในที่เข้าถึงง่าย
  → **นี่คือสถานะที่ระบบ Save ของเราต้องการ ทั้งหมดขึ้นกับคำว่า "ตามคำสั่งของผู้ใช้"**
- **ม.43/5** ผู้ให้บริการสืบค้นแหล่งที่ตั้งข้อมูล (search/ลิงก์) คุ้มครองแค่แหล่งอ้างอิงหรือจุดเชื่อมต่อ ไม่ครอบคลุมการก๊อปภาพมาเก็บเอง
- **ม.43/6** หนังสือแจ้งลบต้องมี: ชื่อและที่อยู่ เบอร์โทร อีเมลของเจ้าของลิขสิทธิ์, งานที่ถูกละเมิด, ข้อมูลที่ละเมิดพร้อมตำแหน่ง, คำรับรองว่าเป็นความจริง, ลายมือชื่อหรือลายมือชื่ออิเล็กทรอนิกส์ เมื่อได้รับแจ้งต้องนำออกโดยไม่ชักช้าและแจ้งผู้ใช้ที่ถูกกล่าวหา ถ้าทำโดยสุจริต ผู้ให้บริการไม่ต้องรับผิดต่อความเสียหายจากการนำออก
- **ม.43/7** ผู้ใช้โต้แย้งได้ ผู้ให้บริการต้องส่งสำเนาให้เจ้าของลิขสิทธิ์ แล้วคืนเนื้อหาภายใน 15 วันหลังพ้น 30 วันนับแต่ได้รับคำโต้แย้ง เว้นแต่เจ้าของแสดงหลักฐานว่าฟ้องคดีแล้ว
- **ม.43/8** ผู้แจ้งหรือผู้โต้แย้งด้วยข้อมูลเท็จต้องรับผิดต่อความเสียหาย
- **ม.53/1** การลบหรือเปลี่ยนข้อมูลบริหารสิทธิ (เครดิต ลายน้ำ) โดยรู้ว่าอาจเอื้อให้เกิดการละเมิด เป็นการละเมิด

### 3.2 คดีตัวอย่าง: Davis v. Pinterest (N.D. Cal. 2022)

- ช่างภาพฟ้อง Pinterest เรื่องภาพ 51 ชิ้น (ลดเหลือ 35 ชิ้นในชั้นพิจารณา) ศาลตัดสินให้ Pinterest ได้รับความคุ้มครองตาม DMCA §512(c)
- เหตุผลหลักของศาล:
  - เนื้อหาถูกอัปโหลดตามความสมัครใจของผู้ใช้ล้วนๆ Pinterest ไม่ได้ใช้ดุลพินิจเลือกว่าจะเก็บอะไร
  - Pinterest ไม่ได้สั่งให้ผู้ใช้อัปโหลดงานชิ้นใดเป็นการเฉพาะ จึงไม่ถือว่ามีอำนาจควบคุมในความหมายของกฎหมาย
  - โฆษณาไม่ได้ผูกกับ pin เฉพาะชิ้น จึงไม่ใช่ประโยชน์ทางการเงินที่มาจากการละเมิดโดยตรง
  - การใช้อัลกอริทึมวิเคราะห์ engagement และปรับโฆษณาไม่ทำให้เสียความคุ้มครอง
- **ผลต่อการออกแบบของเรา:** R1, R2, R6 และการจัดฟีดด้วยอัลกอริทึม (ข้อ 1)
- หมายเหตุ: เป็นกฎหมายสหรัฐฯ ม.43/4 ของไทยมีโครงสร้างคล้ายกัน แต่ยังไม่พบคดีไทยที่ทดสอบเรื่องแบบนี้

### 3.3 สิ่งที่แพลตฟอร์มต้องทำเพื่อแลกกับความคุ้มครอง (ตัวอย่างจาก Pinterest)

- มีตัวแทนรับแจ้งละเมิดพร้อมอีเมล (copyright@pinterest.com)
- ผู้ใช้ที่ pin ถูกลบได้ strike ตามนโยบายผู้ละเมิดซ้ำ และยื่นโต้แย้งได้
- ToS ระบุว่าผู้ใช้รับผิดชอบเนื้อหาที่ตัวเองโพสต์
- ลบ "ทุก pin ที่มีภาพนี้" ได้ แต่เฉพาะสำเนาที่เหมือนกันทุกไบต์ ถ้าภาพถูกย่อหรือแก้จะหาไม่เจอ
- Content Claiming Portal: เจ้าของอัปโหลดต้นฉบับ แล้วเลือกได้ว่าจะลบทุกเวอร์ชันยกเว้น pin ของตัวเอง / ยกเว้น pin ที่ลิงก์ไปเว็บตัวเอง / บล็อกทั้งหมด ทั้งปัจจุบันและอนาคต
- ปี 2012 Pinterest ถูกวิจารณ์เรื่องลิขสิทธิ์หนัก จึงออก meta tag "nopin" ให้เจ้าของเว็บบล็อกการเซฟ และแก้ ToS โดยตัดข้อที่ให้สิทธิ์ขายเนื้อหาออก

---

## 4. สถานะ API ของแต่ละแพลตฟอร์ม (ณ ต.ค. 2026)

| แพลตฟอร์ม | สถานะ | ใช้ได้กับเรายังไง |
|---|---|---|
| Dribbble API v2 | ตัด endpoint ฟีดรวมออกแล้ว เหลือให้ดีไซเนอร์ดึงงานของตัวเอง ใช้เชิงพาณิชย์ได้ถ้าไม่ได้ลอกผลิตภัณฑ์หรือฟีดของ Dribbble | ปุ่ม "เชื่อม Dribbble" ให้ดีไซเนอร์ซิงก์งานตัวเอง (origin=creator) |
| Behance | Adobe แจ้งว่า API ใช้งานไม่ได้ระหว่างย้ายระบบ ไม่มีกำหนดกลับ หยุดออก key ใหม่ และ endpoint เดิม error | ใช้ได้แค่ปุ่ม Save ของผู้ใช้ หรือให้เจ้าของวางลิงก์งานตัวเอง |
| Pinterest API v5 | Trial: pin และบอร์ดเป็น sandbox เห็นแค่ผู้สร้าง Standard: ต้องส่งวิดีโอเดโมให้รีวิว และ v5 ดึง pin จากบอร์ดของคนอื่นไม่ได้แล้ว | ให้ผู้ใช้ import บอร์ดของตัวเองเท่านั้น |
| Are.na API v3 | OAuth2 + PKCE, ไม่ล็อกอินเรียกได้ 30 ครั้งต่อนาที แต่ ToS จำกัดการเก็บข้อมูล และห้ามใช้ API โดยไม่ได้รับอนุญาตหรือเกินควร | ให้ผู้ใช้ import channel ของตัวเอง ห้ามกวาด channel สาธารณะ เพราะภาพในนั้นก็เป็นของคนอื่น |

---

## 5. แพลตฟอร์มอื่นทำงานยังไง (หลักฐาน)

### 5.1 Pinterest
- มี Save Extension บน Chrome, Firefox, Edge และบนมือถือ เซฟจากเว็บไหนก็ได้ และเลือกหลายรูปจากหน้าเดียวได้
- Kent Brewster (อดีตวิศวกร Pinterest) เล่าว่าแอปมือถือและ extension ทั้งหมดใช้สคริปต์ตัวเดียวกันคือ `pinmarklet.js` ไล่ดูรูปทั้งหน้า เลือกรูปที่ดีที่สุด แล้วแสดงเป็นกริดโดยเอารูปดีสุดขึ้นก่อน
- คำตอบในฟอรั่มชุมชน Pinterest: Pinterest ไม่ได้สร้าง pin เอง pin ที่ลิงก์ไปเว็บหนึ่งคือคนอื่นเซฟมาจากเว็บนั้น ส่วนชื่อและคำอธิบายมาจาก Rich Pins ที่ดึงอัตโนมัติ
- **Pin ที่ลิงก์ไป Behance มาจากไหน:** ผู้ใช้เปิดหน้า Behance แล้วกด Save → เซิร์ฟเวอร์ Pinterest ดึงรูปและจด URL ต้นทางไว้ → คนอื่น repin ต่อ ซึ่ง repin ยังอยู่แม้ pin แรกจะถูกลบหรือบัญชีถูกปิด
- บาง pin ไม่มีลิงก์ต้นทาง เพราะผู้ใช้โหลดรูปลงเครื่องแล้วอัปโหลดเอง ศิลปินบ่นเรื่องนี้มาก
- **Pinterestbot:** ทำดัชนีเว็บสาธารณะ เข้าไปอ่านหน้าหลัง pin ที่ผู้ใช้สร้างเพื่ออัปเดตข้อมูล ตรวจลิงก์เสีย เคารพ robots.txt และจำกัดอัตราการเรียก
- Rich Pins อ่าน Open Graph และ schema.org แบบ Article, Product, Recipe เจ้าของเว็บปิดได้ด้วย `<meta name="pinterest-rich-pin" content="false">`

### 5.2 Cosmos (cosmos.so)
- Extension บน Chrome (ผู้ใช้ 100K+) ให้คลิกขวาเซฟรูปจากเว็บไหนก็ได้ เซฟ pin บน Pinterest ได้ หรือ import บอร์ด Pinterest ทั้งบอร์ด รวมถึงเซฟจาก Instagram, X และ Tumblr
- ผู้ใช้เซฟภาพรวมกันกว่า 10 ล้านภาพต่อเดือน (ข้อมูลช่วงประกาศระดมทุน Series A $15M)
- มีนโยบาย DMCA มีตัวแทนรับแจ้ง (dmca@cosmos.so) และปิดบัญชีผู้ละเมิดซ้ำ ToS ให้ผู้ใช้รับรองว่ามีสิทธิ์ในเนื้อหาที่ลง
- ระบบเครดิต: ค้นข้อมูลบนเว็บเพื่อระบุผู้สร้างภาพที่ผู้ใช้เซฟ แล้วเขียนคำอธิบาย → **ดึงเครดิต ไม่ได้ดึงรูป**

### 5.3 Are.na
- เพิ่มบล็อกผ่าน extension, bookmarklet และ share extension บน iOS/Android
- ผู้ใช้รีวิวว่า extension บันทึกแหล่งที่มาให้อัตโนมัติ
- Extension (MV2, โอเพนซอร์ส) ขอสิทธิ์ activeTab, contextMenus, storage, identity และฝัง content script ทุกหน้า
- ถ้าจะให้ลบด้วยเหตุลิขสิทธิ์ ต้องยื่น DMCA notice ให้ถูกต้องก่อน

### 5.4 เทคนิคที่ยืนยันแล้ว
- **คลิกขวาเซฟ:** `chrome.contextMenus` ตั้ง context เป็น "image" ตอนคลิกจะได้ `srcUrl` และ `pageUrl` มาให้
- **Share sheet ของเว็บแอป:** ใส่ `share_target` ใน manifest ระบบจะเปิด PWA และส่ง GET พร้อมพารามิเตอร์ ใช้ได้เมื่อติดตั้ง PWA แล้ว และเบราว์เซอร์ยังรองรับแบบจำกัด (Android ใช้ได้ iOS ต้องทำแอป native)
- **สัญญาณจากเจ้าของเว็บ:** `data-pin-nopin` (ห้ามเซฟ), `data-pin-media` (รูปขนาดเต็ม), `data-pin-url` (URL หลัก), `data-pin-description`, meta `pin:media` และ `pin:id` (ถ้ามี pin:id Pinterest จะทำเป็น repin ของต้นฉบับ)
- **Canonical URL:** Pinterest นับยอดเซฟตาม URL ที่ไม่ซ้ำ จึงแนะนำให้ใช้ลิงก์ถาวรที่ไม่มี tracking
- **ขนาดรูปขั้นต่ำ:** แต่ละแหล่งรายงานไม่ตรงกัน มีทั้ง 80px และ 200×200 เราใช้ 200px Bookmarklet ของ Pinterest ยุคแรกมองไม่เห็นรูปที่เป็น background หรืออยู่ใน iframe
- **SSRF:** ฟีเจอร์ที่ให้ server ดึง URL จากผู้ใช้คือเป้าหมายคลาสสิก การตรวจ IP ก่อนแล้วค่อย fetch โดน DNS rebinding หลอกได้ ต้องตรวจตอนเชื่อมต่อจริง ไม่รับ scheme อื่นนอกจาก http/https และ SVG ฝังลิงก์ที่พาไปเรียก URL ภายในได้
- **ภาพซ้ำ:** Pinterest ตรวจภาพซ้ำครอบคลุมราว 8 พันล้านภาพ ใช้กรองฟีดค้นหา (+11%) หน้าแรก (+7%) และเลือก pin ตัวแทนของกลุ่ม (+9%) ระดับเราใช้ pHash 64 บิต ถ้า Hamming distance ไม่เกินราว 5 ถือว่าใกล้เคียงกัน
- **Supabase Storage:** ย่อขนาดภาพสดได้ผ่าน `/storage/v1/render/image/public/...` แต่ต้องใช้ Pro tier ขึ้นไป bucket ต้องเป็นสาธารณะ และไฟล์ใหญ่ได้ไม่เกิน 25MB

---

## 6. แหล่งภาพ open license (สำหรับบอทเติมฟีด)

| แหล่ง | ปริมาณ | License | ข้อควรระวัง |
|---|---|---|---|
| The Met Collection API | ค้นงาน Open Access ได้มากกว่า 492,000 ชิ้น | CC0 (เฉพาะงานที่ระบุ Open Access) | ไม่ต้องใช้ key ส่วนใหญ่เป็นศิลปะยุคเก่า |
| Art Institute of Chicago API | ราว 61,000 ชิ้น (ตัวเลขจากโปรเจกต์ ArtLens) | CC0 | ไม่ต้องใช้ key |
| Cleveland Museum of Art | ราว 41,000 ชิ้น (ตัวเลขจากโปรเจกต์ ArtLens) | CC0 | API ส่งค่า license มาเป็น "CC0" ไม่ใช่ "Open Access" ตามที่เอกสารเขียน |
| Rijksmuseum, Smithsonian, NGA | หลักหมื่นถึงแสน | CC0 | — |
| Openverse API | กว่า 800 ล้านภาพจาก Flickr, Wikimedia และแหล่งอื่น | CC หลายแบบ | Openverse ไม่ได้ตรวจว่า license ถูกต้องจริง รับเฉพาะ CC0, PDM, CC BY ตัด NC ถ้าเว็บมีรายได้ ตัด ND ถ้าจะครอป |
| Unsplash API | หลายล้านภาพ | Unsplash License | ต้อง hotlink, เครดิตช่างภาพพร้อมลิงก์ที่มี utm, ห้ามทำซ้ำประสบการณ์หลักของ Unsplash, โควตาเดโม 50 ครั้งต่อชั่วโมง ถ้าอนุมัติได้ 5,000 |

---

## 7. งานที่ต้องทำ

ก่อนเขียนโค้ด: สำรวจ codebase และ schema ที่มีอยู่ [Supabase / Vercel / framework] แล้วสรุปแผนให้ดูก่อน ห้ามทำลายข้อมูลหรือฟีเจอร์เดิม

**ลำดับ: Phase 1 → 2 → 5 → 3 → 4 → 6** (ระบบแจ้งลบต้องพร้อมก่อนเปิดภาพ user_save ขึ้นฟีด ตาม R8)

### Phase 1 — บอทดึงภาพ open license
- ดึงจาก Met, AIC, Cleveland, Openverse (Unsplash เป็นทางเลือก) ตามเงื่อนไขในข้อ 6
- กรองภาพ: ด้านสั้นต้องไม่ต่ำกว่า [800]px และกรองตามแผนกหรือแท็กที่เข้ากับแนวเว็บ
- ทุก pin เก็บ origin=open_license, via=bot, license, license_url, attribution, source_url
- ตั้งให้รันทุกวัน ต่อจากจุดที่ดึงค้างไว้ (idempotent) และกันภาพซ้ำด้วย sha256
- pin อยู่ในบอร์ดของบัญชีระบบที่ชื่อชัดเจน เช่น "Open Collections" ห้ามปลอมเป็นผู้ใช้ทั่วไป
- **เหตุผล:** แหล่งเหล่านี้เปิด license ไว้แล้ว ดึงอัตโนมัติได้โดยไม่ต้องพึ่ง ม.43/4 และแก้ปัญหาฟีดว่างได้ทันที

### Phase 2 — ระบบ Save (server + bookmarklet + ช่องวางลิงก์)
**POST /api/save** รับ { image_url, page_url, page_title, board_id, via } หรือรับไฟล์ที่อัปโหลดมา
1. ดึงรูปแบบกัน SSRF: รับแค่ http/https, ตรวจ IP ตอนเชื่อมต่อจริง, บล็อก loopback, private, link-local, metadata, ตรวจซ้ำทุกครั้งที่ redirect, จำกัดขนาด [20MB], ตั้ง timeout, ไม่รับ SVG, ตรวจด้วย sharp ว่า decode ได้
2. ถ้า server ดึงไม่ได้ (403 หรือติด hotlink protection) ให้ client ส่งไฟล์รูปที่เบราว์เซอร์โหลดไว้แล้วขึ้นมาแทน
3. คำนวณ sha256 + pHash 64 บิต (sharp-phash) ถ้ามีภาพนี้อยู่แล้วให้ใช้ image เดิม
4. เช็กกับ `image_blocks` ถ้าตรงให้ปฏิเสธการเซฟ
5. เก็บไฟล์ใน Storage และทำขนาดย่อ 3 ขนาด
6. ดึง metadata จาก page_url (กัน SSRF เหมือนกัน): canonical URL, og:title, og:site_name, author, creator จาก JSON-LD ใช้เป็นเครดิต
7. สร้าง pin: origin=user_save, ค่า via ตามช่องทางที่ใช้, visibility=private เป็นค่าเริ่มต้น

**Image picker** (ใช้ร่วมกันใน bookmarklet และ extension)
- สแกน `<img>` (ใช้ currentSrc หรือตัวใหญ่สุดใน srcset) และ og:image ตัดรูปที่เล็กกว่า 200px
- ใช้ data-pin-media, data-pin-url, data-pin-description ถ้าหน้ามีให้
- ไม่แสดงรูปที่มี nopin (R4)
- ผู้ใช้ติ๊กเลือกเองทุกรูป ไม่มีปุ่มเลือกทั้งหมด (R3)

**Bookmarklet**: ลิงก์ javascript: ที่โหลดสคริปต์ picker จากโดเมนเรา แล้วเปิด popup ให้เลือกบอร์ด
**ช่องวางลิงก์**: วาง URL ของหน้าเว็บ แล้วแสดงรูปให้เลือกด้วย logic เดียวกับ picker

### Phase 5 — ระบบแจ้งลบ
- ฟอร์มเก็บข้อมูลครบตาม ม.43/6 (ข้อ 3.1)
- ขอบเขตการลบ: pin เดียว / ทุก pin ที่เป็นภาพเดียวกัน (sha256) / ทุก pin ที่ภาพคล้ายกัน (pHash ≤ 5) / บล็อกเวอร์ชันในอนาคตด้วย (ตัวเลือกยกเว้นแบบ Content Claiming)
  - **เหตุผล:** การลบด้วย sha256 อย่างเดียวจะหาภาพที่ถูกย่อหรือแก้ไม่เจอ (ข้อจำกัดของ Pinterest) pHash ทำได้ดีกว่า
- ลบแล้วต้องหายจากบอร์ดและฟีดพร้อมกัน แจ้งผู้ใช้ที่โดนลบ และบันทึก strike
- รับคำโต้แย้งตาม ม.43/7 (คืนภายใน 15 วันหลังพ้น 30 วัน ถ้าผู้แจ้งไม่ได้ฟ้อง)
- หน้านโยบายผู้ละเมิดซ้ำ (ม.43/1) ระบุกี่ strike ถึงระงับบัญชี และระบบต้องทำตามจริง
- หน้าติดต่อรับแจ้งที่หาง่าย มีชื่อ ที่อยู่ เบอร์โทร อีเมล (ม.43/4(3))

### Phase 3 — ครีเอเตอร์ส่งงานเอง
- ปุ่มเชื่อม Dribbble (OAuth, ดึงได้เฉพาะงานของเจ้าของบัญชี) แล้วซิงก์งานใหม่อัตโนมัติ
- นำเข้า channel ของตัวเองจาก Are.na ผ่าน API v3 (OAuth)
- หน้า "ส่งผลงาน" ให้อัปโหลดหรือวางลิงก์งานของตัวเอง พร้อมช่องติ๊กยอมรับเงื่อนไขอนุญาตให้แสดง
- ทั้งหมดตั้ง origin=creator และขึ้นฟีดได้
- **เหตุผล:** เป็นทางเดียวที่ได้งานดีไซน์ร่วมสมัยแบบสิทธิ์ชัดบนฟีดสาธารณะ

### Phase 4 — Extension และมือถือ
- Chrome extension (MV3): contextMenus ที่ context "image" ส่ง srcUrl กับ pageUrl ไป /api/save ปุ่มบน toolbar เปิด picker
- PWA: `share_target` (GET, params: title, text, url) ไปที่ /save

### Phase 6 — Job รีเฟรช metadata
- กลับไปอ่านหน้าต้นทางของ pin ที่มีอยู่แล้วเป็นระยะ เพื่ออัปเดตเครดิตและตรวจลิงก์เสีย
- เคารพ robots.txt และจำกัดความถี่การเรียกต่อโดเมน
- ห้ามใช้หา URL ใหม่หรือสร้าง pin ใหม่ (R1)

**ทุก phase** ต้องมีเทสต์ (เช่น SSRF ถูกบล็อก, ภาพซ้ำถูกรวม, pin ส่วนตัวไม่โผล่ในฟีด, ภาพที่ถูก block เซฟไม่ได้, nopin ไม่แสดงใน picker) แล้วรายงานก่อนขึ้น phase ถัดไป

---

## 8. Schema (ปรับให้เข้ากับของเดิม)

```sql
create table images (
  id uuid primary key default gen_random_uuid(),
  sha256 text unique not null,
  phash bigint not null,
  width int, height int,
  storage_path text,            -- null ถ้าเป็น hotlink (Unsplash)
  hotlink_url text,
  blocked boolean default false
);

create table boards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  visibility text not null default 'private' check (visibility in ('private','public'))
);

create table pins (
  id uuid primary key default gen_random_uuid(),
  image_id uuid references images not null,
  board_id uuid references boards not null,
  user_id uuid references auth.users not null,
  origin text not null check (origin in ('open_license','creator','user_save')),
  via text check (via in ('bot','extension','bookmarklet','paste','share','upload','repin','oauth_sync')),
  source_url text, source_canonical text, source_domain text,
  title text, credit text,
  license text, license_url text, attribution text,
  parent_pin_id uuid references pins,
  visibility text not null default 'private' check (visibility in ('private','public')),
  created_at timestamptz default now()
);

create table image_blocks (
  id uuid primary key default gen_random_uuid(),
  sha256 text, phash bigint,
  scope text check (scope in ('identical','similar')),
  exception text check (exception in ('none','claimant_pins','claimant_domain')),
  takedown_id uuid
);

create table takedowns ( /* ข้อมูลตาม ม.43/6, target pin, scope, status, counter_notice, timestamps */ );
create table strikes ( user_id uuid, takedown_id uuid, created_at timestamptz default now() );

-- หาภาพคล้าย: bit_count((a.phash # b.phash)::bit(64)) <= 5
```

- ตั้ง RLS ให้บอร์ดและ pin ที่เป็นส่วนตัวมีแค่เจ้าของที่อ่านได้
- `origin` และ `via` คือหลักฐานว่า pin มาจากไหน **ห้ามลบหรือแก้ย้อนหลัง** เพราะใช้พิสูจน์ได้ว่า pin จาก user_save มาจากการกดของผู้ใช้จริง
- การแจ้งลบลิขสิทธิ์ต้องลบที่ระดับ image เพราะ repin ผูกกับ image เดียวกัน

---

## 9. บันทึกการตัดสินใจ (Decision log)

| วันที่ | การตัดสินใจ | เหตุผล |
|---|---|---|
| 2026-10-05 | D1: ไม่ scrape หรือดึงภาพชุดใหญ่จาก Pinterest, Behance, Dribbble, Google Images | ภาพเป็นลิขสิทธิ์ของเจ้าของงาน, ไม่เข้า ม.43/4, ขัด ToS และ API ของแพลตฟอร์มเหล่านั้น |
| 2026-10-05 | D2: ใช้โมเดล "ผู้ใช้กด Save" แบบ Pinterest, Cosmos, Are.na | เป็นโมเดลที่ทั้งสามเจ้าใช้ และมีคดี Davis รองรับ (ฝั่งสหรัฐฯ) |
| 2026-10-05 | D3: ข้อมูลชุดเดียว ฟีดเป็นแค่ query | ลบที่เดียวหายทุกที่ และไม่มีข้อมูลซ้ำซ้อน |
| 2026-10-05 | D4: `USER_SAVES_PUBLIC_ALLOWED=false` | รอทนายยืนยันเรื่องกฎ "ภาพไม่ทราบสิทธิ์ต้องเป็นส่วนตัว" |
| 2026-10-05 | D5: จัดฟีดด้วยอัลกอริทึม ทีมงานไม่คัดงานของบุคคลที่สามเอง | ลดความเสี่ยงที่จะถูกมองว่าเราเป็นผู้เลือกเผยแพร่ (คดี Davis) |
| 2026-10-05 | D6: ปฏิเสธไอเดีย "บัญชี admin/บอทตระเวนเซฟภาพผ่าน extension" | บอทของบริษัทไม่ใช่ผู้ใช้ จึงไม่ได้รับ ม.43/4 และดูเหมือนตั้งใจอำพรางการ scrape |
| 2026-10-05 | D7: เติมฟีดด้วยบอท open license + งานที่ครีเอเตอร์ส่งเอง | แก้ปัญหาภาพน้อยได้ทันทีโดยไม่เสี่ยง |
| 2026-10-05 | D8: ระบบแจ้งลบต้องเสร็จก่อนเปิดภาพ user_save ขึ้นฟีดสาธารณะ | ม.43/1 และ ม.43/4 กำหนดให้ต้องมีกลไกนี้ |

---

## 10. คำถามที่ยังเปิดอยู่ (ต้องให้ทนาย IP ไทยตอบ)

1. ม.43/4 คุ้มครองโมเดล "ผู้ใช้กด Save แล้วภาพขึ้นฟีดสาธารณะ" แบบเดียวกับที่ DMCA คุ้มครอง Pinterest หรือไม่ (ยังไม่พบคดีไทยที่ทดสอบเรื่องนี้)
2. การจัดอันดับฟีดด้วยอัลกอริทึม และการทำหมวดหรือ "Discover" ทำให้หลุดจากสถานะ "รับฝากตามคำสั่งผู้ใช้" หรือไม่
3. ถ้าเว็บมีรายได้จากโฆษณาหรือ subscription จะเข้าข่าย "ได้รับประโยชน์ทางการเงินโดยตรง" ตาม ม.43/4(2) หรือไม่
4. ประกาศกระทรวงดีอีเรื่องขั้นตอนการแจ้งเตือนฯ พ.ศ. 2565 (มีผลตั้งแต่ 25 ธ.ค. 2565 ผู้ให้บริการต้องลบภายใน 24 ชั่วโมงจึงจะพ้นความรับผิด) เกี่ยวข้องกับระบบเราด้วยหรือไม่
5. ข้อความ ToS ข้อรับรองสิทธิ์ของผู้ใช้ และนโยบายผู้ละเมิดซ้ำที่ควรใช้

ยังไม่ทราบ: Pinterest ช่วงแรกสุดเติมเนื้อหาอย่างไร (ไม่ได้ค้นคว้า)

---

## 11. แหล่งอ้างอิง

**กฎหมายไทย**
- พ.ร.บ.ลิขสิทธิ์ ส่วนที่ 7 ม.43/1–43/8: https://www.drthawip.com/book/export/html/8431
- Copyright Act (No. 5) 2022 (กรมทรัพย์สินทางปัญญา): https://ipthailand.go.th/images/26669/2566/laws/COPYRIGHT%20ACT%20(NO.%205),2022.pdf
- R&T Asia: Notice & Takedown ตาม ม.43/6: https://www.rajahtannasia.com/media/4902/2022-05_amendment-copyright-act-v2.pdf
- ข้อมูลบริหารสิทธิ ม.53/1: https://so06.tci-thaijo.org/index.php/tla_bulletin/article/download/109379/86057/278385
- iLaw: ประกาศกระทรวงดีอีเรื่องขั้นตอนการแจ้งเตือน: https://www.ilaw.or.th/articles/5547

**คดีและนโยบาย Pinterest**
- Loeb & Loeb: Davis v. Pinterest: https://www.loeb.com/en/insights/publications/2022/05/davis-v-pinterest
- Eric Goldman: Section 512(c) Protects Pinterest: https://blog.ericgoldman.org/?p=23880
- Stones Law: https://www.stoneslaw.net/california-court-finds-dmca-safe-harbor-shields-pinterest/
- Pinterest Copyright FAQ: https://help.pinterest.com/en/articles/copyright-faq
- Pinterest Content Claiming (SEJ): https://www.searchenginejournal.com/pinterest-lets-content-owners-control-how-their-images-are-used/403245/
- Pinterest nopin (Asia IP): https://asiaiplaw.com/sector/copyright/will-the-pinterest-ldquonopinrdquo-tag-put-online-image-owners-on-the-defensive
- Mintz: Pinterest ToS changes 2012: https://www.mintz.com/2012/03/26/pinterest-announces-changes-to-its-terms-of-service/

**Pinterest ทำงานยังไง**
- Save extension: https://help.pinterest.com/article/save-pins-with-the-pinterest-browser-button
- Add Pins from the web: https://help.pinterest.com/article/add-pins-from-the-web
- Pinterest crawler: https://help.pinterest.com/en/business/article/pinterest-crawler
- ฟอรั่ม: Pinterest generating Pins for me?: https://community.pinterest.biz/t/pinterest-generating-pins-for-me-pairing-the-wrong-image-with-the-wrong-blog-post/1490
- ฟอรั่ม: My work is being shared without credit: https://community.pinterest.biz/t/my-work-is-being-shared-without-credit/2876
- Kent Brewster: How To Get Your Stuff On Pinterest: https://gist.github.com/kentbrew/2f5be2bdc8383f7489d923af0cc3ce9f
- Save Button docs: https://developers.pinterest.com/docs/web-features/buttons/
- Rich Pins: https://developers.pinterest.com/docs/rich-pins/overview/
- Near Duplicate Image Detection (arXiv): https://arxiv.org/pdf/2209.08433

**Cosmos / Are.na**
- Save to Cosmos: https://chromewebstore.google.com/detail/mgjneceglphcpbbfbhjplkpgfapebmdg
- Cosmos Series A: https://pulse2.com/cosmos-15-million-series-a-closed-as-it-expands-social-discovery-and-attribution-features/amp/
- Cosmos Copyright Policy: https://www.cosmos.so/legal/copyright-policy
- Cosmos ToS: https://tostracker.app/document/cosmosso-tos
- Are.na About/roadmap: https://www.are.na/education
- Are.na Community Guidelines: https://www.are.na/community-guidelines
- Are.na ToS: https://are.na/terms
- Are.na API: https://www.are.na/developers/all.md
- Are.na extension manifest: https://raw.githubusercontent.com/aredotna/chrome-extension/master/manifest.json

**API ของแพลตฟอร์ม**
- Dribbble API changes: https://developer.dribbble.com/changes/
- Dribbble API terms (สรุป): https://timetopost.co/blog/schedule-dribbble-shots/
- Behance API (Adobe Community): https://experienceleaguecommunities.adobe.com/t5/adobe-developer-questions/where-can-i-find-behance-api/m-p/649793/highlight/true
- Pinterest access tiers: https://developers.pinterest.com/docs/key-concepts/access-tiers/
- PinAutomatic (v5 ดึงบอร์ดคนอื่นไม่ได้): https://github.com/AnirudhGoel/PinAutomatic

**แหล่ง open license**
- The Met Open Access: https://www.metmuseum.org/ru/openaccess
- Museum open access 2026: https://www.navigating.art/articles-from-navigatingart/open-access-2026
- ArtLens: https://github.com/alexjacobs08/artlens
- Openverse: https://infrafinder.investinopen.org/solutions/openverse
- About Openverse: https://webcf.waybackmachine.org/web/20231210110130/https://openverse.org/about
- Unsplash API Guidelines: https://help.unsplash.com/en/articles/2511245-unsplash-api-guidelines

**เทคนิค**
- chrome.contextMenus: https://developer.chrome.com/docs/extensions/mv2/reference/contextMenus
- MDN share_target: https://developer.mozilla.org/docs/Web/Manifest/share_target
- SSRF (Wiz): https://www.wiz.io/api/md/academy/application-security/server-side-request-forgery
- SSRF / DNS rebinding: https://learn.securecodewarrior.com/secure-coding-guidelines/server-side-request-forgery
- sharp-phash: https://www.brand.dev/perceptual-hashing-in-node-js-with-sharp-phash-for-developers
- Supabase image transformations: https://supabase.com/docs/guides/storage/serving/image-transformations
- Supabase limits (Nuxt Image): https://image.nuxt.com/providers/supabase
- ขนาดรูปขั้นต่ำ: https://blog.miva.com/its-a-visual-world-getting-pinned-blocking-pins-image-optimization
