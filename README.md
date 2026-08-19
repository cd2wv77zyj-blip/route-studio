# Route Studio — PWA v1 (Flat Repository Build)

This build is intentionally flat so every project file can be uploaded from iOS Files into the root of a GitHub repository without preserving folders.

## Run locally

```bash
npm install
npm run dev
```

## Files

`App.tsx`, `main.tsx`, `styles.css`, `types.ts`, `sample.ts`, `geo.ts`, `svg.ts`, and `manifest.webmanifest` intentionally live at the repository root.

The app includes the iOS Maps-inspired workspace, Web Mercator projection, 10-meter point filtering, Douglas–Peucker simplification, optional path smoothing, styling controls, merchandise aspect ratios, auto-fit/centering, caption support, and transparent SVG export.

## Location-data note

The browser cannot directly read an iPhone's historical device-location database. PWA v1 therefore uses sample coordinate data while keeping the rendering pipeline ready for a future approved location-data adapter and native Swift implementation.


## v1.1
- Draggable bottom sheet with collapsed/medium/expanded snap points
- Live visual updates; preview status/button removed
- Map-only pinch zoom; page pinch zoom disabled
- Portrait orientation requested in PWA manifest with landscape fallback screen
- Functional app menu
- Functional visual map-layer chooser (Standard / Satellite / Hybrid)
- Route rotation and zoom are applied to the map visualization as one geographic scene
- Refined iOS-inspired glass controls and grouped settings

## v1.2
- Full map multi-touch: one-finger pan, pinch zoom, and two-finger rotate
- Fixed dotted print/SVG area stays in place while map + route move behind it
- Removed the explicit Rotate button
- Export now uses the route's current pan/zoom/rotation state
- Added Reset View for quickly returning to centered default framing

## v1.3
- Fixed the route clipping bug: route remains visible outside the dotted print border while composing
- Decoupled geographic scene from the print-area overlay
- Changing 1:1 / 3:1 / 4:5 no longer refits or resets the route
- Added Freeform print area
- Freeform frame can be resized from its lower-right corner
- Route/map gestures continue behind the print frame

## v1.4
- Fixed geographic registration bug: route and map now live inside the exact same transformed scene
- Pan, pinch zoom, and rotation affect map + route as one unit
- Print frame remains independent as a crop/composition guide
