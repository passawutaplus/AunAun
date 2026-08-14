/**
 * Casual canvas modules + extra page image paths for demo catalog projects.
 */
import { DEMO_CATALOG } from "./demo-catalog-creators.mjs";
import { demoCatalogCoverUrl, demoCatalogUrl, napatsaraExtraCoverUrl } from "./demo-images.mjs";

function pad(i) {
  return String(i).padStart(2, "0");
}

export function demoPageRel(index, slot) {
  const c = DEMO_CATALOG[index];
  return `pages/${pad(index)}-${c.username}-${slot}.png`;
}

export function demoPageUrl(index, slot) {
  return demoCatalogUrl(demoPageRel(index, slot));
}

function bid(index, key) {
  return `demo-blk-${pad(index)}-${key}`;
}

function heading(index, key, text) {
  return { id: bid(index, key), type: "heading", heading: text };
}

function headingBody(index, key, heading, body) {
  return { id: bid(index, key), type: "heading_body", heading, body };
}

function body(index, key, text) {
  return { id: bid(index, key), type: "body", body: text };
}

function imageSingle(index, key, url, gapAfter) {
  return {
    id: bid(index, key),
    type: "image",
    url,
    mediaLayout: "single",
    ...(gapAfter ? { gapAfter } : {}),
  };
}

function imageGrid(index, key, urls, gridLayout = "three_split") {
  return {
    id: bid(index, key),
    type: "image",
    mediaLayout: "grid",
    gridLayout,
    urls,
    url: urls[0],
  };
}

function imageMulti(index, key, urls, rowColumns = 3) {
  return {
    id: bid(index, key),
    type: "image",
    mediaLayout: "multi",
    rowColumns,
    urls,
    url: urls[0],
  };
}

function imageGallery(index, key, urls) {
  return {
    id: bid(index, key),
    type: "image",
    mediaLayout: "gallery",
    urls,
    url: urls[0],
  };
}

function imageText(index, key, url, bodyText, splitSide = "image_left") {
  return {
    id: bid(index, key),
    type: "image_text",
    url,
    body: bodyText,
    splitSide,
    textVerticalAlign: "middle",
  };
}

