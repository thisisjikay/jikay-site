# Studio Remote — maxforlive.com image

Upload `studio-remote-maxforlive.gif`. One file serves the device page and all thumbnails. `poster.png` and `crop-previews.png` are review artifacts, not separate uploads.

## Findings checked on 15 September 2026

- Homepage and library cards use `object-fit: cover`, `object-position: 50% 50%`, and a 300px image height. The width changes with the responsive grid.
- Measured card sizes: 369×300 at the default desktop viewport; 310×300 at 1024px; 361×300 at 390px; 621×300 at 650px; 300×300 at 320px. A conservative 642×300 wide-mobile preview adds margin near the grid breakpoint.
- The inspected device page uses `object-fit: contain` and preserves the full source aspect ratio. The screenshot also links to the original image.
- Current listings serve animated GIF screenshot URLs, including Arrangement Finisher and Better Channel EQ.
- No numerical upload-size limit or official recommended screenshot dimensions were established from the public help page. 1080×810 is our design choice, not an official requirement.

Sources: https://maxforlive.com/ ; https://maxforlive.com/library/index.php ; https://maxforlive.com/library/device/16287/arrangement-finisher-song-map-for-live-12 ; https://maxforlive.com/help.php

## Applied recommendations

- A 4:3 source balances full-page presentation and the changing card aspect ratios.
- Keep both products, the bar count and the connection animation in the central area. Let only the photographic background extend into the crop regions.
- Preserve an immediately useful first frame for static previews and slow connections.
- Animate only the counter and connection pulse; a stationary background reduces distraction and GIF size.
- Use an opaque background so the result is consistent on light and dark page surroundings.
- Reuse the existing 124 BPM counter frames and delays. Split each counter frame into two line-animation frames, following the earlier GIF's timing and phone-to-device pulse direction. Four bars loop in approximately 7.74 seconds.

## Build

`node output/maxforlive/build.cjs` from the repository root. Uses the existing animated phone asset, the approved header's rounded Max panel, and a background plate prepared with built-in imagegen. The pulse is adapted from the earlier landscape GIF build script to the curved connection path.

`verification.json` records the final dimensions, frame count, duration, loop setting and size. Crop previews use the same image and centred cover behavior; they are local simulations of the measured site rules, not a live upload test.
