"""Thumbnails for projects that have store screenshots but no video.

For every project with a media/store/ folder (icon.* and shot-*.*, saved from its store page)
and no video, this writes the same files `npm run media` makes from a video:
  public/projects/<id>/poster.webp   1280x720 thumbnail: icon, name, downloads and screenshots
  public/projects/<id>/wrap-1..3.webp 512x288 stills that wrap the project's building

Run: python scripts/store-art.py [--force]   (needs Pillow), then npm run build.
"""

import re
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
PROJECTS = ROOT / "content" / "projects"
PUBLIC = ROOT / "public" / "projects"
FONTS = ROOT / "node_modules" / "@fontsource" / "rajdhani" / "files"
FORCE = "--force" in sys.argv

W, H = 1280, 720
BG = (11, 15, 23)
ACCENT = (255, 209, 102)


def font(weight: int, size: int):
    for f in (FONTS / f"rajdhani-latin-{weight}-normal.woff", Path("C:/Windows/Fonts/segoeuib.ttf")):
        try:
            return ImageFont.truetype(str(f), size)
        except OSError:
            continue
    return ImageFont.load_default(size)


def front_matter(text: str):
    """name, video and the first 'downloads' result from an info.md (enough for this script)."""
    name = re.search(r"^name:\s*'?(.*?)'?\s*$", text, re.M).group(1).replace("''", "'")
    video = re.search(r"^\s+video:", text, re.M) is not None
    downloads = re.search(r"^\s+-\s*'?([0-9.]+[KMB]?\+ downloads)", text, re.M)
    return name, video, downloads.group(1) if downloads else ""


def cover(img: Image.Image, w: int, h: int):
    s = max(w / img.width, h / img.height)
    img = img.resize((max(w, round(img.width * s)), max(h, round(img.height * s))), Image.LANCZOS)
    x, y = (img.width - w) // 2, (img.height - h) // 2
    return img.crop((x, y, x + w, y + h))


def contain(img: Image.Image, w: int, h: int):
    s = min(w / img.width, h / img.height)
    return img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)


def rounded(img: Image.Image, r: int):
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, img.width - 1, img.height - 1), r, fill=255)
    out = img.convert("RGBA")
    out.putalpha(mask)
    return out


def paste_card(canvas: Image.Image, img: Image.Image, x: int, y: int, r: int = 18, border=(255, 255, 255, 40)):
    """Paste with rounded corners, a soft drop shadow and a thin light border."""
    card = rounded(img, r)
    shadow = Image.new("RGBA", (card.width + 80, card.height + 80), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((40, 52, 40 + card.width, 52 + card.height), r, fill=(0, 0, 0, 150))
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(22)), (x - 40, y - 40))
    canvas.alpha_composite(card, (x, y))
    ImageDraw.Draw(canvas).rounded_rectangle((x, y, x + card.width - 1, y + card.height - 1), r, outline=border, width=2)


def wrap_text(draw: ImageDraw.ImageDraw, text: str, f, width: int):
    lines, line = [], ""
    for word in text.split():
        test = f"{line} {word}".strip()
        if draw.textlength(test, font=f) <= width or not line:
            line = test
        else:
            lines.append(line)
            line = word
    return lines + [line]


def backdrop(img: Image.Image):
    bg = cover(img.convert("RGB"), W, H).filter(ImageFilter.GaussianBlur(28)).convert("RGBA")
    bg.alpha_composite(Image.new("RGBA", (W, H), BG + (165,)))
    # darker on the left, behind the text
    fade = Image.linear_gradient("L").rotate(90).resize((W, H))
    shade = Image.new("RGBA", (W, H), BG + (0,))
    shade.putalpha(fade.point(lambda v: int(v * 0.75)))
    bg.alpha_composite(shade)
    return bg


