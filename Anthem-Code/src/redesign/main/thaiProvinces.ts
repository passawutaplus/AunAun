/**
 * The 77 provinces for the Event search (eventIntent.ts).
 * - `say`: words a person types for the province (Thai + English, lower case). The parser finds them in the sentence.
 * - `also`: extra words that only help to MATCH an event to the province: districts and venues that event
 *   titles / places name without the province (many Bangkok events just say "MOCA BANGKOK", "100 Tonson").
 *   Never parsed from the sentence: typing "BACC" stays a keyword (that venue), not "all of Bangkok".
 * - `lat` / `lng`: the provincial town, for "ใกล้ฉัน" (events have no coordinates yet, so near = same province).
 * Short Thai names that are everyday words are only recognised with "จังหวัด" / "จ." (เลย, แพร่, ตาก).
 */
export type Province = { name: string; label: string; say: string[]; also: string[]; lat: number; lng: number };

const p = (name: string, label: string, say: string[], also: string[], lat: number, lng: number): Province => ({
  name,
  label,
  say: [name, ...say],
  also,
  lat,
  lng,
});

export const PROVINCES: Province[] = [
  p(
    "กรุงเทพมหานคร",
    "กรุงเทพฯ",
    ["กรุงเทพฯ", "กรุงเทพ", "กทม.", "กทม", "bangkok", "bkk"],
    [
      "bacc", "หอศิลปวัฒนธรรมแห่งกรุงเทพ", "qsncc", "สิริกิติ์", "moca", "jim thompson", "จิม ทอมป์สัน", "tonson", "river city",
      "kunsthalle", "nova contemporary", "gallery ver", "kathmandu", "n22", "siam discovery", "สยามดิสคัฟเวอรี่", "siam paragon",
      "สยามพารากอน", "พารากอน", "siam square", "สยามสแควร์", "iconsiam", "ไอคอนสยาม", "centralworld", "central world",
      "เซ็นทรัลเวิลด์", "galileoasis", "สุขุมวิท", "sukhumvit", "สีลม", "silom", "สาทร", "sathorn", "ปทุมวัน", "ราชเทวี",
      "บางรัก", "เจริญกรุง", "charoenkrung", "ตลาดน้อย", "ทองหล่อ", "thonglor", "เอกมัย", "ekkamai", "อารีย์", "ari",
      "ลาดพร้าว", "จตุจักร", "chatuchak", "บางนา", "รัชดา", "เยาวราช", "ราชดำเนิน", "ห้วยขวาง", "พญาไท", "บางกะปิ", "คลองเตย",
      "ธนบุรี", "เกาะรัตนโกสินทร์", "จุฬาลงกรณ์", "chulalongkorn", "ศิลปากร วังท่าพระ",
    ],
    13.7563,
    100.5018,
  ),
  // North
  p("เชียงใหม่", "เชียงใหม่", ["chiang mai", "chiangmai", "cnx"], ["maiiam", "ใหม่เอี่ยม", "นิมมาน", "nimman", "สันกำแพง", "หางดง", "ดอยสะเก็ด", "แม่ริม", "ท่าแพ", "วัดเกต", "ช้างม่อย", "san kamphaeng"], 18.7883, 98.9853),
  p("เชียงราย", "เชียงราย", ["chiang rai", "chiangrai"], ["แม่สาย", "เชียงแสน"], 19.9105, 99.8406),
  p("ลำปาง", "ลำปาง", ["lampang"], [], 18.2888, 99.4909),
  p("ลำพูน", "ลำพูน", ["lamphun"], [], 18.5745, 99.0087),
  p("แม่ฮ่องสอน", "แม่ฮ่องสอน", ["mae hong son", "ปาย", "pai"], [], 19.3020, 97.9654),
  p("น่าน", "น่าน", ["nan"], [], 18.7756, 100.7730),
  p("พะเยา", "พะเยา", ["phayao"], [], 19.1666, 99.9019),
  p("แพร่", "แพร่", ["จังหวัดแพร่", "จ.แพร่", "phrae"], [], 18.1446, 100.1403),
  p("อุตรดิตถ์", "อุตรดิตถ์", ["uttaradit"], [], 17.6201, 100.0993),
  p("ตาก", "ตาก", ["จังหวัดตาก", "จ.ตาก", "แม่สอด", "mae sot"], [], 16.8840, 99.1259),
  p("สุโขทัย", "สุโขทัย", ["sukhothai"], [], 17.0078, 99.8230),
  p("พิษณุโลก", "พิษณุโลก", ["phitsanulok"], [], 16.8211, 100.2659),
  p("พิจิตร", "พิจิตร", ["phichit"], [], 16.4429, 100.3487),
  p("กำแพงเพชร", "กำแพงเพชร", ["kamphaeng phet"], [], 16.4828, 99.5227),
  p("เพชรบูรณ์", "เพชรบูรณ์", ["phetchabun", "เขาค้อ"], [], 16.4190, 101.1606),
  p("นครสวรรค์", "นครสวรรค์", ["nakhon sawan"], [], 15.7047, 100.1372),
  p("อุทัยธานี", "อุทัยธานี", ["uthai thani"], [], 15.3835, 100.0246),
  // Central
  p("ชัยนาท", "ชัยนาท", ["chai nat", "chainat"], [], 15.1852, 100.1251),
  p("สิงห์บุรี", "สิงห์บุรี", ["sing buri"], [], 14.8936, 100.3967),
  p("ลพบุรี", "ลพบุรี", ["lopburi", "lop buri"], [], 14.7995, 100.6534),
  p("อ่างทอง", "อ่างทอง", ["ang thong"], [], 14.5896, 100.4551),
  p("พระนครศรีอยุธยา", "อยุธยา", ["อยุธยา", "ayutthaya"], [], 14.3532, 100.5689),
  p("สระบุรี", "สระบุรี", ["saraburi"], [], 14.5289, 100.9101),
  p("ปทุมธานี", "ปทุมธานี", ["pathum thani", "รังสิต", "rangsit"], ["ธรรมศาสตร์ ศูนย์รังสิต"], 14.0208, 100.5250),
  p("นนทบุรี", "นนทบุรี", ["nonthaburi", "เมืองทอง", "muang thong"], ["อิมแพ็ค", "impact", "ปากเกร็ด"], 13.8621, 100.5144),
  p("สมุทรปราการ", "สมุทรปราการ", ["samut prakan", "บางพลี"], ["เมืองโบราณ", "ancient city"], 13.5991, 100.5998),
  p("นครปฐม", "นครปฐม", ["nakhon pathom", "ศาลายา", "salaya"], [], 13.8199, 100.0621),
  p("สมุทรสาคร", "สมุทรสาคร", ["samut sakhon", "มหาชัย"], [], 13.5475, 100.2744),
  p("สมุทรสงคราม", "สมุทรสงคราม", ["samut songkhram", "อัมพวา", "amphawa"], [], 13.4098, 100.0023),
  p("สุพรรณบุรี", "สุพรรณบุรี", ["suphan buri", "suphanburi"], [], 14.4745, 100.1177),
  p("กาญจนบุรี", "กาญจนบุรี", ["kanchanaburi"], [], 14.0228, 99.5328),
  p("ราชบุรี", "ราชบุรี", ["ratchaburi"], [], 13.5283, 99.8134),
  p("เพชรบุรี", "เพชรบุรี", ["phetchaburi", "ชะอำ", "cha-am", "cha am"], [], 13.1119, 99.9399),
  p("ประจวบคีรีขันธ์", "ประจวบฯ", ["ประจวบ", "prachuap", "หัวหิน", "hua hin", "ปราณบุรี", "pranburi"], [], 11.8126, 99.7957),
  p("นครนายก", "นครนายก", ["nakhon nayok"], [], 14.2069, 101.2131),
  p("ปราจีนบุรี", "ปราจีนบุรี", ["prachin buri", "prachinburi"], [], 14.0509, 101.3717),
  p("ฉะเชิงเทรา", "ฉะเชิงเทรา", ["chachoengsao", "แปดริ้ว"], [], 13.6904, 101.0779),
  p("สระแก้ว", "สระแก้ว", ["sa kaeo"], [], 13.8240, 102.0646),
  // East
  p("ชลบุรี", "ชลบุรี", ["chonburi", "chon buri", "พัทยา", "pattaya", "บางแสน", "bang saen", "ศรีราชา", "si racha"], [], 13.3611, 100.9847),
  p("ระยอง", "ระยอง", ["rayong", "เกาะเสม็ด"], [], 12.6814, 101.2816),
  p("จันทบุรี", "จันทบุรี", ["chanthaburi"], [], 12.6114, 102.1039),
  p("ตราด", "ตราด", ["trat", "เกาะช้าง", "koh chang"], [], 12.2428, 102.5175),
  // Northeast
  p("นครราชสีมา", "โคราช", ["โคราช", "korat", "nakhon ratchasima", "เขาใหญ่", "khao yai", "ปากช่อง"], [], 14.9799, 102.0977),
  p("บุรีรัมย์", "บุรีรัมย์", ["buriram"], [], 14.9930, 103.1029),
  p("สุรินทร์", "สุรินทร์", ["surin"], [], 14.8818, 103.4936),
  p("ศรีสะเกษ", "ศรีสะเกษ", ["sisaket", "si sa ket"], [], 15.1186, 104.3220),
  p("อุบลราชธานี", "อุบลฯ", ["อุบล", "ubon"], [], 15.2287, 104.8564),
  p("ยโสธร", "ยโสธร", ["yasothon"], [], 15.7926, 104.1453),
  p("อำนาจเจริญ", "อำนาจเจริญ", ["amnat charoen"], [], 15.8657, 104.6258),
  p("มุกดาหาร", "มุกดาหาร", ["mukdahan"], [], 16.5453, 104.7235),
  p("นครพนม", "นครพนม", ["nakhon phanom"], [], 17.3920, 104.7695),
  p("สกลนคร", "สกลนคร", ["sakon nakhon"], [], 17.1546, 104.1348),
  p("บึงกาฬ", "บึงกาฬ", ["bueng kan"], [], 18.3609, 103.6464),
  p("หนองคาย", "หนองคาย", ["nong khai"], [], 17.8783, 102.7420),
  p("อุดรธานี", "อุดรฯ", ["อุดร", "udon"], [], 17.4138, 102.7870),
  p("หนองบัวลำภู", "หนองบัวลำภู", ["nong bua lamphu"], [], 17.2041, 102.4407),
  p("เลย", "เลย", ["จังหวัดเลย", "จ.เลย", "loei", "เชียงคาน", "chiang khan"], [], 17.4860, 101.7223),
  p("ขอนแก่น", "ขอนแก่น", ["khon kaen"], [], 16.4322, 102.8236),
  p("ชัยภูมิ", "ชัยภูมิ", ["chaiyaphum"], [], 15.8068, 102.0315),
  p("มหาสารคาม", "มหาสารคาม", ["maha sarakham"], [], 16.1851, 103.3026),
  p("ร้อยเอ็ด", "ร้อยเอ็ด", ["roi et"], [], 16.0538, 103.6520),
  p("กาฬสินธุ์", "กาฬสินธุ์", ["kalasin"], [], 16.4314, 103.5059),
  // South
  p("ชุมพร", "ชุมพร", ["chumphon"], [], 10.4930, 99.1800),
  p("ระนอง", "ระนอง", ["ranong"], [], 9.9529, 98.6085),
  p("สุราษฎร์ธานี", "สุราษฎร์ฯ", ["สุราษฎร์", "สุราษ", "surat thani", "เกาะสมุย", "สมุย", "samui", "koh samui", "เกาะพะงัน", "phangan"], [], 9.1382, 99.3217),
  p("พังงา", "พังงา", ["phang nga", "เขาหลัก", "khao lak"], [], 8.4501, 98.5255),
  p("ภูเก็ต", "ภูเก็ต", ["phuket"], [], 7.8804, 98.3923),
  p("กระบี่", "กระบี่", ["krabi", "อ่าวนาง", "ao nang"], [], 8.0863, 98.9063),
  p("นครศรีธรรมราช", "นครศรีฯ", ["นครศรี", "nakhon si thammarat"], [], 8.4304, 99.9631),
  p("ตรัง", "ตรัง", ["trang"], [], 7.5563, 99.6114),
  p("พัทลุง", "พัทลุง", ["phatthalung"], [], 7.6167, 100.0740),
  p("สตูล", "สตูล", ["satun"], [], 6.6238, 100.0674),
  p("สงขลา", "สงขลา", ["songkhla", "หาดใหญ่", "hat yai", "hatyai"], [], 7.1898, 100.5951),
  p("ปัตตานี", "ปัตตานี", ["pattani"], [], 6.8696, 101.2501),
  p("ยะลา", "ยะลา", ["yala", "เบตง", "betong"], [], 6.5411, 101.2804),
  p("นราธิวาส", "นราธิวาส", ["narathiwat", "ตากใบ"], [], 6.4264, 101.8253),
];

/** Every word that matches an event to the province, for the server (lower case). */
export const placeTerms = (prov: Province) => [...new Set([...prov.say, ...prov.also].map((t) => t.toLowerCase()))];

const R = 6371;
const rad = (d: number) => (d * Math.PI) / 180;
export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Provinces "near me": the nearest provincial town first, plus every other one within `km`
 * (Bangkok, Nonthaburi, Pathum Thani and Samut Prakan are all a short ride apart).
 */
export function provincesNear(lat: number, lng: number, km = 45): Province[] {
  const byDistance = PROVINCES.map((prov) => ({ prov, d: distanceKm(lat, lng, prov.lat, prov.lng) })).sort((a, b) => a.d - b.d);
  return byDistance.filter((x, i) => i === 0 || x.d <= km).map((x) => x.prov);
}
