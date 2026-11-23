"""Keeps the site's photos fast and self-hosted. Run by .github/workflows/photos.yml.

1. Copies any photo still hosted on Squarespace into images/ and points the site at the copy.
2. Shrinks big photos (e.g. full-res files from photographers) to 2500px on the long edge,
   strips camera metadata, and converts HEIC/TIFF to JPEG.
3. Makes a 1000px copy of each photo in images/w1000/ for the home page grid.
"""
import json, re, sys, urllib.request
from pathlib import Path

from PIL import Image, ImageOps
try:
    import pillow_heif
    pillow_heif.register_heif_opener()
except ImportError:
    pass

ROOT = Path(__file__).resolve().parents[2]
IMAGES = ROOT / "images"
THUMBS = IMAGES / "w1000"
TEXT_FILES = [*ROOT.glob("*.html"), *(ROOT / "content").glob("*.json")]
MAX_EDGE, THUMB_EDGE, MAX_BYTES = 2500, 1000, 900_000
WEB = {".jpg", ".jpeg", ".png", ".webp"}
CONVERT = {".heic", ".heif", ".tif", ".tiff"}
SQS = re.compile(r"https://images\.squarespace-cdn\.com/[^\"'\s)]+")

changed = False


def replace_everywhere(old, new):
    global changed
    for f in TEXT_FILES:
        t = f.read_text(encoding="utf-8")
        if old in t:
            f.write_text(t.replace(old, new), encoding="utf-8")
            changed = True


def safe_name(url):
    stem = Path(urllib.request.url2pathname(url.split("?")[0].rsplit("/", 1)[-1])).stem
    stem = re.sub(r"[^A-Za-z0-9]+", "-", stem.replace("+", " ")).strip("-").lower() or "photo"
    ext = Path(url.split("?")[0]).suffix.lower()
    return stem, ext if ext in WEB else ".jpg"


# 1. Bring Squarespace-hosted photos home.
IMAGES.mkdir(exist_ok=True)
urls = sorted({m for f in TEXT_FILES for m in SQS.findall(f.read_text(encoding="utf-8"))})
for url in urls:
    stem, ext = safe_name(url)
    dest, n = IMAGES / f"{stem}{ext}", 2
    while dest.exists():  # never overwrite a different photo with the same file name
        dest = IMAGES / f"{stem}-{n}{ext}"; n += 1
    if True:
        try:
            req = urllib.request.Request(url.split("?")[0] + "?format=2500w", headers={"User-Agent": "Mozilla/5.0"})
            dest.write_bytes(urllib.request.urlopen(req, timeout=60).read())
            print("copied", url, "->", dest.name)
        except Exception as e:  # leave the old link in place rather than break the page
            print("could not copy", url, e, file=sys.stderr)
            continue
    replace_everywhere(url, f"images/{dest.name}")


# 2 & 3. Shrink, convert, and make grid-sized copies.
def save(im, path, edge):
    im = ImageOps.exif_transpose(im)
    im.thumbnail((edge, edge), Image.LANCZOS)
    if path.suffix.lower() in (".jpg", ".jpeg"):
        im.convert("RGB").save(path, "JPEG", quality=82, optimize=True, progressive=True)
    elif path.suffix.lower() == ".webp":
        im.save(path, "WEBP", quality=82)
    else:
        im.save(path, "PNG", optimize=True)


THUMBS.mkdir(exist_ok=True)
for src in sorted(p for p in IMAGES.iterdir() if p.is_file()):
    ext = src.suffix.lower()
    if ext in CONVERT:
        jpg = src.with_suffix(".jpg")
        with Image.open(src) as im:
            save(im, jpg, MAX_EDGE)
        replace_everywhere(f"images/{src.name}", f"images/{jpg.name}")
        src.unlink(); src = jpg; changed = True
        print("converted", jpg.name)
    elif ext not in WEB:
        continue
    with Image.open(src) as im:
        too_big = max(im.size) > MAX_EDGE or src.stat().st_size > MAX_BYTES
        if too_big:
            before = src.stat().st_size
            save(im.copy(), src, MAX_EDGE)
            changed = True
            print(f"shrank {src.name}: {before // 1024} KB -> {src.stat().st_size // 1024} KB")
    thumb = THUMBS / src.name
    if not thumb.exists() or thumb.stat().st_mtime < src.stat().st_mtime:
        with Image.open(src) as im:
            save(im, thumb, THUMB_EDGE)
        changed = True

# Remove grid copies whose original was deleted.
for t in THUMBS.iterdir():
    if t.is_file() and not (IMAGES / t.name).exists():
        t.unlink(); changed = True

print("changes made" if changed else "nothing to do")
