#!/usr/bin/env python3
"""Design Feed bot: RSS -> Obsidian notes (title, designer, source link, thumbnail).
Stdlib only. No keys, no login. Usage:
  python3 design_feed.py --vault "/path/to/YourVault"
  python3 design_feed.py --vault ./test --feed-file sample.xml   (offline test)
"""
import argparse, hashlib, json, re, sys, urllib.request
import xml.etree.ElementTree as ET
from datetime import date
from html import unescape
from pathlib import Path
from urllib.parse import urlparse

FEEDS = {
    "Dezeen": "https://www.dezeen.com/feed/",
    "Designboom": "https://www.designboom.com/feed/",
    "Yanko Design": "https://www.yankodesign.com/feed/",
    "Brand New": "https://www.underconsideration.com/brandnew/atom.xml",
    "Creative Boom": "https://www.creativeboom.com/feed/",
    "Its Nice That": "https://www.itsnicethat.com/rss",
    "Core77": "https://feeds.feedburner.com/core77/blog",
    "Fubiz": "https://www.fubiz.net/feed/",
}
# default category hint for sources that are about one thing
SOURCE_HINT = {"Brand New": "Logo-Branding", "Yanko Design": "Product-Gadget"}

# category folder -> keywords (checked against RSS categories + title + summary)
CATEGORIES = {
    "Logo-Branding": ["logo", "brand identity", "branding", "rebrand", "identity", "wordmark", "monogram"],
    "Graphic-Typography": ["poster", "typeface", "typography", "font", "graphic", "illustration", "packaging", "editorial", "book design", "lettering"],
    "UI-UX-Digital": ["ui ", "ux", "app design", "interface", "website", "web design", "digital", "motion", "animation", "interaction"],
    "Product-Gadget": ["product", "gadget", "headphone", "speaker", "camera", "watch", "phone", "keyboard", "lamp", "device", "wearable", "appliance", "industrial design"],
    "Furniture-Interior": ["furniture", "chair", "table", "sofa", "interior", "lighting", "stool", "shelf", "rug", "tableware"],
    "Architecture": ["architecture", "house", "building", "pavilion", "museum", "tower", "residence", "villa"],
    "Fashion-Material": ["fashion", "textile", "material", "jewellery", "jewelry", "footwear", "sneaker", "bag"],
}
OTHER = "Other"
PER_DAY = 10
FOLDER = "Design-Feed"
MAX_IMG_BYTES = 800_000
IMG_EXT = (".jpg", ".jpeg", ".png", ".webp")
ALLOWED_IMG_HOSTS = ("dezeen.com", "designboom.com", "yankodesign.com", "wp.com")
NS = {"dc": "http://purl.org/dc/elements/1.1/",
      "media": "http://search.yahoo.com/mrss/",
      "content": "http://purl.org/rss/1.0/modules/content/"}
UA = {"User-Agent": "Mozilla/5.0 (DesignFeedBot personal use)"}


def fetch(url, limit=3_000_000):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read(limit)


def clean(t):
    return re.sub(r"\s+", " ", unescape(re.sub(r"<[^>]+>", " ", t or ""))).strip()


def find_image(item):
    m = item.find("media:content", NS) or item.find("media:thumbnail", NS)
    if m is not None and m.get("url"):
        return m.get("url")
    enc = item.find("enclosure")
    if enc is not None and (enc.get("type") or "").startswith("image"):
        return enc.get("url")
    body = (item.findtext("content:encoded", namespaces=NS) or item.findtext("description") or "")
    g = re.search(r'<img[^>]+src="([^"]+)"', body)
    return g.group(1) if g else None


def categorize(text, source):
    t = f" {text.lower()} "
    best, score = None, 0
    for cat, kws in CATEGORIES.items():
        s = sum(t.count(k) for k in kws)
        if s > score:
            best, score = cat, s
    return best or SOURCE_HINT.get(source, OTHER)


def parse(xml_bytes, source):
    root = ET.fromstring(xml_bytes)
    atom = "{http://www.w3.org/2005/Atom}"
    for it in list(root.iter("item")) + list(root.iter(atom + "entry")):
        link = (it.findtext("link") or "").strip()
        if not link:  # Atom: <link href="...">
            el = it.find(atom + "link")
            link = (el.get("href") if el is not None else "") or ""
        if not link.startswith("https://"):
            continue
        title = clean(it.findtext("title") or it.findtext(atom + "title"))
        summary = clean(it.findtext("description") or it.findtext(atom + "summary"))
        cats = " ".join(clean(c.text) for c in it.findall("category"))
        author = it.findtext(atom + "author/" + atom + "name")
        yield {
            "title": title,
            "designer": clean(it.findtext("dc:creator", namespaces=NS) or author) or "ไม่ระบุ",
            "link": link,
            "summary": summary[:240],
            "image": find_image(it),
            "source": source,
            "category": categorize(f"{cats} {title} {summary}", source),
        }


MINIMAL_WORDS = ["minimal", "simple", "clean", "monochrome", "quiet", "restrained", "geometric",
                 "matte", "neutral", "pared-back", "calm", "essential"]


def style_score(p):
    """0-100 heuristic: how close to a minimal style, from keywords. Rough, edit by hand."""
    t = f"{p['title']} {p['summary']}".lower()
    return min(100, 30 + 20 * sum(w in t for w in MINIMAL_WORDS))


