# Ableton Set Inspector

A private, browser-based tool for checking Ableton Live Set (`.als`) files without opening Ableton Live.

## Features

- Runs locally in the browser with no upload or server
- Drag-and-drop `.als` loading
- Native gzip decompression using `DecompressionStream`
- XML parsing with `DOMParser`
- Live version, tempo, time signature and estimated Arrangement length
- Track names, types, groups, mixer state, routing and freeze state
- Unique VST2, VST3 and Audio Unit counts
- Ableton devices, Racks and Max for Live detection
- Per-device track occurrences with frozen and unfrozen status
- Audio-file paths classified as inside or outside the Project folder
- Search, plain-text export and a dependency-focused print/PDF layout

## Run locally

The app has no build step.

1. Download or clone the folder.
2. Serve the JiKay site repository root locally so the shared logo asset resolves correctly:

```bash
python3 -m http.server 8080
```

3. Open `http://localhost:8080/tools/ableton-set-inspector/`, then drop an `.als` file onto the page.

## Deploy

Deploy this folder as part of the JiKay site so `../../assets/images/jikay_logo_2021_White.png` remains available. For a standalone deployment, copy the logo into the app folder and update its path in `index.html`.

## Browser support

A current browser with the `DecompressionStream` API is required. Current versions of Chrome, Edge, Firefox and Safari support the intended workflow.

## Important limitations

This is a tolerant structural reader, not an official Ableton file-format implementation. Ableton may alter its internal Set structure between releases. The app cannot:

- Hear or render the project
- Verify installed plug-ins or licences
- Confirm that files marked External still exist
- Interpret every proprietary plug-in state
- Guarantee that a Set will open successfully in Live
- Modify or resave an `.als` file

A report should be treated as a pre-flight inventory rather than a guarantee that a Set will open perfectly on another computer.

## Privacy

The selected file is read into the browser's memory. This build includes no upload endpoint, database or analytics.

## Files

- `index.html` — page structure
- `styles.css` — responsive interface and print layout
- `app.js` — browser state, file loading, report rendering and exports
- `assets/` — favicon, Apple touch icon and social sharing image
- `src/parser/core.js` — pure clip-context, arrangement-length and track-numbering rules
- `src/parser/xml-utils.js` — DOM traversal and XML value helpers
- `src/parser/set-parser.js` — complete Ableton XML-to-report normalisation pipeline
- `test/fixtures/` — representative synthetic Live 10, 11 and 12 XML fixtures
- `test/snapshots/` — deterministic normalized JSON snapshots

## Development

Run the automated checks with:

```bash
npm test
npm run check
```

Use `npm run lint` for ESLint, `npm run format` to apply Prettier, or `npm run format:check` to verify formatting without changing files.

## Current test coverage

Deterministic parser fixtures cover representative Live 10, 11 and 12 structures. Additional real-world Sets should be checked before expanding support for new Ableton Live versions.

## Disclaimer

Ableton and Ableton Live are trademarks of Ableton AG. This independent project is not affiliated with or endorsed by Ableton.
