/**
 * Mock data for /admin/growth (Phase 1). Everything here is sample content:
 * no AI wrote it at runtime, no image was generated, nothing is posted.
 * Demo scenario = spec §19 "Portfolio First Impression".
 */
import { buildVersion } from "./engine";
import { derivePin } from "./revision";
import type { Actor, AgentTask, ArtifactComponent, Campaign, FeedTile, GeSettings, PlatformVariantDef, Recipe, Tone } from "./types";

export const OWNER: Actor = { kind: "owner", id: "owner", name: "Owner" };
export const SYSTEM: Actor = { kind: "system", id: "scheduler", name: "Scheduler (mock)" };

export const DEMO_COMMENT = "ภาพ 2 แน่นไป ลดข้อความ 30% อย่าแก้ภาพ 3";
export const SEED_AT = "2026-11-20T01:00:00.000Z";

const frame = (n: number, headline: string, lines: string[], recipe: Recipe, tone: Tone, visualNote: string): ArtifactComponent => ({
  id: `frame-${n}`,
  kind: "frame",
  label: `ภาพ ${n}`,
  content: { headline, lines, recipe, tone, visualNote },
});

const copy = (platform: string, label: string, text: string, hashtags: string[], cta: string): ArtifactComponent => ({
  id: `copy:${platform}`,
  kind: "copy",
  label,
  content: { text, hashtags, cta },
});

const section = (n: number, heading: string, body: string, bullets: string[] = []): ArtifactComponent => ({
  id: `seo:s${n}`,
  kind: "seo_section",
  label: `SEO H2 ${n}`,
  content: { heading, body, bullets },
});

const FEED_TILES: FeedTile[] = [
  { id: "t-own", label: "Your Portfolio Has 5 Seconds", recipe: "R02", tone: "ink", textHeavy: false, own: true },
  { id: "t-quote", label: "Not a contest.", recipe: "R04", tone: "ink", textHeavy: true },
  { id: "t-studio", label: "Studio tour", recipe: "R01", tone: "ink", textHeavy: false },
  { id: "t-opencall", label: "Open call guide", recipe: "R06", tone: "white", textHeavy: false },
  { id: "t-3d", label: "3D breakdown", recipe: "R03", tone: "grey", textHeavy: true },
  { id: "t-ui", label: "Collections UI", recipe: "R05", tone: "white", textHeavy: false },
  { id: "t-work", label: "Creator work", recipe: "R01", tone: "image", textHeavy: false },
  { id: "t-ask", label: "พอร์ตเริ่มยังไง?", recipe: "R04", tone: "grey", textHeavy: true },
  { id: "t-expo", label: "Exhibition", recipe: "R06", tone: "image", textHeavy: false },
];

