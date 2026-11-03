// Use SoundCloud's supported widget; no stream URLs, API keys or audio downloads.
function loadWidgetAPI() {
  if (window.SC?.Widget) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const timer = setTimeout(() => reject(new Error("SoundCloud could not load")), 20000);
    script.src = "https://w.soundcloud.com/player/api.js";
    script.onload = () => { clearTimeout(timer); resolve(); };
    script.onerror = () => { clearTimeout(timer); reject(new Error("SoundCloud could not load")); };
    document.head.append(script);
  });
}

export async function createSoundCloudSource(config) {
  await loadWidgetAPI();
  const embed = new URL("https://w.soundcloud.com/player/");
  embed.search = new URLSearchParams({
    url: `https://api.soundcloud.com/playlists/${config.playlistId}`,
    secret_token: config.secretToken || "",
    auto_play: "true",
    visual: "false",
    show_artwork: "false",
    show_comments: "false",
    show_user: "false",
    sharing: "false",
    buying: "false",
  }).toString();
  const iframe = document.createElement("iframe");
  iframe.title = "SoundCloud audio player";
  iframe.className = "soundcloud-audio";
  iframe.allow = "autoplay; encrypted-media";
  iframe.tabIndex = -1;
  iframe.setAttribute("aria-hidden", "true");
  iframe.src = embed.href;
  document.body.append(iframe);

  const widget = window.SC.Widget(iframe);
  const events = window.SC.Widget.Events;
  const sounds = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("SoundCloud timed out")), 20000);
    widget.bind(events.ERROR, () => { clearTimeout(timer); reject(new Error("Playlist unavailable")); });
    widget.bind(events.READY, () => widget.getSounds(items => {
      clearTimeout(timer);
      resolve(items || []);
    }));
  });

  const toTrack = (sound, index) => ({
    title: typeof sound.title === "string" && sound.title.trim() ? sound.title : `Track ${index + 1}`,
    file: `soundcloud:${sound.id}`,
    video: config.videos?.[sound.permalink] || config.videos?.[sound.id] || null,
    url: sound.permalink_url || config.playlistUrl,
    artist: sound.user?.username || "JiKay",
  });
  const tracks = sounds.map(toTrack);

  class SoundCloudAudio extends EventTarget {
    paused = true;
    ended = false;
    error = null;
    src = "";
    wanted = false;
    version = 0;
    expectedIndex = 0;
    pending = null;
    confirmedPlayback = false;
    position = 0;
    relativePosition = 0;
    autoplay = false;
    metadataPending = false;
    seekTarget = null;
    seekDeadline = 0;
    volumeLevel = 1;

    get volume() {
      return this.volumeLevel;
    }

    set volume(value) {
      if (!Number.isFinite(value)) return;
      this.volumeLevel = Math.max(0, Math.min(1, value));
      widget.setVolume(this.volumeLevel * 100);
      this.dispatchEvent(new Event("volumechange"));
    }

    get currentTime() {
      return this.position / 1000;
    }

    set currentTime(seconds) {
      const duration = this.duration;
      if (!Number.isFinite(seconds) || !Number.isFinite(duration) || duration <= 0) return;
      this.position = Math.max(0, Math.min(duration, seconds)) * 1000;
      this.relativePosition = this.position / (duration * 1000);
      this.seekTarget = this.position;
      this.seekDeadline = Date.now() + 5000;
      this.ended = false;
      widget.seekTo(this.position);
      this.dispatchEvent(new Event("timeupdate"));
    }

    get duration() {
      const milliseconds = Number(sounds[this.expectedIndex]?.duration);
      return Number.isFinite(milliseconds) && milliseconds > 0 ? milliseconds / 1000 : NaN;
    }

    constructor() {
      super();
      const current = callback => {
        const version = this.version;
        widget.getCurrentSoundIndex(soundIndex => {
          if (version === this.version && soundIndex === this.expectedIndex) callback();
        });
      };
      widget.bind(events.PLAY, () => current(() => {
        if (!this.wanted) { widget.pause(); return; }
        const version = this.version;
        widget.isPaused(paused => {
          if (version !== this.version || paused || !this.wanted) return;
          this.paused = false;
          this.ended = false;
          this.error = null;
          this.confirmedPlayback = true;
          this.refreshMetadata();
          this.settle();
          this.dispatchEvent(new Event("playing"));
        });
      }));
      widget.bind(events.PAUSE, () => current(() => {
        if (!this.wanted || this.ended) return;
        // skip/seek can queue pause events. Read the widget's current state before
        // treating one as a native pause of the newly selected sound.
        const version = this.version;
        widget.isPaused(paused => {
          if (version !== this.version || !paused || !this.wanted) return;
          this.wanted = false;
          this.paused = true;
          this.settle(new DOMException("Playback paused", "AbortError"));
          this.dispatchEvent(new Event("pause"));
        });
      }));
      widget.bind(events.PLAY_PROGRESS, data => current(() => {
        if (!this.wanted || !this.confirmedPlayback) return;
        this.updatePosition(data);
      }));
      widget.bind(events.SEEK, data => current(() => {
        if (this.updatePosition(data)) this.dispatchEvent(new Event("seeked"));
      }));
      widget.bind(events.FINISH, () => {
        const duration = Number(sounds[this.expectedIndex]?.duration);
        const nearEnd = duration > 0
          ? this.position >= Math.max(duration * 0.9, duration - 2000)
          : this.relativePosition >= 0.99;
        // A queued FINISH from the old song must not skip a newly selected song.
        if (!this.wanted || !this.confirmedPlayback || !nearEnd) return;
        // SoundCloud can already have advanced its index by the time an async
        // getter replies. Handle completion now; the page owns ordered wraparound.
        this.ended = true;
        this.paused = true;
        this.wanted = false;
        this.dispatchEvent(new Event("ended"));
      });
      widget.bind(events.ERROR, () => current(() => {
        this.error = new Error("SoundCloud track unavailable");
        this.settle(this.error);
        this.dispatchEvent(new Event("error"));
      }));
      widget.bind(events.LOAD_PROGRESS, () => this.refreshMetadata());
    }

    updatePosition(data) {
      const position = Number(data.currentPosition);
      if (!Number.isFinite(position) || position < 0) return false;
      // Ignore queued pre-seek progress until SoundCloud confirms the new position.
      if (this.seekTarget !== null && Date.now() < this.seekDeadline
        && Math.abs(position - this.seekTarget) > 1500) return false;
      this.seekTarget = null;
      this.position = position;
      this.relativePosition = Number(data.relativePosition) || 0;
      this.dispatchEvent(new Event("timeupdate"));
      return true;
    }

    refreshMetadata() {
      const selected = sounds[this.expectedIndex];
      const complete = selected?.title?.trim() && Number(selected.duration) > 0;
      if (!selected || complete || this.metadataPending) return;
      const version = this.version;
      const soundIndex = this.expectedIndex;
      this.metadataPending = true;
      widget.getCurrentSound(sound => {
        if (version !== this.version) return;
        this.metadataPending = false;
        if (String(sound?.id) !== String(selected.id) || !sound.title?.trim()) return;
        sounds[soundIndex] = { ...selected, ...sound };
        Object.assign(tracks[soundIndex], toTrack(sounds[soundIndex], soundIndex));
        this.dispatchEvent(new Event("loadedmetadata"));
      });
    }

    settle(error) {
      if (!this.pending) return;
      clearTimeout(this.pending.timer);
      const { resolve, reject } = this.pending;
      this.pending = null;
      if (error) reject(error);
      else resolve();
    }

    load() {
      ++this.version;
      this.settle(new DOMException("Track changed", "AbortError"));
      this.wanted = this.autoplay;
      this.paused = true;
      this.ended = false;
      this.error = null;
      this.confirmedPlayback = false;
      this.position = 0;
      this.relativePosition = 0;
      this.metadataPending = false;
      this.seekTarget = null;
      this.expectedIndex = sounds.findIndex(sound => `soundcloud:${sound.id}` === this.src);
      widget.skip(this.expectedIndex);
      widget.setVolume(this.volumeLevel * 100);
      widget.seekTo(0);
      // Do not cancel the widget's automatic start when this selection should play.
      if (!this.autoplay) widget.pause();
      this.refreshMetadata();
    }

    play() {
      if (!this.paused) return Promise.resolve();
      this.wanted = true;
      if (this.pending) return this.pending.promise;
      const promise = new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          this.wanted = false;
          widget.pause();
          this.settle(new DOMException("press play", "NotAllowedError"));
        }, 8000);
        this.pending = { resolve, reject, timer };
      });
      this.pending.promise = promise;
      widget.play();
      return promise;
    }

    pause() {
      const changed = !this.paused;
      this.wanted = false;
      this.paused = true;
      this.settle(new DOMException("Playback paused", "AbortError"));
      widget.pause();
      if (changed) this.dispatchEvent(new Event("pause"));
    }
  }

  return {
    audio: new SoundCloudAudio(),
    tracks,
  };
}
