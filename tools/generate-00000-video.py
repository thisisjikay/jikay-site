#!/usr/bin/env python3
"""Turn supplied footage into a monochrome, looping 00000 CRT background.

Usage: python3 tools/generate-00000-video.py /path/to/source.mp4 --name four --duration 27
Requires FFmpeg, with no third-party Python packages.
"""

import argparse
import math
from pathlib import Path
import random
import re
import shutil
import subprocess
import tempfile


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--name", default="cold-winter", help="Output filename prefix")
    parser.add_argument("--start", type=float, default=0,
                        help="Source start time in seconds (default: 0)")
    parser.add_argument("--duration", type=float, default=23.5,
                        help="Seconds of source footage to use (default: 23.5)")
    parser.add_argument("--gamma", type=float, default=1,
                        help="Lift shadow detail before adding static (default: 1)")
    parser.add_argument("--overlap", type=float, default=2,
                        help="Seconds blended across the loop join (default: 2)")
    parser.add_argument("--no-scanlines", action="store_true",
                        help="Use square grain without fixed horizontal scanlines")
    parser.add_argument("--no-tracking", action="store_true",
                        help="Disable picture wobble, horizontal tearing and rolling tracking bars")
    parser.add_argument("--stabilize", action="store_true",
                        help="Lock camera framing before blending (requires FFmpeg vidstab)")
    parser.add_argument("--ffmpeg", default=shutil.which("ffmpeg"))
    parser.add_argument("--signal", type=float, default=0.36,
                        help="Footage mixed into the snow, from 0 to 1 (default: 0.36)")
    args = parser.parse_args()
    if not args.ffmpeg:
        parser.error("Install FFmpeg or pass --ffmpeg /path/to/ffmpeg.")
    if not args.source.is_file():
        parser.error("The source footage does not exist.")
    if not 0 <= args.signal <= 1:
        parser.error("--signal must be between 0 and 1.")
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", args.name):
        parser.error("--name must use lowercase letters, numbers and single hyphens.")
    if not math.isfinite(args.duration) or args.duration <= 4:
        parser.error("--duration must be greater than 4 seconds.")
    if not math.isfinite(args.start) or args.start < 0:
        parser.error("--start must be zero or greater.")
    if not math.isfinite(args.gamma) or not 0.1 <= args.gamma <= 10:
        parser.error("--gamma must be between 0.1 and 10.")
    if not math.isfinite(args.overlap) or not 0 < args.overlap < args.duration / 2:
        parser.error("--overlap must be positive and less than half of --duration.")

    destination = Path(__file__).resolve().parents[1] / "assets/00000/video"
    destination.mkdir(parents=True, exist_ok=True)
    movie = destination / f"{args.name}-loop.mp4"
    poster = destination / f"{args.name}-poster.jpg"
    fps, source_frames, overlap = 24, round(args.duration * 24), round(args.overlap * 24)
    if overlap < 2:
        parser.error("--overlap must contain at least two frames.")
    frames = source_frames - overlap
    seconds = frames / fps
    common = [args.ffmpeg, "-hide_banner", "-loglevel", "warning", "-y"]

    with tempfile.TemporaryDirectory(prefix=f"{args.name}-") as temporary:
        clean_loop = Path(temporary) / "footage-loop.mkv"
        prepare = "fps=24,scale=640:360,setsar=1,format=gray"
        stabilization = ""
        if args.stabilize:
            transforms = Path(temporary) / "camera.trf"
            print("Locking the window framing to remove the camera shift…", flush=True)
            subprocess.run(common + [
                "-ss", str(args.start), "-i", str(args.source), "-an",
                "-vf", f"{prepare},trim=end_frame={source_frames},"
                f"vidstabdetect=tripod=1:mincontrast=0.08:result='{transforms}'",
                "-frames:v", str(source_frames), "-f", "null", "-",
            ], check=True)
            stabilization = (
                f"vidstabtransform=input='{transforms}':tripod=1:optzoom=0:"
                "crop=black:interpol=bicubic,"
            )
        # End on the opening overlap, then wrap to the very next source frame.
        # A cosine dissolve preserves the footage's forward movement.
        dissolve = f"(0.5-0.5*cos(PI*T/{overlap / fps}))"
        graph = (
            f"[0:v]{prepare},{stabilization}"
            f"eq=gamma={args.gamma},"
            f"trim=end_frame={source_frames},setpts=PTS-STARTPTS,split=3[mid][tail][head];"
            f"[mid]trim=start_frame={overlap}:end_frame={frames},setpts=PTS-STARTPTS[body];"
            f"[tail]trim=start_frame={frames}:end_frame={source_frames},setpts=PTS-STARTPTS[end];"
            f"[head]trim=end_frame={overlap},setpts=PTS-STARTPTS[start];"
            f"[end][start]blend=all_expr='A*(1-{dissolve})+B*{dissolve}':shortest=1[seam];"
            "[body][seam]concat=n=2:v=1:a=0[out]"
        )
        print("Blending the footage into a forward-only loop…", flush=True)
        subprocess.run(common + [
            "-ss", str(args.start), "-i", str(args.source),
            "-filter_complex", graph, "-map", "[out]",
            "-an", "-c:v", "ffv1", "-frames:v", str(frames), str(clean_loop),
        ], check=True)

        # Match the shared static's 4-by-2-pixel snow at the final 1280x720 size.
        # Both rolling interference and line displacement are periodic at the seam.
        phase = f"2*PI*T/{seconds}"
        displacement = (
            f"1.4*sin(5*{phase})+"
            f"18*exp(-pow((mod(Y+H*2*T/{seconds},H)-H*0.45)/7,2))*sin(11*{phase})"
        )
        phosphor = ("geq=lum='lum(X,Y)':cb=128:cr=128," if args.no_scanlines else
                    "geq=lum='lum(X,Y)*(0.82+0.18*mod(Y,2))':cb=128:cr=128,")
        tracking = "null" if args.no_tracking else f"geq=lum='lum(X+{displacement},Y)'"
        graph = (
            f"[0:v]{tracking}[signal];"
            "[1:v]scale=640:360:flags=neighbor[snow];"
            f"[signal][snow]blend=all_expr='A*{args.signal}+B*{1-args.signal}':shortest=1,"
            "scale=1280:720:flags=neighbor,format=yuv420p,"
            f"{phosphor}"
            "vignette=PI/5[out]"
        )
        print(f"Rendering {seconds:g}s of monochrome CRT signal and snow…", flush=True)
        noise_width, noise_height = (640, 360) if args.no_scanlines else (320, 360)
        process = subprocess.Popen(common + [
            "-i", str(clean_loop), "-f", "rawvideo", "-pixel_format", "gray",
            "-video_size", f"{noise_width}x{noise_height}",
            "-framerate", str(fps), "-i", "pipe:0",
            "-filter_complex", graph, "-map", "[out]", "-an", "-map_metadata", "-1",
            "-c:v", "libx264", "-preset", "slow", "-crf", "26",
            "-maxrate", "3000k", "-bufsize", "6000k", "-movflags", "+faststart",
            "-frames:v", str(frames), str(movie),
        ], stdin=subprocess.PIPE)
        noise = random.Random(20261101)
        try:
            for frame in range(frames):
                grain = noise.randbytes(noise_width * noise_height)
                rows = []
                for y in range(noise_height):
                    wave = math.tau * (y / noise_height - 2 * frame / frames)
                    gain = (0.88 if args.no_tracking else
                            0.88 + 0.10 * math.sin(wave) + 0.06 * math.cos(wave * 3))
                    if not args.no_scanlines:
                        gain *= 0.94 + 0.06 * math.sin(y * 2.41)
                    table = bytes(min(255, round(
                        (6 + v * 0.16 if v < 150 else 90 + (v - 150) * 1.55) * gain
                    )) for v in range(256))
                    start = y * noise_width
                    rows.append(grain[start:start + noise_width].translate(table))
                process.stdin.write(b"".join(rows))
        finally:
            process.stdin.close()
            code = process.wait()
        if code:
            raise SystemExit(f"FFmpeg failed with exit status {code}")

    subprocess.run(common + [
        "-i", str(movie), "-frames:v", "1", "-q:v", "2", str(poster),
    ], check=True)
    print(f"Created {movie} ({movie.stat().st_size / 1024 / 1024:.2f} MiB)")
    print(f"Created {poster}")


if __name__ == "__main__":
    main()
