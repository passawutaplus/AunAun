// Guests who open the bare root land on /welcome first; signed-in users and deep links go straight to the app.
(function () {
  try {
    var p = location.pathname.replace(/\/+$/, "") || "/";
    if (p === "/discover") { sessionStorage.setItem("aplus-vault-explore", "1"); return; }
    if (p !== "/" && p !== "/index.html") return;
    if (location.hash.length > 1 || /[?&](source|share_|login)/.test(location.search)) return;
    if (sessionStorage.getItem("aplus-vault-explore")) return;
    if (localStorage.getItem("aplus-vault-user")) return;
    for (var i = 0; i < localStorage.length; i++) if (/^sb-.*-auth-token$/.test(localStorage.key(i) || "")) return;
    location.replace("/welcome");
  } catch (e) {}
})();