function portfolioComponents(): ArtifactComponent[] {
  const frames = [
    frame(1, "Your Portfolio Has 5 Seconds", ["คนเปิดพอร์ตตัดสินใจเร็วกว่าที่คิด"], "R02", "ink", "ภาพมือถือเปิดพอร์ตบนโต๊ะไม้ แสงเช้า (mock)"),
    frame(
      2,
      "ทำไมพอร์ตถึงโดนปัดผ่าน",
      [
        "งานแรกไม่บอกว่าเราถนัดอะไร",
        "ใส่ทุกงานจนคนไม่รู้จะดูอะไรก่อน",
        "เปิดบนมือถือแล้วภาพเล็ก อ่านไม่ออก",
        "ไม่เล่าว่าโจทย์คืออะไร",
        "หาช่องทางติดต่อไม่เจอ",
      ],
      "R03",
      "grey",
      "กองโปสการ์ดงานดีไซน์ วางซ้อนกันเยอะ ๆ (mock)",
    ),
    frame(3, "เปิดด้วยงานที่อยากได้งานแบบนั้น", ["งานชิ้นแรกคือคำตอบว่าคุณทำอะไร", "เลือกงานที่อยากได้โจทย์แบบนั้นอีก"], "R03", "white", "งานชิ้นเดียววางกลางผนังแกลเลอรี (mock)"),
    frame(4, "เล่า Process สั้น ๆ 3 ขั้น", ["โจทย์ → แนวคิด → ผลลัพธ์", "ภาพละ 1 ประโยคพอ"], "R03", "grey", "สเก็ตช์ 3 ขั้นเรียงซ้ายไปขวา (mock)"),
    frame(5, "ติดต่อได้ใน 1 แตะ", ["ใส่ลิงก์โปรไฟล์ไว้ที่เดียว", "บอกว่าว่างรับงานไหม"], "R03", "white", "ปุ่มติดต่อบนหน้าโปรไฟล์ (UI จริงตอนทำจริง)"),
    frame(6, "Show your work on SAMECOR", ["สร้างโปรไฟล์ครีเอเตอร์ฟรี", "ลิงก์ในโปรไฟล์"], "R04", "red", "ตัวอักษรใหญ่บนพื้น Samecor Red"),
  ];
  const byId = Object.fromEntries(frames.map((f) => [f.id, f]));
  const pin = derivePin(
    {
      id: "pin:checklist",
      kind: "pin",
      label: "Pinterest pin",
      content: { title: "Portfolio First Impression Checklist", items: [] },
      derivedFrom: ["frame-3", "frame-4", "frame-5"],
    },
    byId,
  );
  return [
    ...frames,
    pin,
    copy("instagram", "IG caption", "พอร์ตมีเวลาแค่ 5 วินาที\nปัดดูว่าควรเปิดด้วยอะไร แล้วเก็บไว้เช็กก่อนส่งงาน", ["portfolio", "graphicdesign", "designthailand", "samecor"], "ลิงก์ในโปรไฟล์"),
    copy(
      "facebook",
      "FB post",
      "เคยไหม เปิดพอร์ตบนมือถือแล้วไม่รู้จะดูอะไรก่อน\n\nคนดูพอร์ตตัดสินใจเร็วมาก งานแรกเลยสำคัญที่สุด\n\n3 อย่างที่แก้ได้วันนี้: เปิดด้วยงานที่อยากได้งานแบบนั้น, เล่า Process สั้น ๆ 3 ขั้น, ให้ติดต่อได้ใน 1 แตะ\n\nอ่าน checklist เต็มได้ในบทความ",
      [],
      "อ่านบทความ",
    ),
    copy("threads", "Threads post", "เวลาคนเปิดพอร์ต เรามักอยากให้เขาดูทุกงาน\nแต่จริง ๆ งานแรกควรตอบคำถามอะไร?", [], ""),
    copy("pinterest", "Pin description", "Portfolio First Impression Checklist: เช็กพอร์ตก่อนส่งงาน ให้คนเข้าใจงานคุณใน 5 วินาที", [], "อ่าน checklist"),
    {
      id: "seo:meta",
      kind: "seo_meta",
      label: "SEO meta",
      content: {
        title: "วิธีทำพอร์ตดีไซน์ให้คนเข้าใจใน 5 วินาที | SAMECOR",
        metaDescription: "Checklist จัดพอร์ตดีไซน์ให้คนเปิดดูแล้วรู้ทันทีว่าคุณถนัดอะไร พร้อมข้อผิดพลาดที่แก้ได้วันนี้",
        slug: "portfolio-first-impression",
      },
    },
    section(1, "Why it matters", "คนดูพอร์ตส่วนใหญ่ตัดสินใจจากงานแรก ถ้างานแรกไม่ชัด งานดีที่อยู่ข้างหลังก็อาจไม่ถูกเห็น"),
    section(2, "5 วินาทีแรก คนดูอะไร", "เขาอยากรู้แค่ 2 อย่าง: คุณทำงานแบบไหน และงานนั้นตรงกับที่เขาหาไหม"),
    section(3, "Checklist ก่อนส่งพอร์ต", "ใช้เช็กก่อนส่งทุกครั้ง", ["งานแรกบอกได้ว่าถนัดอะไร", "มีบริบทสั้น ๆ ทุกงาน", "ติดต่อได้ใน 1 แตะ"]),
    section(4, "ข้อผิดพลาดที่แก้ได้ทันที", "ใส่ทุกงานที่เคยทำ ภาพเล็กบนมือถือ และไม่มีช่องทางติดต่อ แก้ได้ในวันเดียว"),
    section(5, "เริ่มลงผลงานบน SAMECOR", "สร้างโปรไฟล์ครีเอเตอร์ฟรี แล้วลงงานชิ้นแรกที่อยากให้คนเห็น"),
    { id: "feed:grid", kind: "feed", label: "Feed 3×3", content: { tiles: FEED_TILES } },
  ];
}

