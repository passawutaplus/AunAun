import {
  Bot,
  Globe,
  Monitor,
  Package,
  Palette,
  PenLine,
  Rainbow,
  Smartphone,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export type InspireCategory =
  | "inspiration"
  | "uiux"
  | "branding"
  | "colors"
  | "assets"
  | "ai"
  | "mockup"
  | "marketing";

export interface InspireResource {
  name: string;
  url: string;
  domain: string;
  description: string;
  category: InspireCategory;
}

export interface CategoryMeta {
  id: "all" | InspireCategory;
  label: string;
  icon: LucideIcon;
}

export const CATEGORIES: CategoryMeta[] = [
  { id: "all", label: "ทั้งหมด", icon: Sparkles },
  { id: "inspiration", label: "Inspiration", icon: Globe },
  { id: "uiux", label: "Web & UI/UX", icon: Monitor },
  { id: "branding", label: "Branding & Graphic", icon: Palette },
  { id: "colors", label: "Colors & Gradients", icon: Rainbow },
  { id: "assets", label: "Assets & Icons", icon: Package },
  { id: "ai", label: "AI Design", icon: Bot },
  { id: "mockup", label: "Mockups", icon: Smartphone },
  { id: "marketing", label: "Marketing & Copy", icon: PenLine },
];

export const RESOURCES: InspireResource[] = [
  // Inspiration (general)
  {
    name: "Pinterest",
    url: "https://www.pinterest.com",
    domain: "pinterest.com",
    description: "คลังแสงไอเดียไร้ขอบเขต เหมาะสำหรับทำ Moodboard ต้นทางของทุกงานสร้างสรรค์",
    category: "inspiration",
  },
  {
    name: "Behance",
    url: "https://www.behance.net",
    domain: "behance.net",
    description: "แหล่งรวมเคสงานดีไซน์ระดับบิ๊กโปรเจกต์ เจาะลึกวิธีคิดแบบ Case Study ของโปรทั่วโลก",
    category: "inspiration",
  },
  {
    name: "Dribbble",
    url: "https://dribbble.com",
    domain: "dribbble.com",
    description: "ชุมชนโชว์งานดีไซน์เน้นความสวยงาม ทันสมัย และเทรนด์ดีไซน์ล่าสุด",
    category: "inspiration",
  },
  {
    name: "Awwwards",
    url: "https://www.awwwards.com",
    domain: "awwwards.com",
    description: "เวทีประกวดเว็บไซต์ที่สวยและล้ำที่สุดในโลก เหมาะสำหรับหาไอเดียดีไซน์ระดับพรีเมียม",
    category: "inspiration",
  },
  {
    name: "It's Nice That",
    url: "https://www.itsnicethat.com",
    domain: "itsnicethat.com",
    description: "แมกกาซีนครีเอทีฟระดับโลก ครอบคลุมกราฟิก ศิลปะ และวัฒนธรรมดีไซน์",
    category: "inspiration",
  },
  {
    name: "Designspiration",
    url: "https://www.designspiration.com",
    domain: "designspiration.com",
    description: "ค้นหาไอเดียดีไซน์ด้วยสีและคีย์เวิร์ด เหมาะทำ mood board เร็ว",
    category: "inspiration",
  },
  {
    name: "Muzli",
    url: "https://muz.li",
    domain: "muz.li",
    description: "ฟีดไอเดียดีไซน์รายวันจากทั่วโลก เปิดทุกเช้าเติมแรงบันดาลใจ",
    category: "inspiration",
  },

  // Web & UI/UX
  {
    name: "Mobbin",
    url: "https://mobbin.com",
    domain: "mobbin.com",
    description: "คลังภาพ Screenshot ของแอปจริงระดับโลก เจาะลึก UX/UI Flow ที่ดีที่สุด",
    category: "uiux",
  },
  {
    name: "Land-book",
    url: "https://land-book.com",
    domain: "land-book.com",
    description: "แหล่งรวมดีไซน์หน้าแรก (Landing Page) ที่เน้นการสร้าง Conversion ที่ดีที่สุด",
    category: "uiux",
  },
  {
    name: "Godly",
    url: "https://godly.website",
    domain: "godly.website",
    description: "รวมเว็บไซต์ที่มีแอนิเมชันลื่นไหลและดีไซน์ระดับเทพที่สุดในโลก",
    category: "uiux",
  },
  {
    name: "Lapa Ninja",
    url: "https://www.lapa.ninja",
    domain: "lapa.ninja",
    description: "คลังไอเดีย Landing Page แบ่งหมวดหมู่ตามธุรกิจอย่างละเอียด",
    category: "uiux",
  },
  {
    name: "Dark Mode Design",
    url: "https://darkmodedesign.com",
    domain: "darkmodedesign.com",
    description: "รวมเว็บไซต์โหมดมืด (Dark Mode) ที่ออกแบบแสงและเงามาอย่างสมบูรณ์แบบ",
    category: "uiux",
  },
  {
    name: "Screenlane",
    url: "https://screenlane.com",
    domain: "screenlane.com",
    description: "แจก UI หน้าจอแอปพลิเคชัน ค้นหาตามฟีเจอร์ได้เลย เช่น หน้า Login หรือหน้า Profile",
    category: "uiux",
  },
  {
    name: "One Page Love",
    url: "https://onepagelove.com",
    domain: "onepagelove.com",
    description: "คลัง Landing Page สวยๆ แบ่งหมวดตามอุตสาหกรรมและสไตล์",
    category: "uiux",
  },
  {
    name: "Page Flows",
    url: "https://pageflows.com",
    domain: "pageflows.com",
    description: "วิดีโอ UX flow ของแอปดังๆ ดู user journey จริงก่อนออกแบบ",
    category: "uiux",
  },
  {
    name: "Refero",
    url: "https://refero.design",
    domain: "refero.design",
    description: "คลัง UI pattern จากแอปและเว็บจริง ค้นหาตาม component ได้",
    category: "uiux",
  },
  {
    name: "SaaS Landing Page",
    url: "https://saaslandingpage.com",
    domain: "saaslandingpage.com",
    description: "รวม Landing Page ของ SaaS ชั้นนำ เน้น conversion และ copy",
    category: "uiux",
  },

  // Branding & Graphic
  {
    name: "Savee",
    url: "https://savee.it",
    domain: "savee.it",
    description: "แพลตฟอร์มเซฟรูปภาพและ Inspiration ที่สะอาดตา (ดีไซเนอร์หลายคนใช้แทน Pinterest)",
    category: "branding",
  },
  {
    name: "BP&O",
    url: "https://bpando.org",
    domain: "bpando.org",
    description: "บทความวิเคราะห์งานออกแบบโลโก้และแพ็กเกจจิ้งระดับพรีเมียมทั่วโลก",
    category: "branding",
  },
  {
    name: "Mindsparkle Mag",
    url: "https://mindsparklemag.com",
    domain: "mindsparklemag.com",
    description: "แมกกาซีนออนไลน์รวมงานดีไซน์สไตล์มินิมอลและไฮเอนด์",
    category: "branding",
  },
  {
    name: "Brand New",
    url: "https://www.underconsideration.com/brandnew",
    domain: "underconsideration.com",
    description: "รีวิวและวิเคราะห์งาน rebrand ระดับโลกอย่างละเอียด",
    category: "branding",
  },
  {
    name: "Identity Designed",
    url: "https://identitydesigned.com",
    domain: "identitydesigned.com",
    description: "เคสสตัดี้แบรนด์ไอเดนทิตี้จากทั่วโลก เน้นกระบวนการคิด",
    category: "branding",
  },
  {
    name: "LogoLounge",
    url: "https://www.logolounge.com",
    domain: "logolounge.com",
    description: "แหล่งรวมโลโก้เทรนด์ล่าสุดและบทวิเคราะห์ทิศทาง branding",
    category: "branding",
  },

  // Colors & Type
  {
    name: "Coolors",
    url: "https://coolors.co",
    domain: "coolors.co",
    description: "เครื่องมือเจนโทนสีที่เร็วที่สุดในโลก ช่วยจับคู่สีให้งานออกมาดูแพงและมีมิติ",
    category: "colors",
  },
  {
    name: "Color Hunt",
    url: "https://colorhunt.co",
    domain: "colorhunt.co",
    description: "คลังจานสี (Color Palettes) ที่คนโหวตว่าสวยที่สุด อัปเดตเทรนด์สีทุกวัน",
    category: "colors",
  },
  {
    name: "Khroma",
    url: "https://khroma.co",
    domain: "khroma.co",
    description: "AI ช่วยจับคู่สีตามความชอบของคุณ ได้เฉดสีที่แปลกใหม่และดูแพง",
    category: "colors",
  },
  {
    name: "Grabient",
    url: "https://www.grabient.com",
    domain: "grabient.com",
    description: "รวมโค้ดสีเกรเดี้ยน (Gradient) สวยๆ สามารถก๊อปปี้ CSS ไปใช้ทำเว็บได้ทันที",
    category: "colors",
  },
  {
    name: "Typewolf",
    url: "https://www.typewolf.com",
    domain: "typewolf.com",
    description: "ไบเบิลเรื่องฟอนต์ของดีไซเนอร์ บอกเทรนด์ฟอนต์มาแรงและวิธีจับคู่ฟอนต์",
    category: "colors",
  },
  {
    name: "Fontshare",
    url: "https://www.fontshare.com",
    domain: "fontshare.com",
    description: "คลังฟอนต์ระดับพรีเมียมที่เปิดให้โหลดไปใช้ในงานเชิงพาณิชย์ได้ฟรี 100%",
    category: "colors",
  },
  {
    name: "Adobe Color",
    url: "https://color.adobe.com",
    domain: "color.adobe.com",
    description: "เครื่องมือสร้างและค้นหา color palette จากชุมชนนักออกแบบ",
    category: "colors",
  },
  {
    name: "Happy Hues",
    url: "https://www.happyhues.co",
    domain: "happyhues.co",
    description: "จานสีพร้อมตัวอย่าง UI จริง ช่วยเห็นภาพก่อนนำไปใช้งาน",
    category: "colors",
  },
  {
    name: "Paletton",
    url: "https://paletton.com",
    domain: "paletton.com",
    description: "เครื่องมือสร้างสีแบบ interactive ดูความสัมพันธ์ของสีบนวงล้อ",
    category: "colors",
  },

  // Assets & Icons
  {
    name: "Unsplash",
    url: "https://unsplash.com",
    domain: "unsplash.com",
    description: "คลังภาพถ่ายความละเอียดสูงระดับช่างภาพโปร โหลดฟรีและไม่มีค่าลิขสิทธิ์",
    category: "assets",
  },
  {
    name: "Iconify",
    url: "https://iconify.design",
    domain: "iconify.design",
    description: "แหล่งรวมไอคอนเวกเตอร์ที่ใหญ่ที่สุด ค้นหาและดึงไปใช้งานเขียนโค้ดได้ทันที",
    category: "assets",
  },
  {
    name: "Freepik",
    url: "https://www.freepik.com",
    domain: "freepik.com",
    description: "คลังวัตถุดิบกราฟิกยอดฮิต มีครบทั้ง Vector, Mockup 3D และรูปภาพ",
    category: "assets",
  },
  {
    name: "unDraw",
    url: "https://undraw.co",
    domain: "undraw.co",
    description: "ภาพประกอบเวกเตอร์สไตล์มินิมอล สามารถปรับเปลี่ยนสีให้ตรงกับแบรนด์ได้ฟรี",
    category: "assets",
  },
  {
    name: "Lordicon",
    url: "https://lordicon.com",
    domain: "lordicon.com",
    description: "คลังไอคอนแอนิเมชันขยับได้ (Lottie) ช่วยให้งานออกแบบดูมีชีวิตชีวาขึ้น 10 เท่า",
    category: "assets",
  },
  {
    name: "Phosphor Icons",
    url: "https://phosphoricons.com",
    domain: "phosphoricons.com",
    description: "เซ็ตไอคอนคลีนๆ ที่เข้ากับดีไซน์ทุกรูปแบบ (สาย UI/UX นิยมใช้มาก)",
    category: "assets",
  },
  {
    name: "Pexels",
    url: "https://www.pexels.com",
    domain: "pexels.com",
    description: "ภาพถ่ายและวิดีโอฟรีคุณภาพสูง ใช้เชิงพาณิชย์ได้",
    category: "assets",
  },
  {
    name: "SVG Repo",
    url: "https://www.svgrepo.com",
    domain: "svgrepo.com",
    description: "คลัง SVG ฟรีหลายแสนไฟล์ ดาวน์โหลดและปรับสีได้ทันที",
    category: "assets",
  },
  {
    name: "Blush",
    url: "https://blush.design",
    domain: "blush.design",
    description: "ภาพประกอบ customizable จากศิลปินทั่วโลก ปรับสีและท่าทางได้",
    category: "assets",
  },
  {
    name: "Shapefest",
    url: "https://www.shapefest.com",
    domain: "shapefest.com",
    description: "3D shapes และ abstract objects ฟรีสำหรับงานกราฟิกและเว็บ",
    category: "assets",
  },

  // AI Design
  {
    name: "v0 by Vercel",
    url: "https://v0.dev",
    domain: "v0.dev",
    description:
      "AI เจนโค้ด UI (React/Tailwind) จากการพิมพ์บรีฟ คัดลอกโค้ดไปแปะในระบบใช้งานได้ทันที",
    category: "ai",
  },
  {
    name: "Relume AI",
    url: "https://www.relume.io",
    domain: "relume.io",
    description:
      "AI ช่วยวางโครงสร้างเว็บ (Sitemap & Wireframe) พร้อมเขียนคำโฆษณาลง Figma ได้ภายในไม่กี่วินาที",
    category: "ai",
  },
  {
    name: "Uizard",
    url: "https://uizard.io",
    domain: "uizard.io",
    description:
      "AI อัจฉริยะแปลงภาพสเก็ตช์หรือแคปหน้าจอ ให้กลายเป็นหน้า UI/UX ที่คลิกโต้ตอบได้จริง",
    category: "ai",
  },
  {
    name: "Recraft.ai",
    url: "https://www.recraft.ai",
    domain: "recraft.ai",
    description: "AI เจนงานภาพประกอบเวกเตอร์และไอคอนคมชัด ดาวน์โหลด SVG ไปแก้ต่อใน Figma ได้ฟรี",
    category: "ai",
  },
  {
    name: "Kittl AI",
    url: "https://www.kittl.com",
    domain: "kittl.com",
    description: "AI ช่วยออกแบบลายเสื้อ โลโก้ และตัวอักษรศิลป์ (Typography) พร้อมเทมเพลตระดับโปร",
    category: "ai",
  },
  {
    name: "Adobe Firefly",
    url: "https://firefly.adobe.com",
    domain: "firefly.adobe.com",
    description:
      "AI สายดีไซเนอร์จาก Adobe เจนภาพและขยายขอบเขตภาพอย่างเนียนตา ปลอดภัยเรื่องลิขสิทธิ์เชิงพาณิชย์ 100%",
    category: "ai",
  },
  {
    name: "Midjourney",
    url: "https://www.midjourney.com",
    domain: "midjourney.com",
    description: "ราชาแห่ง AI เจนภาพกราฟิกและภาพถ่ายระดับภาพยนตร์ เหมาะทำ Moodboard ส่งลูกค้า",
    category: "ai",
  },
  {
    name: "Clipdrop",
    url: "https://clipdrop.co",
    domain: "clipdrop.co",
    description: "รวมเครื่องมือ AI มหัศจรรย์ ลบคนออกจากภาพ ย้ายแสงไฟ และขยายขนาดภาพได้โดยไม่แตก",
    category: "ai",
  },
  {
    name: "Ideogram",
    url: "https://ideogram.ai",
    domain: "ideogram.ai",
    description: "AI เจนภาพที่ใส่ตัวอักษรและ typography ในภาพได้แม่นยำ",
    category: "ai",
  },
  {
    name: "Runway",
    url: "https://runwayml.com",
    domain: "runwayml.com",
    description: "AI วิดีโอและภาพเคลื่อนไหว สร้าง motion content สำหรับโซเชียล",
    category: "ai",
  },
  {
    name: "Leonardo.ai",
    url: "https://leonardo.ai",
    domain: "leonardo.ai",
    description: "AI image gen เน้นงาน game asset, concept art และ illustration",
    category: "ai",
  },
  {
    name: "Canva Magic Studio",
    url: "https://www.canva.com/magic",
    domain: "canva.com",
    description: "ชุดเครื่องมือ AI ใน Canva สำหรับออกแบบกราฟิกและคอนเทนต์เร็ว",
    category: "ai",
  },

  // Mockups
  {
    name: "Shots.so",
    url: "https://shots.so",
    domain: "shots.so",
    description: "เครื่องมือทำ Mockup จัดวางหน้าจอเว็บหรือแอปให้ดูพรีเมียมภายใน 10 วินาที",
    category: "mockup",
  },
  {
    name: "LS Graphics",
    url: "https://www.ls.graphics",
    domain: "ls.graphics",
    description: "แจก Mockup อุปกรณ์ต่างๆ ความละเอียดสูงระดับ 4K สำหรับสายพอร์ตโฟลิโอ",
    category: "mockup",
  },
  {
    name: "Artboard Studio",
    url: "https://artboard.studio",
    domain: "artboard.studio",
    description: "แพลตฟอร์มจัดวาง Mockup กำหนดมุมกล้องและแสงเงาเองได้เหมือนถ่ายในสตูดิโอ",
    category: "mockup",
  },
  {
    name: "Mockup World",
    url: "https://www.mockupworld.co",
    domain: "mockupworld.co",
    description: "รวม mockup ฟรีทุกประเภท อุปกรณ์ บรรจุภัณฑ์ และสิ่งพิมพ์",
    category: "mockup",
  },
  {
    name: "Mockuuups",
    url: "https://mockuuups.studio",
    domain: "mockuuups.studio",
    description: "แจก mockup PSD และ scene คุณภาพสูงสำหรับพอร์ตโฟลิโอ",
    category: "mockup",
  },

  // Marketing & Copy
  {
    name: "Swiped.co",
    url: "https://swiped.co",
    domain: "swiped.co",
    description: "คลังรวมโฆษณาและ Copywriting ระดับตำนาน เอาไว้แกะรอยวิธีเขียนขาย",
    category: "marketing",
  },
  {
    name: "Marketing Examples",
    url: "https://marketingexamples.com",
    domain: "marketingexamples.com",
    description: "สรุปเคสการตลาดเจ๋งๆ พร้อมภาพประกอบสั้นๆ เข้าใจง่าย เอาไปปรับใช้ได้ทันที",
    category: "marketing",
  },
  {
    name: "Really Good Emails",
    url: "https://reallygoodemails.com",
    domain: "reallygoodemails.com",
    description: "คลังอีเมลการตลาดที่ออกแบบดี แยกหมวดตามอุตสาหกรรม",
    category: "marketing",
  },
  {
    name: "Good Email Copy",
    url: "https://www.goodemailcopy.com",
    domain: "goodemailcopy.com",
    description: "ตัวอย่าง copy อีเมลจริงจากแบรนด์ดัง เอาไว้เรียนรู้การเขียนขาย",
    category: "marketing",
  },
];
