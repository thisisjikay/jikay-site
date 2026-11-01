---
version: 1
slug: "00000-index-html"
primary_target: "00000/index.html"
related_targets: ["00000/styles.css","00000/player.js","00000/soundcloud.js","00000/title-fit.js"]
---

# 00000 listening room

Mode: Experience. Audience: listeners exploring music released under the user's 00000 alias.
Primary target: `00000/index.html`; related styles and player script stay within this route.

The user approved a single full-viewport composition: original monochrome CRT video,
centred white CRT title, three white circular transport controls bottom centre, and a
small top-left back link. Use VT323 lettering and a restrained white phosphor glow.
Keep track titles on one line. Measure and shrink long titles to fit after title updates,
font loading and viewport changes; retain the CSS size for shorter titles. Exceptionally
long names stop shrinking at 1rem and use ellipsis with their full text still accessible.
The approved preview is the top CRT-text variant at
`/Users/hotdamnstudio/.codex/generated_images/01a1967b-1002-77f1-b4b9-407aec4cd47b/exec-88e8a2d3-2bb3-4f66-8453-6a15f810aebe.png`.
This route deliberately uses the 00000 CRT identity, preserving the rest of the site.

Choose a random initial song, then play ordered tracks with wraparound. Pausing freezes
music and video together. Browser-blocked autoplay has a one-tap play fallback.
Songs can specify their own muted looping videos; missing or failed clips use shared
CRT static without interrupting audio. Reduced motion uses a still poster instead.

Media lives in `assets/00000/`, with one hand-edited configuration. The user subsequently
supplied a private 00000 SoundCloud playlist, now the active audio source. Use the official
Widget API to fetch titles/order and control playback. The user explicitly removed the
top-right SoundCloud link and requested autoplay on load. Enable widget autoplay and
preserve start intent when selecting a song; retain the play fallback for browser policy.
Local-file playback remains available by removing the soundcloud config.
Optional clips map to SoundCloud song permalinks or IDs. The original six-second static loop,
matching poster and reproducible generation script are included. No invented tracks,
progress bar or visible playlist.

Verify real browser playback, keyboard controls, desktop/mobile/landscape layout,
long titles, rapid switching, failed audio/video, reduced motion and empty playlists.
