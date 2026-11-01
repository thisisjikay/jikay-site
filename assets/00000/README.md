# 00000 media

The listening page is at `/00000/`. It currently streams the **00000 SoundCloud playlist**.
This folder holds its configuration, optional song videos and the shared CRT background.

## Title style experiment

`"titleStyle": "filename"` in `playlist.json` displays lowercase titles with underscores
and an `.mp3` suffix: `Lost` → `lost.mp3`, `Cold Winter` → `cold_winter.mp3`.
This only changes how titles appear on the page and browser tab; SoundCloud titles,
audio files and video mappings keep their original names.

To revert, change this one setting to `"titleStyle": "original"` and refresh the page.
Removing the setting also restores the original titles.

## Update the SoundCloud playlist

Add, remove or reorder songs in the same SoundCloud playlist. The page reads its current
track list and titles on each visit; you do not need to upload audio files here or edit
the website for those changes. A random song starts each visit, then playback follows
SoundCloud's playlist order and wraps around.

The `soundcloud` section in `playlist.json` contains the playlist ID, its secret-link token
and its share URL. The supported SoundCloud widget handles playback without an API key.
If you reset the private share link, update `secretToken` and `playlistUrl` to match.
If you switch to another playlist, also update `playlistId` from its official embed code.
SoundCloud remains the streaming provider and requires an internet connection.
The page automatically requests playback on load. Browsers that block audible autoplay still
require pressing the centre play button. Open the HTTP preview below rather than the
HTML file directly; browser security blocks the module and playlist loading over `file://`.

## Give a SoundCloud song its own video

Copy a clip into `video/`, then add it to `soundcloud.videos` using the song's SoundCloud
URL name (the last part of its public URL, before any private `/s-…` token):

```json
"videos": {
  "lost": "video/lost-loop.mp4",
  "strange-places": "video/strange-places-loop.mp4"
}
```

This shows the mapping format. Omit a song from this object to use CRT static.
The numeric SoundCloud track ID is also accepted as a key. A failed video automatically
falls back to static without interrupting its song.

Cold Winter uses `video/cold-winter-loop.mp4`: a silent 21.5-second, 1280 × 720 loop
made from the supplied driving footage. A two-second cosine dissolve joins the end
back to the beginning while the road keeps moving forward. The monochrome picture
is mixed at 36% signal / 64% television snow, with scanlines, rolling interference,
horizontal tracking displacement and the shared static's vignette and grain scale.
Effects are baked into the MP4, so playback needs no canvas or extra browser effects.
The matching still is `video/cold-winter-poster.jpg`; reduced motion continues to use
the listening room's shared static poster.

To recreate it from the original 23.7-second source (the first 23.5 seconds are used):

```sh
python3 tools/generate-cold-winter-loop.py "/path/to/Cold Winter Placeholder.mp4"
```

Pass `--ffmpeg /path/to/ffmpeg` for a standalone binary. Adjust `--signal 0.36` to
change how much driving footage shows through. The source's audio is discarded.

Four uses `video/four-loop.mp4?v=2`: a silent 25-second, 1280 × 720 monochrome loop
from the supplied star-field and planet clip. It uses the same two-second dissolve,
scanlines, television snow and vignette as Cold Winter, with picture wobble,
horizontal tearing and rolling tracking bars disabled. The darker
footage uses 64% signal / 36% snow and a gamma lift of 1.35 to retain the stars and
the planet's edge. Its matching still is `video/four-poster.jpg`. The mapping uses
Four's SoundCloud track ID (`2430220608`) so it also works before its title and URL
name have finished loading from SoundCloud.

To recreate Four from the supplied 27.42-second source:

```sh
python3 tools/generate-00000-video.py "/path/to/13442864_1920_1080_60fps.mp4" \
  --name four --duration 27 --signal 0.64 --gamma 1.35 --no-tracking
```

The shared generator also accepts `--ffmpeg /path/to/ffmpeg`. Cold Winter's original
command remains available and uses the shared generator's original default settings.

Lost uses `video/lost-loop.mp4?v=3`: a silent five-second, 1280 × 720 monochrome loop
from the steady aircraft-window section of `MVI 1419.mp4` (source time 12–19.5s).
The framing is stabilized before a 2.5-second cosine dissolve joins the ends.
Fixed scanlines, television snow and the vignette retain the VHS treatment.
Picture wobble, horizontal tearing and rolling tracking bars are disabled.
The mix uses 64% signal and gamma 1.35.
The version query refreshes previously cached footage. Its SoundCloud track ID is
`2430205179`; the matching still is `video/lost-poster.jpg`.

```sh
python3 tools/generate-00000-video.py "/path/to/MVI 1419.mp4" \
  --name lost --start 12 --duration 7.5 --overlap 2.5 --signal 0.64 --gamma 1.35 \
  --no-tracking --stabilize
```

Strange Places uses `video/strange-places-loop.mp4`: a silent 5.25-second,
1280 × 720 monochrome loop from the misty waterfront footage in `1101 (1).mp4`.
The framing is stabilized and the ends use a two-second cosine dissolve.
Scanlines, television snow and a vignette match the other backgrounds; tracking
wobble, tearing and rolling bars are disabled. The mix uses 64% signal and gamma 1.35.
Its SoundCloud track ID is `2430206916`; the still is `video/strange-places-poster.jpg`.

