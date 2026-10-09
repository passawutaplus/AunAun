import { FORUM_PATH } from "@/lib/brandConfig";

export type LearnNavItem = {
  id: string;
  label: string;
};

/** In-page sections on /learn (single page). */
export const LEARN_NAV: LearnNavItem[] = [
  { id: "works", label: "Work" },
  { id: "start", label: "How it works" },
  { id: "who", label: "About" },
  { id: "creators", label: "Publish" },
  { id: "hirers", label: "Hire" },
  { id: "trust", label: "FAQ" },
];

export type LearnHeroFace = "serif" | "sans" | "soft";

/** One word in the learn hero blurb. Size, weight, and face change from word to word. */
export type LearnHeroWord = {
  text: string;
  face: LearnHeroFace;
  /** Desktop size in rem. Mobile scales down from this. */
  rem: number;
  weight: 300 | 400 | 500 | 600 | 700;
  italic?: boolean;
};

export const LEARN_HERO_LOCKUP: readonly (readonly LearnHeroWord[])[] = [
  [
    { text: "Create", face: "serif", rem: 1.45, weight: 400, italic: true },
    { text: "your", face: "soft", rem: 0.95, weight: 700 },
    { text: "profile.", face: "sans", rem: 2.15, weight: 300 },
  ],
  [
    { text: "Connect", face: "sans", rem: 1.12, weight: 300 },
    { text: "through", face: "serif", rem: 1.28, weight: 400, italic: true },
    { text: "your", face: "soft", rem: 0.9, weight: 700 },
    { text: "work.", face: "sans", rem: 1.65, weight: 600 },
  ],
  [
    { text: "Discover", face: "sans", rem: 1.35, weight: 500 },
    { text: "new", face: "soft", rem: 0.9, weight: 400 },
    { text: "opportunities.", face: "serif", rem: 1.85, weight: 500, italic: true },
  ],
];

export const LEARN_MANIFESTO =
  "You Create. We Connect. SAMECOR starts from a project, then a conversation, a hire, or a collab. One profile opens what comes next.";

export const LEARN_STATEMENT =
  "This is not a gallery and not a job board. Opportunity starts after someone has seen the real work.";

export const LEARN_WAYS = [
  {
    n: "001",
    title: "Show the real work",
    body: "Publish the role, the process, and the result. People can see what you can do, not just a pretty picture.",
    tags: ["Project", "Process", "Result"],
    image: "/learn/learn-way-show.jpg",
  },
  {
    n: "002",
    title: "Get found by style",
    body: "Hirers scroll Explore, see the work first, then open the profile. You do not need an ad to start.",
    tags: ["Explore", "Category", "Saved"],
    image: "/learn/learn-way-discover.jpg",
  },
  {
    n: "003",
    title: "Talk from that piece",
    body: "The chat already has the work in it. You do not retell the whole portfolio from scratch.",
    tags: ["Chat", "This piece", "Clear brief"],
    image: "/learn/learn-way-talk.jpg",
  },
  {
    n: "004",
    title: "Opportunity follows",
    body: "A hire, a collab, or an invite onto a team comes after the real work is seen — not from the lowest price.",
    tags: ["Hire", "Collab", "Join a team"],
    image: "/learn/learn-way-opportunity.jpg",
  },
] as const;

export const LEARN_MODES = [
  {
    id: "mode-projects",
    label: "Projects",
    n: "01",
    title: "Start from a piece of work",
    body: "Projects is the home of the feed. You see the role, the process, and the result before a name, a price, or a job post.",
    points: [
      "Each project carries context, not only a cover image.",
      "Save a piece, or write from that piece.",
      "A hire, a collab, or a team invite comes after the work is seen.",
    ],
    image: "/learn/learn-way-show.jpg",
  },
  {
    id: "mode-designers",
    label: "Designers",
    n: "02",
    title: "Find the person behind the work",
    body: "Designers collects profiles. You already know the style from their projects, then you see what they are open to.",
    points: [
      "A profile is a person, not a bid.",
      "Opportunity status says hire, collab, a team, or just a conversation.",
      "You still start from a project you liked, not from a blank application.",
    ],
    image: "/learn/learn-way-discover.jpg",
  },
  {
    id: "mode-packages",
    label: "Packages",
    n: "03",
    title: "A scoped offer, not a contract",
    body: "A package shows what is included, a rough price, a rough timeline, and sample work, so someone can ask with a clear brief.",
    points: [
      "Scope, price range, time, and deliverables sit in one place.",
      "Sample work stays attached, so the offer is not only a number.",
      "Publishing a package does not start a hire by itself.",
    ],
    image: "/learn/learn-shortlist.png",
  },
  {
    id: "mode-objects",
    label: "Objects",
    n: "04",
    title: "Things a creator sells",
    body: "Objects are prints, small made things, and art toys. You are looking at the object, not hiring someone for a job.",
    points: [
      "Separate from Projects, Designers, and Packages.",
      "Prints, objects, and art toys live in this mode.",
      "Look and keep what you want, without turning the feed into a job board.",
    ],
    image: "/learn/learn-film-box.png",
  },
] as const;

