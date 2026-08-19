# Route Studio — PWA v1.5

A mobile-first route-to-vector editor with a full-map composition canvas.

## v1.5 changes

- Full-map main view replaces the default swipe-up form panel
- Exact print-area aspect ratios: 1:1, 3:1, and 4:5
- Freeform print area remains independently resizable
- Map and route stay geographically locked together during pan, pinch zoom, and rotation
- Dotted SVG area remains an independent composition/crop guide
- Flat single vector route line retained throughout the app
- Steel Blue (`#3B6EA8`) is now the default accent and route color
- Brush Route / Steel Blue app icon included as square 1024×1024 source artwork plus PWA sizes
- Route/time controls moved into a dedicated modal instead of occupying the map
- Style page moved into a dedicated Apple-inspired glass panel
- Settings menu now carries the same Steel Blue / cream visual system
- Map-style layer selector retained
- Live visual updates remain enabled
- Portrait PWA orientation retained
- SVG export retained

## Development

```bash
npm install
npm run dev
```

The browser prototype still uses sample coordinates. A PWA cannot directly read iPhone historical location data; the location-data provider will be replaced later without changing the route-processing/editor architecture.


## iPhone GitHub upload

This archive is **truly flat**. There are no folders inside it.

Upload every file from the unzipped archive directly to the root of the GitHub repository. The app icon PNG files (`app-icon-192.png`, `app-icon-512.png`, and `app-icon-1024.png`) intentionally live at the repository root for iPhone/Safari compatibility.
