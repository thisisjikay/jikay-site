# Ableton Set Inspector

A private, browser-based MVP for inspecting Ableton Live Set (`.als`) files without opening Ableton Live.

## Features

- Runs locally in the browser with no upload or server
- Drag-and-drop `.als` loading
- Native gzip decompression using `DecompressionStream`
- XML parsing with `DOMParser`
- Live version, tempo, time signature, scenes and locators
- Track names, types, groups, mixer state, routing and freeze state
- Ableton devices, racks, Max for Live, VST2, VST3 and Audio Unit detection
- Internal audio and MIDI clip analysis for durations, media references and track counts
- Referenced sample paths and absolute-only path warnings
- External routing notices
- Compact and full-detail modes
- Search, text export and print/PDF layout

## Run locally

The app has no build step.

1. Download or clone the folder.
2. Open `index.html` directly, or serve the folder locally:

```bash
python3 -m http.server 8080
```

3. If serving locally, open `http://localhost:8080`, then drop an `.als` file onto the page.

## Deploy to GitHub Pages

1. Create a GitHub repository.
2. Add the files in this folder to the repository root.
3. Open **Settings → Pages**.
4. Set the source to **Deploy from a branch**.
5. Select the `main` branch and `/ (root)`.
6. Save.

## Browser support

A current browser with the `DecompressionStream` API is required. Current versions of Chrome, Edge, Firefox and Safari support the intended workflow.

## Important limitations

This is a tolerant structural parser, not an official Ableton file-format implementation. Ableton may alter XML structures between releases. The app cannot:

- Hear or render the project
- Verify installed plug-ins or licences
- Confirm that external paths exist
- Interpret every proprietary plug-in state
- Guarantee that a Set will open successfully in Live
- Modify or resave an `.als` file

A report should be treated as a pre-flight inventory rather than a definitive compatibility test.

## Privacy

The selected file is read into the browser's memory. This build includes no upload endpoint, database or analytics.

## Files

- `index.html` — page structure
- `styles.css` — responsive interface and print layout
- `app.js` — browser state, file loading, report rendering and exports
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

## Development priorities

1. Validate the synthetic Live 10, 11 and 12 coverage against anonymised real Sets.
2. Add parser fixtures for additional device, automation and clip edge cases.
3. Improve rack-chain and group hierarchy representation.
4. Add whole-project folder scanning.
5. Add Set-to-Set comparison.

## Disclaimer

Ableton and Ableton Live are trademarks of Ableton AG. This independent project is not affiliated with or endorsed by Ableton.
