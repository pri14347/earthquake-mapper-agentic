export const USGS_FEED_URL =
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson";

interface EarthquakeFeature {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: {
    OBJECTID: number;
    event_id: string;
    mag: number | null;
    place: string;
    time: number;
    depth_km: number;
    url: string;
  };
}

interface EarthquakeFeed {
  type: "FeatureCollection";
  metadata: { generated: number };
  features: EarthquakeFeature[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function normalizeFeed(value: unknown): EarthquakeFeed {
  if (
    !isRecord(value) ||
    value.type !== "FeatureCollection" ||
    !Array.isArray(value.features) ||
    !isRecord(value.metadata) ||
    !isFiniteNumber(value.metadata.generated) ||
    Number.isNaN(new Date(value.metadata.generated).getTime())
  ) {
    throw new Error("USGS returned an invalid GeoJSON feature collection");
  }

  const features: EarthquakeFeature[] = [];
  for (const feature of value.features) {
    if (!isRecord(feature) || !isRecord(feature.properties)) {
      throw new Error("USGS returned an invalid feature");
    }
    const properties = feature.properties;
    // The all-events feed also includes quarry blasts and other non-earthquake events.
    if (properties.type !== "earthquake") continue;
    const geometry = feature.geometry;
    const coordinates = isRecord(geometry) ? geometry.coordinates : undefined;
    if (
      !isRecord(geometry) ||
      geometry.type !== "Point" ||
      !Array.isArray(coordinates) ||
      !isFiniteNumber(coordinates[0]) ||
      !isFiniteNumber(coordinates[1]) ||
      !isFiniteNumber(coordinates[2]) ||
      coordinates[0] < -180 || coordinates[0] > 180 ||
      coordinates[1] < -90 || coordinates[1] > 90 ||
      !isFiniteNumber(properties.time) ||
      Number.isNaN(new Date(properties.time).getTime()) ||
      (properties.mag !== null && !isFiniteNumber(properties.mag)) ||
      typeof feature.id !== "string" ||
      typeof properties.url !== "string"
    ) {
      throw new Error("USGS returned an earthquake with invalid coordinates or attributes");
    }
    const url = new URL(properties.url);
    if (url.protocol !== "https:" || url.hostname !== "earthquake.usgs.gov") {
      throw new Error("USGS returned an unexpected event link");
    }
    features.push({
      type: "Feature",
      // USGS Z is depth in km, not elevation in meters. Preserve it as an attribute.
      geometry: { type: "Point", coordinates: [coordinates[0], coordinates[1]] },
      properties: {
        OBJECTID: features.length + 1,
        event_id: feature.id,
        mag: properties.mag,
        place: typeof properties.place === "string" ? properties.place : "Location not reported",
        time: properties.time,
        depth_km: coordinates[2],
        url: url.href,
      },
    });
  }
  return {
    type: "FeatureCollection",
    metadata: { generated: value.metadata.generated },
    features,
  };
}
