/**
 * Profile > Connected apps. One card per service: what you can bring in, what is not possible.
 * Every connection is read-only and starts private. Nothing here talks to a service yet: `status` drives the button.
 * status: "soon" (planned) | "unavailable" (the service offers no way in).
 */
export const CONNECTION_GROUPS = [
  { id: "design", label: "Design & portfolio" },
  { id: "photos", label: "Photos & files" },
  { id: "boards", label: "Boards & bookmarks" },
  { id: "social", label: "Social & art" },
];

export const CONNECTIONS = [
  { id: "dribbble", group: "design", name: "Dribbble", can: "Your own shots, with title and link back.", cannot: "Other designers' shots or the Dribbble feed.", status: "soon" },
  { id: "figma", group: "design", name: "Figma", can: "Frames from your own files, saved as images.", cannot: "Editing your files. Figma image links expire, so we keep a copy.", status: "soon" },
  { id: "canva", group: "design", name: "Canva", can: "Your own designs, exported as PNG or JPG.", cannot: "Editing designs or reading other people's.", status: "soon" },
  { id: "arena", group: "design", name: "Are.na", can: "Your own channels.", cannot: "Browsing other people's channels in bulk.", status: "soon" },
  { id: "behance", group: "design", name: "Behance", can: "", cannot: "Adobe has paused its connection for now.", alt: "Use the Chrome extension or paste a project link.", status: "unavailable" },

  { id: "gphotos", group: "photos", name: "Google Photos", can: "Photos and albums you pick yourself.", cannot: "Browsing your whole library (Google closed that in 2025).", status: "soon" },
  { id: "drive", group: "photos", name: "Google Drive & Dropbox", can: "Image files you choose one by one.", cannot: "Scanning your folders in the background.", status: "soon" },
  { id: "flickr", group: "photos", name: "Flickr", can: "Your own photos, with the licence label you set.", cannot: "Other people's photos.", status: "soon" },
  { id: "smugmug", group: "photos", name: "SmugMug", can: "Your own galleries and photos.", cannot: "Galleries you do not own.", status: "soon" },

  { id: "pinterest", group: "boards", name: "Pinterest", can: "Your own boards and pins.", cannot: "Other people's boards. Pinterest must approve us first.", status: "soon" },
  { id: "raindrop", group: "boards", name: "Raindrop.io", can: "Your bookmarks with their cover images; collections become collections.", cannot: "Changing or deleting your bookmarks.", status: "soon" },
  { id: "miro", group: "boards", name: "Miro", can: "Images placed on your boards.", cannot: "Whole frames as pictures (Miro does not offer that yet).", status: "soon" },
  { id: "notion", group: "boards", name: "Notion", can: "Images in the pages you choose to share.", cannot: "Workspaces or pages you do not share.", status: "soon" },

  { id: "instagram", group: "social", name: "Instagram", can: "Your own posts, on Business or Creator accounts.", cannot: "Personal accounts or other people's posts (Meta closed that).", status: "soon" },
  { id: "threads", group: "social", name: "Threads", can: "Images from your own posts.", cannot: "Other people's posts.", status: "soon" },
  { id: "bluesky", group: "social", name: "Bluesky", can: "Images from your own posts.", cannot: "Your feed or other people's posts.", status: "soon" },
  { id: "tumblr", group: "social", name: "Tumblr", can: "Photos from your own blog.", cannot: "Blogs you only follow.", status: "soon" },
  { id: "deviantart", group: "social", name: "DeviantArt", can: "Your own deviations.", cannot: "Other artists' work.", status: "soon" },
  { id: "sketchfab", group: "social", name: "Sketchfab", can: "Previews of your own 3D models.", cannot: "Models you do not own.", status: "soon" },
];

const initials = name => String(name).replace(/[^A-Za-z0-9 ]/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?";

export function connectionCardMarkup(c, { esc, escA }) {
  const soon = c.status === "soon";
  const pill = soon ? "Coming soon" : "Not available";
  const body = c.can
    ? `<ul class='conn-list'><li class='is-can'><b>You can</b><span>${esc(c.can)}</span></li><li class='is-cannot'><b>Not possible</b><span>${esc(c.cannot)}</span></li></ul>`
    : `<ul class='conn-list'><li class='is-cannot'><b>Not possible</b><span>${esc(c.cannot)}</span></li>${c.alt ? `<li class='is-can'><b>Instead</b><span>${esc(c.alt)}</span></li>` : ""}</ul>`;
  return `<article class='conn-card is-${escA(c.status)}' data-conn-group='${escA(c.group)}'><header><span class='conn-mark' aria-hidden='true'>${esc(initials(c.name))}</span><div><h3>${esc(c.name)}</h3><span class='conn-pill'>${pill}</span></div></header>${body}<button type='button' class='ghost-button conn-button' disabled>${soon ? "Connect" : "Not available"}</button></article>`;
}

export function connectionsSectionMarkup({ esc, escA }) {
  const tabs = [{ id: "all", label: "All" }, ...CONNECTION_GROUPS]
    .map((g, i) => `<button type='button' class='conn-tab' data-conn-filter='${escA(g.id)}' aria-pressed='${i === 0 ? "true" : "false"}'>${esc(g.label)}</button>`)
    .join("");
  return `<section class='profile-studio-card conn-section' id='connections' aria-labelledby='conn-title'>
    <div class='conn-head'><div><span class='section-label'>Connections</span><h2 id='conn-title'>Connected apps</h2><p>Bring in your own work from the places you already use. You choose every image.</p></div></div>
    <ul class='conn-promise'><li>Read-only: we never post or change anything on those sites.</li><li>Everything you bring in starts private to you.</li><li>You can disconnect at any time.</li></ul>
    <div class='conn-tabs' role='group' aria-label='Filter apps'>${tabs}</div>
    <div class='conn-grid'>${CONNECTIONS.map(c => connectionCardMarkup(c, { esc, escA })).join("")}</div>
    <p class='conn-foot'>Missing a service? Tell us from Settings &rsaquo; Feedback and we will look at it.</p>
  </section>`;
}