def poster(name: str, downloads: str, icon: Image.Image, shots: list[Image.Image]):
    land = [s for s in shots if s.width >= s.height]
    port = [s for s in shots if s.height > s.width]
    canvas = backdrop((land or shots)[0])
    d = ImageDraw.Draw(canvas)

    # screenshots on the right
    if len(port) >= 3 or not land:
        phones = (port + land)[:3]
        # three phones across x 560..1240, the middle one 12% bigger and overlapping its neighbours by 30px
        ratio = phones[0].height / phones[0].width
        w = min((680 + 60) / 3.12, 520 / ratio)
        sizes = [round(w * (1.12 if k == 1 else 1)) for k in range(3)]
        left = 560 + (680 - (sum(sizes) - 60)) // 2
        xs = [left, left + sizes[0] - 30, left + sizes[0] + sizes[1] - 60]
        for k in (0, 2, 1):  # middle phone last, on top
            if k >= len(phones):
                continue
            img = cover(phones[k], sizes[k], round(sizes[k] * ratio))
            paste_card(canvas, img, xs[k], (H - img.height) // 2, r=26)
    else:
        big = cover(land[0], 660, 371)
        paste_card(canvas, big, 576, 92, r=18)
        for k, s in enumerate(land[1:3]):
            paste_card(canvas, cover(s, 320, 180), 576 + k * 340, 487, r=14)

    # icon, name and downloads on the left
    title = font(700, 62)
    lines = wrap_text(d, name, title, 450)[:3]
    x, y = 64, (H - (150 + 36 + len(lines) * 62 + 18 + 38)) // 2
    paste_card(canvas, icon.convert("RGB").resize((150, 150), Image.LANCZOS), x, y, r=34)
    y += 186
    for line in lines:
        d.text((x, y), line, font=title, fill=(255, 255, 255))
        y += 62
    y += 18
    tag = font(700, 22)
    label = "ON GOOGLE PLAY"
    tw = d.textlength(label, font=tag)
    d.rounded_rectangle((x, y, x + tw + 32, y + 38), 19, fill=ACCENT)
    d.text((x + 16, y + 6), label, font=tag, fill=BG)
    if downloads:
        d.text((x + tw + 50, y + 2), downloads, font=font(600, 30), fill=(225, 230, 240))
    return canvas.convert("RGB")


def wrap(img: Image.Image):
    w, h = 512, 288
    if img.width >= img.height:
        return cover(img.convert("RGB"), w, h)
    out = cover(img.convert("RGB"), w, h).filter(ImageFilter.GaussianBlur(14))
    out = Image.blend(out, Image.new("RGB", (w, h), BG), 0.45)
    phone = contain(img.convert("RGB"), w, h - 24)
    out.paste(phone, ((w - phone.width) // 2, 12))
    return out


def main():
    made = 0
    for store in sorted(PROJECTS.glob("*/*/media/store")):
        info = (store.parent.parent / "info.md").read_text(encoding="utf-8")
        pid = re.search(r"^id:\s*(\S+)", info, re.M).group(1)
        name, video, downloads = front_matter(info)
        if video:
            continue  # the video pipeline makes this project's poster and wraps
        icons = sorted(store.glob("icon.*"))
        shot_files = sorted(store.glob("shot-*.*"), key=lambda p: int(re.search(r"\d+", p.stem).group()))
        if not icons or not shot_files:
            print(f"warning: {pid}: media/store needs icon.* and shot-*.*")
            continue
        out = PUBLIC / pid
        out.mkdir(parents=True, exist_ok=True)
        shots = [Image.open(p) for p in shot_files]
        target = out / "poster.webp"
        if FORCE or not target.exists():
            poster(name, downloads, Image.open(icons[0]), shots).save(target, "WEBP", quality=82, method=6)
            made += 1
        # landscape shots first: they fill the building bands best
        ordered = [s for s in shots if s.width >= s.height] + [s for s in shots if s.height > s.width]
        for k, s in enumerate(ordered[:3], 1):
            target = out / f"wrap-{k}.webp"
            if FORCE or not target.exists():
                wrap(s).save(target, "WEBP", quality=72, method=6)
                made += 1
        print(f"store-art: {pid}")
    print(f"store-art: {made} file(s) made")


if __name__ == "__main__":
    main()
