import type { JobPost } from "@/hooks/useJobs";
import { parseEmbeddedResponsibilities } from "@/lib/jobBrief";

export const CATALOG_JOB_PREFIX = "00000000-0000-0000-0003-";

export const catalogJobId = (i: number) => {
  const hex = i.toString(16).padStart(2, "0");
  return `${CATALOG_JOB_PREFIX}0000000000${hex}`;
};

export const LENY_STUDIO_NAME = "LENY";
export const LENY_ORG_ID = "00000000-0000-0000-0005-000000000000";

const LENY_STUDIO_BKK = "สตูดิโอ LENY กรุงเทพ";

type ShowcaseJob = {
  id: string;
  title: string;
  role_category: string;
  employment_type: JobPost["employment_type"];
  location_type: JobPost["location_type"];
  location: string;
  budget_min: number;
  budget_max: number;
  budget_type: JobPost["budget_type"];
  cover_image_url: string;
  description: string;
  skills: string[];
  requirements_must: string[];
  requirements_nice: string[];
  perks: string[];
  exclusions_note: string;
  workplace_address: string;
  meeting_location: string;
  headcount: number;
};

export const LENY_SHOWCASE: ShowcaseJob[] = [
  {
    id: catalogJobId(0),
    title: "Brand Designer — ระบบอัตลักษณ์ LENY",
    role_category: "Branding",
    employment_type: "fulltime",
    location_type: "hybrid",
    location: "Bangkok · 2 วัน/สัปดาห์",
    budget_min: 35000,
    budget_max: 55000,
    budget_type: "monthly",
    cover_image_url: "/job-covers/leny-brand-identity.png",
    description:
      "LENY กำลังตั้งระบบอัตลักษณ์ให้ใช้ได้ทั้งร้าน แพ็กเกจ และช่องทางออนไลน์ — ต้องการคนออกแบบที่คิดเป็นระบบ ไม่ใช่แค่โลโก้สวย\n\nหน้าที่หลัก\n• ออกแบบโลโก้ โทนสี ไทโป และกฎการใช้แบรนด์\n• ทำ brand guideline ที่ทีมอื่นหยิบใช้ได้จริง\n• ปรับอัตลักษณ์ลงนามบัตร ป้ายร้าน และเทมเพลตโซเชียล\n\nเข้าออฟิสกรุงเทพ 2 วัน/สัปดาห์ ที่เหลือทำงานจากที่บ้าน",
    skills: ["Branding", "Logo", "Typography", "Illustrator", "Figma"],
    requirements_must: [
      "มีพอร์ตระบบอัตลักษณ์อย่างน้อย 2 ชุด",
      "ใช้ Illustrator และ Figma เป็น",
      "เขียน guideline ให้คนที่ไม่ใช่ดีไซเนอร์อ่านรู้เรื่อง",
    ],
    requirements_nice: ["เคยทำแบรนด์แฟชั่นหรือไลฟ์สไตล์", "เข้าใจการผลิตป้ายและแพ็กเกจ"],
    perks: ["ออกแบบแกนแบรนด์ตั้งแต่ต้น", "คุยตรงกับผู้ก่อตั้ง", "เครดิตชื่อใน guideline"],
    exclusions_note: "ไม่รวมถ่ายภาพสินค้า โมชันกราฟิก และการลงโฆษณา",
    workplace_address: LENY_STUDIO_BKK,
    meeting_location: LENY_STUDIO_BKK,
    headcount: 1,
  },
  {
    id: catalogJobId(1),
    title: "UI/UX Designer — แอปสมาชิก LENY",
    role_category: "UI/UX",
    employment_type: "fulltime",
    location_type: "remote",
    location: "Remote · GMT+7",
    budget_min: 40000,
    budget_max: 65000,
    budget_type: "monthly",
    cover_image_url: "/job-covers/leny-wellness.png",
    description:
      "ออกแบบแอปสมาชิกร้าน LENY — จองคิว แต้มสะสม และดูคอลเลกชันใหม่จากมือถือ\n\nหน้าที่หลัก\n• วาด user flow และ wireframe จองคิว / สมาชิก\n• ออกแบบ UI ให้เข้ากับโทนแบรนด์ส้ม-ขาว\n• ส่งไฟล์ Figma พร้อมคอมโพเนนต์ให้เดเวลอปเปอร์\n\nทำงานรีโมต โซนเวลา GMT+7 นัดออนไลน์สัปดาห์ละครั้ง",
    skills: ["UI/UX", "Figma", "Mobile", "Design system", "Prototyping"],
    requirements_must: [
      "มีพอร์ตแอปมือถือที่ออกแบบครบ flow",
      "ใช้ Figma Auto Layout และคอมโพเนนต์เป็น",
      "ส่งสเปกให้เดเวลอปเปอร์ได้โดยไม่ต้องอธิบายซ้ำ",
    ],
    requirements_nice: ["เคยทำแอปสมาชิกหรือร้านค้า", "รู้พื้นฐาน iOS / Android guideline"],
    perks: ["ออกแบบผลิตภัณฑ์หลักของแบรนด์", "รีโมตเต็มเวลา", "รีวิวงานกับทีมเล็ก ตัดสินใจเร็ว"],
    exclusions_note: "ไม่รวมเขียนโค้ด ทำแอนิเมชัน และดูแลโฆษณา",
    workplace_address: "Remote · GMT+7",
    meeting_location: `นัดออนไลน์ หรือ ${LENY_STUDIO_BKK} ถ้าต้องเวิร์กช็อป`,
    headcount: 1,
  },
  {
    id: catalogJobId(2),
    title: "Photographer — Lookbook คอลเลกชันแรก",
    role_category: "Photography",
    employment_type: "parttime",
    location_type: "hybrid",
    location: "Bangkok",
    budget_min: 25000,
    budget_max: 40000,
    budget_type: "fixed",
    cover_image_url: "/job-covers/leny-lookbook.png",
    description:
      "LENY กำลังทำ lookbook คอลเลกชันแรก — โทนส้ม-ขาว ทั้งภาพเสื้อผ้าบนไม้แขวนและภาพนางแบบในสตูดิโอ\n\nหน้าที่หลัก\n• วางแผนช็อตกับสไตลิสต์ก่อนวันถ่าย\n• ถ่าย lookbook ในสตูดิโอกรุงเทพ 1–2 วัน\n• ส่งไฟล์คัดแล้ว + รีทัชเบื้องต้น พร้อมใช้เว็บและโซเชียล\n\nส่งงานภายใน 10 วันหลังวันถ่าย",
    skills: ["Photography", "Lookbook", "Lighting", "Fashion", "Retouch"],
    requirements_must: [
      "มีพอร์ตถ่ายแฟชั่นหรือ lookbook",
      "ใช้ไฟสตูดิโอได้เอง",
      "ส่งไฟล์คัดและรีทัชเบื้องต้นได้",
    ],
    requirements_nice: ["เคยถ่าย e-commerce", "มีผู้ช่วยกล้องของตัวเอง", "มีเลนส์ 85mm หรือเทียบเท่า"],
    perks: ["เครดิตช่างภาพใน lookbook", "ค่าเดินทางในกรุงเทพตามจริง", "ได้ชุดอ้างอิงจากคอลเลกชันแรก"],
    exclusions_note: "ไม่รวมถ่ายวิดีโอ รีทัชละเอียดรายชิ้น และการจัดสไตล์เสื้อผ้า",
    workplace_address: LENY_STUDIO_BKK,
    meeting_location: LENY_STUDIO_BKK,
    headcount: 1,
  },
  {
    id: catalogJobId(3),
    title: "Packaging Designer — กล่องของขวัญ LENY",
    role_category: "Graphic",
    employment_type: "fulltime",
    location_type: "hybrid",
    location: "Bangkok · 2 วัน/สัปดาห์",
    budget_min: 30000,
    budget_max: 48000,
    budget_type: "monthly",
    cover_image_url: "/job-covers/leny-packaging.png",
    description:
      "ออกแบบกล่องของขวัญและซองใส่สินค้า LENY ให้เปิดแล้วรู้สึกคุ้มค่าที่จะให้ต่อ\n\nหน้าที่หลัก\n• ออกแบบโครงสร้างกล่อง ซอง และป้ายแท็ก\n• ทำไฟล์พิมพ์พร้อมไดคัท\n• ทดลองวัสดุกับโรงพิมพ์ แล้วปรับจนผลิตได้จริง\n\nเข้าออฟิส 2 วัน/สัปดาห์ เพื่อดูตัวอย่างพิมพ์",
    skills: ["Packaging", "Print", "Dieline", "Illustrator", "Graphic"],
    requirements_must: [
      "มีพอร์ตแพ็กเกจที่ผลิตจริงแล้ว",
      "ทำไฟล์ไดคัทและสเปกสีพิมพ์ได้",
      "คุยกับโรงพิมพ์เรื่องวัสดุได้",
    ],
    requirements_nice: ["รู้จักกระดาษและงานปั๊มนูน", "เคยทำกล่องของขวัญแฟชั่น"],
    perks: ["เห็นงานขึ้นชั้นวางจริง", "งบทดลองวัสดุ", "คุยตรงกับทีมร้าน"],
    exclusions_note: "ไม่รวมถ่ายภาพสินค้า เขียนคัดลอก และการติดต่อโรงพิมพ์ต่างประเทศ",
    workplace_address: LENY_STUDIO_BKK,
    meeting_location: LENY_STUDIO_BKK,
    headcount: 1,
  },
  {
    id: catalogJobId(4),
    title: "Motion Designer — คลิปเปิดตัวแบรนด์",
    role_category: "Motion",
    employment_type: "fulltime",
    location_type: "remote",
    location: "Remote",
    budget_min: 32000,
    budget_max: 50000,
    budget_type: "monthly",
    cover_image_url: "/job-covers/leny-motion.png",
    description:
      "ทำคลิปเปิดตัวแบรนด์และโมชันสั้นสำหรับเว็บกับโซเชียล — โทนนิ่ง ไม่วุ่น\n\nหน้าที่หลัก\n• ทำสตอรี่บอร์ดคลิปเปิดตัว 15–30 วินาที\n• โมชันไทโป โลโก้ และภาพสินค้า\n• ส่งไฟล์แนวตั้ง-แนวนอน พร้อมซับไทเทิล\n\nรีโมต นัดดูรอบตัดต่อสัปดาห์ละ 2 ครั้ง",
    skills: ["Motion", "After Effects", "Typography", "Storyboard", "Social"],
    requirements_must: [
      "มีพอร์ตโมชัน 15–30 วินาที",
      "ใช้ After Effects เป็นงานหลัก",
      "ส่งไฟล์ตามสเปกแพลตฟอร์มได้",
    ],
    requirements_nice: ["ตัดต่อ Premiere หรือ Resolve ได้", "ทำเสียงประกอบเบื้องต้นได้"],
    perks: ["งานเปิดตัวชิ้นแรกของแบรนด์", "รีโมต", "เครดิตในคลิป"],
    exclusions_note: "ไม่รวมถ่ายภาพเคลื่อนไหวในโลเคชัน และการซื้อลิขสิทธิ์เพลง",
    workplace_address: "Remote",
    meeting_location: `นัดออนไลน์ หรือ ${LENY_STUDIO_BKK}`,
    headcount: 1,
  },
  {
    id: catalogJobId(5),
    title: "Content Creator — เรื่องราวร้านธง LENY",
    role_category: "Video",
    employment_type: "parttime",
    location_type: "remote",
    location: "Remote · ถ่ายร้านเป็นครั้งคราว",
    budget_min: 18000,
    budget_max: 28000,
    budget_type: "monthly",
    cover_image_url: "/job-covers/leny-store.png",
    description:
      "เล่าเรื่องร้านธง LENY ให้คนอยากเดินเข้าไป — คลิปสั้น ภาพนิ่ง และแคปชัน\n\nหน้าที่หลัก\n• วางแผนคอนเทนต์ร้าน 4–6 ชิ้นต่อเดือน\n• ลงถ่ายร้านเป็นครั้งคราว แล้วตัดคลิปสั้น\n• เขียนแคปชันโทนอบอุ่น ไม่ขายของโจ่งแจ้ง\n\nส่วนใหญ่ทำจากที่บ้าน ลงร้านเมื่อนัดถ่าย",
    skills: ["Content", "Short video", "Caption", "Instagram", "TikTok"],
    requirements_must: [
      "มีพอร์ตคลิปสั้นที่เล่าเรื่องร้านหรือแบรนด์",
      "ถ่ายและตัดคลิปด้วยมือถือหรือกล้องเล็กได้",
      "เขียนแคปชันภาษาไทยได้เอง",
    ],
    requirements_nice: ["เคยทำคอนเทนต์แฟชั่น", "มีขาตั้งและไมค์หนีบเสื้อ"],
    perks: ["ลงร้านธงเป็นครั้งคราว", "ใช้สินค้าถ่ายได้ตามนัด", "ตารางยืดหยุ่น"],
    exclusions_note: "ไม่รวมยิงแอด ดูแลคอมเมนต์ และการไลฟ์ยาว",
    workplace_address: "Remote · ถ่ายที่ร้านธงตามนัด",
    meeting_location: "ร้านธง LENY กรุงเทพ",
    headcount: 1,
  },
  {
    id: catalogJobId(6),
    title: "Interior Designer — ร้านธง LENY",
    role_category: "Other",
    employment_type: "fulltime",
    location_type: "hybrid",
    location: "Bangkok · ลงร้าน",
    budget_min: 38000,
    budget_max: 58000,
    budget_type: "monthly",
    cover_image_url: "/job-covers/leny-interior.png",
    description:
      "ออกแบบพื้นที่ร้านธงให้เดินเลือกเสื้อผ้าแล้วอยากลอง — แสง วัสดุ ชั้นวาง\n\nหน้าที่หลัก\n• วางผังร้าน โซนลองเสื้อ และจุดถ่ายรูป\n• เลือกวัสดุ แสง และเฟอร์นิเจอร์\n• ลงไซต์ดูช่าง และปรับรายละเอียดจนเปิดร้านได้\n\nลงร้านกรุงเทพเป็นหลัก เข้าสตูดิโอเมื่อวางแบบ",
    skills: ["Interior", "Retail", "Lighting", "Material", "Site"],
    requirements_must: [
      "มีพอร์ตร้านค้าหรือพื้นที่รีเทล",
      "ทำแบบและสเปกให้ช่างอ่านได้",
      "ลงไซต์คุยช่างได้",
    ],
    requirements_nice: ["เคยออกแบบร้านแฟชั่น", "รู้จักผู้รับเหมาร้านขนาดเล็ก"],
    perks: ["ออกแบบร้านธงชิ้นแรก", "งบวัสดุทดลอง", "เห็นงานเปิดจริง"],
    exclusions_note: "ไม่รวมควบคุมงบก่อสร้างทั้งโครงการ และการจัดซื้อเฟอร์นิเจอร์นำเข้า",
    workplace_address: "ร้านธง LENY กรุงเทพ",
    meeting_location: LENY_STUDIO_BKK,
    headcount: 1,
  },
  {
    id: catalogJobId(7),
    title: "Copywriter — เสียงแบรนด์ LENY",
    role_category: "Copywriting",
    employment_type: "parttime",
    location_type: "remote",
    location: "Remote",
    budget_min: 20000,
    budget_max: 32000,
    budget_type: "monthly",
    cover_image_url: "/job-covers/leny-editorial.png",
    description:
      "ตั้งเสียงแบรนด์ LENY ให้ฟังดูเป็นคน ไม่ใช่โฆษณา — ใช้ในเว็บ ป้ายร้าน และโซเชียล\n\nหน้าที่หลัก\n• เขียน tone of voice และคำที่ใช้ / ไม่ใช้\n• เขียนข้อความเว็บ แท็กสินค้า และแคปชันหลัก\n• ปรับสำเนียงให้ทีมอื่นเขียนต่อได้\n\nรีโมต ส่งงานเป็นรอบรายสัปดาห์",
    skills: ["Copywriting", "Tone of voice", "Thai", "Brand writing", "Social"],
    requirements_must: [
      "มีพอร์ตงานเขียนแบรนด์ภาษาไทย",
      "เขียนสั้นได้โดยไม่เสียโทน",
      "รับฟีดแบ็กแล้วแก้รอบได้ตรง",
    ],
    requirements_nice: ["เคยเขียนงานแฟชั่น", "แปลไทย-อังกฤษสายแบรนด์ได้"],
    perks: ["กำหนดเสียงแบรนด์ตั้งแต่ต้น", "รีโมต", "เครดิตในหน้า About"],
    exclusions_note: "ไม่รวมเขียนบทความยาว SEO และการตอบแชทลูกค้า",
    workplace_address: "Remote",
    meeting_location: `นัดออนไลน์ หรือ ${LENY_STUDIO_BKK}`,
    headcount: 1,
  },
  {
    id: catalogJobId(8),
    title: "Social Designer — เทมเพลตคอนเทนต์",
    role_category: "Graphic",
    employment_type: "fulltime",
    location_type: "remote",
    location: "Remote · GMT+7",
    budget_min: 28000,
    budget_max: 42000,
    budget_type: "monthly",
    cover_image_url: "/job-covers/leny-social.png",
    description:
      "ทำเทมเพลตโซเชียลให้ทีมคอนเทนต์ใส่รูปแล้วโพสต์ได้เอง — โทนเดียวทั้งฟีด\n\nหน้าที่หลัก\n• ออกแบบเทมเพลตฟีด สตอรี่ และปกคลิป\n• ทำไฟล์ Figma ที่เปลี่ยนข้อความได้\n• อัปเดตเทมเพลตตามคอลเลกชันใหม่\n\nรีโมต โซนเวลา GMT+7",
    skills: ["Social", "Figma", "Templates", "Graphic", "Instagram"],
    requirements_must: [
      "มีพอร์ตฟีดแบรนด์ที่จัดโทนเป็นระบบ",
      "ทำเทมเพลต Figma ให้คนอื่นใช้ต่อได้",
      "จัดสัดส่วนไฟล์ตามแต่ละแพลตฟอร์มได้",
    ],
    requirements_nice: ["เข้าใจขนาด Reels / TikTok", "ทำโมชันสั้นติดเทมเพลตได้"],
    perks: ["กำหนดหน้าตาฟีดทั้งแบรนด์", "รีโมต", "อัปเดตตามคอลเลกชันใหม่"],
    exclusions_note: "ไม่รวมโพสต์จริง ตอบคอมเมนต์ และการยิงแอด",
    workplace_address: "Remote · GMT+7",
    meeting_location: `นัดออนไลน์ หรือ ${LENY_STUDIO_BKK}`,
    headcount: 1,
  },
  {
    id: catalogJobId(9),
    title: "3D Artist — เรนเดอร์สินค้า LENY",
    role_category: "3D",
    employment_type: "parttime",
    location_type: "remote",
    location: "Remote",
    budget_min: 24000,
    budget_max: 38000,
    budget_type: "fixed",
    cover_image_url: "/job-covers/leny-3d.png",
    description:
      "เรนเดอร์สินค้าและพร็อปร้านให้ใช้บนเว็บเมื่อยังไม่มีของจริงครบ\n\nหน้าที่หลัก\n• โมเดล / ปรับโมเดลเสื้อผ้าหรือพร็อปร้าน\n• จัดแสงโทนส้ม-ขาว แล้วเรนเดอร์ภาพใช้ขาย\n• ส่งไฟล์พื้นหลังโปร่งและฉากร้าน\n\nงานคิดเป็นโปรเจกต์ ส่งภายใน 3 สัปดาห์",
    skills: ["3D", "Rendering", "Product", "Lighting", "Blender"],
    requirements_must: [
      "มีพอร์ตเรนเดอร์สินค้าที่ดูใกล้ของจริง",
      "ใช้ Blender หรือซอฟต์แวร์เทียบเท่าเป็น",
      "จัดไฟล์ส่งตามสเปกเว็บได้",
    ],
    requirements_nice: ["ทำผ้าและรอยยับได้", "ส่งเทิร์นอะราวด์สั้นได้"],
    perks: ["งานเปิดตัวเว็บร้าน", "รีโมต", "เครดิตในหน้าสินค้า"],
    exclusions_note: "ไม่รวมถ่ายภาพของจริง โมเดลตัวละคร และการทำเกม",
    workplace_address: "Remote",
    meeting_location: `นัดออนไลน์ หรือ ${LENY_STUDIO_BKK}`,
    headcount: 1,
  },
  {
    id: catalogJobId(10),
    title: "Stylist — คอลเลกชันฤดูฝน",
    role_category: "Other",
    employment_type: "parttime",
    location_type: "hybrid",
    location: "Bangkok",
    budget_min: 22000,
    budget_max: 35000,
    budget_type: "fixed",
    cover_image_url: "/job-covers/leny-atelier.png",
    description:
      "จัดลุคคอลเลกชันฤดูฝนให้ดูใส่จริงได้ ไม่ใช่แค่แขวนสวย\n\nหน้าที่หลัก\n• คัดเสื้อผ้า รองเท้า และพร็อปต่อช็อต\n• ฟิตติ้งนางแบบก่อนวันถ่าย\n• อยู่กองถ่าย lookbook จนครบช็อต\n\nลงสตูดิโอกรุงเทพตามวันถ่าย",
    skills: ["Styling", "Fashion", "Lookbook", "Fitting", "Wardrobe"],
    requirements_must: [
      "มีพอร์ตสไตล์แฟชั่นหรือ lookbook",
      "จัดลุคจากเสื้อผ้าที่มีอยู่ได้",
      "อยู่กองถ่ายครบวันได้",
    ],
    requirements_nice: ["มีพร็อปหรือรองเท้าให้ยืม", "เคยทำงานคอลเลกชันฤดูฝน"],
    perks: ["เครดิตสไตลิสต์ใน lookbook", "ค่าเดินทางในกรุงเทพตามจริง", "ได้ชุดอ้างอิงหลังจบงาน"],
    exclusions_note: "ไม่รวมถ่ายภาพ ตัดเย็บแก้ไขแบบ และการซื้อเสื้อผ้าเพิ่มนอกงบ",
    workplace_address: LENY_STUDIO_BKK,
    meeting_location: LENY_STUDIO_BKK,
    headcount: 1,
  },
  {
    id: catalogJobId(11),
    title: "Web Designer — เว็บร้าน LENY",
    role_category: "Web/UI",
    employment_type: "fulltime",
    location_type: "hybrid",
    location: "Bangkok · 2 วัน/สัปดาห์",
    budget_min: 36000,
    budget_max: 52000,
    budget_type: "monthly",
    cover_image_url: "/job-covers/leny-web.png",
    description:
      "ออกแบบเว็บร้าน LENY ให้เปิดแล้วอยากซื้อ — หน้าแรก คอลเลกชัน และหน้ารายละเอียดสินค้า\n\nหน้าที่หลัก\n• ออกแบบหน้าเว็บเดสก์ท็อปและมือถือ\n• จัดลำดับหน้า คอลเลกชัน และตะกร้า\n• ส่งไฟล์ Figma พร้อมสเปกให้เดเวลอปเปอร์\n\nเข้าออฟิส 2 วัน/สัปดาห์ ที่เหลือรีโมต",
    skills: ["Web/UI", "Figma", "Ecommerce", "Responsive", "Design system"],
    requirements_must: [
      "มีพอร์ตเว็บร้านหรือ e-commerce",
      "ออกแบบมือถือและเดสก์ท็อปคู่กัน",
      "ส่งสเปกระยะห่าง ตัวอักษร และสถานะปุ่มได้",
    ],
    requirements_nice: ["รู้จักพื้นฐาน Shopify หรือ Webflow", "เคยทำหน้า lookbook"],
    perks: ["ออกแบบเว็บร้านหลัก", "คุยตรงกับทีมแบรนด์", "เห็นงานขึ้นจริง"],
    exclusions_note: "ไม่รวมเขียนโค้ด ดูแลโดเมน และการยิงแอด",
    workplace_address: LENY_STUDIO_BKK,
    meeting_location: LENY_STUDIO_BKK,
    headcount: 1,
  },
];

