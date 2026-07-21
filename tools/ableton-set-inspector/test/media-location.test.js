import assert from "node:assert/strict";
import test from "node:test";

await import("../src/parser/core.js");
await import("../src/parser/xml-utils.js");
await import("../src/parser/set-parser.js");

const { classifyMediaProjectLocation } = globalThis.AbletonSetParser;

test("Ableton project-relative media is classified as in project", () => {
  assert.equal(classifyMediaProjectLocation(3), "in-project");
});

test("other explicit Ableton path types are classified as external", () => {
  for (const type of [1, 2, 4, 5, 6, 7]) {
    assert.equal(classifyMediaProjectLocation(type), "external");
  }
});

test("missing path-type evidence remains unknown", () => {
  assert.equal(classifyMediaProjectLocation(null), "unknown");
  assert.equal(classifyMediaProjectLocation(undefined), "unknown");
});
