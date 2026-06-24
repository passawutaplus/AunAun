import { createFileRoute } from "@tanstack/react-router";
import { ANTHEM_SHOWCASE_URL } from "@/lib/productLinks";
import { SITE_URL } from "@/lib/siteUrl";

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: async () => {
        const body = `# So1o Freelancer

> หลังบ้านครบวงจรสำหรับฟรีแลนซ์ไทย — ลูกค้า ใบเสนอราคา การเงิน ภาษี Smart Brief Creative Labs และ AI Mentor (ไม่รวมฟีดโชว์เคสผลงาน)

## Pages

- [Home](${SITE_URL}/): ภาพรวมแอปและเครื่องคำนวณราคางานฟรีแลนซ์ฟรี
- [Blog](${SITE_URL}/blog): บทความและเทคนิคสำหรับฟรีแลนซ์ไทย
- [Help Center](${SITE_URL}/help): ศูนย์ช่วยเหลือ คู่มือ FAQ เส้นทางแนะนำ และ Support Hub
- [Help — Getting started](${SITE_URL}/help/getting-started): เริ่มต้นใช้งาน 3 ขั้นแรก
- [Help — Payments](${SITE_URL}/help/payments): QR PromptPay และ Stripe Connect บนหน้า Track
- [Help — Tax](${SITE_URL}/help/tax): คู่มือภาษีฟรีแลนซ์ไทย
- [Pricing](${SITE_URL}/pricing): แพ็กเกจ Free / Pro / Pro+ / In-House
- [Creative Partner AI](${SITE_URL}/creative-partner): AI ที่ปรึกษาด้านงานออกแบบ สี ฟอนต์ คอนเซปต์
- [Privacy](${SITE_URL}/privacy): นโยบายความเป็นส่วนตัว (PDPA)
- [Terms](${SITE_URL}/terms): ข้อกำหนดการใช้งาน
- [Sign in](${SITE_URL}/auth): เข้าสู่ระบบหรือสมัครสมาชิก

## Related products (external)

- [Pixel100 Community Showcase](${ANTHEM_SHOWCASE_URL}): ฟีดผลงานชุมชนฟรีแลนซ์สไตล์ Pinterest — แยกจาก My Desk
`;
        return new Response(body, {
          status: 200,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
