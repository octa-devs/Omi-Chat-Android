#!/usr/bin/env python3
"""
Generate Android app icons and splash assets from source images.
Requires: pip install pillow
"""

from PIL import Image, ImageDraw
import os
import sys

def generate_icons(source_path, output_dir="android/app/src/main/res", logo_path=None):
    """Generate all required Android icon densities and splash drawables."""

    icon_sizes = {
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192,
    }

    play_store_size = 512

    try:
        if not os.path.exists(source_path):
            raise FileNotFoundError(f"Source icon not found: {source_path}")

        img = Image.open(source_path)
        print(f"[*] Opened source icon: {source_path} ({img.size} {img.mode})")

        if img.mode != "RGBA":
            img = img.convert("RGBA")

        # Create a square version by cropping to center
        width, height = img.size
        size = min(width, height)
        left = (width - size) // 2
        top = (height - size) // 2
        img = img.crop((left, top, left + size, top + size))
        print(f"[*] Cropped to square: {img.size}")

        # Ensure output directories exist
        for density in icon_sizes.keys():
            os.makedirs(os.path.join(output_dir, density), exist_ok=True)

        # 1. Generate regular launcher icons
        for density, d_size in icon_sizes.items():
            icon = img.resize((d_size, d_size), Image.Resampling.LANCZOS)
            out = os.path.join(output_dir, density, "ic_launcher.png")
            icon.save(out, "PNG")
            print(f"  [+] Generated: {out} ({d_size}x{d_size})")

        # 2. Generate round icons (circular mask)
        for density, d_size in icon_sizes.items():
            icon = img.resize((d_size, d_size), Image.Resampling.LANCZOS)
            mask = Image.new("L", (d_size, d_size), 0)
            draw = ImageDraw.Draw(mask)
            draw.ellipse((0, 0, d_size, d_size), fill=255)
            icon.putalpha(mask)
            out = os.path.join(output_dir, density, "ic_launcher_round.png")
            icon.save(out, "PNG")
            print(f"  [+] Generated round: {out} ({d_size}x{d_size})")

        # 3. Generate Play Store icon (512x512)
        play_dir = os.path.join(output_dir, "..", "play_store")
        os.makedirs(play_dir, exist_ok=True)
        ps_out = os.path.join(play_dir, "ic_launcher_play_store.png")
        play_icon = img.resize((play_store_size, play_store_size), Image.Resampling.LANCZOS)
        play_icon.save(ps_out, "PNG")
        print(f"  [+] Generated Play Store: {ps_out} ({play_store_size}x{play_store_size})")

        # 4. Generate adaptive foreground
        adaptive_sizes = {
            "mipmap-mdpi": 108,
            "mipmap-hdpi": 162,
            "mipmap-xhdpi": 216,
            "mipmap-xxhdpi": 324,
            "mipmap-xxxhdpi": 432,
        }

        for density, d_size in adaptive_sizes.items():
            fg_size = int(d_size * 66 / 108)
            fg = img.resize((fg_size, fg_size), Image.Resampling.LANCZOS)
            canvas = Image.new("RGBA", (d_size, d_size), (0, 0, 0, 0))
            offset = (d_size - fg_size) // 2
            canvas.paste(fg, (offset, offset), fg)

            out = os.path.join(output_dir, density, "ic_launcher_foreground.png")
            canvas.save(out, "PNG")
            print(f"  [+] Generated adaptive foreground: {out} ({d_size}x{d_size})")

        # 5. Generate adaptive background (solid brand azure color #1E88E5)
        bg_color = (0x1E, 0x88, 0xE5, 0xFF)
        for density, d_size in adaptive_sizes.items():
            bg = Image.new("RGBA", (d_size, d_size), bg_color)
            out = os.path.join(output_dir, density, "ic_launcher_background.png")
            bg.save(out, "PNG")
            print(f"  [+] Generated adaptive background: {out} ({d_size}x{d_size})")

        # 6. Generate splash logo if logo_path provided
        if logo_path and os.path.exists(logo_path):
            logo_img = Image.open(logo_path)
            if logo_img.mode != "RGBA":
                logo_img = logo_img.convert("RGBA")

            splash_sizes = {
                "drawable-mdpi": 320,
                "drawable-hdpi": 480,
                "drawable-xhdpi": 640,
                "drawable-xxhdpi": 960,
                "drawable-xxxhdpi": 1280,
            }

            for density, d_size in splash_sizes.items():
                copy_logo = logo_img.copy()
                copy_logo.thumbnail((d_size, d_size), Image.Resampling.LANCZOS)

                canvas = Image.new("RGBA", (d_size, d_size), (0, 0, 0, 0))
                off_x = (d_size - copy_logo.width) // 2
                off_y = (d_size - copy_logo.height) // 2
                canvas.paste(copy_logo, (off_x, off_y), copy_logo)

                splash_dir = os.path.join(output_dir, density)
                os.makedirs(splash_dir, exist_ok=True)
                out = os.path.join(splash_dir, "splash_logo.png")
                canvas.save(out, "PNG")
                print(f"  [+] Generated splash: {out} ({d_size}x{d_size})")

        print("\nAll Android icons and assets generated successfully!")
        print(f"Output directory: {output_dir}")
        return True

    except Exception as e:
        print(f"[!] Error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    # Locate source and logo in project or arguments
    default_source = os.path.join(base_dir, "pop no name.jpg")
    default_logo = os.path.join(base_dir, "omi chat.png")
    default_output = os.path.join(base_dir, "android", "app", "src", "main", "res")

    src = sys.argv[1] if len(sys.argv) > 1 else default_source
    out_dir = sys.argv[2] if len(sys.argv) > 2 else default_output
    logo = sys.argv[3] if len(sys.argv) > 3 else default_logo

    success = generate_icons(src, output_dir=out_dir, logo_path=logo)
    sys.exit(0 if success else 1)
