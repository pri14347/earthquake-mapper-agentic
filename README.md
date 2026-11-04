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

For an authenticated basemap through your **ArcGIS Online organization**:

1. Sign in to your organization's ArcGIS Online site. Open **Content → My content
   → New item → Developer credentials → API key credentials**.
2. Choose **Public application**, **No item access**, and only the **Basemap styles
   service** privilege. Do not select impersonation or administrative privileges.
3. Configure referrers for your deployed origin, `https://pri14347.github.io`.
   Cross-origin browser requests normally send only the origin, not the repository
   path. This restriction therefore also trusts other apps on that GitHub Pages
   origin; use a dedicated custom domain if you need stronger isolation.
   For development, also allow `http://127.0.0.1:5173` and/or
   `http://localhost:5173` only if you use them. Prefer separate development credentials.
4. Save the credentials item, generate an API key with an appropriate expiration,
   and store it locally or in the GitHub Actions secret described below.
5. Copy `.env.example` to `.env.local` and set `VITE_ARCGIS_API_KEY` locally.
6. Restart Vite. The app will use the authenticated `arcgis/dark-gray` style;
   the footer will show **ArcGIS basemap · API key configured**.

Creating API key credentials requires an eligible user type and role privileges
to generate API keys and assign privileges to applications. If the option or
service privilege is missing, ask your organization administrator; do not use
an unrestricted credential instead. ArcGIS Online service/credit rules apply,
not ArcGIS Location Platform's free-tier/pricing model.

You do not need a separate ArcGIS Location Platform account, an OAuth client ID,
an organization portal URL, or a web map ID for this public, basemap-only setup.
The SDK's default portal is ArcGIS Online. No user sign-in is added.

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

## GitHub Pages deployment

The included [deployment workflow](.github/workflows/deploy.yml) tests and builds
the app with Node.js 24 and deploys `dist` on pushes to `main`. Actions are pinned
to immutable revisions. Relative Vite asset paths support the repository subpath
without changing the local development URL.

1. In [repository Pages settings](https://github.com/pri14347/earthquake-mapper-agentic/settings/pages),
   choose **Build and deployment → Source → GitHub Actions**.
2. Optionally add your ArcGIS Online key under **Settings → Secrets and variables
   → Actions → New repository secret**, named `VITE_ARCGIS_API_KEY`.
   With no secret, the app retains its existing public-basemap mode.
3. Commit and push these deployment changes to `main`.
4. Open **Actions → Deploy earthquake explorer to GitHub Pages** and wait for both
   jobs to succeed. Alternatively use **Run workflow** after it is on `main`.
5. Open **https://pri14347.github.io/earthquake-mapper-agentic/**.
   Verify the basemap, earthquake popups, Refresh, and location permission.

GitHub Actions secrets protect the key during configuration, not after deployment:
Vite embeds it in the public JavaScript bundle. Never add a client secret or
privileged token. Updating the Actions secret requires a new deployment; changing
it does not alter an already published site. For key rotation or credential changes,
generate the replacement token, update the secret, and redeploy. Esri requires
token regeneration after referrer changes as well as privilege/item-access changes.

### Add the deployed app to ArcGIS Online

This is a separate **Application item**, not the developer credentials item:

1. Sign in to your organization's ArcGIS Online site.
2. Open **Content → My content → New item → Application**.
3. Choose **Web mapping** and enter
   `https://pri14347.github.io/earthquake-mapper-agentic/`.
4. Set the title to **Seismic — Earthquake Explorer**, add a summary, tags, and
   USGS attribution, then save.
5. On the item page, choose **Share → Everyone (public)** if allowed by your
   organization and appropriate for this public app.
6. Open the app from the item's launch/open action and verify the deployed URL.

ArcGIS Online stores the app URL and metadata; GitHub Pages serves the files.
The USGS feed continues to load directly, so no earthquake layer upload or
organization-hosted feature service is required. Do not publish credentials in
the Application item's description, URL, or attachments, or make the developer
credentials item public merely to distribute the app.

Sharing the Application item only with the organization does **not** make the
GitHub Pages website private. Organization-only access requires a separate
authorization/hosting design; it is not implemented here.

### Other static hosting

`npm run build` writes a static site to `dist`. Serve it over **HTTPS**.
Browser geolocation requires a secure context; localhost and loopback addresses
also work during development. Set the optional API key before building, and
include the deployed origin in its referrer restrictions.
The build preserves native `light-dark()` CSS for Calcite theme tokens; use a
current evergreen browser (Chrome/Edge 124+, Firefox 128+, or Safari 18+, subject
to the SDK's current system requirements).

## Official guidance

- [ArcGIS Vite setup](https://developers.arcgis.com/javascript/latest/vite/)
- [GeoJSONLayer earthquake sample](https://developers.arcgis.com/javascript/latest/sample-code/layers-geojson/)
- [Locate component and secure contexts](https://developers.arcgis.com/javascript/latest/sample-code/locate/)
- [Calcite setup](https://developers.arcgis.com/calcite-design-system/get-started/)
- [API key authentication](https://developers.arcgis.com/documentation/security-and-authentication/api-key-authentication/)
- [ArcGIS Online API key credentials](https://developers.arcgis.com/documentation/security-and-authentication/api-key-authentication/api-key-credentials/online/)
- [Add an app URL to ArcGIS Online](https://doc.arcgis.com/en/arcgis-online/manage-data/add-app-url.htm)
- [Vite GitHub Pages deployment](https://vite.dev/guide/static-deploy.html#github-pages)
