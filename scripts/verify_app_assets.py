#!/usr/bin/env python3
"""
Verify integrity and dimensions of all Android and Web assets.
"""

from PIL import Image
import os
import sys

def verify_assets():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    res_dir = os.path.join(base_dir, "android", "app", "src", "main", "res")
    pub_dir = os.path.join(base_dir, "public")

    expected_android = [
        ("mipmap-mdpi/ic_launcher.png", (48, 48)),
        ("mipmap-hdpi/ic_launcher.png", (72, 72)),
        ("mipmap-xhdpi/ic_launcher.png", (96, 96)),
        ("mipmap-xxhdpi/ic_launcher.png", (144, 144)),
        ("mipmap-xxxhdpi/ic_launcher.png", (192, 192)),
        ("mipmap-mdpi/ic_launcher_round.png", (48, 48)),
        ("mipmap-hdpi/ic_launcher_round.png", (72, 72)),
        ("mipmap-xhdpi/ic_launcher_round.png", (96, 96)),
        ("mipmap-xxhdpi/ic_launcher_round.png", (144, 144)),
        ("mipmap-xxxhdpi/ic_launcher_round.png", (192, 192)),
        ("mipmap-mdpi/ic_launcher_foreground.png", (108, 108)),
        ("mipmap-hdpi/ic_launcher_foreground.png", (162, 162)),
        ("mipmap-xhdpi/ic_launcher_foreground.png", (216, 216)),
        ("mipmap-xxhdpi/ic_launcher_foreground.png", (324, 324)),
        ("mipmap-xxxhdpi/ic_launcher_foreground.png", (432, 432)),
        ("drawable-mdpi/splash_logo.png", (320, 320)),
        ("drawable-hdpi/splash_logo.png", (480, 480)),
        ("drawable-xhdpi/splash_logo.png", (640, 640)),
        ("drawable-xxhdpi/splash_logo.png", (960, 960)),
        ("drawable-xxxhdpi/splash_logo.png", (1280, 1280)),
    ]

    expected_web = [
        ("icon-192.png", (192, 192)),
        ("icon-512.png", (512, 512)),
        ("apple-touch-icon.png", (180, 180)),
        ("logo.png", (256, 256)),
        ("favicon.ico", None),
    ]

    errors = 0
    print("[*] Verifying Android resource assets...")
    for rel_path, dim in expected_android:
        full_path = os.path.join(res_dir, rel_path.replace("/", os.sep))
        if not os.path.exists(full_path):
            print(f"  [MISSING] {rel_path}")
            errors += 1
            continue
        if dim:
            with Image.open(full_path) as im:
                if im.size != dim:
                    print(f"  [MISMATCH] {rel_path}: expected {dim}, got {im.size}")
                    errors += 1
                else:
                    print(f"  [OK] {rel_path} ({dim[0]}x{dim[1]})")

    print("\n[*] Verifying Web/PWA assets...")
    for rel_path, dim in expected_web:
        full_path = os.path.join(pub_dir, rel_path)
        if not os.path.exists(full_path):
            print(f"  [MISSING] {rel_path}")
            errors += 1
            continue
        if dim:
            with Image.open(full_path) as im:
                if im.size != dim:
                    print(f"  [MISMATCH] {rel_path}: expected {dim}, got {im.size}")
                    errors += 1
                else:
                    print(f"  [OK] {rel_path} ({dim[0]}x{dim[1]})")
        else:
            print(f"  [OK] {rel_path}")

    if errors == 0:
        print("\nAll assets verified successfully! 100% compliant.")
        return True
    else:
        print(f"\nVerification finished with {errors} issue(s).", file=sys.stderr)
        return False

if __name__ == "__main__":
    ok = verify_assets()
    sys.exit(0 if ok else 1)