```sh
python3 tools/generate-00000-video.py "/path/to/1101 (1).mp4" \
  --name strange-places --duration 7.25 --signal 0.64 --gamma 1.35 \
  --no-tracking --stabilize
```

Get 2 U uses `video/get-2-u-loop.mp4`: a silent 9.75-second, 1280 × 720 monochrome
loop from the party footage in `1101 (1)(1).mp4`. A two-second cosine dissolve
joins the ends. Scanlines, television snow and a vignette match the listening room;
tracking wobble, tearing and rolling bars are disabled. The brighter footage uses
45% signal / 55% snow and gamma 1. The source is cropped to fill 16:9 without
stretching; the original dancing and camera movement are preserved.
Its SoundCloud track ID is `2430218802`; the still is `video/get-2-u-poster.jpg`.

```sh
python3 tools/generate-00000-video.py "/path/to/1101 (1)(1).mp4" \
  --name get-2-u --duration 11.75 --signal 0.45 --gamma 1 --no-tracking
```

Last Of Us uses `video/last-of-us-loop.mp4`: a silent 4.5-second, 1280 × 720
monochrome loop from `Strumble Head Lighthouse at night.mp4`. The lighthouse beam
peaks 2.25 seconds apart; the loop spans two full beam cycles, with a 0.25-second
cosine dissolve across the join. Scanlines, television snow and a vignette match
the other backgrounds, without tracking wobble, tearing or rolling bars.
The mix uses 64% signal and gamma 1.35. Its SoundCloud track ID is `2430214545`;
the matching still is `video/last-of-us-poster.jpg`.

```sh
python3 tools/generate-00000-video.py "/path/to/Strumble Head Lighthouse at night.mp4" \
  --name last-of-us --duration 4.75 --overlap 0.25 --signal 0.64 --gamma 1.35 \
  --no-tracking
```

## Use local audio files instead

Remove the `soundcloud` section from `playlist.json` to use the local `tracks` list instead.
An empty local list displays “No tracks available”.

1. Copy your music into `audio/`. MP3 is recommended for broad browser support.
2. Open `playlist.json` and add an entry to `tracks` for each song:

```json
{
  "fallbackVideo": "static.mp4",
  "tracks": [
    {
      "title": "Your first song",
      "file": "audio/first-song.mp3"
    },
    {
      "title": "Your second song",
      "file": "audio/second-song.mp3",
      "video": "video/second-song-loop.mp4"
    }
  ]
}
```

These are examples, not included songs. Replace the titles and filenames with your own.
Paths are relative to this folder, including the `audio/` or `video/` prefix. Filenames are
case-sensitive on the live site. Spaces work, but short filenames with hyphens are easiest.
Use double quotes, commas between entries, and no comma after the final entry.

The first song is selected randomly on each visit. After that, songs play in the order
you put them in the list, returning to the beginning after the last song.

## Add a song-specific video

Copy a clip into `video/`, then add `"video": "video/your-loop.mp4"` to that song's entry.
Use MP4 with H.264 video for broad browser support. Video sound is always muted;
the separate music file is what listeners hear. Clips loop independently of song length.
Landscape footage is cropped to fill each screen, so keep important details near the centre.

Omit `video` to use the original CRT static loop. A video that fails to load also falls
back to static without interrupting the song. Play/pause controls both music and video.
Reduced-motion visitors see `static-poster.jpg` instead of moving footage.

## Change or remove media

- **Rename a displayed title:** edit `title`; the audio filename can stay the same.
- **Replace a song or video:** copy the new file into its folder and update its playlist path.
  A new filename helps listeners avoid cached older versions.
- **Change order:** move whole song entries up or down in `tracks`.
- **Remove a song:** remove its entry, then optionally remove its unused files.
- **Remove a song's video:** remove only that entry's `video` property to restore static.
- **Change the shared loop:** replace `static.mp4` or update `fallbackVideo`, and update
  `static-poster.jpg` to match.

Publish the changed files using the site's normal GitHub publishing process.
There is no build step or API key required. Local-file playback also works without
SoundCloud. Only the current background video is loaded, not the whole video collection.

## Local preview

From the repository root, run:

```sh
python3 -m http.server 4173
```

Visit `http://localhost:4173/00000/`. Use a local web server rather than opening the HTML
directly, because the player loads the playlist over HTTP. Browser autoplay rules may
require pressing play on the first visit.

## Recreate the static

The included six-second 1280 × 720 CRT loop is original, silent and designed to loop
without a visible cut. The poster is its first frame. To regenerate both, install
FFmpeg, then run from the repository root:

```sh
python3 tools/generate-00000-static.py
```

For a standalone FFmpeg binary, pass `--ffmpeg /path/to/ffmpeg`.
The script uses Python's standard library, a fixed random seed and H.264 encoding.

## Font

The page serves VT323 locally from `assets/fonts/VT323-Regular.ttf`.
Its SIL Open Font License is included alongside the font.
