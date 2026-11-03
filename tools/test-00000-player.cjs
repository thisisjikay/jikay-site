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
      this.tagName = "DIV";
      this.parentElement = null;
      this.style = { setProperty: (name, value) => this.attributes.set(name, value) };
    }
    setAttribute(name, value) { this.attributes.set(name, value); }
    removeAttribute(name) { this.attributes.delete(name); if (name === "src") this.src = ""; }
    replaceWith(replacement) { nodes.set(this.id, replacement); }
    closest(selectors) {
      for (let node = this; node; node = node.parentElement) {
        if (selectors.split(",").some(selector => {
          selector = selector.trim();
          if (selector.startsWith(".")) return node.attributes.get("class")?.split(" ").includes(selector.slice(1));
          if (selector.startsWith("[")) {
            const [, name, value] = selector.match(/^\[([^=\]]+)(?:=['"]?([^'"\]]+)['"]?)?\]$/);
            return node.attributes.has(name) && (value === undefined || node.attributes.get(name) === value);
          }
          return node.tagName.toLowerCase() === selector;
        })) return node;
      }
      return null;
    }
    click() {
      if (this.disabled) return;
      const event = new Event("click", { cancelable: true });
      Object.defineProperty(event, "target", { value: this });
      for (let node = this; node; node = node.parentElement) node.dispatchEvent(event);
    }
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
      this.volume = 1;
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
  for (const id of ["room", "volume-control", "volume", "transport", "back-link", "track-title", "player-status", "track-announcement", "previous-track", "toggle-playback", "next-track", "scrubber", "song-position"]) {
    nodes.set(id, new Element(id));
  }
  for (const [id, tag] of [["volume", "INPUT"], ["song-position", "INPUT"], ["previous-track", "BUTTON"], ["next-track", "BUTTON"], ["toggle-playback", "BUTTON"], ["back-link", "A"]]) nodes.get(id).tagName = tag;
  for (const id of ["room", "volume-control", "transport", "scrubber"]) nodes.get(id).setAttribute("class", id === "room" ? "listening-room" : id);
  for (const node of nodes.values()) if (node.id !== "room") node.parentElement = nodes.get("room");
  nodes.get("volume").parentElement = nodes.get("volume-control");
  nodes.get("song-position").parentElement = nodes.get("scrubber");
  nodes.get("volume").value = "100";
  nodes.get("volume").disabled = true;
  for (const id of ["music", "background-video"]) nodes.set(id, new Media(id));
  const motion = new EventTarget();
  motion.matches = Boolean(options.reducedMotion);
  const window = new EventTarget();
  window.matchMedia = () => motion;
  const random = Object.create(Math);
  random.random = () => options.random ?? 0;
  const fullscreenCalls = [];
  const document = Object.assign(new EventTarget(), {
    querySelector: selector => nodes.get(selector === ".listening-room" ? "room" : selector.slice(1)),
    title: "00000", fullscreenElement: null, fullscreenEnabled: !options.fullscreenUnsupported,
    documentElement: {},
    async exitFullscreen() { fullscreenCalls.push("exit"); this.fullscreenElement = null; },
  });
  if (!options.fullscreenUnsupported) document.documentElement.requestFullscreen = async () => {
    fullscreenCalls.push("enter");
    if (options.fullscreenRejected) throw new Error("Denied");
    document.fullscreenElement = document.documentElement;
  };
  vm.runInNewContext(source, {
    document, window, URL, AbortController, Math: random,
    fetch: async () => {
      if (options.fetchFailure) throw new Error("Offline");
      return { ok: true, json: async () => playlist };
    },
  });
  await flush();
  return {
    get: id => nodes.get(id), document, attempts, window, pending, fullscreenCalls,
    click: async id => { nodes.get(id).click(); await flush(); },
    key: async (key, { target = "room", handled = false, ...properties } = {}) => {
      const event = new Event("keydown", { cancelable: true });
      Object.assign(event, { key, ...properties });
      Object.defineProperty(event, "target", { value: nodes.get(target) });
      if (handled) event.preventDefault();
      document.dispatchEvent(event);
      await flush();
      return event;
    },
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
  ["volume defaults to full, adjusts without playing, and survives track changes", async () => {
    const page = await setup(songs, { blocked: true });
    const slider = page.get("volume");
    assert.equal(slider.disabled, false);
    assert.equal(page.get("music").volume, 1);
    slider.value = "35";
    slider.dispatchEvent(new Event("input"));
    assert.equal(page.get("music").volume, 0.35);
    assert.equal(slider.attributes.get("aria-valuetext"), "35%");
    assert.equal(page.get("volume-control").attributes.get("--volume"), "35%");
    assert.ok(page.get("music").paused);
    await page.click("next-track");
    assert.equal(page.get("music").volume, 0.35);
    assert.equal(slider.value, "35");
    slider.value = "0";
    slider.dispatchEvent(new Event("input"));
    assert.equal(page.get("music").volume, 0);
    assert.equal(page.get("volume-control").dataset.muted, "true");
    assert.ok(page.get("background-video").muted);
    assert.equal((await setup(songs)).get("music").volume, 1, "A new visit starts at full volume");
  }],
  ["screen clicks recover blocked autoplay without toggling or stealing control actions", async () => {
    const page = await setup(songs, { blocked: true, duration: 120 });
    page.unblock();
    for (const id of ["back-link", "volume", "volume-control", "song-position", "scrubber", "transport"]) {
      await page.click(id);
      assert.ok(page.get("music").paused, `${id} must not start playback`);
    }
    await page.click("track-title");
    assert.equal(page.get("music").paused, false);
    const attempts = page.attempts.length;
    await page.click("room");
    assert.equal(page.attempts.length, attempts, "Clicking while playing is a no-op");
    await page.click("toggle-playback");
    assert.ok(page.get("music").paused, "The bubbled pause click must not resume playback");
    await page.click("next-track");
    assert.ok(page.get("music").paused);
    await page.click("player-status");
    assert.equal(page.get("music").paused, false);
    const pending = await setup(songs, { pending: true });
    const before = pending.attempts.length;
    await pending.click("room");
    await pending.click("track-title");
    assert.equal(pending.attempts.length, before, "Loading clicks cannot duplicate the pending request");
    const empty = await setup({ tracks: [] });
    await empty.click("room");
    assert.equal(empty.attempts.length, 0);
  }],
  ["arrow shortcuts seek five percent, keep fractions and clamp without altering video or pause", async () => {
    for (const duration of [120, 3600, 123.45]) {
      const page = await setup(songs, { duration });
      await page.click("toggle-playback");
      page.get("background-video").currentTime = 3;
      const event = await page.key("ArrowRight");
      assert.ok(event.defaultPrevented);
      assert.equal(page.get("music").currentTime, duration * 0.05);
      assert.ok(page.get("music").paused);
      assert.equal(page.get("background-video").currentTime, 3);
      await page.key("ArrowRight", { repeat: true });
      assert.equal(page.get("music").currentTime, duration * 0.1);
      page.get("music").currentTime = duration - 1;
      await page.key("ArrowRight");
      assert.equal(page.get("music").currentTime, duration);
      page.get("music").currentTime = 1;
      await page.key("ArrowLeft");
      assert.equal(page.get("music").currentTime, 0);
      await page.key(" ");
      await page.key("ArrowRight");
      assert.equal(page.get("music").paused, false);
    }
    const unknown = await setup(songs);
    await unknown.key("ArrowRight");
    assert.equal(unknown.get("music").currentTime, 0);
  }],
  ["space and punctuation shortcuts preserve track order, state and repeat guards", async () => {
    const page = await setup(songs);
    await page.key(" ");
    assert.ok(page.get("music").paused);
    await page.key(" ", { repeat: true });
    assert.ok(page.get("music").paused);
    await page.key(".");
    assert.equal(page.get("track-title").textContent, "Second");
    assert.ok(page.get("music").paused);
    await page.key(".", { repeat: true });
    assert.equal(page.get("track-title").textContent, "Second");
    await page.key(",");
    assert.equal(page.get("track-title").textContent, "First");
    await page.key(" ");
    await page.key(",");
    assert.equal(page.get("track-title").textContent, "Third");
    assert.equal(page.get("music").paused, false);
    await page.key(".");
    await page.key(".");
    assert.equal(page.get("track-title").textContent, "Second");
  }],
  ["keyboard shortcuts respect modifiers, fields, native buttons and handled events", async () => {
    const page = await setup(songs, { duration: 120 });
    page.get("track-title").setAttribute("contenteditable", "true");
    for (const properties of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }, { isComposing: true }, { target: "track-title" }, { target: "volume" }, { target: "song-position" }]) {
      const event = await page.key(".", properties);
      assert.equal(page.get("track-title").textContent, "First");
      assert.equal(event.defaultPrevented, false);
    }
    for (const target of ["toggle-playback", "next-track"]) {
      const event = await page.key(" ", { target });
      assert.equal(event.defaultPrevented, false);
      assert.equal(page.get("music").paused, false);
    }
    for (const target of ["volume", "song-position"]) {
      const event = await page.key("ArrowRight", { target });
      assert.equal(event.defaultPrevented, false);
      assert.equal(page.get("music").currentTime, 0);
    }
    await page.key(".", { handled: true });
    assert.equal(page.get("track-title").textContent, "First", "An already handled event must stay handled");
    const event = await page.key("x");
    assert.equal(event.defaultPrevented, false);
  }],
  ["fullscreen toggles the whole document, ignores repeats and handles unsupported or denied entry", async () => {
    const page = await setup(songs);
    await page.key("f");
    assert.equal(page.document.fullscreenElement, page.document.documentElement);
    await page.key("f", { repeat: true });
    assert.deepEqual(page.fullscreenCalls, ["enter"]);
    await page.key("F");
    assert.equal(page.document.fullscreenElement, null);
    assert.deepEqual(page.fullscreenCalls, ["enter", "exit"]);
    for (const options of [{ fullscreenUnsupported: true }, { fullscreenRejected: true }]) {
      const denied = await setup(songs, options);
      await denied.key("f");
      assert.match(denied.get("player-status").textContent, /fullscreen/i);
      assert.equal(denied.document.fullscreenElement, null);
      assert.equal(denied.get("music").paused, false);
    }
  }],
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