const COPY = [
  {
    heading: "Identity ที่ยังเป็นของดอย",
    lead: "ลดโลโก้เหลือเมล็ดกับเส้นเขา โทนดิน–ครีม ไม่ให้ดูเหมือนเชนใหญ่",
    aside: "ทดลอง 4 ทิศทาง แล้วล็อกแบบ stamp เพราะติดบนถุงกระดาษได้ชัดที่สุด",
    close: "ร้านใช้ของจริงแล้ว และต่อด้วยงานคาเฟ่ในย่านนิมมาน",
  },
  {
    heading: "กล่องที่วางบนชั้นแล้วจำได้",
    lead: "ลายกนกถูกถอดเป็นเส้นเรขา เหลือชื่อรสถ่อนลาย เพื่อให้ของฝากดูพรีเมียมโดยไม่ทิ้งความเป็นไทย",
    aside: "ชุด 3 รสใช้โครงเดียวกัน เปลี่ยนสีฝาให้แยกรสทันที",
    close: "ช่วงเทศกาลยอดของฝากขึ้น และลูกค้าขอชุดสงกรานต์ต่อ",
  },
  {
    heading: "ช้างน้อยที่เด็กอีสานเห็นตัวเอง",
    lead: "สเก็ตช์จากตลาดเช้า แล้วลดรายละเอียดเป็นสีน้ำโปร่ง ใบหน้ากลมอ่านง่าย",
    aside: "ตัวละครถูกออกแบบให้เปิดซ้ำได้ทั้งปกและหน้าใน",
    close: "หนังสือเข้าห้องสมุดโรงเรียน และมีคำขอตอนฤดูฝน",
  },
  {
    heading: "ลายทอที่ใส่กับเสื้อเชิ้ตได้",
    lead: "ดอกบัวถูกถอดเป็นโมดูลซ้ำ จังหวะเส้นยืน-พุ่งอ่านได้ว่ามาจากน่าน",
    aside: "ทดลองครามกับครีมก่อนตัดเป็นผ้าขาวม้าและเชิ้ต limited",
    close: "ลายถูกใช้ทั้งของที่ระลึกและเสื้อในเมือง",
  },
  {
    heading: "จานที่อยากจับทุกมื้อ",
    lead: "ปั้นล้อ เผาเทสต์เคลือบ 3 สูตร เลือกผิวด้านที่ยังเห็นรอยนิ้ว",
    aside: "ชุด 8 ชิ้นสำหรับบ้านและร้านอาหารฟาร์ม ไม่ใช่จานโรงงานขาว",
    close: "ร้านใช้บนโต๊ะจริง และมีคิวสั่งชุดบ้าน",
  },
  {
    heading: "ป้ายที่อ่านเรื่องได้จากถนน",
    lead: "ล็อกสีแดงมะละกอและตัวหนา วางแบบป้ายหนังไทยยุค 90 แต่พื้นผิวปัจจุบัน",
    aside: "คีย์วิชวลใช้พร็อปร้านจริง ไม่พึ่งสต็อกอาหาร",
    close: "ร้านติดป้ายหน้าและสตอรี่ จองโต๊ะช่วงเย็นแน่นขึ้น",
  },
  {
    heading: "จองให้จบในสามหน้า",
    lead: "เคาน์เตอร์เต็มวันหยุด เลยย้าย happy path ขึ้นมือถือ เหลือเลือกคอร์ส วัน แล้วชำระ",
    aside: "สัมภาษณ์พนักงาน 4 คน แล้วแยกเคสสมาชิกกับวอล์กอิน",
    close: "โรงแรมใช้ prototype เทรนทีม และต่อยอดเว็บจองห้อง",
  },
  {
    heading: "ฟีดที่เล่าเมนูเป็นเรื่อง",
    lead: "ล็อกพาเลต 4 สี จัดกริดเป็นคาว-หวาน-เครื่องดื่ม ยิงในโลเคชันเดียวทั้งเดือน",
    aside: "ร้านโพสต์ต่อเองได้ เพราะเทมเพลตรีลถูกทำเป็นระบบ",
    close: "ยอดเซฟเมนูเพิ่มขึ้นหลังเปลี่ยนกริด",
  },
  {
    heading: "ผ้าทอที่แสงทำให้เห็นเส้น",
    lead: "แสงข้างอ่อนบนพื้นขาว แล้วมีไลฟ์สไตล์หนึ่งใบบนไม้เก่าเพื่อไม่ให้แบน",
    aside: "เป้าหมายคือรูปที่ขายบนช้อปได้ โดยยังเห็นลายทอชัด",
    close: "ร้านอัปปกใหม่ทั้งร้าน และลดการถ่ายมือถือเอง",
  },
  {
    heading: "วันที่ดูเป็นคน ไม่ใช่แคตตาล็อก",
    lead: "ถ่ายช่วงทอง เกรดสีฟิล์มอุ่น เหลือโมเมนต์เดินและหัวเราะมากกว่าโพส",
    aside: "คู่อยากได้ภาพที่เป็นวันที่เดินด้วยกัน ไม่ใช่สตูดิโอวิมาน",
    close: "ใช้เป็นอัลบั้มงานและภาพปกการ์ดเชิญ",
  },
  {
    heading: "สินค้าที่เข้าใจในครึ่งนาที",
    lead: "แตกสคริปต์เป็น 6 ช็อต ไอคอนวนซ้ำได้ในลูปรีล โดยไม่ง้อพรีเซนเตอร์",
    aside: "โทนครีมชมพูให้แบรนด์เล็กดูแพงโดยไม่ถ่ายแพ็กเกจใหม่ทั้งชุด",
    close: "ใช้เป็นพินโปรไฟล์และโฆษณารีล",
  },
  {
    heading: "ทริปที่ดูเป็นหนังสั้น",
    lead: "จัดจังหวะตามน้ำขึ้นน้ำลง เหลือวิวและรายละเอียดเรือ มากกว่าใบหน้าไกด์",
    aside: "เกรด teal-orange และซับสองภาษาสำหรับหน้าเว็บทัวร์",
    close: "คลิป 8 นาทีใช้อยู่บนยูทูบและหน้าแพ็กเกจ",
  },
  {
    heading: "ตัวละครที่อยากวางบนโต๊ะ",
    lead: "สเก็ตช์ซิลูเอ็ต 3 แบบ ปั้นหัวกลมให้อ่านอารมณ์จากคิ้ว โดยไม่คัดลอกลายเซน",
    aside: "เรนเดอร์สตูดิโอบนฐานอะคริลิก พร้อมไฟล์พิมพ์เรซิน",
    close: "หล่อเรซินจำนวนจำกัด 50 ตัว",
  },
  {
    heading: "เสียงที่เห็นเป็นรูปได้",
    lead: "ผสมแอมเบียนต์แมลงกับระฆังวัดเบา ๆ แล้วทำปกคลื่นเสียงที่กลายเป็นลายกนก",
    aside: "โทนหลอนแบบไทย ไม่ใช่ฮาโลวีนฝรั่ง",
    close: "ใช้เป็นอัตลักษณ์ซีซัน และมีสปอนเซอร์ตอนที่ 3",
  },
  {
    heading: "ห้องที่นึกถึงกลิ่นทะเลได้",
    lead: "เก็บวัสดุจริงจากไซต์ จัดแสงบ่ายให้เงาไม้ไม่ดำเกินไป",
    aside: "เจ้าของอยากเห็นปีกใหม่ 8 ห้องก่อนรีโนเวต",
    close: "ล็อกวัสดุแล้วใช้ภาพขายพรีโอเพน",
  },
  {
    heading: "เครื่องเงินที่ใส่กับยีนส์ได้",
    lead: "ลดลายให้เหลือเส้นโค้ง จัดลุคกับยีนส์และซิ่นสั้น ให้ดูเป็นแฟชั่นเมือง",
    aside: "ไม่ต้องการภาพแบบของที่ระลึกวัด",
    close: "ใช้เปิดพรีออเดอร์ออนไลน์",
  },
  {
    heading: "เก้าอี้ที่โรงงานทำตามได้",
    lead: "จำกัดรัศมีโค้งตามแม่พิมพ์ที่มี แล้วเรนเดอร์ไผ่ให้เห็นข้อปล้อง",
    aside: "ต้นแบบต้องทำจริงด้วยเครื่องมือโรงงาน ไม่ใช่แค่เรนเดอร์สวย",
    close: "โรงงานทำโปรโตไทป์จริง 1 ตัว",
  },
  {
    heading: "จำได้ในสามวินาที",
    lead: "ล็อกสัดส่วนหัวใหญ่ ทำอารมณ์ 8 แบบก่อนขยายเป็นสติกเกอร์ 16 ชิ้น",
    aside: "ร้านของเล่นอยากได้ตัวแทนแบรนด์ที่เด็กจำได้ทันที",
    close: "ใช้บนถุงและสติกเกอร์ไลน์",
  },
  {
    heading: "กรุงเทพที่ยังเป็นคนเดิน",
    lead: "ถ่ายจากระยะกลาง ไม่จ่อหน้า เกรดสีฟิล์มโทนเขียวอ่อนของหลอดไฟตลาด",
    aside: "อยากเก็บย่านก่อนร้านเปลี่ยนเป็นคาเฟ่ โดยไม่ทำให้คนในภาพเป็นสินค้า",
    close: "จัดแสดงเล็กในร้านหนังสือ และเป็นซีรีส์บนโปรไฟล์",
  },
  {
    heading: "ทดลองให้เห็นรอยต่อ",
    lead: "สเก็ตช์ด้วย AI แล้วตัดประกอบใน Photoshop เติมเส้นมือและเทกซ์เจอร์พิมพ์",
    aside: "ไม่แอบอ้างว่าวาดมือทั้งชิ้น — เปิดบทสนทนาเรื่องเครื่องมือกับลายไทย",
    close: "โปสเตอร์ 3 ใบใช้คุยในคอมมูนิตี้",
  },
];

