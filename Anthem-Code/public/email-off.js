// /email/off — turn the weekly summary e-mail off (or back on) from the link in the e-mail. See email-off.html.
(function () {
  var FN = "https://zkflkpbmbozrchqncpzi.supabase.co/functions/v1/weekly-digest";
  var q = new URLSearchParams(location.search);
  var u = q.get("u") || "";
  var t = q.get("t") || "";
  var title = document.getElementById("title");
  var sub = document.getElementById("sub");
  var toggle = document.getElementById("toggle");
  var home = document.getElementById("home");

  var COPY = {
    off: ["ปิดอีเมลสรุปรายสัปดาห์แล้ว", "จะไม่ได้รับอีเมลนี้อีก เปิดรับใหม่ได้ทุกเมื่อ", "เปิดรับอีกครั้ง"],
    on: ["เปิดรับอีเมลสรุปรายสัปดาห์แล้ว", "ส่งทุกวันจันทร์", "ปิดอีเมลนี้"],
    bad: ["ลิงก์นี้ใช้ไม่ได้", "ปิดหรือเปิดอีเมลนี้ได้ที่ Settings → Notifications"],
    fail: ["ยังทำรายการไม่สำเร็จ", "ลองใหม่อีกครั้ง หรือปิดได้ที่ Settings → Notifications"],
  };

  function show(state) {
    var c = COPY[state];
    title.textContent = c[0];
    sub.textContent = c[1];
    if (c[2]) {
      toggle.textContent = c[2];
      toggle.hidden = false;
      toggle.disabled = false;
      toggle.onclick = function () {
        send(state === "off" ? "on" : "off");
      };
    } else {
      toggle.hidden = true;
      home.textContent = "ไปที่ Settings";
      home.href = "/settings?tab=Notifications";
    }
  }

  function send(action) {
    toggle.disabled = true;
    // text/plain keeps it a simple request (no CORS preflight); the function reads the JSON itself.
    fetch(FN, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: JSON.stringify({ action: action, u: u, t: t }),
    })
      .then(function (r) {
        return r.json().then(function (b) {
          return { status: r.status, body: b };
        });
      })
      .then(function (res) {
        if (res.status === 403 || res.status === 401) return show("bad");
        if (!res.body || res.body.ok !== true) return show("fail");
        show(res.body.weekly ? "on" : "off");
      })
      .catch(function () {
        show("fail");
      });
  }

  if (!u || !t) show("bad");
  else send("off");
})();