export const SHOWCASE_JOB_IDS = new Set(LENY_SHOWCASE.map((j) => j.id));

export const isCatalogJobId = (id: string) => id.startsWith(CATALOG_JOB_PREFIX);

export const showcaseCoverUrl = (jobId: string) =>
  LENY_SHOWCASE.find((j) => j.id === jobId)?.cover_image_url ?? null;

/** Extra job photos under the cover — up to 6 other LENY stills. */
export const showcaseGalleryUrls = (jobId: string): string[] => {
  const own = showcaseCoverUrl(jobId);
  return LENY_SHOWCASE.map((j) => j.cover_image_url).filter((url) => url && url !== own).slice(0, 6);
};

/** Keep 12 LENY catalog cards; hide leftover seed jobs; leave real posts intact. */
export const applyLenyShowcase = (jobs: JobPost[]): JobPost[] => {
  const overlay = new Map(LENY_SHOWCASE.map((j) => [j.id, j]));
  return jobs
    .filter((j) => !isCatalogJobId(j.id) || overlay.has(j.id))
    .map((j) => {
      const next = overlay.get(j.id);
      if (!next) return j;
      return {
        ...j,
        title: next.title,
        role_category: next.role_category,
        employment_type: next.employment_type,
        location_type: next.location_type,
        location: next.location,
        budget_min: next.budget_min,
        budget_max: next.budget_max,
        budget_type: next.budget_type,
        cover_image_url: next.cover_image_url,
        gallery_urls: showcaseGalleryUrls(next.id),
        description: next.description,
        skills: next.skills,
        requirements_must: next.requirements_must,
        requirements_nice: next.requirements_nice,
        perks: next.perks,
        deliverables: parseEmbeddedResponsibilities(next.description).responsibilities,
        exclusions_note: next.exclusions_note,
        workplace_address: next.workplace_address,
        meeting_location: next.meeting_location,
        headcount: next.headcount,
        hiring_org_id: LENY_ORG_ID,
        hiring_org: {
          id: LENY_ORG_ID,
          display_name: LENY_STUDIO_NAME,
          logo_url: "/job-covers/leny-brand-identity.png",
          status: "approved",
          province: "Bangkok",
        },
        studio: j.studio
          ? { ...j.studio, name: LENY_STUDIO_NAME, verified: true }
          : { name: LENY_STUDIO_NAME, slug: "doi-studio", avatar_url: next.cover_image_url, verified: true },
      };
    });
};
