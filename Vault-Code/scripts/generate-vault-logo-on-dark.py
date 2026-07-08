from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = Path(
    r"C:\Users\PC\.cursor\projects\f-So1o-AunAun-fresh\assets"
    r"\c__Users_PC_AppData_Roaming_Cursor_User_workspaceStorage_"
    r"1f7742f2010b6b8d1a1f6ce0ed3f8dc1_images_vault-blackwhite-logo-7fa74bd8-3661-4e47-b3a7-24361a2a21b1.png"
)


def make_white_on_transparent(img: Image.Image, black_threshold: int = 40, white_threshold: int = 200) -> Image.Image:
    rgba = img.convert("RGBA")
    pixels = rgba.load()
    w, h = rgba.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            brightness = (r + g + b) / 3
            if brightness <= black_threshold:
                pixels[x, y] = (0, 0, 0, 0)
            elif brightness >= white_threshold:
                pixels[x, y] = (255, 255, 255, 255)
            else:
                # soft edge — keep as white with partial alpha
                alpha = max(0, min(255, int((brightness - black_threshold) / (white_threshold - black_threshold) * 255)))
                pixels[x, y] = (255, 255, 255, alpha)
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


def fit_square(img: Image.Image, size: int, pad_ratio: float = 0.04) -> Image.Image:
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


def main() -> None:
    raw = Image.open(SRC)
    transparent = make_white_on_transparent(raw)
    assets = ROOT / "outputs" / "a-plus-vault" / "assets"
    assets.mkdir(parents=True, exist_ok=True)

    outs = {
        assets / "vault-logo-on-dark.png": 512,
        assets / "vault-logo-on-dark-128.png": 128,
        assets / "vault-logo-on-dark-32.png": 32,
    }
    for path, size in outs.items():
        fit_square(transparent, size).save(path, format="PNG", optimize=True)
        print("wrote", path, size)

    # Verify transparency
    check = Image.open(assets / "vault-logo-on-dark.png")
    print("corner", check.getpixel((0, 0)), "center sample", check.getpixel((256, 256)))


if __name__ == "__main__":
    main()
