# Verification Plan - Cap Case Restoration

This plan verifies the fixes for Button text and Selection Handle alignment.

## Issues Addressed
1. **Selection Handles at Origin**: Caused by `index.jsx` using `node.x` instead of `node.X` in the selection/resize logic.
2. **Button Text Not Displaying**: Caused by missing `"Text"` default in `button.json` and lack of fallback in the renderer.

## Core Component Fixes
- [x] **index.jsx**: Updated multi-select bounding box and single-select handle coordinates to use capitalized keys.
- [x] **button.json**: Restored `"Text": "\"Button\""` to defaults.
- [x] **ButtonRenderer.jsx**: Added `|| 'Button'` fallback and updated `PropTypes`.
- [x] **All Renderers**: Audited for `PropTypes` and internal property access.

## Verification Steps
1. **Drag & Resize**: Drag a component and verify handles follow it correctly, rather than staying at (0,0).
2. **New Button**: Add a new button; verify it has "Button" text by default.
3. **Existing Button**: Verify existing buttons (if any) display fallback text.
4. **Multi-Select**: select multiple components; verify the blue bounding box encapsulates them correctly.
