import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeFeed, USGS_FEED_URL } from "./earthquakes.ts";

function fixture() {
  return {
    type: "FeatureCollection",
    metadata: { generated: 1_790_000_000_000 },
    features: [{
      type: "Feature",
      id: "test123",
      geometry: { type: "Point", coordinates: [-122.2, 38.8, 7.25] },
      properties: {
        type: "earthquake",
        mag: 4.2 as number | null,
        time: 1_789_999_000_000,
        place: "Near a test location",
        url: "https://earthquake.usgs.gov/earthquakes/eventpage/test123",
      },
    }],
  };
}

test("uses the worldwide seven-day feed", () => {
  assert.equal(USGS_FEED_URL, "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson");
});

test("preserves depth in km, time, magnitude and event identity", () => {
  const feed = normalizeFeed(fixture());
  assert.deepEqual(feed.features[0]?.geometry.coordinates, [-122.2, 38.8]);
  assert.deepEqual(feed.features[0]?.properties, {
    OBJECTID: 1, event_id: "test123", mag: 4.2,
    time: 1_789_999_000_000, place: "Near a test location", depth_km: 7.25,
    url: "https://earthquake.usgs.gov/earthquakes/eventpage/test123",
  });
});

test("excludes non-earthquake events and accepts an empty feed", () => {
  const feed = fixture();
  feed.features[0]!.properties.type = "quarry blast";
  assert.equal(normalizeFeed(feed).features.length, 0);
  feed.features = [];
  assert.equal(normalizeFeed(feed).features.length, 0);
});

test("retains null and negative magnitudes", () => {
  const feed = fixture();
  feed.features[0]!.properties.mag = null;
  assert.equal(normalizeFeed(feed).features[0]?.properties.mag, null);
  feed.features[0]!.properties.mag = -1.2;
  assert.equal(normalizeFeed(feed).features[0]?.properties.mag, -1.2);
});

test("rejects malformed or out-of-range data instead of showing an empty success", () => {
  assert.throws(() => normalizeFeed({}), /invalid GeoJSON/);
  const feed = fixture();
  feed.features[0]!.geometry.coordinates[1] = 100;
  assert.throws(() => normalizeFeed(feed), /invalid coordinates/);
  feed.features[0]!.geometry.coordinates[1] = 40;
  feed.features[0]!.properties.time = Number.NaN;
  assert.throws(() => normalizeFeed(feed), /invalid coordinates/);
});

test("rejects non-USGS and unsafe event links", () => {
  for (const url of ["https://example.com/event", "javascript:alert(1)", "http://earthquake.usgs.gov/event"]) {
    const feed = fixture();
    feed.features[0]!.properties.url = url;
    assert.throws(() => normalizeFeed(feed), /unexpected event link/);
  }
});
