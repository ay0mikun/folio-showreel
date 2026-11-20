# Folio — Showreel studio

A browser-local app for turning up to 12 images into a sequential showreel, with a dark preview workspace, stacked controls, and self-hosted Geist typography.

Run `python3 -m http.server 8766 --directory dist` from this directory and open http://localhost:8766.

- PNG, JPG and WebP imports in any aspect ratio. Images are normalized on import to 1920 × 1080, preserving proportions with letterboxing as needed.
- Default 1.5 seconds per screen. Edit per-screen duration (0.1–10 seconds) or total duration; time is distributed evenly across the screens and includes transitions.
- Editable crossfade length (0.02–3 seconds, capped at 80% of a screen slot). Soft uses quintic easing; Stiff dissolves directly through the middle 20% of the transition window.
- New uploads sort naturally by filename (Screen 2 before Screen 10). Drag rows with a mouse, drag the grip on a touch device, use keyboard arrows on the grip, or use the existing move buttons. Dragging saves a custom order; Sort by name restores filename order. New batches append in natural order once a custom order is established.
- Reorder and remove screens; preview, scrub, and save automatically with IndexedDB. Existing saved projects remain compatible.
- Full HD 1920 × 1080 exports: silent 30 fps video (MP4 preferred, WebM fallback) or a looping animated GIF.
- GIF dissolves are sampled at 20 fps with 256 colors per frame. Still holds use GIF frame delays instead of duplicated frames. Encoding happens one frame at a time in a Web Worker, keeping the editor responsive and avoiding storage of all raw frames at once. GIF timing rounds to the nearest hundredth of a second. A 256 MB encoded-output guard reports an actionable error for unusually large animations.
- Video recording runs in real time and stops if the tab is hidden. GIF encoding is deterministic and does not depend on real-time playback. Both exports support cancellation.
- Screens, settings, and generated files remain in the browser.

## GitHub and Vercel

The app has no runtime server or secrets. `vercel.json` serves the `dist/` folder directly, with no build or install step. Import the GitHub repository into Vercel and use the default project settings. All uploads and saved showreels remain local to the visitor’s browser. Saved projects are scoped to the domain; projects from another hostname are not automatically transferred.

## Checks

Run `npm test` and `node --check dist/app.js`.

## Bundled dependencies

`dist/vendor/gifenc.mjs` is gifenc 1.0.3 (MIT), with its license alongside it. `dist/vendor/geist-latin.woff2` is the Geist variable font, bundled from @fontsource-variable/geist with its OFL license. No third-party CDN is needed at runtime.
