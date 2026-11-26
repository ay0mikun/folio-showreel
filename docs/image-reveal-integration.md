# Native image reveal and tactile controls

The requested EasyUI component was inspected before changes. Reelo is a buildless vanilla JavaScript/ES-module app served from `dist`, managed with npm. It has no React, TypeScript configuration, Tailwind, path aliases, shadcn configuration, UI providers, or animation-library dependencies. Existing motion uses CSS and the Web Animations API.

EasyUI's source uses React, Framer Motion, Lucide React, TSX, and Tailwind classes. Its supplied `/r/ai-image-reveal.json` URL returned 404; the official GitHub source and metadata were available. The user approved a native-canvas adaptation rather than changing the framework. The shadcn installer was therefore not run. No dependencies were installed, and no project configuration was changed.

## Source and files

- Original: https://github.com/Surajmaurya1/easyui/blob/main/src/components/ui/AIImageReveal.tsx
- `dist/vendor/easyui-particles.mjs`: adapted typed-array particle engine and cell-color sampling, with TypeScript types removed.
- `dist/vendor/easyui-LICENSE.txt`: upstream MIT license and attribution.
- `dist/image-reveal.mjs`: native controller, progress mapping, refinement, visibility/reduced-motion handling, and lifecycle cleanup.
- `dist/tactile-ranges.mjs`: visual thumb press/step feedback and subtle paired-value feedback. Native pointer/keyboard stepping is preserved; no audio, vibration, or haptic APIs are used.
- `dist/app.js`, `dist/index.html`, `dist/style.css`: export integration, decorative canvas, lazy loading, and scoped styling.
- `tests/image-reveal.test.mjs`: deterministic landing, color sampling, real completion gating, and progress mapping checks.

## Behavior and performance

The particle target is sampled from the user's locally rendered composition, never a remote example image. Progress comes from the same native progress element as the Cancel button. Encoding reaching 100% alone cannot resolve the effect: successful completion must also be signaled. Cancellation closes and stops it; new exports restart it. The decoration never changes downloaded output.

The roughly 11 KB particle/controller code is lazy-loaded on export intent. The decorative canvas is capped at 360×240, updates at most 30 times per second, pauses in hidden tabs and when gathering has caught up with stalled progress, and frees its working buffers on stop. Reduced motion keeps the regular static preview. The final sharp resolve takes at most 220 ms and doesn't delay downloading.

## Verification

- `npm test`: 34 tests passed.
- `node --check` on every application/vendor JavaScript module: passed.
- Local module and HTML asset-reference audit: passed.
- `git diff --check`: passed.
- `npm run typecheck --if-present`, `npm run lint --if-present`, and `npm run build --if-present`: no corresponding scripts are configured. This static JavaScript project has no TypeScript compiler or bundler build step; these are not reported as completed type/lint/build checks.
- Browser: visual step feedback, early particle cloud, completed MP4, completed GIF, sharp-image cleanup, cancellation/restart, and console-error checks passed.

No manual setup steps remain. This is a native Reelo integration rather than a drop-in implementation of the original React props/ref API.
