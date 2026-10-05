import { esc } from "./utils.js";

/**
 * Scroll-driven "how it works" tutorials for My Vault and Collections.
 * One sticky stage on the left switches scenes while the steps scroll on the right.
 * Used on the guest explainer pages and as an overlay behind the (i) button once logged in.
 */
export const HOWTO = {
  vault: [
    { n: "01", title: "See it. Keep it.", th: "เจออะไรน่าสนใจ กดเก็บทันที", body: "Right-click any image, video, or page and choose + Keep in Vault. It saves with the source and the date — and your tab never moves." },
    { n: "02", title: "Save now, sort later.", th: "เก็บก่อน จัดทีหลัง", body: "Everything lands in your Inbox first. No folders to pick while you’re in the flow — organize when you have a calm minute." },
    { n: "03", title: "Find it by how you remember.", th: "ค้นหาแบบที่คุณจำได้", body: "Search by color, by a similar image, or a few words in Thai or English. Narrow by source, date, or usage rights." },
    { n: "04", title: "Put it to work.", th: "เอาไปใช้กับงานจริง", body: "Pull references onto a moodboard or into a project. Nothing is copied — it’s the same reference, with its credit attached." },
  ],
  collections: [
    { n: "01", title: "Name a collection.", th: "ตั้งชื่อคอลเลกชันตามงาน", body: "Make one per theme, client, or campaign. Keep the name short — you’ll see it everywhere." },
    { n: "02", title: "Choose where + Keep saves.", th: "เลือกว่าจะเก็บเข้าที่ไหน", body: "On any Discover card, pick a collection from the dropdown beside + Keep. From then on, one click saves straight into it." },
    { n: "03", title: "Nest as you grow.", th: "จัดซ้อนกันเมื่องานเยอะขึ้น", body: "Put campaigns inside clients, moods inside campaigns. Pin and highlight what matters right now." },
    { n: "04", title: "Lives once. Shows in many.", th: "เก็บครั้งเดียว ใช้ได้หลายที่", body: "A reference sits once in your Vault and can belong to many collections — so nothing is duplicated and nothing is lost." },
  ],
};

export const HOWTO_VIEWS = Object.keys(HOWTO);

const tile = (thumb, i) => `<span class='ht-tile'>${thumb(i)}</span>`;

function scenesMarkup(view, thumb) {
  if (view === "vault") {
    return [
      `<div class='ht-scene' data-scene='0'><div class='ht-browser'><div class='ht-bar'><i></i><i></i><i></i><b>pinterest.com/pin/poster-studies</b></div><div class='ht-page'><span class='ht-img'>${thumb(3)}</span><div class='ht-lines'><i></i><i></i><i></i></div><div class='ht-ctx'><span>Open image in new tab</span><span>Copy image address</span><span class='ht-keep'>+ Keep in Vault</span></div><div class='ht-toast'><span class='ht-thumb'>${thumb(3)}</span><div><strong>Saved to Vault</strong><small>source &amp; credit kept</small></div></div></div></div></div>`,
      `<div class='ht-scene' data-scene='1'><div class='ht-panel'><div class='ht-panel-head'><strong>Inbox</strong><small>sort later</small></div><div class='ht-grid'>${tile(thumb, 1)}${tile(thumb, 5)}<span class='ht-tile ht-new'>${thumb(3)}</span>${tile(thumb, 7)}${tile(thumb, 2)}${tile(thumb, 6)}</div></div></div>`,
      `<div class='ht-scene' data-scene='2'><div class='ht-panel'><div class='ht-search'><svg viewBox='0 0 24 24' width='16' height='16' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round'><circle cx='11' cy='11' r='7'/><path d='m20 20-3.5-3.5'/></svg><span class='ht-type'>เก้าอี้วินเทจ</span></div><div class='ht-chips'><span>rights:free</span><span><i style='background:#f05040'></i>#f05040</span><span>site:pinterest</span></div><div class='ht-grid'>${tile(thumb, 1)}<span class='ht-tile ht-hit'>${thumb(4)}</span>${tile(thumb, 5)}<span class='ht-tile ht-hit'>${thumb(0)}</span>${tile(thumb, 2)}${tile(thumb, 6)}</div></div></div>`,
      `<div class='ht-scene' data-scene='3'><div class='ht-use'><span class='ht-tile ht-hero'>${thumb(3)}</span><span class='ht-pill p1'>Moodboard · Warm heritage</span><span class='ht-pill p2'>Project · Tea rebrand</span><span class='ht-pill p3'>Collection · Packaging</span></div></div>`,
    ].join("");
  }
  return [
    `<div class='ht-scene' data-scene='0'><div class='ht-panel ht-form'><strong>New collection</strong><div class='ht-input'><span class='ht-type'>Packaging ideas</span></div><span class='ht-btn'>Create</span></div></div>`,
    `<div class='ht-scene' data-scene='1'><div class='ht-card'><span class='ht-tile ht-card-img'>${thumb(2)}</span><span class='ht-target'>Packaging ideas<svg viewBox='0 0 24 24' width='12' height='12' fill='none' stroke='currentColor' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'><path d='m6 9 6 6 6-6'/></svg></span><span class='ht-keepchip'>+ Keep</span><div class='ht-menu'><span>My Vault</span><span class='on'>Packaging ideas ✓</span><span>Client A — Brand</span><span>+ New collection</span></div></div></div>`,
    `<div class='ht-scene' data-scene='2'><div class='ht-tree'><div class='ht-node n0'>Client A<small>3</small></div><div class='ht-node n1'>Brand<small>24</small></div><div class='ht-node n2'>Social<small>11</small></div><div class='ht-node n3'>Packaging<small>18</small></div></div></div>`,
    `<div class='ht-scene' data-scene='3'><div class='ht-reuse'><span class='ht-tile ht-hero'>${thumb(4)}</span><span class='ht-pill p1'>Packaging ideas</span><span class='ht-pill p2'>Client A — Brand</span><span class='ht-pill p3'>Moodboard</span><svg class='ht-links' viewBox='0 0 200 200' preserveAspectRatio='none'><path d='M100 100 L30 30M100 100 L170 40M100 100 L100 175'/></svg></div></div>`,
  ].join("");
}

export function howtoMarkup(view, thumb) {
  const steps = HOWTO[view];
  if (!steps) return "";
  return `<section class='howto' data-howto='${view}' data-active='0'>
  <div class='howto-stage'><div class='howto-scenes'>${scenesMarkup(view, thumb)}</div><div class='howto-dots' aria-hidden='true'>${steps.map((_, i) => `<i data-dot='${i}'></i>`).join("")}</div></div>
  <ol class='howto-steps'>${steps.map((s, i) => `<li class='howto-step' data-step='${i}'><span class='howto-num'>${esc(s.n)}</span><h3>${esc(s.title)}</h3><p class='howto-th'>${esc(s.th)}</p><p>${esc(s.body)}</p></li>`).join("")}</ol>
</section>`;
}

/** Marks the step nearest the middle of the viewport as active. */
export function bindHowto(root) {
  (root || document).querySelectorAll("[data-howto]:not([data-bound])").forEach(el => {
    el.dataset.bound = "1";
    const steps = [...el.querySelectorAll(".howto-step")];
    if (!("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          el.dataset.active = e.target.dataset.step;
          steps.forEach(s => s.classList.toggle("is-active", s === e.target));
        }
      });
    }, { rootMargin: "-42% 0px -42% 0px" });
    steps.forEach(s => io.observe(s));
    steps[0] && steps[0].classList.add("is-active");
  });
}
