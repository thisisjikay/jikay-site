const SESSION_CONTAINERS = new Set(["ClipSlot", "ClipSlotList"]);
const ARRANGEMENT_CONTAINERS = new Set(["ArrangerAutomation", "ArrangerClip", "Arrangement"]);
const UNKNOWN_CONTAINERS = new Set(["TakeLane", "TakeLanes", "Comping", "FreezeSequencer", "FreezeSequence"]);

export function classifyClipContext(node, trackNode = null) {
  let current = node?.parentElement || null;

  while (current && current !== trackNode) {
    if (SESSION_CONTAINERS.has(current.tagName)) return "Session";
    if (ARRANGEMENT_CONTAINERS.has(current.tagName)) return "Arrangement";
    if (UNKNOWN_CONTAINERS.has(current.tagName)) return "Unknown";
    current = current.parentElement;
  }

  return "Unknown";
}

export function calculateArrangementLength({ clips, locators, loop }) {
  const arrangementClipEnds = clips
    .filter((clip) => clip.context === "Arrangement")
    .map((clip) => clip.end)
    .filter(Number.isFinite);
  const locatorTimes = locators.map((locator) => locator.time).filter(Number.isFinite);
  const loopEnd = loop?.enabled && Number.isFinite(loop.end) ? loop.end : 0;

  return Math.max(0, loopEnd, ...arrangementClipEnds, ...locatorTimes);
}

export function assignTrackDisplayIndexes(tracks) {
  let regularIndex = 0;
  let returnIndex = 0;

  tracks.forEach((track) => {
    if (["audio", "midi", "group"].includes(track.type)) {
      regularIndex += 1;
      track.displayIndex = String(regularIndex).padStart(2, "0");
    } else if (track.type === "return") {
      returnIndex += 1;
      track.displayIndex = `R${returnIndex}`;
    } else if (track.type === "master") {
      track.displayIndex = "M";
    } else if (track.type === "cue") {
      track.displayIndex = "C";
    }
  });

  return tracks;
}