/** Slots are UTC (Bangkok = UTC+7). Mon 23 Nov 12:00 / 19:30, Wed 25 Nov 12:00. */
const PORTFOLIO_VARIANTS: PlatformVariantDef[] = [
  { platform: "instagram", label: "Instagram carousel", canvas: "1080×1350 (4:5)", componentIds: ["frame-1", "frame-2", "frame-3", "frame-4", "frame-5", "frame-6", "copy:instagram", "feed:grid"], scheduledAt: "2026-11-23T05:00:00.000Z" },
  { platform: "facebook", label: "Facebook post", canvas: "1080×1350 (4:5)", componentIds: ["frame-1", "copy:facebook"], scheduledAt: "2026-11-23T05:00:00.000Z" },
  { platform: "threads", label: "Threads", canvas: "Text-first", componentIds: ["copy:threads"], scheduledAt: "2026-11-23T12:30:00.000Z" },
  { platform: "pinterest", label: "Pinterest pin", canvas: "1000×1500 (2:3)", componentIds: ["pin:checklist", "copy:pinterest"], scheduledAt: "2026-11-25T05:00:00.000Z" },
  { platform: "blog", label: "Blog / SEO", canvas: "Article + OG 1200×630", componentIds: ["frame-1", "seo:meta", "seo:s1", "seo:s2", "seo:s3", "seo:s4", "seo:s5"], scheduledAt: "2026-11-25T05:00:00.000Z" },
];

function bioComponents(): ArtifactComponent[] {
  return [
    frame(1, "Your Bio, Before / After", ["ประโยคแรกที่คนจำได้"], "R02", "white", "การ์ดโปรไฟล์สองใบวางเทียบกัน (mock)"),
    frame(2, "Before", ["นักออกแบบที่หลงใหลในทุกอย่าง"], "R04", "grey", "ตัวอักษรเทาจาง (mock)"),
    frame(3, "After", ["ออกแบบแพ็กเกจจิ้งให้แบรนด์อาหารไทย"], "R04", "ink", "ตัวอักษรชัดบนพื้น Ink"),
    copy("instagram", "IG caption", "Bio ที่ดีบอกว่าคุณทำอะไรให้ใคร ในประโยคเดียว", ["creatorbio", "portfolio"], "ลิงก์ในโปรไฟล์"),
    copy("threads", "Threads post", "ประโยคแรกที่เล่าเรื่องตัวเองยากแค่ไหน? ของคุณเขียนว่าอะไร", [], ""),
  ];
}
const BIO_VARIANTS: PlatformVariantDef[] = [
  { platform: "instagram", label: "Instagram carousel", canvas: "1080×1350 (4:5)", componentIds: ["frame-1", "frame-2", "frame-3", "copy:instagram"], scheduledAt: "2026-11-26T11:30:00.000Z" },
  { platform: "threads", label: "Threads", canvas: "Text-first", componentIds: ["copy:threads"], scheduledAt: "2026-11-26T12:30:00.000Z" },
];

function baseCampaign(id: string, name: string, pillar: string, goal: string, components: ArtifactComponent[], variants: PlatformVariantDef[]): Campaign {
  const v1 = buildVersion({ version: 1, createdAt: SEED_AT, createdBy: "ai-mock", components, variants });
  return {
    id,
    name,
    pillar,
    goal,
    audience: "ครีเอเตอร์เริ่มต้น / นักศึกษาดีไซน์",
    status: "AWAITING_APPROVAL",
    versions: [v1],
    locks: [],
    approvals: [],
    comments: [],
    jobs: [],
    publications: [],
    audit: [{ id: "aud-1", at: SEED_AT, actor: { kind: "agent", id: "copy-agent", name: "Copy agent (mock)" }, action: "version.created", resource: `campaign:${id}`, toVersion: 1, detail: v1.contentHash }],
    sources: [],
    rights: [],
  };
}

export function seedCampaigns(): Campaign[] {
  const portfolio = baseCampaign(
    "portfolio-first-impression-w01",
    "Portfolio First Impression",
    "Design Knowledge",
    "Create profile",
    portfolioComponents(),
    PORTFOLIO_VARIANTS,
  );
  const v1 = portfolio.versions[0];
  // The owner already approved the Facebook post on v1 (per-platform approval).
  portfolio.approvals = [{ id: "apr-1", platform: "facebook", version: 1, approvedHash: v1.variantHashes.facebook, approverId: OWNER.id, decidedAt: "2026-11-20T02:10:00.000Z" }];
  portfolio.audit.push({ id: "aud-2", at: "2026-11-20T02:10:00.000Z", actor: OWNER, action: "approval.granted", resource: `campaign:${portfolio.id}`, toVersion: 1, detail: `facebook ${v1.variantHashes.facebook}` });
  portfolio.sources = [
    { label: "Research packet (mock): พฤติกรรมเปิดพอร์ตบนมือถือ", url: "https://samecor.com/journal", checkedAt: "2026-11-20" },
  ];
  portfolio.rights = [
    { label: "ภาพทั้งหมด: mock (ยังไม่ได้สร้างจริง)", status: "NOT_NEEDED" },
    { label: "ภาพ 5: ต้องใช้ screenshot UI จริงตอนทำจริง", status: "PENDING" },
  ];

  const bio = baseCampaign("creator-bio-w04", "Creator Bio Before/After", "Design Knowledge", "Complete profile", bioComponents(), BIO_VARIANTS);
  bio.sources = [{ label: "ตัวอย่าง bio เขียนขึ้นเอง ไม่ใช่ของครีเอเตอร์จริง", url: "https://samecor.com", checkedAt: "2026-11-20" }];
  bio.rights = [{ label: "ไม่มีผลงานคนอื่น", status: "NOT_NEEDED" }];
  return [portfolio, bio];
}

