// Brand splash: plays once per browser session (line trace, white mark on coral), then fades out. Skipped for reduced motion.
(function () {
  try {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (sessionStorage.getItem("aplus-vault-splash")) return;
    sessionStorage.setItem("aplus-vault-splash", "1");
    document.documentElement.setAttribute("data-splash", "1");
    document.addEventListener("DOMContentLoaded", function () {
      var el = document.getElementById("vault-splash");
      if (!el) return;
      var done = function () {
        el.classList.add("is-out");
        setTimeout(function () { el.remove(); document.documentElement.removeAttribute("data-splash"); }, 450);
      };
      el.addEventListener("click", done);
      setTimeout(done, 4800);
    });
  } catch (e) {}
})();