export const LEARN_ABOUT = {
  image: "/learn/learn-about-portrait.jpg",
  body: "Creative people should be found for what they actually make, not for who priced lowest or wrote the longest application. SAMECOR starts with the work. People see the style, the role, and the context, then talk from the piece they like — a hire, a collab, or a team invite follows.",
  facts: [
    { k: "Starts with", v: "Real work" },
    { k: "Not", v: "A job board or a price bid" },
    { k: "Based in", v: "Bangkok" },
  ],
} as const;

export const LEARN_LOOP_LINE = ["Real work", "See the style", "Get the context", "Talk from the piece", "Opportunity"] as const;

export const LEARN_IMAGES = {
  hero: "/learn/learn-hero-wall.png",
  who: "/learn/learn-who-fan.png",
  split: "/learn/learn-split-roles.png",
  firstVisit: "/learn/learn-first-visit.png",
  publish: "/learn/learn-publish.png",
  shortlist: "/learn/learn-shortlist.png",
  chat: "/learn/learn-chat-bridge.png",
  cta: "/learn/learn-cta-attract.png",
} as const;

export const LEARN_FILM = {
  cover: "/learn/learn-film-cover.png",
  poster: "/learn/learn-film-poster.png",
  avatar: "/learn/learn-film-avatar.png",
  tiles: [
    "/learn/learn-film-bottle.png",
    "/learn/learn-film-tea.png",
    "/learn/learn-film-silk.png",
    "/learn/learn-film-box.png",
    "/learn/learn-film-night.png",
    "/demo-catalog/covers/01-napatsara.png",
  ],
} as const;

export const LEARN_WHO_NOT = [
  {
    title: "ไม่ใช่แค่โชว์รูป",
    body: "ผลงานมีบทบาท กระบวนการ และผลลัพธ์ — คนดูเข้าใจว่าคุณทำอะไรได้จริง",
  },
  {
    title: "ไม่เริ่มจากราคา",
    body: "คนจ้างเห็นสไตล์ก่อน แล้วค่อยคุยขอบเขต — ไม่เลือกจากแพ็กเกจถูกสุด",
  },
  {
    title: "ไม่เริ่มจากใบสมัครยาว",
    body: "ทักจากชิ้นงานที่ชอบ ไม่ต้องเดาจากเรซูเม่หรือประกาศตำแหน่ง",
  },
] as const;

export const LEARN_ROLES = [
  {
    id: "creators",
    title: "ฉันอยากโชว์ผลงาน",
    body: "ลงงานจริง ให้คนเห็นสไตล์ แล้วทักจากชิ้นที่ใช่",
    cta: "ดูขั้นลงผลงาน",
  },
  {
    id: "hirers",
    title: "ฉันอยากหาคนทำงาน",
    body: "เลื่อนดูของจริง เก็บ shortlist แล้วคุยจากงานที่ชอบ",
    cta: "ดูขั้นจ้างงาน",
  },
] as const;

export const LEARN_FIRST_VISIT = [
  {
    step: "01",
    title: "เลื่อน Explore",
    body: "หน้าแรกคือผลงานจริง สลับแท็บ Projects กับ Designers ได้เลย ยังไม่ต้องล็อกอิน",
  },
  {
    step: "02",
    title: "เปิดชิ้นที่สะดุดตา",
    body: "ดูรูป บทบาท และบริบทงาน — รู้สไตล์ก่อนตัดสินใจทัก",
  },
  {
    step: "03",
    title: "เปิดโปรไฟล์คนนั้น",
    body: "ดูงานอื่นและสถานะรับโอกาส ว่าเขาเปิดรับจ้าง คอลแลป หรือแค่คุย",
  },
  {
    step: "04",
    title: "สมัครเมื่อจะลงมือ",
    body: "บันทึก ทัก หรือลงผลงาน ระบบจึงขอเข้าสู่ระบบ แล้วย้อนกลับหน้าที่ค้างไว้ได้",
  },
] as const;

