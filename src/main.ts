import "./style.css";
import "@arcgis/map-components/components/arcgis-map";
import "@arcgis/map-components/components/arcgis-popup";
import "@arcgis/map-components/components/arcgis-zoom";
import "@arcgis/map-components/components/arcgis-home";
import "@arcgis/map-components/components/arcgis-locate";
import "@arcgis/map-components/components/arcgis-scale-bar";
import "@esri/calcite-components/components/calcite-shell";
import "@esri/calcite-components/components/calcite-navigation";
import "@esri/calcite-components/components/calcite-navigation-logo";
import "@esri/calcite-components/components/calcite-button";
import "@esri/calcite-components/components/calcite-notice";
import "@esri/calcite-components/components/calcite-chip";
import esriConfig from "@arcgis/core/config.js";
import Basemap from "@arcgis/core/Basemap.js";
import Map from "@arcgis/core/Map.js";
import GeoJSONLayer from "@arcgis/core/layers/GeoJSONLayer.js";
import PopupTemplate from "@arcgis/core/PopupTemplate.js";
import SimpleRenderer from "@arcgis/core/renderers/SimpleRenderer.js";
import SimpleMarkerSymbol from "@arcgis/core/symbols/SimpleMarkerSymbol.js";
import SizeVariable from "@arcgis/core/renderers/visualVariables/SizeVariable.js";
import * as reactiveUtils from "@arcgis/core/core/reactiveUtils.js";
import { normalizeFeed, USGS_FEED_URL } from "./earthquakes.ts";

const mapElement = document.querySelector("arcgis-map")!;
const locate = document.querySelector("arcgis-locate")!;
const refresh = document.querySelector("calcite-button")!;
const status = document.querySelector<HTMLElement>("#feed-status")!;
const updated = document.querySelector<HTMLElement>("#updated")!;
const notice = document.querySelector("calcite-notice")!;
const noticeTitle = document.querySelector<HTMLElement>("#notice-title")!;
const noticeMessage = document.querySelector<HTMLElement>("#notice-message")!;
const basemapLabel = document.querySelector<HTMLElement>("#basemap-mode")!;

const apiKey = import.meta.env.VITE_ARCGIS_API_KEY?.trim();
if (apiKey) esriConfig.apiKey = apiKey;
mapElement.map = new Map({
  basemap: apiKey
    ? new Basemap({ style: { id: "arcgis/dark-gray" } })
    : "dark-gray-vector",
});
basemapLabel.textContent = apiKey
  ? "ArcGIS basemap · API key configured"
  : "Public ArcGIS basemap · no key configured";

function showError(title: string, message: string, error: unknown): void {
  console.error(title, error);
  noticeTitle.textContent = title;
  noticeMessage.textContent = message;
  notice.open = true;
}

const popupTemplate = new PopupTemplate({
  title: "{place}",
  content: [
    {
      type: "fields",
      fieldInfos: [
        { fieldName: "mag", label: "Magnitude", format: { places: 1 } },
        { fieldName: "depth_km", label: "Depth (km)", format: { places: 1 } },
        {
          fieldName: "time",
          label: "Time (your local timezone)",
          format: { dateFormat: "short-date-short-time" },
        },
        { fieldName: "event_id", label: "USGS event ID" },
      ],
    },
    {
      type: "text",
      text: '<a href="{url}" target="_blank" rel="noopener noreferrer">View event on USGS</a>',
    },
  ],
});

const renderer = new SimpleRenderer({
  symbol: new SimpleMarkerSymbol({
    color: [255, 183, 77, 0.72],
    size: 7,
    outline: { color: [255, 219, 166, 0.95], width: 0.8 },
  }),
  visualVariables: [
    new SizeVariable({
      field: "mag",
      stops: [
        { value: 0, size: 5 },
        { value: 2, size: 9 },
        { value: 4, size: 17 },
        { value: 6, size: 29 },
        { value: 8, size: 43 },
      ],
    }),
  ],
});

let activeLayer: GeoJSONLayer | undefined;
let activeUrl: string | undefined;
let controller: AbortController | undefined;
let disposed = false;

