import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { DOMParser } from "@xmldom/xmldom";

globalThis.DOMParser = DOMParser;
await import("../src/parser/core.js");
await import("../src/parser/xml-utils.js");
await import("../src/parser/set-parser.js");

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const FIXED_GENERATED_AT = "2026-01-01T00:00:00.000Z";
const FIXED_MODIFIED_AT = Date.parse("2025-12-31T12:00:00.000Z");

for (const version of ["live10", "live11", "live12"]) {
  test(`${version} fixture matches its normalized JSON snapshot`, async () => {
    const fixturePath = path.join(TEST_DIR, "fixtures", `${version}.xml`);
    const snapshotPath = path.join(TEST_DIR, "snapshots", `${version}.json`);
    const xml = await readFile(fixturePath, "utf8");
    const expected = JSON.parse(await readFile(snapshotPath, "utf8"));
    const document = globalThis.AbletonSetParser.parseXml(xml);
    const actual = globalThis.AbletonSetParser.parseAbletonDocument(document, {
      name: `${version}.als`,
      size: Buffer.byteLength(xml),
      lastModified: FIXED_MODIFIED_AT,
      generatedAt: FIXED_GENERATED_AT,
    });

    assert.deepEqual(actual, expected);
  });
}
