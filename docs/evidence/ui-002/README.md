# UI-002 visual review evidence

These screenshots contain synthetic component content only. They were captured from a temporary local review route on 2026-08-10; that route was removed before commit. The evidence is documentation-only and is not imported by the Web runtime.

## Captures

- `wide-1440.png`: desktop primitive coverage at a 1440 px viewport.
- `dialog-1440.png`: modal focus and overlay review at a 1440 px viewport.
- `narrow-top-390.png`: narrow reflow and control review at a 390 px viewport.
- `narrow-drawer-390.png`: narrow drawer bounds and focus review at a 390 px viewport.

## Observed evidence

- No document-level horizontal overflow at 1440 px or 390 px.
- Buttons, select triggers, and pagination controls measured at least 44 CSS pixels in height; the high-risk action size is 48 CSS pixels.
- The native table remained inside its 358 px narrow scroll region without hiding values.
- Dialog and drawer focus entered and remained inside their modal surfaces, Escape dismissed them, and focus returned to the trigger.
- The narrow drawer remained within the 390 px viewport and displayed its close-control focus indicator.
- Comfortable, compact, and action density examples used the generated Noma token and component CSS layers.

## Human-review boundary

These captures support, but do not replace, independent keyboard, screen-reader, zoom/reflow, reduced-motion, and forced-colours review on real browsers and assistive technologies.
