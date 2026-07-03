import type { CommunityPost } from "@/hooks/useCommunityPosts";
import { communityMediaFromPost } from "@/lib/communityMedia";
import { catalogCommunityPostId, catalogUserId } from "@/lib/communityCatalogIds";
import { isDemoMode } from "@/lib/demoMode";

const SHOWCASE_DEFS: Array<{
  category: string;
  kind: "tip" | "question";
  title: string;
  body: string;
  tags: string[];
  questionTopic?: CommunityPost["question_topic"];
}> = [
  {
    category: "Graphic / Branding",
    kind: "question",
    title: "ส่งไฟล์โลโก้ให้ลูกค้าแบบไหนดีที่สุด?",
    body: "ลูกค้าขอทั้ง AI, PNG, SVG และ mockup บน signage — ควรแพ็กเป็น zip ชุดเดียวหรือแยกตาม use case?\n\nมี template folder structure ที่ใช้บ่อยไหมครับ",
    tags: ["logo", "handoff", "client"],
    questionTopic: "client",
  },
  {
    category: "Illustration / Art",
    kind: "tip",
    title: "ส่ง line art ให้ art director ตรวจก่อนลงสี",
    body: "export PNG 2000px ขาวดำ + layer แยก character/background\nใส่ note บน Figma ว่าจุดไหนต้องการ emphasis — ลดรอบ revision ตอนลงสีได้ครึ่งหนึ่ง",
    tags: ["lineart", "workflow", "review"],
  },
  {
    category: "Photography",
    kind: "tip",
    title: "แสงธรรมชาติ vs Softbox สำหรับพอร์ตเทรต",
    body: "แสงหน้าต่าง diffused ช่วง 9–10 โมงให้ skin tone นุ่ม\nถ้าต้อง shoot บ่าย ใช้ 1 softbox 45° + reflector ขาวฝั่งตรงข้าม",
    tags: ["portrait", "lighting", "tips"],
  },
  {
    category: "Video / Film",
    kind: "question",
    title: "Laptop ตัดตอบ 4K แนะนำสเปกเท่าไหร่?",
    body: "งานส่วนใหญ่ Premiere + After Effects สั้นๆ ไม่เกิน 5 นาที\nRAM 32GB พอไหม หรือควรลง 64GB + GPU แยก?",
    tags: ["gear", "premiere", "setup"],
    questionTopic: "tools",
  },
  {
    category: "Craft / Handmade",
    kind: "tip",
    title: "จัด composition งานจักสานให้ดูพรีเมียม",
    body: "ถ่ายบนพื้นหลัง neutral + เงาเดียวด้านข้าง\nวาง props น้อยชิ้น เน้น texture วัสดุ — อย่าใส่ของรกๆ รอบชิ้นงาน",
    tags: ["photography", "craft", "styling"],
  },
  {
    category: "UI/UX",
    kind: "tip",
    title: "เช็ก contrast ก่อนส่งมอบ UI",
    body: "ใช้ plugin Stark หรือเช็ก WCAG AA อย่างน้อย 4.5:1 สำหรับ body text\nปุ่ม primary อย่าใช้ gradient ที่ทำให้อ่าน label ยาก",
    tags: ["accessibility", "ui", "wcag"],
  },
  {
    category: "Content / Social",
    kind: "tip",
    title: "เขียน caption ให้คนอ่านจบ",
    body: "บรรทัดแรก = insight หรือคำถาม\nย่อหน้าสั้น 1–2 บรรทัด ใส่ CTA ท้ายโพสต์ชัดเจน (save / comment / link)",
    tags: ["caption", "copywriting", "social"],
  },
  {
    category: "Music / Audio",
    kind: "tip",
    title: "เลือก BPM ตาม mood board",
    body: "brand สาย lifestyle มักอยู่ 90–110 BPM\nงาน tech/corporate 120–128 BPM — ส่ง reference track 2–3 เพลงให้ client approve ก่อน compose",
    tags: ["bpm", "music", "brief"],
  },
];

const SHOWCASE_PROFILES = [
  { display_name: "พิมพ์ชนก ใจดี", username: "pimchanok" },
  { display_name: "วรรณกร พันธ์ทอง", username: "wannakorn" },
  { display_name: "ธัญญา รัตนพร", username: "thanya" },
  { display_name: "ฉัตรชัย วรกุล", username: "chatchai" },
  { display_name: "อาทิตยา จันทร์เพ็ญ", username: "atittaya" },
  { display_name: "พลอยไพลิน ขจร", username: "ploypailin" },
  { display_name: "ธนกร แสงทอง", username: "thanakorn" },
  { display_name: "อนุชา ภูมิดี", username: "anucha" },
] as const;

function buildStaticShowcasePosts(): CommunityPost[] {
  const now = new Date().toISOString();
  return SHOWCASE_DEFS.map((def, ci) => {
    const authorIndex = (ci * 3 + 2) % 20;
    const profile = SHOWCASE_PROFILES[ci % SHOWCASE_PROFILES.length]!;
    return {
      id: catalogCommunityPostId(ci, 2),
      author_id: catalogUserId(authorIndex),
      post_kind: def.kind,
      title: def.title,
      body: def.body,
      category: def.category,
      tags: def.tags,
      tools: [],
      gallery_urls: [],
      video_urls: [],
      mentioned_project_ids: [],
      tagged_user_ids: [],
      media_aspect: "square",
      text_cover_theme: null,
      question_topic: def.questionTopic ?? null,
      status: "published",
      reply_count: ci % 4,
      like_count: 8 + ci * 3,
      view_count: 120 + ci * 40,
      created_at: now,
      updated_at: now,
      profile: {
        display_name: profile.display_name,
        avatar_url: `https://api.dicebear.com/7.x/notionists/svg?seed=${profile.username}`,
        username: profile.username,
      },
    };
  });
}

let staticCache: CommunityPost[] | null = null;

export function getStaticCommunityShowcasePosts(): CommunityPost[] {
  if (!staticCache) staticCache = buildStaticShowcasePosts();
  return staticCache;
}

export function postHasCommunityMedia(post: CommunityPost): boolean {
  return communityMediaFromPost(post.gallery_urls ?? [], post.video_urls ?? []).length > 0;
}

export function shouldSupplementCommunityFeed(filter: {
  feedSource?: "all" | "following";
  tag?: string;
  category?: string;
  search?: string;
  postKind?: string;
}): boolean {
  if (filter.tag?.trim()) return false;
  if (filter.postKind) return false;
  if (filter.feedSource === "following") return false;
  if (filter.search?.trim()) return false;
  if (filter.category && filter.category !== "All") return false;
  return true;
}

export function canUseStaticCommunityShowcase(): boolean {
  return import.meta.env.DEV || isDemoMode();
}

/** Interleave text-cover showcase posts when the live feed has no text-only cards. */
export function mergeCommunityFeedShowcase(
  posts: CommunityPost[],
  showcase: CommunityPost[],
): CommunityPost[] {
  if (!showcase.length) return posts;
  if (posts.some((p) => !postHasCommunityMedia(p))) return posts;

  const existingIds = new Set(posts.map((p) => p.id));
  const toAdd = showcase.filter((p) => !existingIds.has(p.id));
  if (!toAdd.length) return posts;

  const result: CommunityPost[] = [];
  let si = 0;
  for (let i = 0; i < posts.length; i++) {
    result.push(posts[i]!);
    if ((i + 1) % 2 === 0 && si < toAdd.length) {
      result.push(toAdd[si++]!);
    }
  }
  while (si < toAdd.length) result.push(toAdd[si++]!);
  return result;
}