export const LEARN_GLOSSARY = [
  {
    term: "Opportunity",
    meaning: "What can follow the work — not limited to a hire",
  },
  {
    term: "Hire",
    meaning: "A brief, a scope, and a budget that are clear",
  },
  {
    term: "Collab",
    meaning: "Working together or trading skills — not always a full hire",
  },
  {
    term: "Support",
    meaning: "Sending PX or a gift to a creator — not a hire",
  },
  {
    term: "Catalog",
    meaning: "A grouped set of work on a profile",
  },
  {
    term: "Explore",
    meaning: "The feed of real work, by style and category",
  },
] as const;

export const LEARN_STEPS = [
  {
    step: "01",
    title: "ลงผลงานพร้อมบริบท",
    body: "อัปโหลดงานจริง ใส่บทบาท กระบวนการ และผลลัพธ์ ให้คนเข้าใจศักยภาพจากของจริง ไม่ใช่แค่ภาพสวย",
  },
  {
    step: "02",
    title: "ถูกค้นพบจากสไตล์",
    body: "คนจ้างและคนให้โอกาสเลื่อนดูผลงาน กรองตามหมวด และเปิดโปรไฟล์จากงานที่สนใจ",
  },
  {
    step: "03",
    title: "คุยต่อจากผลงานนั้น",
    body: "เริ่มแชทหรือคุยโอกาสจากชิ้นงานที่เห็นร่วมกัน — ไม่ต้องขายตัวเองซ้ำจากศูนย์",
  },
] as const;

export const LEARN_FEATURES = [
  {
    title: "Explore work",
    body: "Search and scroll real creator work. See the style before you start a conversation.",
    to: "/",
    cta: "Open Explore",
  },
  {
    title: "Publish a portfolio",
    body: "Keep the work on one profile and stay open to opportunity without running ads.",
    to: "/portfolio/new",
    cta: "Publish",
    auth: true,
  },
  {
    title: "Find a designer",
    body: "Judge people from the work and the profile, not from a price package.",
    to: "/",
    cta: "Browse Explore",
  },
  {
    title: "Chat from the work",
    body: "Talk about a hire or a collab with the piece you actually liked attached.",
    to: "/chat",
    cta: "Open chat",
    auth: true,
  },
  {
    title: "Save a collection",
    body: "Keep a shortlist of work you like, then reach out when you are ready.",
    to: "/collections",
    cta: "View collections",
    auth: true,
  },
  {
    title: "Opportunity status",
    body: "Say which kinds of work you are open to, so the right people can find you.",
    to: "/settings",
    cta: "Edit profile",
    auth: true,
  },
] as const;

export const LEARN_CREATOR_JOURNEY = [
  {
    title: "Set a short profile",
    body: "A name, a photo, and a short intro so people know who they are talking to.",
  },
  {
    title: "Set your opportunity status",
    body: "Say if you are open to hire, collab, an internship, a team, or just a conversation. You can change it later.",
  },
  {
    title: "Publish the first pieces",
    body: "Start with 1–3 pieces that explain your role. Better than a long empty list.",
  },
  {
    title: "Add context, not just a picture",
    body: "Role, tools, process, result — hirers understand what you can do faster.",
  },
  {
    title: "Make it public",
    body: "The work shows up on Explore by category. You do not need an ad to begin.",
  },
  {
    title: "Reply when someone writes",
    body: "The chat is tied to the piece they saw. You do not retell the whole portfolio.",
  },
] as const;

export const LEARN_CREATOR_SECTIONS = LEARN_CREATOR_JOURNEY;

export const LEARN_CREATOR_CHECKLIST = [
  "รูปปกที่อ่านงานได้ชัด",
  "ชื่อผลงานสั้น ตรงประเภท",
  "หมวดงานที่ถูกต้อง",
  "บทบาทของคุณในชิ้นงาน",
  "มองเห็นสาธารณะเมื่อพร้อมรับโอกาส",
] as const;

