/*
 * /auth/app-return: hands a sign-in result from the phone's browser back to the SAMECOR app.
 *
 * The app starts Google / LINE / Facebook sign-in (and password reset emails) with
 * redirectTo = https://samecor.com/auth/app-return[?to=reset-password]. Supabase sends the browser here with
 * ?code=… (or ?error=…). This page forwards everything to com.samecor.app://auth/<callback|reset-password>,
 * which the shell turns back into https://samecor.com/auth/callback or /reset-password in its web view, where the
 * PKCE code verifier is stored. The code is useless anywhere else.
 *
 * iOS: ASWebAuthenticationSession catches the com.samecor.app:// navigation itself.
 * Android: Chrome Custom Tabs launch the app through an intent:// URL (package-pinned). If the browser blocks the
 * automatic jump, the button does the same thing with a tap.
 */
(function () {
  var ua = navigator.userAgent;
  var params = new URLSearchParams(window.location.search);
  // Supabase may put errors in the fragment; keep one flat query either way.
  new URLSearchParams(window.location.hash.replace(/^#/, "")).forEach(function (value, key) {
    if (!params.has(key)) params.set(key, value);
  });
  var to = params.get("to") === "reset-password" ? "reset-password" : "callback";
  params.delete("to");
  var query = params.toString();
  var suffix = query ? "?" + query : "";

  // Opened inside the app's own web view (an app link): finish right here.
  if (ua.indexOf("SamecorApp") !== -1) {
    window.location.replace((to === "reset-password" ? "/reset-password" : "/auth/callback") + suffix);
    return;
  }

  var appUrl = "com.samecor.app://auth/" + to + suffix;
  var target = /Android/i.test(ua)
    ? "intent://auth/" + to + suffix + "#Intent;scheme=com.samecor.app;package=com.samecor.app;end"
    : appUrl;

  var button = document.getElementById("open");
  if (button) button.setAttribute("href", target);
  window.location.replace(target);
})();
