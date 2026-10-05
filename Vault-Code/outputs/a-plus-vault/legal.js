/* Legal Center: the privacy-request form (no inline scripts: the CSP allows 'self' only). */
(() => {
  const form = document.querySelector("[data-privacy-form]");
  if (!form) return;
  const status = form.querySelector("[data-privacy-status]");
  const button = form.querySelector(".privacy-submit");
  const say = text => { status.textContent = text; };

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    button.disabled = true;
    say("Sending…");
    try {
      const headers = { "content-type": "application/json" };
      try {
        const session = JSON.parse(localStorage.getItem("aplus-vault-supabase-session") || "null");
        if (session && session.access_token) headers.authorization = `Bearer ${session.access_token}`;
      } catch { /* anonymous request is fine */ }
      const response = await fetch("/api/privacy-request", { method: "POST", headers, body: JSON.stringify(data) });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body || body.success === false) throw new Error((body && body.message) || "Could not send. Email privacy@aplus1.app instead.");
      say(body.message || "Received. We will answer within 30 days.");
      form.reset();
    } catch (error) {
      say(error.message);
    } finally {
      button.disabled = false;
    }
  });
})();
