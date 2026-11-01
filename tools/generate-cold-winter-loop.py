#!/usr/bin/env python3
"""Recreate Cold Winter using the shared 00000 video generator and its defaults."""

from pathlib import Path
import runpy


if __name__ == "__main__":
    runpy.run_path(str(Path(__file__).with_name("generate-00000-video.py")), run_name="__main__")