export const LEARN_HIRER_JOURNEY = [
  {
    title: "Look at the work first",
    body: "Start from style and quality, then open the profile — not from a price package.",
  },
  {
    title: "Filter by category",
    body: "Use Explore to reach work that is close to the brief.",
  },
  {
    title: "Save before you write",
    body: "Keep a few pieces in a collection, compare the style, then message when you are ready.",
  },
  {
    title: "Continue from this piece",
    body: "Choose hire or collab and write a short brief. The creator knows which piece you saw.",
  },
  {
    title: "Talk in a chat that has the work",
    body: "Scope, timeline, and detail continue from the piece you referenced.",
  },
] as const;

export const LEARN_HIRER_SECTIONS = LEARN_HIRER_JOURNEY;

export const LEARN_HIRER_TIPS = [
  "สรุปโจทย์สั้นๆ 1–3 ประโยค",
  "ช่วงงบหรือขอบเขตคร่าวๆ (ถ้ามี)",
  "ไทม์ไลน์ที่คาดหวัง",
  "อ้างอิงผลงานบน SAMECOR ที่ชอบ",
] as const;

export const LEARN_LOOP_WORDS = ["จ้างงาน", "คอลแลป", "สนับสนุน"] as const;

export const LEARN_PX_POINTS = [
  {
    title: "PX คืออะไร",
    body: "หน่วยในแพลตฟอร์มสำหรับกิจกรรมอย่างของขวัญ ภารกิจ และรางวัล — ไม่ใช่เงินฝากธนาคาร",
  },
  {
    title: "Welcome / ภารกิจ",
    body: "PX จากต้อนรับหรือภารกิจบางประเภทอาจถอนเป็นเงินสดไม่ได้ ใช้กระตุ้นการเริ่มใช้งาน",
  },
  {
    title: "Earned PX",
    body: "PX ที่ได้ตามกฎที่ถอนได้ จะนับแยก และถอนได้เมื่อเข้าเงื่อนไขที่ระบบกำหนด",
  },
  {
    title: "ของขวัญ / สนับสนุน",
    body: "ส่ง PX หรือของขวัญเพื่อสนับสนุนงานครีเอเตอร์ — ไม่ใช่การจ้างงานอัตโนมัติ",
  },
  {
    title: "สิ่งที่เราไม่สัญญา",
    body: "PX ไม่ใช่การลงทุน และไม่การันตีรายได้ — โอกาสเกิดจากผลงานและการคุยจริง",
  },
] as const;

export const LEARN_TRUST_LINKS = [
  { to: "/legal", label: "Legal and policies", body: "The full document index, by section" },
  { to: "/legal/community", label: "Community rules", body: "What is allowed on SAMECOR" },
  { to: "/legal/ip", label: "Intellectual property", body: "Rights and responsibility when you publish work" },
  { to: "/legal/privacy", label: "Privacy", body: "What we collect and how it is used" },
  { to: "/legal/terms", label: "Terms of use", body: "The conditions of the service" },
  { to: FORUM_PATH, label: "Forum", body: "Ask questions and report issues with the community" },
  { to: "/help", label: "Help Center", body: "Common questions and how to use the product" },
] as const;

export const LEARN_FAQ = [
  {
    id: "what-is",
    q: "How is SAMECOR different from a portfolio site or a job board?",
    a: "Real work is the door to opportunity. People see the style and context first, then talk from that piece — not from a price package or a long application.",
  },
  {
    id: "free",
    q: "Is it free?",
    a: "You can explore, publish, and talk about opportunity on a regular account. If a premium feature exists, the upgrade page says so plainly.",
  },
  {
    id: "first-work",
    q: "I do not have much work yet. How do I start?",
    a: "Publish 1–3 pieces with clear context, set your opportunity status, then fill the catalog. Quality and context matter more than a long list.",
  },
  {
    id: "hirer-see",
    q: "What does a hirer see on a profile?",
    a: "Public work, opportunity status, skills and categories, and a way to continue from the piece they opened.",
  },
  {
    id: "px-money",
    q: "Is PX money? Can I cash it out?",
    a: "PX is a unit inside the platform. Some welcome and mission PX cannot be cashed out. Earned PX that meets the rules can. See the PX wallet or Help Center for the detail.",
  },
  {
    id: "hide",
    q: "Can I hide or delete a piece?",
    a: "Yes, from the work manager. Change visibility or remove a piece when you do not want it shown.",
  },
  {
    id: "community",
    q: "How is this page different from the Help Center?",
    a: "This page is the overview of how SAMECOR works. The Help Center is the step-by-step when you have a question. The Forum is where you talk with the community.",
  },
] as const;
