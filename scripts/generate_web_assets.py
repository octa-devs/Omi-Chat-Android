#!/usr/bin/env python3
"""
Generate Web & PWA assets (favicon.ico, icon-192.png, icon-512.png, apple-touch-icon.png)
from the source project logo.
Requires: pip install pillow
"""

from PIL import Image
import os
import sys

def generate_web_assets(source_logo=None, public_dir="public"):
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if not source_logo:
        # Prefer omi chat.png, fallback to pop no name.jpg
        for candidate in ["omi chat.png", "pop no name.jpg"]:
            path = os.path.join(base_dir, candidate)
            if os.path.exists(path):
                source_logo = path
                break

    if not source_logo or not os.path.exists(source_logo):
        print(f"[!] Source logo not found: {source_logo}", file=sys.stderr)
        return False

    out_public = os.path.join(base_dir, public_dir) if not os.path.isabs(public_dir) else public_dir
    os.makedirs(out_public, exist_ok=True)

    print(f"[*] Processing source image: {source_logo}")
    img = Image.open(source_logo)
    if img.mode != "RGBA":
        img = img.convert("RGBA")

    # Crop to square
    w, h = img.size
    min_dim = min(w, h)
    l = (w - min_dim) // 2
    t = (h - min_dim) // 2
    img = img.crop((l, t, l + min_dim, t + min_dim))

    targets = [
        ("icon-192.png", (192, 192)),
        ("icon-512.png", (512, 512)),
        ("apple-touch-icon.png", (180, 180)),
        ("logo.png", (256, 256)),
    ]

    for filename, (dim_w, dim_h) in targets:
        resized = img.resize((dim_w, dim_h), Image.Resampling.LANCZOS)
        out_path = os.path.join(out_public, filename)
        resized.save(out_path, "PNG")
        print(f"  [+] Generated: {out_path} ({dim_w}x{dim_h})")

    # Generate multi-size favicon.ico
    favicon_path = os.path.join(out_public, "favicon.ico")
    icon_sizes = [(16, 16), (32, 32), (48, 48)]
    ico_imgs = [img.resize(s, Image.Resampling.LANCZOS) for s in icon_sizes]
    ico_imgs[0].save(favicon_path, format="ICO", sizes=icon_sizes)
    print(f"  [+] Generated: {favicon_path} (16x16, 32x32, 48x48)")

    print("\nAll Web & PWA assets generated successfully!")
    return True

if __name__ == "__main__":
    src = sys.argv[1] if len(sys.argv) > 1 else None
    success = generate_web_assets(src)
    sys.exit(0 if success else 1)
