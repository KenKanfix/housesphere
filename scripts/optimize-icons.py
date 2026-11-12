from pathlib import Path

from PIL import Image

root = Path(__file__).resolve().parent.parent
icons = [
    root / "public" / "icons" / "icon-192.png",
    root / "public" / "icons" / "icon-512.png",
    root / "public" / "icons" / "icon-maskable-512.png",
    root / "public" / "icons" / "apple-touch-icon.png",
    root / "public" / "favicon-32.png",
]

for path in icons:
    image = Image.open(path).convert("RGB")
    optimized = image.quantize(colors=256, method=Image.MEDIANCUT, dither=Image.FLOYDSTEINBERG)
    optimized.save(path, format="PNG", optimize=True, compress_level=9)
    print(f"Optimised {path.name}: {path.stat().st_size / 1024:.0f} KB")
