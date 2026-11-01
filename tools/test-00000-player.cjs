// Run with: node tools/test-00000-player.cjs
// Exercise media races and browser-policy failures without downloading test music.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../00000/player.js"), "utf8")
  .replace("import.meta.url", '"https://example.test/00000/player.js"');
const flush = async () => { for (let n = 0; n < 25; n++) await Promise.resolve(); };

async function setup(playlist, options = {}) {
  const nodes = new Map();
  const attempts = [];
  let blocked = Boolean(options.blocked);
  const pending = [];
  class Element extends EventTarget {
    constructor(id) {
      super();
      this.id = id;
      this.disabled = ["previous-track", "next-track", "toggle-playback", "song-position"].includes(id);
      this.dataset = {};
      this.attributes = new Map();
      this.textContent = "";
      this.hidden = false;
      this.value = "0";
      this.style = { setProperty: (name, value) => this.attributes.set(name, value) };
    }
    setAttribute(name, value) { this.attributes.set(name, value); }
    removeAttribute(name) { this.attributes.delete(name); if (name === "src") this.src = ""; }
    replaceWith(replacement) { nodes.set(this.id, replacement); }
    click() { if (!this.disabled) this.dispatchEvent(new Event("click")); }
  }
  class Media extends Element {
    constructor(id) {
      super(id);
      this.paused = true;
      this.ended = false;
      this.currentTime = 0;
      this.duration = NaN;
      this.src = "";
      this.error = null;
      this.loadVersion = 0;
    }
    cloneNode() { return new Media(this.id); }
    pause() {
      const changed = !this.paused;
      this.paused = true;
      if (changed) this.dispatchEvent(new Event("pause"));
    }
    load() {
      this.loadVersion += 1;
      this.currentTime = 0;
      this.duration = options.duration ?? NaN;
      this.paused = true;
      this.ended = false;
      this.error = null;
      if (!this.src) return;
      const selected = this.src;
      queueMicrotask(() => {
        if (this.src !== selected) return;
        if (selected.includes("missing")) this.error = { code: 4 };
        this.dispatchEvent(new Event(this.error ? "error" : "loadeddata"));
      });
    }
    play() {
      attempts.push(this.src);
      if (blocked && this.id === "music") return Promise.reject(new DOMException("Blocked", "NotAllowedError"));
      if (this.src.includes("missing")) return Promise.reject(new DOMException("Missing", "NotSupportedError"));
      const start = () => {
        this.paused = false;
        this.dispatchEvent(new Event("playing"));
      };
      if (options.pending && this.id === "music") {
        const version = this.loadVersion;
        return new Promise((resolve, reject) => pending.push(() => {
          if (version !== this.loadVersion) reject(new DOMException("Source changed", "AbortError"));
          else { start(); resolve(); }
        }));
      }
      start();
      return Promise.resolve();
    }
  }
  for (const id of ["track-title", "player-status", "track-announcement", "previous-track", "toggle-playback", "next-track", "scrubber", "song-position"]) {
    nodes.set(id, new Element(id));
  }
  for (const id of ["music", "background-video"]) nodes.set(id, new Media(id));
  const motion = new EventTarget();
  motion.matches = Boolean(options.reducedMotion);
  const window = new EventTarget();
  window.matchMedia = () => motion;
  const random = Object.create(Math);
  random.random = () => options.random ?? 0;
  const document = { querySelector: selector => nodes.get(selector.slice(1)), title: "00000" };
  vm.runInNewContext(source, {
    document, window, URL, AbortController, Math: random,
    fetch: async () => {
      if (options.fetchFailure) throw new Error("Offline");
      return { ok: true, json: async () => playlist };
    },
  });
  await flush();
  return {
    get: id => nodes.get(id), document, attempts, window, pending,
    click: async id => { nodes.get(id).click(); await flush(); },
    unblock: () => { blocked = false; },
    motion: async value => { motion.matches = value; motion.dispatchEvent(new Event("change")); await flush(); },
  };
}

const songs = {
  fallbackVideo: "static.mp4",
  tracks: [
    { title: "First", file: "audio/first.mp3" },
    { title: "Second", file: "audio/second.mp3", video: "video/second.mp4" },
    { title: "Third", file: "audio/third.mp3" },
  ],
};