function urlsFor(index) {
  const cover = demoCatalogCoverUrl(index);
  const a = demoPageUrl(index, "a");
  const b = demoPageUrl(index, "b");
  const c = demoPageUrl(index, "c");
  return { cover, a, b, c };
}

function canvasForIndex(index) {
  const p = DEMO_CATALOG[index].project;
  const t = COPY[index];
  const { cover, a, b, c } = urlsFor(index);
  const rhythm = index % 5;

  if (rhythm === 0) {
    return [
      imageSingle(index, "hero", cover, "tight"),
      headingBody(index, "h", t.heading, t.lead),
      imageGrid(index, "grid", [a, b, c], "three_split"),
      imageText(index, "aside", a, t.aside, "image_left"),
      imageGallery(index, "gal", [cover, b]),
      body(index, "close", t.close),
    ];
  }
  if (rhythm === 1) {
    return [
      imageSingle(index, "hero", cover, "tight"),
      heading(index, "h", t.heading),
      imageGrid(index, "grid", [a, b, c, cover], "four_quad"),
      imageText(index, "aside", b, t.aside, "text_left"),
      body(index, "close", `${t.lead} ${t.close}`),
    ];
  }
  if (rhythm === 2) {
    return [
      imageSingle(index, "hero", cover, "tight"),
      headingBody(index, "h", t.heading, t.lead),
      imageMulti(index, "row", [a, b, c], 3),
      imageText(index, "aside", a, t.aside, "text_left"),
      body(index, "close", t.close),
    ];
  }
  if (rhythm === 3) {
    return [
      imageGallery(index, "gal", [cover, a, b, c]),
      headingBody(index, "h", t.heading, t.lead),
      imageGrid(index, "grid", [a, b, c, cover], "wide_over_two"),
      body(index, "close", `${t.aside} ${t.close}`),
    ];
  }
  return [
    imageSingle(index, "hero", cover, "tight"),
    headingBody(index, "h", t.heading, t.lead),
    imageGrid(index, "grid", [a, b, c], "three_split_rev"),
    body(index, "close", `${t.aside} ${t.close}`),
  ];
}

