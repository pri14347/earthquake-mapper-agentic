# Seismic — Earthquake Explorer

A small, public ArcGIS web prototype showing worldwide USGS earthquakes from the
past seven days. Select a magnitude-sized circle for location, magnitude, depth,
local event time, and the original USGS event page. Use Locate to zoom to your
position, Home to reset the map, and Refresh to reload the feed.

## Run

Requires Node.js 24+ (Node.js 24 LTS recommended).

```sh
npm install
npm run dev
```

Open http://127.0.0.1:5173. For validation:

```sh
npm test
npm run build
```

## ArcGIS access

The app uses ArcGIS Maps SDK for JavaScript 5.1, map web components, Calcite 5.2,
TypeScript, and Vite, scaffolded with `@arcgis/create`'s official Vite template.
There is no backend, user sign-in, or private content.

By default, the app uses the publicly accessible `dark-gray-vector` ArcGIS basemap.
This is an explicit prototype configuration, not a fallback for invalid credentials.
The footer identifies the active basemap mode.

For your **ArcGIS Location Platform** basemap:

1. Create API key credentials with only the **Basemap styles service** privilege.
2. Restrict allowed referrers to your actual localhost and deployment URLs.
3. Copy `.env.example` to `.env.local` and set `VITE_ARCGIS_API_KEY` locally.
4. Restart Vite. The app will use the `arcgis/dark-gray` Location Platform style.

Never paste credentials into chat or commit `.env.local`. Vite embeds `VITE_`
variables in the browser bundle: API keys are visible to users, **not secrets**.
Do not use client secrets or administrative credentials here. Monitor usage,
rotate keys, and verify service terms before public production deployment.
Invalid configured keys show a basemap error; they do not silently switch modes.

## Data and privacy

- Feed: https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson
- Only events whose USGS type is `earthquake` are displayed.
- Data loads at startup and when Refresh is selected; there is no background polling.
- Depth is copied from the feed's third coordinate (kilometers below the surface)
  into a separate attribute, not interpreted as map elevation.
- Negative and unavailable magnitudes are retained. The smallest symbols also
  represent magnitudes below the legend range.
- USGS records are preliminary and may change. This is not an emergency-alert system.
- Locate requests browser permission only when activated. This app does not store
  location, add analytics, or send coordinates to a backend. Basemap providers
  necessarily receive map tile requests for the viewed area.
- Internet access is required for data, maps, fonts, and SDK assets.
- Feed refresh errors preserve the last successfully loaded layer and explicitly
  mark it as previously loaded data.

## Deployment

`npm run build` writes a static site to `dist`. Serve it over **HTTPS**.
Browser geolocation requires a secure context; localhost and loopback addresses
also work during development. Set the API key before building if using Location
Platform, and include the deployed origin in its referrer restrictions.
For subpath hosting, configure Vite's `base` before building.
The build preserves native `light-dark()` CSS for Calcite theme tokens; use a
current evergreen browser (Chrome/Edge 124+, Firefox 128+, or Safari 18+, subject
to the SDK's current system requirements).

## Official guidance

- [ArcGIS Vite setup](https://developers.arcgis.com/javascript/latest/vite/)
- [GeoJSONLayer earthquake sample](https://developers.arcgis.com/javascript/latest/sample-code/layers-geojson/)
- [Locate component and secure contexts](https://developers.arcgis.com/javascript/latest/sample-code/locate/)
- [Calcite setup](https://developers.arcgis.com/calcite-design-system/get-started/)
- [API key authentication](https://developers.arcgis.com/documentation/security-and-authentication/api-key-authentication/)
