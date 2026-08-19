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


## v1.6
- Refined full-map UI to match the approved mockup direction more closely
- Removed top-left hamburger menu
- Bottom navigation is now Route / Style / History / Settings with equal-weight icons
- Route uses a minimalist route-line icon instead of a calendar
- Style no longer uses a large blue floating circle
- Export moved to a standalone icon bubble beside the print-size presets
- Removed the “SVG Area” label
- Added History page for previously worked routes
- Route and Style bottom sheets can be dragged downward to dismiss, in addition to the X button
- Map/route minimum zoom reduced substantially
- Route geometry now renders in a fixed square coordinate scene to prevent aspect-ratio distortion
- Added Apple touch icon reference and root-level icon paths
- Settings focuses on app-wide defaults, map/display, and data/privacy rather than per-route styling


## v1.6.1 hotfix
- Replaced unsupported Lucide `Gear` import with supported `Settings` icon so Vercel can build successfully.


## v1.7
- Selected minimalist one-line Route Studio logo direction in the header
- Steel Blue #3 remains the primary brand color (`#3B6EA8`)
- Settings now supports editable Units, Default Route Style, Default Print Area, Map Style, and History preference
- Added live route-distance calculator in lower-left corner using selected units
- History now opens as the same swipe-down bottom-sheet pattern as Route, Style, and Settings
- Added SVG Preview viewer before export, with transparent checkerboard background and final export button
- Export bubble now opens SVG Preview instead of downloading immediately
- Minimum map zoom reduced further