export function buildDemoProjectPresentation(index) {
  const blocks = canvasForIndex(index);
  const { cover, a, b, c } = urlsFor(index);
  return {
    editor_mode: "casual",
    gallery_urls: [cover, a, b, c],
    content_blocks: blocks,
    allow_hire: index === 0 || index === 1 || index === 6,
  };
}

export function buildNapatsaraExtraPresentation() {
  const cover = napatsaraExtraCoverUrl();
  const a = demoCatalogUrl("pages/01b-napatsara-a.png");
  const b = demoCatalogUrl("pages/01b-napatsara-b.png");
  const index = 101;
  return {
    editor_mode: "casual",
    gallery_urls: [cover, a, b],
    content_blocks: [
      imageSingle(index, "hero", cover, "tight"),
      headingBody(index, "h", "ชุดเทศกาลที่ยังเป็นแม่ละมุน", "ลดทอง เพิ่มฟ้าน้ำและลายคลื่นบาง ๆ ให้รู้ทันทีว่าเป็นของช่วงสงกรานต์"),
      imageGrid(index, "grid", [cover, a, b], "three_split"),
      body(index, "close", "ใช้เป็นของฝากบริษัทช่วงเมษา โดยยังอยู่ในครอบครัวแบรนด์เดิม"),
    ],
    allow_hire: true,
  };
}

/** Prompts for extra page stills (cover already generated). */
export const PAGE_IMAGE_PROMPTS = DEMO_CATALOG.map((c, i) => ({
  username: c.username,
  a: c.detailPrompt,
  b: extraPromptB(i, c),
  c: extraPromptC(i, c),
}));

