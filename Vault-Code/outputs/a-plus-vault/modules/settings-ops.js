export const VAULT_SUPER_ADMIN_EMAIL = "passawut.a.plus@gmail.com";

export const FEEDBACK_RATINGS = [
  { value: 5, label: "Excellent" },
  { value: 4, label: "Good" },
  { value: 3, label: "Okay" },
  { value: 2, label: "Poor" },
  { value: 1, label: "Terrible" },
];

export function isVaultSuperAdmin(user) {
  return String(user && user.email || "").trim().toLowerCase() === VAULT_SUPER_ADMIN_EMAIL;
}

export function feedbackSettingsMarkup(ctx) {
  const { esc, escA, rating, message, submitted } = ctx;
  if (submitted) {
    return `<article class="profile-studio-card vault-feedback-card is-submitted">
      <div class="settings-card-head">
        <h2>Give Feedback</h2>
        <p>Thanks — we got your rating.</p>
      </div>
      <p class="vault-feedback-thanks">Thank you for helping improve A+ Vault.</p>
      <button type="button" class="ghost-button" data-feedback-again>Send another</button>
    </article>`;
  }
  const rows = FEEDBACK_RATINGS.map((r) => {
    const selected = Number(rating) === r.value;
    return `<button type="button" class="vault-feedback-rating ${selected ? "active" : ""}" data-feedback-rating="${r.value}">
      <span class="vault-feedback-score">${r.value}</span>
      <span>${esc(r.label)}</span>
    </button>`;
  }).join("");
  return `<article class="profile-studio-card vault-feedback-card">
    <div class="settings-card-head">
      <h2>Give Feedback</h2>
      <p>Rate A+ Vault 1–5 and tell us what to improve.</p>
    </div>
    <form class="vault-feedback-form" data-feedback-form>
      <div class="vault-feedback-ratings" role="group" aria-label="Rating">${rows}</div>
      <label>Details (optional)
        <textarea name="message" rows="3" maxlength="500" placeholder="What worked, what broke, or what you want next…">${escA(message || "")}</textarea>
      </label>
      <p class="settings-field-hint">Needs a real signed-in account (not local demo).</p>
      <div class="settings-actions">
        <button type="submit" class="primary-button" data-feedback-submit ${rating ? "" : "disabled"}>Send Feedback</button>
      </div>
    </form>
  </article>`;
}

function formatBytes(n) {
  const v = Number(n) || 0;
  if (v < 1024) return v + " B";
  if (v < 1024 * 1024) return (v / 1024).toFixed(1) + " KB";
  if (v < 1024 * 1024 * 1024) return (v / (1024 * 1024)).toFixed(1) + " MB";
  return (v / (1024 * 1024 * 1024)).toFixed(2) + " GB";
}

function fmtTime(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

export function adminSettingsMarkup(ctx) {
  const { esc, overview, feedback, captures, loading, error } = ctx;
  if (loading) {
    return `<article class="profile-studio-card vault-admin-card">
      <div class="settings-card-head"><h2>Vault Admin</h2><p>Loading ops snapshot…</p></div>
    </article>`;
  }
  if (error) {
    return `<article class="profile-studio-card vault-admin-card">
      <div class="settings-card-head"><h2>Vault Admin</h2><p>Could not load admin data.</p></div>
      <p class="settings-field-hint">${esc(error)}</p>
      <button type="button" class="ghost-button" data-admin-refresh>Retry</button>
    </article>`;
  }
  const o = overview || {};
  const kpis = [
    ["Items", o.items ?? 0],
    ["Captures 24h", o.captures_24h ?? 0],
    ["Captures 7d", o.captures_7d ?? 0],
    ["Scopes", o.capture_scopes ?? 0],
    ["Feedback", o.feedback_total ?? 0],
    ["Avg rating", o.feedback_avg ?? "—"],
    ["Storage objs", o.storage_objects ?? 0],
    ["Storage", formatBytes(o.storage_bytes)],
  ].map(([label, value]) => `<div class="vault-admin-kpi"><span>${esc(String(label))}</span><strong>${esc(String(value))}</strong></div>`).join("");

  const feedbackRows = (Array.isArray(feedback) ? feedback : []).slice(0, 20).map((row) => {
    return `<li>
      <div class="vault-admin-row-head">
        <strong>${esc(String(row.rating || "?"))}/5</strong>
        <span>${esc(row.user_email || "unknown")}</span>
        <em>${esc(fmtTime(row.created_at))}</em>
      </div>
      <p>${esc(row.message || "(rating only)")}</p>
    </li>`;
  }).join("") || "<li class='vault-admin-empty'>No feedback yet.</li>";

  const captureRows = (Array.isArray(captures) ? captures : []).slice(0, 20).map((row) => {
    return `<li>
      <div class="vault-admin-row-head">
        <strong>${esc(row.item_type || "?")}</strong>
        <span>${esc((row.title || row.object_id || "").slice(0, 48))}</span>
        <em>${esc(fmtTime(row.created_at))}</em>
      </div>
      <p>scope ${esc(row.bearer_prefix || "—")}${row.user_id ? " · user linked" : " · anonymous"}</p>
    </li>`;
  }).join("") || "<li class='vault-admin-empty'>No captures.</li>";

  return `<article class="profile-studio-card vault-admin-card">
    <div class="settings-card-head">
      <h2>Vault Admin</h2>
      <p>Super-admin ops for A+ Vault. Visible only in Settings for ${esc(VAULT_SUPER_ADMIN_EMAIL)}.</p>
    </div>
    <div class="vault-admin-kpi-grid">${kpis}</div>
    <div class="settings-actions vault-admin-actions">
      <button type="button" class="ghost-button" data-admin-refresh>Refresh</button>
      <button type="button" class="ghost-button danger-button" data-admin-purge-captures>Purge captures older than 30 days</button>
    </div>
    <div class="vault-admin-columns">
      <section>
        <h3>Recent feedback</h3>
        <ul class="vault-admin-list">${feedbackRows}</ul>
      </section>
      <section>
        <h3>Recent captures</h3>
        <ul class="vault-admin-list">${captureRows}</ul>
      </section>
    </div>
  </article>`;
}
