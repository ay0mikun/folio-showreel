# Unspecified design states

The supplied frames cover empty and loaded desktop editors, custom dimensions, control interaction states, fill modes and selected fill appearance. The color picker follows the explicitly supplied ASCIInator reference.

No dedicated designs were supplied for mobile layouts, upload/storage errors, preset loading/failure, or export failure. Existing fallback behavior is retained rather than introducing new visible controls.

The supplied Presets.zip was not present at its stated path. The six available Figma preset images were optimized instead; a different archive still needs to be supplied if it contains additional images.

Implemented dialogue variants from 70:17912 and 76:23801: guide, rendering with progress/cancel, successful download, and gratitude. Gratitude appears once per page visit after Download/Back to editor from a successful export, or after 30 seconds of editor inactivity. Rendering, other dialogs, the color picker, and hidden tabs defer the invitation. The support button links to https://buymeamalt.com/@ayomikun.

The export action variants (73:23786 → 73:23778 → 70:17826) now morph on success: progress fills smoothly, the shared first button changes into Download, and the remaining actions unfold as the dialog resizes. Figma supplies static variants without keyframes; the requested morph uses a 480 ms soft easing and is skipped for reduced motion. It is driven only by real successful export completion.
