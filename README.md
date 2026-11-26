# Folio — Showreel studio

A browser-local app for turning up to 12 images into a sequential showreel, with a dark preview workspace, a Figma-matched inspector, self-hosted Inter and Geist Mono typography, and the supplied Folio app mark.

Run `python3 -m http.server 8766 --directory dist` from this directory and open http://localhost:8766.

- PNG, JPG, WebP and SVG imports keep their original dimensions and transparency. The default canvas matches a selected source, and stays pinned to that source when screens are reordered. Enter a custom integer width and height, or use Match source to restore native sizing. Sources fit without cropping or stretching.
- Default 0.6 seconds per screen. Edit per-screen duration (0.1–10 seconds) or total duration; time is distributed evenly across the screens and includes transitions.
- Editable crossfade length (0.02–3 seconds, capped at 80% of a screen slot). Soft uses quintic easing; Stiff dissolves directly through the middle 20% of the transition window.
- New uploads sort naturally by filename (Screen 2 before Screen 10). Drag rows with a mouse, drag the grip on a touch device, use keyboard arrows on the grip, or use the existing move buttons. Dragging saves a custom order; Sort by name restores filename order. New batches append in natural order once a custom order is established.
- Reorder and remove screens; preview, scrub, and save automatically with IndexedDB. Existing saved projects remain compatible.
- Frame-ratio presets plus original-size or custom-size exports: silent 30 fps video (MP4 preferred, WebM fallback) looping GIF, or PNG of the current preview frame. Odd video dimensions use WebM to preserve the exact requested dimensions. Canvas limits are 8192 px per side and 32 megapixels.
- Backgrounds: #fefefe (default), #0e0e0e, any custom solid color, six gradients, a user-uploaded image scaled to cover, or None. Padding and rounded source corners are shared by preview and all exports. Both default to zero so original-size exports remain edge-to-edge. None supports transparent GIF and PNG export and switches video to GIF; the current video path does not preserve alpha. GIF uses one-bit transparency and frame disposal that clears the previous image. Uploaded background images are composited over #fefefe.
- Composition names, padding, corner radius, background choices, uploaded backgrounds, native sources, and custom dimensions save on the device. Earlier projects still load; screens flattened by older releases must be re-uploaded to restore original dimensions and alpha.
- GIF dissolves are sampled at 20 fps with up to 256 colors per frame. Transparent GIFs reserve one palette entry for transparency. Still holds use GIF frame delays instead of duplicated frames. Encoding happens one frame at a time in a Web Worker, keeping the editor responsive and avoiding storage of all raw frames at once. GIF timing rounds to the nearest hundredth of a second. A 256 MB encoded-output guard reports an actionable error for unusually large animations.
- Video recording runs in real time and stops if the tab is hidden. GIF encoding is deterministic and does not depend on real-time playback. Both exports support cancellation.
- Screens, settings, and generated files remain in the browser.

## GitHub and Vercel

The app has no runtime server or secrets. `vercel.json` serves the `dist/` folder directly, with no build or install step. Import the GitHub repository into Vercel and use the default project settings. All uploads and saved showreels remain local to the visitor’s browser. Saved projects are scoped to the domain; projects from another hostname are not automatically transferred.

## Checks

Run `npm test` and `node --check dist/app.js`.

## Bundled dependencies

`dist/vendor/gifenc.mjs` is gifenc 1.0.3 (MIT), with its license alongside it. Inter and Geist Mono variable fonts are bundled from Fontsource, each with its OFL license. Figma SVG assets are bundled locally, and the user-provided app icon is used for the header and favicon. No third-party CDN is needed at runtime.
