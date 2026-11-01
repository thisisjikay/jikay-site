#!/usr/bin/env python3
"""Render the social preview with the website's actual VT323 font.

Usage: python3 tools/generate-00000-social.py [--ffmpeg /path/to/ffmpeg]
"""

import argparse
from pathlib import Path
import shutil
import subprocess


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ffmpeg", default=shutil.which("ffmpeg"))
    args = parser.parse_args()
    if not args.ffmpeg:
        parser.error("FFmpeg is required. Install it or pass --ffmpeg /path/to/ffmpeg.")

    root = Path(__file__).resolve().parents[1]
    output = root / "assets" / "00000" / "social-preview.jpg"
    filters = [
        "scale=1200:630:force_original_aspect_ratio=increase",
        "crop=1200:630",
        "drawbox=color=black@0.38:t=fill",
    ]
    # Draw the five glyphs separately to match the page's 0.045em tracking.
    # Use the same local font file, rather than approximating its lettering.
    for index in range(5):
        filters.append(
            "drawtext=fontfile=assets/fonts/VT323-Regular.ttf:text=0:"
            "fontcolor=white:fontsize=96:"
            f"x=(w-text_w)/2+({index - 2})*(text_w+4.32):y=(h-text_h)/2:"
            "shadowcolor=black@0.8:shadowx=0:shadowy=2"
        )
    subprocess.run([
        args.ffmpeg, "-hide_banner", "-loglevel", "error", "-y",
        "-i", "assets/00000/static-poster.jpg",
        "-vf", ",".join(filters), "-frames:v", "1", "-q:v", "2", str(output),
    ], cwd=root, check=True)
    print(f"Created {output} (1200 × 630)")


if __name__ == "__main__":
    main()