def push_supabase(items):
    """Upsert into public.discover_items (Design Feed) via REST. Needs env SUPABASE_URL + SUPABASE_SERVICE_KEY
    (service key stays on your computer, never in code or chat)."""
    import os
    base, key = os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_SERVICE_KEY")
    if not base or not key:
        sys.exit("set SUPABASE_URL and SUPABASE_SERVICE_KEY first")
    slug_of = {"Logo-Branding": "logo", "Graphic-Typography": "graphic", "UI-UX-Digital": "ui",
               "Product-Gadget": "product", "Furniture-Interior": "furniture",
               "Architecture": "architecture", "Fashion-Material": "fashion", "Other": "other"}
    rows = []
    for p in items:
        if not p["image"] or not p["image"].startswith("https://"):
            continue  # a published Design Feed item needs an https preview image
        host = urlparse(p["link"]).hostname or p["source"]
        known = p["designer"] and p["designer"] != "ไม่ระบุ"
        rows.append({
            "source": "feed", "source_id": hashlib.sha1(p["link"].encode()).hexdigest()[:20],
            "source_url": p["link"], "original_image_url": p["image"],
            "image_sm_path": p["image"], "image_md_path": p["image"], "image_lg_path": p["image"],
            "title": p["title"], "license": "credited", "delivery_mode": "hotlink",
            "attribution": p["designer"] if known else f"via {p['source']}",
            "attribution_json": {"artist": p["designer"] if known else "", "institution": p["source"],
                                 "institution_url": f"https://{host}/", "credit_line": f"{p['source']} · {p['link']}"},
            "category": slug_of.get(p["category"], "other"),
            "tags": [p["category"].lower()], "quality_score": style_score(p),
            "source_meta": {"summary": p["summary"], "why_good": "", "theme": "", "permission": "none"},
            "status": "review",  # hidden until you set status='published'
        })
    if not rows:
        print("no items with images to push")
        return
    req = urllib.request.Request(
        f"{base.rstrip('/')}/rest/v1/discover_items?on_conflict=source,source_id",
        data=json.dumps(rows).encode(), method="POST",
        headers={"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json",
                 "Prefer": "resolution=ignore-duplicates,return=minimal"})
    urllib.request.urlopen(req, timeout=30).read()
    print(f"pushed {len(rows)} rows to discover_items (status=review, hidden until you publish)")


def save_thumb(url, dest_dir, stem):
    try:
        u = urlparse(url)
        if u.scheme != "https" or not u.hostname.endswith(ALLOWED_IMG_HOSTS):
            return None
        ext = Path(u.path).suffix.lower()
        if ext not in IMG_EXT:
            return None
        data = fetch(url, MAX_IMG_BYTES + 1)
        if len(data) > MAX_IMG_BYTES:
            return None
        dest_dir.mkdir(parents=True, exist_ok=True)
        name = f"{stem}{ext}"
        (dest_dir / name).write_bytes(data)
        return name
    except Exception:
        return None


def slug(s):
    return re.sub(r"[^\w฀-๿-]+", "-", s).strip("-")[:60] or "untitled"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--vault", required=True)
    ap.add_argument("--feed-file", help="offline test: local RSS xml")
    ap.add_argument("--no-images", action="store_true")
    ap.add_argument("--supabase", action="store_true", help="also push items to A+ Vault Design Feed")
    a = ap.parse_args()

    out = Path(a.vault).expanduser() / FOLDER
    notes, imgs = out / "inbox", out / "images"
    out.mkdir(parents=True, exist_ok=True)
    seen_path = out / ".seen.json"
    seen = set(json.loads(seen_path.read_text())) if seen_path.exists() else set()

    pool = []
    if a.feed_file:
        pool += list(parse(Path(a.feed_file).read_bytes(), "Sample"))
    else:
        for name, url in FEEDS.items():
            try:
                pool += list(parse(fetch(url), name))
            except Exception as e:
                print(f"! {name}: {e}", file=sys.stderr)

    # round-robin across sources so one site doesn't dominate
    by_src = {}
    for p in pool:
        by_src.setdefault(p["source"], []).append(p)
    picked, i = [], 0
    while len(picked) < PER_DAY and any(by_src.values()):
        for lst in by_src.values():
            if lst and len(picked) < PER_DAY:
                p = lst.pop(0)
                if p["link"] not in seen:
                    picked.append(p)
    counts = {}
    for p in picked:
        counts[p["category"]] = counts.get(p["category"], 0) + 1
    print("categories:", counts)

    today = date.today().isoformat()
    for p in picked:
        h = hashlib.sha1(p["link"].encode()).hexdigest()[:6]
        stem = f"{today}-{slug(p['title'])}-{h}"
        thumb = None if a.no_images or not p["image"] else save_thumb(p["image"], imgs, stem)
        lines = ["---", f'title: "{p["title"].replace(chr(34), chr(39))}"',
                 f'designer: "{p["designer"]}"', f'source: "{p["source"]}"',
                 f'link: "{p["link"]}"', f"date: {today}", "status: inbox",
                 f'category: "{p["category"]}"',
                 f'tags: [design-feed, {p["category"].lower()}]', "---", "",
                 f"# {p['title']}", "", f"**ดีไซเนอร์/ผู้เขียน:** {p['designer']}  ",
                 f"**ต้นทาง:** [{p['source']}]({p['link']})", ""]
        if thumb:
            lines += [f"![[{thumb}]]", ""]
        if p["summary"]:
            lines += [f"> {p['summary']}", ""]
        cat_dir = notes / p["category"]
        cat_dir.mkdir(parents=True, exist_ok=True)
        (cat_dir / f"{stem}.md").write_text("\n".join(lines), encoding="utf-8")
        seen.add(p["link"])

    if a.supabase and picked:
        push_supabase(picked)
    seen_path.write_text(json.dumps(sorted(seen)))
    print(f"saved {len(picked)} notes -> {notes}")


if __name__ == "__main__":
    main()
