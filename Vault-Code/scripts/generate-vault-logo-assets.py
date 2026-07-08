from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = Path(
    r"C:\Users\PC\.cursor\projects\f-So1o-AunAun-fresh\assets"
    r"\c__Users_PC_AppData_Roaming_Cursor_User_workspaceStorage_"
    r"1f7742f2010b6b8d1a1f6ce0ed3f8dc1_images_vault-logo-a34af286-95a0-49b1-a9d6-a1048badd7c1.png"
)


def make_transparent(img: Image.Image, black_threshold: int = 28) -> Image.Image:
    rgba = img.convert("RGBA")
    pixels = rgba.load()
    w, h = rgba.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if r <= black_threshold and g <= black_threshold and b <= black_threshold:
                pixels[x, y] = (0, 0, 0, 0)
    return rgba


def content_bbox(img: Image.Image) -> tuple[int, int, int, int]:
    pixels = img.load()
    w, h = img.size
    minx, miny, maxx, maxy = w, h, -1, -1
    for y in range(h):
        for x in range(w):
            if pixels[x, y][3] > 8:
                minx = min(minx, x)
                miny = min(miny, y)
                maxx = max(maxx, x)
                maxy = max(maxy, y)
    if maxx < 0:
        return (0, 0, w, h)
    return (minx, miny, maxx + 1, maxy + 1)


def fit_square(img: Image.Image, size: int, pad_ratio: float = 0.06) -> Image.Image:
    crop = img.crop(content_bbox(img))
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    pad = int(size * pad_ratio)
    target = size - pad * 2
    cw, ch = crop.size
    scale = min(target / cw, target / ch)
    nw = max(1, int(round(cw * scale)))
    nh = max(1, int(round(ch * scale)))
    resized = crop.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas.paste(resized, ((size - nw) // 2, (size - nh) // 2), resized)
    return canvas


def write(path: Path, img: Image.Image) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, format="PNG", optimize=True)
    print("wrote", path, img.size)


def main() -> None:
    raw = Image.open(SRC)
    print("source", SRC.name, raw.size, raw.mode)
    transparent = make_transparent(raw)
    master = fit_square(transparent, 512, pad_ratio=0.04)

    destinations = {
        ROOT / "outputs" / "a-plus-vault" / "assets" / "vault-logo.png": 512,
        ROOT / "outputs" / "a-plus-vault" / "assets" / "vault-logo-32.png": 32,
        ROOT / "outputs" / "a-plus-vault" / "assets" / "vault-logo-128.png": 128,
        ROOT / "outputs" / "a-plus-vault" / "assets" / "vault-save-icon-32.png": 32,
        ROOT / "outputs" / "a-plus-vault" / "assets" / "vault-save-icon-128.png": 128,
        ROOT / "outputs" / "a-plus-vault" / "favicon.png": 32,
        ROOT / "outputs" / "a-plus-vault" / "apple-touch-icon.png": 180,
        ROOT / "vault-extension" / "icons" / "icon-16.png": 16,
        ROOT / "vault-extension" / "icons" / "icon-32.png": 32,
        ROOT / "vault-extension" / "icons" / "icon-48.png": 48,
        ROOT / "vault-extension" / "icons" / "icon-128.png": 128,
        ROOT / "outputs" / "a-plus-vault-extension-unpacked" / "icons" / "icon-16.png": 16,
        ROOT / "outputs" / "a-plus-vault-extension-unpacked" / "icons" / "icon-32.png": 32,
        ROOT / "outputs" / "a-plus-vault-extension-unpacked" / "icons" / "icon-48.png": 48,
        ROOT / "outputs" / "a-plus-vault-extension-unpacked" / "icons" / "icon-128.png": 128,
    }

    write(ROOT / "outputs" / "a-plus-vault" / "assets" / "vault-logo-source.png", transparent)
    for path, size in destinations.items():
        write(path, fit_square(transparent, size, pad_ratio=0.05 if size <= 32 else 0.04))

    # also keep a clean master for references
    write(ROOT / "outputs" / "a-plus-vault" / "assets" / "vault-logo-512.png", master)
    print("done")


if __name__ == "__main__":
    main()
