#!/usr/bin/env python3
"""Generate the original 00000 CRT loop using Python's standard library and FFmpeg.

Usage: python3 tools/generate-00000-static.py [--ffmpeg /path/to/ffmpeg]
"""

import argparse
import math
from pathlib import Path
import random
import shutil
import subprocess


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ffmpeg", default=shutil.which("ffmpeg"))
    args = parser.parse_args()
    if not args.ffmpeg:
        parser.error("FFmpeg is required. Install it or pass --ffmpeg /path/to/ffmpeg.")

    destination = Path(__file__).resolve().parents[1] / "assets" / "00000"
    destination.mkdir(parents=True, exist_ok=True)
    movie = destination / "static.mp4"
    poster = destination / "static-poster.jpg"
    width, height, fps, seconds = 320, 360, 24, 6
    frames = fps * seconds
    noise = random.Random(00000)

    command = [
        args.ffmpeg, "-hide_banner", "-loglevel", "warning", "-y",
        "-f", "rawvideo", "-pixel_format", "gray", "-video_size", f"{width}x{height}",
        "-framerate", str(fps), "-i", "pipe:0", "-an",
        "-vf", "scale=1280:720:flags=neighbor,format=yuv420p,"
        "geq=lum='lum(X,Y)*(0.82+0.18*mod(Y,2))':cb=128:cr=128,vignette=PI/5",
        "-c:v", "libx264", "-preset", "slow", "-crf", "26",
        "-maxrate", "3600k", "-bufsize", "7200k",
        "-movflags", "+faststart", "-frames:v", str(frames), str(movie),
    ]
    process = subprocess.Popen(command, stdin=subprocess.PIPE)
    try:
        for frame in range(frames):
            phase = frame / frames
            grain = noise.randbytes(width * height)
            rows = []
            for y in range(height):
                # The rolling interference is periodic over exactly six seconds.
                # Random snow has the same distribution across the loop boundary.
                wave = math.tau * (y / height - phase)
                gain = 0.88 + 0.10 * math.sin(wave) + 0.06 * math.cos(wave * 3)
                fine_lines = 0.94 + 0.06 * math.sin(y * 2.41)
                # Sparse bright flecks stretch horizontally when scaled to 720p,
                # rather than turning fine, grey grain into compression artefacts.
                table = bytes(min(255, round(
                    (6 + value * 0.16 if value < 150 else 90 + (value - 150) * 1.55)
                    * gain * fine_lines
                )) for value in range(256))
                start = y * width
                rows.append(grain[start:start + width].translate(table))
            process.stdin.write(b"".join(rows))
    finally:
        process.stdin.close()
        code = process.wait()
    if code:
        raise SystemExit(f"FFmpeg failed with exit status {code}")

    subprocess.run([
        args.ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", str(movie),
        "-frames:v", "1", "-q:v", "2", str(poster),
    ], check=True)
    print(f"Created {movie} ({movie.stat().st_size / 1024 / 1024:.2f} MiB)")
    print(f"Created {poster}")


if __name__ == "__main__":
    main()
