# 00000 media

The listening page is at `/00000/`. It currently streams the **00000 SoundCloud playlist**.
This folder holds its configuration, optional song videos and the shared CRT background.

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

These are example filenames. Omit a song from this object to use CRT static.
The numeric SoundCloud track ID is also accepted as a key. A failed video automatically
falls back to static without interrupting its song.

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
