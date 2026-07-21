import test from "node:test";
import assert from "node:assert/strict";

await import("../src/parser/core.js");

const { assignTrackDisplayIndexes, calculateArrangementLength, classifyClipContext } = globalThis.AbletonSetParserCore;

function element(tagName, parentElement = null) {
  return { tagName, parentElement };
}

test("arrangement length ignores Session and Unknown clips", () => {
  const beats = calculateArrangementLength({
    clips: [
      { context: "Arrangement", end: 64 },
      { context: "Session", end: 512 },
      { context: "Unknown", end: 1024 },
    ],
    locators: [{ time: 80 }],
    loop: { enabled: true, end: 72 },
  });

  assert.equal(beats, 80);
});

test("arrangement length includes enabled loop end", () => {
  assert.equal(
    calculateArrangementLength({
      clips: [{ context: "Arrangement", end: 16 }],
      locators: [],
      loop: { enabled: true, end: 32 },
    }),
    32,
  );
});

test("clip context recognises known Session and Arrangement containers", () => {
  const track = element("AudioTrack");
  const clipSlot = element("ClipSlot", track);
  const sessionClip = element("AudioClip", clipSlot);
  const arranger = element("ArrangerAutomation", track);
  const arrangementClip = element("AudioClip", arranger);

  assert.equal(classifyClipContext(sessionClip, track), "Session");
  assert.equal(classifyClipContext(arrangementClip, track), "Arrangement");
});

test("clip context stays Unknown for take lanes and unrecognised containers", () => {
  const track = element("AudioTrack");
  const takeLane = element("TakeLane", track);
  const takeClip = element("AudioClip", takeLane);
  const mystery = element("MysterySequencer", track);
  const mysteryClip = element("MidiClip", mystery);

  assert.equal(classifyClipContext(takeClip, track), "Unknown");
  assert.equal(classifyClipContext(mysteryClip, track), "Unknown");
});

test("normal and Return tracks use independent counters", () => {
  const tracks = [{ type: "audio" }, { type: "midi" }, { type: "return" }, { type: "return" }, { type: "master" }, { type: "cue" }];

  assignTrackDisplayIndexes(tracks);
  assert.deepEqual(
    tracks.map((track) => track.displayIndex),
    ["01", "02", "R1", "R2", "M", "C"],
  );
});
