// Run with: node tools/test-00000-soundcloud.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "../00000/soundcloud.js"), "utf8")
  .replace("export async function", "async function");
const flush = async () => { for (let n = 0; n < 30; n++) await Promise.resolve(); };

async function setup({ blocked = false } = {}) {
  const listeners = new Map();
  const frames = [];
  const events = { READY: "ready", PLAY: "play", PLAY_PROGRESS: "progress", PAUSE: "pause", FINISH: "finish", ERROR: "error" };
  const sounds = [
    { id: 42, title: "First", duration: 100000, permalink: "first", permalink_url: "https://soundcloud.com/artist/first", user: { username: "Artist" } },
    { id: 84, title: "Second", duration: 120000, permalink: "second", permalink_url: "https://soundcloud.com/artist/second", user: { username: "Artist" } },
  ];
  const emit = (name, payload) => { for (const listener of listeners.get(name) || []) listener(payload); };
  const widget = {
    index: 0, paused: true, seeks: [], pauses: 0,
    bind(name, listener) {
      if (!listeners.has(name)) listeners.set(name, []);
      listeners.get(name).push(listener);
      if (name === events.READY) queueMicrotask(listener);
    },
    getSounds: callback => queueMicrotask(() => callback(sounds)),
    getCurrentSoundIndex(callback) { const index = this.index; queueMicrotask(() => callback(index)); },
    isPaused(callback) { const paused = this.paused; queueMicrotask(() => callback(paused)); },
    skip(index) { this.index = index; },
    seekTo(position) { this.seeks.push(position); },
    pause() { this.pauses++; const changed = !this.paused; this.paused = true; if (changed) queueMicrotask(() => emit(events.PAUSE)); },
    play() { if (!blocked) { this.paused = false; queueMicrotask(() => emit(events.PLAY)); } },
  };
  const factory = () => widget;
  factory.Events = events;
  const context = vm.createContext({
    window: { SC: { Widget: factory } }, URL, URLSearchParams,
    EventTarget, Event, DOMException, setTimeout, clearTimeout,
    document: {
      createElement: () => ({ setAttribute() {} }),
      body: { append: frame => frames.push(frame) },
    },
  });
  vm.runInContext(source, context);
  const result = await context.createSoundCloudSource({
    playlistId: 123, secretToken: "s-test", playlistUrl: "https://soundcloud.com/artist/sets/test/s-test",
    videos: { first: "video/first.mp4" },
  });
  return { ...result, widget, emit, events, frames };
}

(async () => {
  {
    const page = await setup();
    assert.equal(page.tracks.length, 2);
    assert.equal(page.tracks[0].title, "First");
    assert.equal(page.tracks[0].file, "soundcloud:42");
    assert.equal(page.tracks[0].video, "video/first.mp4");
    assert.equal(page.tracks[0].artist, "Artist");
    const embed = new URL(page.frames[0].src);
    assert.equal(embed.searchParams.get("secret_token"), "s-test");
    assert.equal(embed.searchParams.get("url"), "https://api.soundcloud.com/playlists/123");
    assert.equal(embed.searchParams.get("auto_play"), "true");
    console.log("PASS playlist metadata, optional videos and private embed token");
  }
  {
    const { audio, widget } = await setup();
    audio.src = "soundcloud:84";
    audio.autoplay = true;
    audio.load();
    assert.equal(widget.pauses, 0, "Loading the initial song must not cancel autoplay");
    assert.equal(audio.wanted, true);
    await audio.play();
    assert.equal(audio.paused, false);
    audio.pause();
    console.log("PASS autoplay selection starts without an intervening pause command");
  }
  {
    const { audio, widget } = await setup();
    audio.src = "soundcloud:42";
    audio.load();
    await audio.play();
    assert.equal(audio.paused, false);
    audio.pause();
    await flush();
    assert.ok(audio.paused);
    const seeks = widget.seeks.length;
    await audio.play();
    assert.equal(widget.seeks.length, seeks, "Resume must not restart the song");
    audio.pause();
    audio.src = "soundcloud:84";
    audio.load();
    await flush();
    assert.ok(audio.paused, "A paused track change stays paused");
    assert.equal(widget.index, 1);
    assert.equal(widget.seeks.at(-1), 0);
    console.log("PASS play/pause, resume and paused track selection");
  }
  {
    const { audio, widget, emit, events } = await setup();
    audio.src = "soundcloud:42";
    audio.load();
    const stale = audio.play();
    const rejected = assert.rejects(stale, { name: "AbortError" });
    audio.src = "soundcloud:84";
    audio.load();
    await rejected;
    await audio.play();
    await flush();
    assert.equal(widget.index, 1);
    assert.equal(audio.paused, false);
    let ended = 0;
    audio.addEventListener("ended", () => { ended++; });
    emit(events.FINISH); // Delayed completion of the previous song.
    await flush();
    assert.equal(ended, 0, "A stale FINISH must not skip the newly selected song");
    emit(events.PLAY_PROGRESS, { currentPosition: 119500, relativePosition: 0.996 });
    await flush();
    widget.index = 0; // The widget may auto-advance before the FINISH callback.
    emit(events.FINISH);
    await flush();
    assert.equal(ended, 1);
    assert.ok(audio.ended);
    audio.pause();
    console.log("PASS stale completion rejection and legitimate completion despite widget auto-advance");
  }
  {
    const { audio } = await setup({ blocked: true });
    audio.src = "soundcloud:42";
    audio.load();
    const attempt = audio.play();
    const rejected = assert.rejects(attempt, { name: "AbortError" });
    audio.pause();
    await rejected;
    assert.ok(audio.paused);
    assert.equal(audio.pending, null);
    console.log("PASS cancelling blocked playback clears the pending attempt and timer");
  }
  console.log("5 SoundCloud scenarios passed.");
})().catch(error => { console.error(error); process.exitCode = 1; });
