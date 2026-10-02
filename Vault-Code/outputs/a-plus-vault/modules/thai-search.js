/**
 * Thai → English search vocabulary for designers. Library tags are English (seeder AI + museum
 * metadata), so a Thai query is split into known phrases and each phrase searches its English variants.
 * Thai has no spaces between words, so phrases are matched longest-first inside each token.
 */
const VOCAB = {
  // Discover categories
  "โปสเตอร์": ["poster"],
  "ตัวอักษร": ["typography", "lettering", "calligraphy", "typeface"],
  "ฟอนต์": ["typeface", "typography", "font"],
  "ไทโปกราฟี": ["typography"],
  "พู่กันจีน": ["calligraphy"],
  "คัดลายมือ": ["calligraphy"],
  "ภาพประกอบ": ["illustration"],
  "ภาพวาด": ["painting", "drawing"],
  "ภาพสเก็ตช์": ["sketch", "drawing"],
  "สเก็ตช์": ["sketch", "drawing"],
  "ลายเส้น": ["drawing", "line"],
  "ผ้า": ["textile", "fabric"],
  "สิ่งทอ": ["textile"],
  "ผ้าไหม": ["silk"],
  "งานปัก": ["embroidery"],
  "ปัก": ["embroidery"],
  "เซรามิก": ["ceramic", "porcelain", "pottery"],
  "เครื่องปั้นดินเผา": ["ceramic", "pottery", "earthenware"],
  "กระเบื้อง": ["tile"],
  "ถ้วย": ["cup", "bowl"],
  "แจกัน": ["vase"],
  "เฟอร์นิเจอร์": ["furniture"],
  "เก้าอี้": ["chair"],
  "โต๊ะ": ["table", "desk"],
  "ตู้": ["cabinet"],
  "โคมไฟ": ["lamp", "lighting"],
  "สถาปัตยกรรม": ["architecture", "architectural"],
  "อาคาร": ["building", "architecture"],
  "ตึก": ["building"],
  "บ้าน": ["house"],
  "วัด": ["temple"],
  "ภาพถ่าย": ["photograph", "photography"],
  "รูปถ่าย": ["photograph"],
  "ภาพพิมพ์": ["print"],
  "แกะไม้": ["woodblock", "woodcut"],
  "ภาพพิมพ์แกะไม้": ["woodblock", "woodcut"],
  "อุกิโยเอะ": ["ukiyo-e"],
  "ลวดลาย": ["pattern", "ornament", "motif"],
  "ลาย": ["pattern", "motif"],
  "แพทเทิร์น": ["pattern"],
  "วอลเปเปอร์": ["wallpaper", "sidewall"],
  "กระดาษปิดผนัง": ["wallpaper", "sidewall"],
  "โลโก้": ["logo"],
  "แบรนด์": ["branding", "brand"],
  "บรรจุภัณฑ์": ["packaging"],
  "แพ็กเกจ": ["packaging"],
  "เครื่องประดับ": ["jewelry"],
  "แฟชั่น": ["fashion", "costume"],
  "เสื้อผ้า": ["costume", "dress", "clothing"],
  "แผนที่": ["map"],
  "หนังสือ": ["book"],
  "ปก": ["cover"],
  "การ์ด": ["card"],
  // motifs / subjects
  "ดอกไม้": ["floral", "flower"],
  "ใบไม้": ["leaf", "foliage"],
  "ต้นไม้": ["tree"],
  "ธรรมชาติ": ["nature", "landscape"],
  "ทิวทัศน์": ["landscape"],
  "ภูเขา": ["mountain"],
  "ทะเล": ["sea", "ocean", "wave"],
  "คลื่น": ["wave"],
  "สัตว์": ["animal"],
  "นก": ["bird"],
  "ปลา": ["fish"],
  "แมว": ["cat"],
  "ม้า": ["horse"],
  "มังกร": ["dragon"],
  "ช้าง": ["elephant"],
  "คน": ["figure", "people", "portrait"],
  "ผู้หญิง": ["woman"],
  "ผู้ชาย": ["man"],
  "ใบหน้า": ["face", "portrait"],
  "ภาพเหมือน": ["portrait"],
  "เมือง": ["city", "urban"],
  "ดวงอาทิตย์": ["sun"],
  "ดวงจันทร์": ["moon"],
  "ดาว": ["star"],
  "เรขาคณิต": ["geometric"],
  "วงกลม": ["circle"],
  "เส้น": ["line"],
  "ตาราง": ["grid"],
  "นามธรรม": ["abstract"],
  // styles / eras
  "มินิมอล": ["minimal"],
  "เรียบง่าย": ["minimal", "simple"],
  "วินเทจ": ["vintage"],
  "ย้อนยุค": ["vintage", "retro"],
  "เรโทร": ["retro"],
  "โมเดิร์น": ["modern"],
  "ร่วมสมัย": ["contemporary"],
  "คลาสสิก": ["classical", "classic"],
  "อาร์ตนูโว": ["art nouveau"],
  "อาร์ตเดโค": ["art deco"],
  "บาวเฮาส์": ["bauhaus"],
  "ญี่ปุ่น": ["japanese", "japan"],
  "จีน": ["chinese", "china"],
  "ไทย": ["thai", "thailand", "siam"],
  "อินเดีย": ["indian", "india"],
  "ยุโรป": ["european"],
  "ฝรั่งเศส": ["french", "france"],
  "อิสลาม": ["islamic"],
  "หรูหรา": ["luxury", "ornate"],
  "ตกแต่ง": ["decorative", "ornament"],
  "สีน้ำ": ["watercolor"],
  "สีน้ำมัน": ["oil"],
  "หมึก": ["ink"],
  "ทอง": ["gold", "gilt"],
  "เงิน": ["silver"],
  "ไม้": ["wood"],
  "แก้ว": ["glass"],
  "โลหะ": ["metal"],
  "หนัง": ["leather"],
  "กระดาษ": ["paper"],
  // colors and tone
  "สีแดง": ["red"],
  "แดง": ["red"],
  "สีส้ม": ["orange"],
  "ส้ม": ["orange"],
  "สีเหลือง": ["yellow"],
  "เหลือง": ["yellow"],
  "สีเขียว": ["green"],
  "เขียว": ["green"],
  "สีฟ้า": ["blue", "light blue"],
  "ฟ้า": ["blue"],
  "สีน้ำเงิน": ["blue", "navy"],
  "น้ำเงิน": ["blue", "navy"],
  "สีม่วง": ["purple", "violet"],
  "ม่วง": ["purple", "violet"],
  "สีชมพู": ["pink"],
  "ชมพู": ["pink"],
  "สีน้ำตาล": ["brown"],
  "น้ำตาล": ["brown"],
  "สีดำ": ["black"],
  "ดำ": ["black"],
  "สีขาว": ["white"],
  "ขาว": ["white"],
  "สีเทา": ["gray", "grey"],
  "เทา": ["gray", "grey"],
  "สีทอง": ["gold"],
  "ขาวดำ": ["black and white", "monochrome"],
  "โทนอุ่น": ["warm"],
  "โทนเย็น": ["cool"],
  "พาสเทล": ["pastel"],
};

const PHRASES = Object.keys(VOCAB).sort((a, b) => b.length - a.length);
const THAI = /[฀-๿]/;

export function hasThai(text) {
  return THAI.test(String(text || ""));
}

/**
 * English variant groups for the known Thai phrases in `token`, longest match first.
 * Unknown Thai characters are skipped; returns [] when nothing is recognised.
 */
export function thaiConcepts(token) {
  const text = String(token || "");
  const groups = [];
  let i = 0;
  while (i < text.length) {
    const hit = PHRASES.find(p => text.startsWith(p, i));
    if (hit) {
      groups.push(VOCAB[hit]);
      i += hit.length;
    } else {
      i += 1;
    }
  }
  return groups;
}
