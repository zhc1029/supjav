import assert from "node:assert/strict";
import test from "node:test";
import { load } from "cheerio";
import {
  mapPlayerSources,
  parseWatchConfig,
  resolvePlaybackStreams,
} from "../src/lib/scraper.ts";

const referer = "https://javtiful.com/video/42/sample-video";
const playback = {
  endpoint: "/video/42/playback",
  ticket: "initial-fixture-value",
};
const sampleSources = [
  {
    src: "https://media.example.test/video.m3u8",
    type: "application/x-mpegURL",
    size: 720,
  },
];

 test("finds nested playback config when the legacy config element is absent", () => {
  const configJson = JSON.stringify({
    videoTitle: "Fixture video",
    playback: { endpoint: playback.endpoint, ticket: playback.ticket },
  });
  const $ = load(`<script type="application/json">${configJson}</script>`);
  const config = parseWatchConfig($);

  assert.equal(config.videoTitle, "Fixture video");
  assert.equal(config.playback.endpoint, playback.endpoint);
});

test("maps returned src, type, and size into application stream fields", () => {
  assert.deepEqual(mapPlayerSources(sampleSources), [
    {
      url: sampleSources[0].src,
      type: "application/x-mpegURL",
      quality: "720p",
    },
  ]);
});

test("retries once with a renewed ticket after a 409 response", async () => {
  let callCount = 0;
  let firstRequestValue;
  let retryRequestValue;
  const streams = await resolvePlaybackStreams(
    playback,
    referer,
    async (endpoint, ticket, requestReferer) => {
      callCount += 1;
      assert.equal(new URL(endpoint).pathname, "/video/42/playback");
      assert.equal(requestReferer, referer);
      if (callCount === 1) {
        firstRequestValue = ticket;
        return { status: 409, data: { renewTicket: "renewed-fixture-value" } };
      }
      retryRequestValue = ticket;
      return { status: 200, data: { success: true, sources: sampleSources } };
    }
  );

  assert.equal(callCount, 2);
  assert.ok(firstRequestValue !== retryRequestValue, "retry uses the renewed value");
  assert.deepEqual(streams, [
    {
      url: sampleSources[0].src,
      type: "application/x-mpegURL",
      quality: "720p",
    },
  ]);
});

test("does not send a ticket to a playback endpoint on another origin", async () => {
  let callCount = 0;
  const streams = await resolvePlaybackStreams(
    { endpoint: "https://other.example.test/playback", ticket: "fixture" },
    referer,
    async () => {
      callCount += 1;
      return { status: 200, data: { success: true, sources: sampleSources } };
    }
  );

  assert.equal(callCount, 0);
  assert.deepEqual(streams, []);
});
