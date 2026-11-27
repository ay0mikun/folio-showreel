# Reelo Figma asset mapping

SVG files retain the original downloaded root dimensions. Uploaded source imagery remains dynamic. The supplied square PNG is reserved for favicon and saved-app branding.

| Asset | Native size | UI slot |
| --- | --- | --- |
| `35-547-imgFrame2.svg` | 16 × 16 | Drag grip |
| `35-547-imgFrame4.svg` | 12 × 12 | Clear all |
| `4-8-imgFrame1.svg` | 16 × 16 | Revert all settings |
| `4-8-imgFrame2.svg` | 16 × 16 | Guide |
| `4-8-imgFrame3.svg` | 14 × 14 | Composition name pencil |
| `4-8-imgFrame4.svg` | 20 × 20 | Source upload |
| `4-8-imgFrame5.svg` | 16 × 16 | Timing and transition reset |
| `4-8-imgFrame6.svg` | 16 × 16 | Export selector chevron |
| `4-8-imgFrame7.svg` | 16 × 16 | Export icon |
| `4-8-imgReelo.svg` | 78.2776 × 20 | Header wordmark |
| `4-8-imgVector2.svg` | 48.098 × 62.8974 | Empty upload illustration layer |
| `4-8-imgVector3.svg` | 16.4936 × 15.8406 | Empty upload illustration layer |
| `4-8-imgVector4.svg` | 22.6918 × 22.145 | Empty upload illustration layer |
| `4-8-imgVector5.svg` | 22.6918 × 22.145 | Empty upload illustration layer |
| `4-8-imgVector6.svg` | 16.4936 × 15.8406 | Empty upload illustration layer |
| `68-7032-imgFrame.svg` | 20 × 20 | Transparent fill |
| `68-7032-imgFrame1.svg` | 20 × 20 | Upload background |
| `68-7032-imgFrame2.svg` | 20 × 20 | Open custom color picker |
| `play.svg` | 16 × 16 | Play |
| `remove-hover.svg` | 16 × 16 | Remove hover (67:149) |
| `remove.svg` | 16 × 16 | Remove default (67:149) |
| `restart.svg` | 16 × 16 | Restart |

The dotted artboard is a code-native 20 px tile containing the supplied 4 × 4 px, 1 px-radius dot geometry. It is preview-only, so it never becomes part of transparent exports.

Preset images come from Figma component 68:7032. The user authorized optimizing these assets. Full-resolution dimensions are preserved; 108 px thumbnails are only used in the 36 px selector slots.

## Dialogue variants (70:17912, 76:23801)
- `guide-app-icon.svg`: exact guide icon, native 63×63 inside the 60×60 Figma slot.
- `export-loader.svg`: 18×18 rendering indicator.
- `export-cancel.svg`: 16×16 cancel icon.
- `share-x.svg`: 13×13 asset centered in the 16×16 share slot.
- `support-avatar.webp`: supplied portrait, optimized to 180×180 (3× the 60 px slot), with the same centered crop.
- Export imagery and filename are generated from the user's composition, replacing the example content in Figma.

## Toasts (81:23937)
- `toast-check.svg`: exact 16×16 green success icon.
- `toast-info.svg`: exact 16×16 orange error/info icon.
- `toast-close.svg`: exact 16×16 dismiss icon.
- Toasts use a minimum 300 px card, 12 px corners, 1.5 px top border, 10 px horizontal/14 px vertical padding, 6 px content gap, and the Figma shadow. Cards grow to keep messages on one line, with 60 px before the dismiss icon. Messages exceeding the viewport are truncated visually.
