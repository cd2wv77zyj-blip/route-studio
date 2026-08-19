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