const tests = [
  ["progress waits for a known duration, follows media time and resets", async () => {
    const page = await setup(songs);
    const slider = page.get("song-position");
    assert.ok(slider.disabled);
    page.get("music").duration = 120;
    page.get("music").currentTime = 30;
    page.get("music").dispatchEvent(new Event("durationchange"));
    assert.equal(slider.disabled, false);
    assert.equal(slider.value, "30");
    assert.equal(page.get("scrubber").attributes.get("--progress"), "25%");
    assert.equal(slider.attributes.get("aria-valuetext"), "0:30 of 2:00");
    await page.click("next-track");
    assert.equal(slider.value, "0");
    assert.ok(slider.disabled);
  }],
  ["scrubbing previews during drag then seeks only the song on release", async () => {
    const page = await setup(songs, { duration: 120 });
    const slider = page.get("song-position");
    page.get("music").currentTime = 30;
    page.get("background-video").currentTime = 4;
    slider.dispatchEvent(new Event("pointerdown"));
    slider.value = "90";
    slider.dispatchEvent(new Event("input"));
    assert.equal(page.get("music").currentTime, 30);
    assert.equal(page.get("scrubber").attributes.get("--progress"), "75%");
    page.get("music").currentTime = 31;
    page.get("music").dispatchEvent(new Event("timeupdate"));
    assert.equal(slider.value, "90", "Playback must not fight the drag position");
    slider.dispatchEvent(new Event("change"));
    assert.equal(page.get("music").currentTime, 90);
    assert.equal(page.get("music").paused, false);
    assert.equal(page.get("background-video").currentTime, 4);
  }],
  ["paused seeking stays paused and stale scrubs cannot seek the next track", async () => {
    const page = await setup(songs, { duration: 120 });
    const slider = page.get("song-position");
    await page.click("toggle-playback");
    slider.value = "45";
    slider.dispatchEvent(new Event("input"));
    slider.dispatchEvent(new Event("change"));
    assert.equal(page.get("music").currentTime, 45);
    assert.ok(page.get("music").paused);
    slider.dispatchEvent(new Event("pointerdown"));
    slider.value = "80";
    slider.dispatchEvent(new Event("input"));
    await page.click("next-track");
    slider.value = "80";
    slider.dispatchEvent(new Event("change"));
    assert.equal(page.get("music").currentTime, 0);
    assert.ok(page.get("music").paused);
    assert.equal(slider.value, "0");
  }],
  ["empty and unavailable playlists disable playback", async () => {
    for (const [playlist, options, expected] of [
      [{ tracks: [] }, {}, "No tracks available"],
      [{ tracks: [{ title: "Invalid" }, null] }, {}, "No tracks available"],
      [null, { fetchFailure: true }, "Music is unavailable"],
    ]) {
      const page = await setup(playlist, options);
      assert.equal(page.get("track-title").textContent, expected);
      assert.ok(page.get("toggle-playback").disabled);
      assert.ok(page.get("next-track").disabled);
    }
  }],
  ["random initial track then list order, backwards and wraparound", async () => {
    const page = await setup(songs, { random: 0.5 });
    assert.equal(page.get("track-title").textContent, "Second");
    assert.match(page.get("background-video").src, /video\/second.mp4$/);
    await page.click("next-track");
    assert.equal(page.get("track-title").textContent, "Third");
    await page.click("next-track");
    assert.equal(page.get("track-title").textContent, "First");
    await page.click("previous-track");
    assert.equal(page.get("track-title").textContent, "Third");
    assert.equal(page.get("music").paused, false);
  }],
  ["pause/resume controls both media; paused track changes stay paused", async () => {
    const page = await setup(songs);
    page.get("music").currentTime = 12;
    await page.click("toggle-playback");
    assert.ok(page.get("music").paused);
    assert.ok(page.get("background-video").paused);
    await page.click("toggle-playback");
    assert.equal(page.get("music").currentTime, 12);
    assert.equal(page.get("background-video").paused, false);
    await page.click("toggle-playback");
    await page.click("next-track");
    assert.equal(page.get("track-title").textContent, "Second");
    assert.ok(page.get("music").paused);
    assert.ok(page.get("background-video").paused);
    assert.equal(page.get("music").currentTime, 0);
  }],
  ["autoplay rejection offers a usable play button", async () => {
    const page = await setup(songs, { blocked: true });
    assert.equal(page.get("player-status").textContent, "press play");
    assert.equal(page.get("toggle-playback").dataset.playing, "false");
    assert.ok(page.get("background-video").paused);
    page.unblock();
    await page.click("toggle-playback");
    assert.equal(page.get("music").paused, false);
    assert.equal(page.get("background-video").paused, false);
    assert.equal(page.get("player-status").textContent, "");
  }],
  ["native media pauses leave the visible play button usable", async () => {
    const page = await setup(songs);
    page.get("music").pause();
    await flush();
    assert.equal(page.get("toggle-playback").dataset.playing, "false");
    assert.ok(page.get("background-video").paused);
    await page.click("toggle-playback");
    assert.equal(page.get("music").paused, false);
  }],
  ["track ending advances; a single-track playlist loops", async () => {
    const page = await setup(songs);
    page.get("music").ended = true;
    page.get("music").dispatchEvent(new Event("ended"));
    await flush();
    assert.equal(page.get("track-title").textContent, "Second");
    const single = await setup({ tracks: [songs.tracks[0]] });
    const old = single.get("music");
    old.ended = true;
    old.dispatchEvent(new Event("ended"));
    await flush();
    assert.equal(single.get("music"), old, "Retain the media element's playback permission");
    assert.equal(single.get("track-title").textContent, "First");
    assert.equal(single.get("music").paused, false);
  }],
  ["failed video falls back without resetting audio", async () => {
    const page = await setup({ ...songs, tracks: [{ ...songs.tracks[0], video: "video/missing.mp4" }] });
    assert.match(page.get("background-video").src, /static.mp4$/);
    assert.equal(page.get("music").paused, false);
    const noVideo = await setup({ fallbackVideo: "missing.mp4", tracks: [songs.tracks[0]] });
    assert.ok(noVideo.get("background-video").hidden);
    assert.equal(noVideo.get("music").paused, false);
  }],
  ["failed audio skips forward and stops after one failed pass", async () => {
    const page = await setup({ tracks: [{ title: "Missing", file: "missing.mp3" }, songs.tracks[1]] });
    assert.equal(page.get("track-title").textContent, "Second");
    assert.equal(page.get("music").paused, false);
    const broken = await setup({ tracks: [
      { title: "Missing 1", file: "missing-1.mp3" },
      { title: "Missing 2", file: "missing-2.mp3" },
    ] });
    assert.equal(broken.get("player-status").textContent, "Music is unavailable. Please try again later.");
    assert.ok(broken.get("toggle-playback").disabled);
    assert.ok(broken.get("background-video").paused);
    assert.ok(broken.attempts.length < 10, "No endless retry loop");
  }],
  ["reduced motion avoids video loading and responds to preference changes", async () => {
    const page = await setup(songs, { reducedMotion: true });
    assert.equal(page.get("background-video").src, "");
    assert.equal(page.get("music").paused, false);
    await page.motion(false);
    assert.match(page.get("background-video").src, /static.mp4$/);
    assert.equal(page.get("background-video").paused, false);
    await page.motion(true);
    assert.equal(page.get("background-video").src, "");
    assert.equal(page.get("music").paused, false);
  }],
  ["stale media events and promises cannot take over a newer selection", async () => {
    const page = await setup(songs, { pending: true });
    const oldAudio = page.get("music");
    const oldVideo = page.get("background-video");
    await page.click("next-track");
    await page.click("next-track");
    oldAudio.dispatchEvent(new Event("ended"));
    oldAudio.dispatchEvent(new Event("error"));
    oldVideo.dispatchEvent(new Event("error"));
    for (const resolve of page.pending) resolve();
    await flush();
    assert.equal(page.get("track-title").textContent, "Third");
    assert.match(page.get("music").src, /third.mp3$/);
    assert.match(page.get("background-video").src, /static.mp4$/);
  }],
  ["leaving the page stops both media", async () => {
    const page = await setup(songs);
    page.window.dispatchEvent(new Event("pagehide"));
    assert.ok(page.get("music").paused);
    assert.ok(page.get("background-video").paused);
  }],
];

(async () => {
  for (const [name, test] of tests) {
    await test();
    console.log(`PASS ${name}`);
  }
  console.log(`${tests.length} player scenarios passed.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