export function seedSettings(): GeSettings {
  return {
    mode: "mock",
    pauseAll: false,
    aiCredit: { status: "UNKNOWN", cycleStart: null, source: "unavailable", capUsd: null, spentEstimateUsd: 0, noticeSentForCycle: null },
  };
}

export function seedTasks(): AgentTask[] {
  const t = (id: string, role: AgentTask["role"], title: string, usesAi: boolean, dependsOn: string[] = []): AgentTask => ({
    id,
    role,
    title,
    status: "QUEUED",
    usesAi,
    dependsOn,
    idempotencyKey: `mock:${id}`,
    claimedBy: null,
    leaseUntil: null,
    attempts: 0,
    createdAt: SEED_AT,
  });
  return [
    t("task-research", "research", "Daily research 07:00", true),
    t("task-score", "strategy", "Score topics 07:30", true, ["task-research"]),
    t("task-listen", "analytics", "Listening sync 10:00 (no AI)", false),
    t("task-qa", "qa", "Link check (no AI)", false),
  ];
}

export type DecisionKind = "source" | "rights" | "setup" | "risk";
export interface DecisionItem {
  id: string;
  kind: DecisionKind;
  title: string;
  detail: string;
  options: string[];
  decided?: string;
}

export function seedDecisions(): DecisionItem[] {
  return [
    { id: "d-opencall", kind: "source", title: "Open Calls ธ.ค.: 2 แหล่งยังไม่ยืนยันวันปิดรับ", detail: "สถานะ NEEDS_VERIFY โพสต์ไม่ได้จนกว่าจะเช็กแล้ว", options: ["ให้ AI เช็กใหม่", "เปลี่ยนเป็นคู่มือวิธีหา", "ข้ามสัปดาห์นี้"] },
    { id: "d-consent", kind: "rights", title: "Creator spotlight: ยังไม่มี consent", detail: "ไม่มี consent = ไม่โพสต์ผลงานคนอื่น", options: ["ขอ consent", "ใช้ artwork ของ SAMECOR"] },
    { id: "d-risk", kind: "risk", title: "คอมเมนต์ถามเรื่องลิขสิทธิ์ผลงาน (mock)", detail: "เรื่องสิทธิ์ต้องตอบเอง AI แค่ร่างให้", options: ["ตอบเอง", "ให้ AI ร่างก่อน"] },
    { id: "d-setup", kind: "setup", title: "Phase 2 ยังขาด 3 อย่าง", detail: "Claude API key (Supabase secret), social handles จริง, เช็กว่า Magnific มี REST API ไหม", options: ["รับทราบ"] },
  ];
}

export interface InsightItem {
  id: string;
  title: string;
  detail: string;
  action: "Keep" | "Improve" | "Stop" | "Test Next";
}

export const UNAVAILABLE_METRICS: { label: string; reason: string }[] = [
  { label: "Social reach", reason: "ยังไม่ต่อ API (Phase 3)" },
  { label: "Blog sessions", reason: "ยังไม่มีบทความจริง" },
];

export const MOCK_INSIGHTS: InsightItem[] = [
  { id: "i-1", title: "Carousel ความรู้ถูกเซฟเยอะ แต่คนสมัครน้อย", detail: "สมมติฐาน: ท้าย carousel ยังไม่ชวนไปต่อ ลองเพิ่มหน้า onboarding", action: "Test Next" },
  { id: "i-2", title: "Threads คำถามปลายเปิดได้คอมเมนต์ดีกว่าโพสต์ประกาศ", detail: "ฐานยังเล็ก ถือเป็น directional", action: "Keep" },
  { id: "i-3", title: "ปกตัวหนังสือแน่นดูช้ากว่าปกภาพ", detail: "ลดตัวหนังสือบนปก ให้ภาพนำ", action: "Improve" },
];