function extraPromptB(i, c) {
  const map = [
    "Coffee cup with simple bean-and-mountain stamp, cream ceramic, studio tabletop, no text",
    "Three Thai pastry boxes in a row, gold cream lids with geometric kranok, silk cloth, no logos",
    "Watercolor character sheet of a round baby elephant, three poses, children's book, no text",
    "Indigo and cream lotus geometry printed on a folded shirt, textile product photo, no people",
    "Handmade ceramic bowls stacked, matte earth glaze, side light, no logos",
    "Printed som tam campaign poster leaning on a restaurant counter, papaya red, no readable letters",
    "Close UI of spa booking date picker, mint green cards, no tiny fake paragraphs, no logos",
    "Editorial khao soi bowl matching an orange-wood social palette, no text",
    "Handwoven silk on aged wood, lifestyle product photo, no people",
    "Thai couple walking a tea plantation path, candid documentary, golden hour, no logos",
    "Six-frame motion storyboard of a cream-pink skincare bottle, flat icons, no letters",
    "Three cinematic travel thumbnails of Andaman sea and longtail boat, teal-orange, no titles",
    "Three-angle turnaround of a cute cloud art-toy with abstract Thai crown, grey studio",
    "Abstract gold kranok sound-wave on indigo, square print, no letters",
    "Hua Hin boutique hotel balcony with teak and linen, afternoon sea light, no people",
    "Macro of a modern Thai silver cuff on dark linen, luxury lighting, no text",
    "Three orthographic views of a curved bamboo chair, white cyclorama, no logos",
    "Six sticker poses of a round pink pig mascot on white, original character, no letters",
    "Bangkok market alley with hanging lamps at dusk, film grain, no close faces",
    "Close crop of Thai kranok fracturing into violet glitch pixels, print grain, no text",
  ];
  return map[i] || c.detailPrompt;
}

function extraPromptC(i, c) {
  const map = [
    "Kraft coffee bag side view with round stamp, Chiang Mai specialty branding, no readable brand",
    "Close foil-stamp lid of a Thai dessert box, cream and gold, no letters",
    "Watercolor children's book cover of elephant at morning market, pastel, no text",
    "Rolled indigo pha khao ma with lotus geometry, wooden table, no people",
    "Macro fingerprint texture on handmade ceramic rim, warm clay, no text",
    "Isan food props with graphic printed menu card, red and lime, no readable text",
    "Mint spa app payment screen on a phone mockup, pale stone, no logos",
    "Nine-tile food grid board on a table, northern Thai, orange-wood, no usernames",
    "Extreme close-up of handwoven silk threads, studio lighting, no text",
    "Two hands with a simple wedding ring, film grain, warm light, no text",
    "Hero still of cream-pink skincare bottle with sparkles and a timeline bar, no text",
    "Longtail boat silhouette on Andaman horizon, cinematic 2.35 crop, no text",
    "Cute resin cloud creature on acrylic plinth, dramatic product light, no logos",
    "Podcast art: sound wave morphing into Thai ornament, indigo gold, no microphone, no letters",
    "Interior material board: teak, plaster, linen, sea pebble, no text",
    "Fashion look of silver jewelry with short modern sinh, moody studio, no logos",
    "Bamboo chair joinery detail, industrial design photo, no text",
    "Pink pig mascot on a toy-store paper bag mockup, kawaii, no trademarks",
    "People walking away in Wang Lang market dusk, documentary film grain",
    "Experimental poster trio of glitch kranok in violet black, no letters",
  ];
  return map[i] || c.coverPrompt;
}

export const NAPATSARA_EXTRA_PAGE_PROMPTS = {
  a: "Thai dessert box with cool water-blue Songkran wave motif, studio still, no brand names",
  b: "Festival seal sticker and greeting card for Thai pastry gift set, water-blue gold, no text",
};
