# Route Studio — PWA v1

A first working web prototype for converting GPS coordinate tracks into clean vector artwork.

## Included

- iOS Maps-inspired full-screen visual workspace
- Bottom-sheet date/time and styling controls
- Responsive mobile + desktop layout
- Sample coordinate track
- Web Mercator projection
- Consecutive-point filtering below 10 meters
- Douglas–Peucker simplification
- Optional quadratic/Bezier-style smoothing
- Stroke thickness + color
- Start/end markers
- Square 1:1, Wide 3:1, Tall 4:5 output ratios
- Automatic 85% fit and centering
- Rotation and zoom preview
- Optional caption
- Transparent SVG export with tight viewBox
- PWA manifest

## Run locally

1. Install Node.js 20+.
2. In this folder:

```bash
npm install
npm run dev
```

3. Open the local URL Vite displays.

For a production check:

```bash
npm run build
npm run preview
```

## GitHub upload

Upload the **contents of this folder** to the root of `route-studio`, not the outer ZIP itself.

## Location-data note

Browsers cannot read an iPhone's historical location database. This PWA intentionally separates coordinate processing from the future location-data provider. The sample route exercises the rendering/editor/export pipeline now. Later, an approved import/provider can feed `GPSPoint[]` data into the same pipeline, and the native Swift version can use its own permission-aware location service.

## Privacy direction

Real location tracks should be processed locally by default. Avoid transmitting or persisting raw GPS history unless a feature explicitly requires it. If backend storage is later added: encrypt in transit and at rest, minimize retention, scope authentication per user, provide deletion/export controls, and never log raw coordinates in analytics.