async function loadEarthquakes(): Promise<void> {
  controller?.abort();
  const request = new AbortController();
  controller = request;
  const timeout = setTimeout(() => request.abort(new Error("Feed request timed out")), 30_000);
  refresh.loading = true;
  refresh.disabled = true;
  status.textContent = "Loading the USGS feed…";
  notice.open = false;
  let candidate: GeoJSONLayer | undefined;
  let candidateUrl: string | undefined;

  try {
    const response = await fetch(USGS_FEED_URL, { signal: request.signal, cache: "no-store" });
    if (!response.ok) throw new Error(`USGS returned HTTP ${response.status}`);
    const feed = normalizeFeed(await response.json());
    if (disposed) return;
    request.signal.throwIfAborted();

    if (feed.features.length > 0) {
      candidateUrl = URL.createObjectURL(
        new Blob([JSON.stringify(feed)], { type: "application/geo+json" }),
      );
      candidate = new GeoJSONLayer({
        url: candidateUrl,
        title: "Earthquakes · past 7 days",
        copyright: "USGS Earthquake Hazards Program",
        popupTemplate,
        renderer,
        fields: [
          { name: "OBJECTID", type: "oid" },
          { name: "event_id", type: "string" },
          { name: "place", type: "string" },
          { name: "mag", type: "double" },
          { name: "depth_km", type: "double" },
          { name: "time", type: "date" },
          { name: "url", type: "string" },
        ],
        objectIdField: "OBJECTID",
        orderBy: [{ field: "mag", order: "descending" }],
      });
      await candidate.load({ signal: request.signal });
    }

    if (disposed) return;
    request.signal.throwIfAborted();
    await mapElement.viewOnReady();
    mapElement.closePopup();
    if (activeLayer) {
      mapElement.map!.remove(activeLayer);
      activeLayer.destroy();
    }
    if (activeUrl) URL.revokeObjectURL(activeUrl);
    activeLayer = candidate;
    activeUrl = candidateUrl;
    if (candidate) mapElement.map!.add(candidate);
    candidate = undefined;
    candidateUrl = undefined;
    status.textContent = feed.features.length > 0
      ? "USGS feed loaded · past 7 days"
      : "No earthquakes reported in the past 7 days";
    updated.textContent = `Feed updated ${new Date(feed.metadata.generated).toLocaleString()}`;
    updated.setAttribute("datetime", new Date(feed.metadata.generated).toISOString());
  } catch (error) {
    if (disposed || controller !== request) return;
    status.textContent = activeLayer
      ? "Refresh failed · showing previously loaded data"
      : "Earthquake data unavailable";
    showError(
      "Could not load earthquakes",
      activeLayer
        ? "Previously loaded data is still visible. Check your connection and select Refresh to retry."
        : "Check your connection, then select Refresh to retry the USGS feed.",
      error,
    );
  } finally {
    clearTimeout(timeout);
    candidate?.destroy();
    if (candidateUrl) URL.revokeObjectURL(candidateUrl);
    if (controller === request && !disposed) {
      refresh.loading = false;
      refresh.disabled = false;
    }
  }
}

locate.geolocationOptions = { enableHighAccuracy: false, timeout: 15_000, maximumAge: 60_000 };
locate.addEventListener("arcgisError", (event) => {
  showError(
    "Location unavailable",
    "Allow location access in your browser and use HTTPS or localhost. You can still explore the map manually.",
    event.detail,
  );
});
locate.addEventListener("arcgisSuccess", () => {
  if (noticeTitle.textContent === "Location unavailable") notice.open = false;
});
refresh.addEventListener("click", () => void loadEarthquakes());

reactiveUtils.watch(
  () => mapElement.view?.fatalError,
  (error) => {
    if (error) showError("Map unavailable", "The map could not render. Check WebGL support and reload the page.", error);
  },
);

async function start(): Promise<void> {
  try {
    await mapElement.viewOnReady();
    const basemap = mapElement.map!.basemap!;
    void basemap.loadAll().catch((error: unknown) => {
      showError(
        "Basemap unavailable",
        apiKey
          ? "Check your API key, basemap privileges, allowed referrers, and network connection. Reload after correcting the configuration."
          : "The public ArcGIS basemap could not load. Check your connection and reload.",
        error,
      );
    });
    await loadEarthquakes();
  } catch (error) {
    refresh.disabled = true;
    status.textContent = "Map initialization failed";
    showError("Could not start the map", "Check WebGL support and your connection, then reload.", error);
  }
}

window.addEventListener("pagehide", (event) => {
  if (event.persisted) return;
  disposed = true;
  controller?.abort();
  if (activeUrl) URL.revokeObjectURL(activeUrl);
});

void start();
