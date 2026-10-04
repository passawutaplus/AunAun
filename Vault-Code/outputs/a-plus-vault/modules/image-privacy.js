/** Third-party images: no Referer, lazy loading, and a quiet placeholder if one fails. One seam for a future proxy. */
export function resolveImageUrl(url) {
  return url;
}

function isRemote(img) {
  const src = img.getAttribute("src") || "";
  return /^https?:\/\//i.test(src) && !src.startsWith(location.origin);
}

function harden(img) {
  if (!isRemote(img)) return;
  if (!img.hasAttribute("referrerpolicy")) img.setAttribute("referrerpolicy", "no-referrer");
  if (!img.hasAttribute("loading")) img.setAttribute("loading", "lazy");
  if (!img.dataset.imgGuard) {
    img.dataset.imgGuard = "1";
    img.addEventListener("error", () => img.classList.add("img-broken"), { once: true });
  }
}

export function startImagePrivacy() {
  document.querySelectorAll("img").forEach(harden);
  new MutationObserver(list => {
    for (const m of list) {
      m.addedNodes.forEach(n => {
        if (n.nodeType !== 1) return;
        if (n.tagName === "IMG") harden(n);
        else n.querySelectorAll?.("img").forEach(harden);
      });
    }
  }).observe(document.body, { childList: true, subtree: true });
}
