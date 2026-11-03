const mediaRoot = new URL("../assets/00000/", import.meta.url);
const title = document.querySelector("#track-title");
const status = document.querySelector("#player-status");
const announcement = document.querySelector("#track-announcement");
const previous = document.querySelector("#previous-track");
const toggle = document.querySelector("#toggle-playback");
const next = document.querySelector("#next-track");
const scrubber = document.querySelector("#scrubber");
const songPosition = document.querySelector("#song-position");
const room = document.querySelector(".listening-room");
const volumeControl = document.querySelector(".volume-control");
const volumeInput = document.querySelector("#volume");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let audio = document.querySelector("#music");
let video = document.querySelector("#background-video");
let tracks = [];
let index = 0;
let selection = 0;
let videoSelection = 0;
let audioEvents = new AbortController();
let intendedPlaying = false;
let fallbackVideo = "static.mp4";
let titleStyle = "original";
let backgroundFile = fallbackVideo;
let scrubbing = false;
let scrubSelection = null;
let volume = 1;
let fullscreenPending = false;
const failedTracks = new Set();

function showStatus(message = "") {
  status.textContent = message;
}

function displayTitle(originalTitle) {
  if (titleStyle !== "filename") return originalTitle;
  return `${originalTitle.trim().replace(/\.mp3$/i, "").toLowerCase().replace(/\s+/g, "_")}.mp3`;
}

function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function paintProgress(position, duration) {
  const fraction = duration > 0 ? Math.max(0, Math.min(1, position / duration)) : 0;
  scrubber.style.setProperty("--progress", `${fraction * 100}%`);
  songPosition.setAttribute("aria-valuetext", duration > 0
    ? `${formatTime(position)} of ${formatTime(duration)}`
    : "Position unavailable");
}

function updateProgress() {
  const duration = audio.duration;
  const available = tracks.length > 0 && Number.isFinite(duration) && duration > 0 && !audio.error;
  songPosition.disabled = !available;
  songPosition.max = available ? String(duration) : "1";
  if (!scrubbing) {
    const position = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
    songPosition.value = available ? String(Math.max(0, Math.min(duration, position))) : "0";
  }
  paintProgress(Number(songPosition.value), available ? duration : 0);
}

function updateControls() {
  const playing = !audio.paused && !audio.ended;
  toggle.dataset.playing = String(playing);
  toggle.setAttribute("aria-label", playing ? "Pause" : "Play");
  toggle.setAttribute("aria-busy", String(intendedPlaying && !playing));
}

function syncVideo() {
  if (reducedMotion.matches || !intendedPlaying || audio.paused || audio.ended) {
    video.pause();
    return;
  }
  // A browser may independently block video (for example in low-power mode).
  // The poster remains visible and music continues normally.
  video.play().catch(() => {});
}

function setVideo(file, allowFallback = true) {
  backgroundFile = file;
  const version = ++videoSelection;
  const oldVideo = video;
  const replacement = oldVideo.cloneNode(false);
  replacement.removeAttribute("src");
  replacement.hidden = true;
  replacement.muted = true;
  replacement.defaultMuted = true;
  replacement.preload = "auto";
  oldVideo.pause();
  oldVideo.replaceWith(replacement);
  oldVideo.removeAttribute("src");
  oldVideo.load();
  video = replacement;

  if (reducedMotion.matches) return;

  replacement.addEventListener("loadeddata", () => {
    if (version !== videoSelection) return;
    replacement.hidden = false;
    syncVideo();
  }, { once: true });
  replacement.addEventListener("error", () => {
    if (version !== videoSelection) return;
    if (allowFallback && file !== fallbackVideo) {
      setVideo(fallbackVideo, false);
    } else {
      replacement.hidden = true;
    }
  }, { once: true });
  replacement.src = new URL(file, mediaRoot).href;
  replacement.load();
  syncVideo();
}

function pause() {
  intendedPlaying = false;
  audio.pause();
  video.pause();
  showStatus();
  updateControls();
}

function handleAudioFailure(version) {
  if (version !== selection || failedTracks.has(index)) return;
  failedTracks.add(index);
  if (intendedPlaying && failedTracks.size < tracks.length) {
    let candidate = (index + 1) % tracks.length;
    while (failedTracks.has(candidate)) candidate = (candidate + 1) % tracks.length;
    selectTrack(candidate, true, "Previous track unavailable. Trying the next…");
    return;
  }

  const allFailed = failedTracks.size === tracks.length;
  intendedPlaying = false;
  audio.pause();
  video.pause();
  showStatus(allFailed
    ? "Music is unavailable. Please try again later."
    : "This track is unavailable. Try another track.");
  toggle.disabled = true;
  updateControls();
  updateProgress();
}

async function play() {
  if (!tracks.length || toggle.disabled) return;
  const version = selection;
  intendedPlaying = true;
  showStatus("Loading…");
  updateControls();

  try {
    // Call directly from the button event to retain browser user activation.
    await audio.play();
    if (version !== selection || !intendedPlaying) return;
    syncVideo();
  } catch (error) {
    if (version !== selection || !intendedPlaying) return;
    if (error.name === "NotAllowedError") {
      intendedPlaying = false;
      video.pause();
      showStatus("press play");
      updateControls();
    } else if (error.name !== "AbortError") {
      handleAudioFailure(version);
    }
  }
}

function selectTrack(trackIndex, shouldPlay, message = "") {
  const version = ++selection;
  audioEvents.abort();
  audioEvents = new AbortController();
  const options = { signal: audioEvents.signal };
  // Keep one audio element: Safari grants autoplay permission per element.
  // load() cancels the previous source and any pending play() promise.
  audio.pause();

  index = (trackIndex + tracks.length) % tracks.length;
  scrubbing = false;
  intendedPlaying = shouldPlay;
  const track = tracks[index];
  let trackVideo = track.video || fallbackVideo;
  const updateDetails = () => {
    if (version !== selection) return;
    const styledTitle = displayTitle(track.title);
    title.textContent = styledTitle;
    document.title = `${styledTitle} — 00000`;
    announcement.textContent = `Selected: ${track.title}, by 00000`;
  };
  updateDetails();
  audio.addEventListener("loadedmetadata", () => {
    updateDetails();
    const updatedVideo = track.video || fallbackVideo;
    if (updatedVideo !== trackVideo) {
      trackVideo = updatedVideo;
      setVideo(trackVideo);
    }
  }, options);
  showStatus(message);
  toggle.disabled = false;

  audio.addEventListener("playing", () => {
    if (audio.paused || audio.ended) return;
    if (!intendedPlaying) {
      audio.pause();
      return;
    }
    failedTracks.clear();
    showStatus();
    updateControls();
    syncVideo();
  }, options);
  audio.addEventListener("pause", () => {
    // Ignore a queued pause event from a source we have already replaced.
    if (!audio.paused) return;
    // Native media controls and operating-system interruptions can also pause it.
    // Preserve intent at natural endings so the next song still starts.
    if (!audio.ended && !audio.error) {
      if (intendedPlaying) showStatus("press play");
      intendedPlaying = false;
    }
    updateControls();
    syncVideo();
  }, options);
  audio.addEventListener("waiting", () => {
    if (intendedPlaying) showStatus("Loading…");
    video.pause();
  }, options);
  audio.addEventListener("ended", () => {
    if (audio.ended && intendedPlaying) selectTrack(index + 1, true);
  }, options);
  audio.addEventListener("error", () => {
    if (audio.error) handleAudioFailure(version);
  }, options);
  for (const event of ["loadedmetadata", "durationchange", "timeupdate", "seeked"]) {
    audio.addEventListener(event, updateProgress, options);
  }

  audio.src = new URL(track.file, mediaRoot).href;
  audio.autoplay = shouldPlay;
  audio.load();
  updateProgress();
  setVideo(trackVideo);
  updateControls();
  if (shouldPlay) void play();
}

function step(direction) {
  if (!tracks.length) return;
  failedTracks.clear();
  const shouldPlay = intendedPlaying;
  selectTrack(index + direction, shouldPlay);
}

function togglePlayback() {
  if (toggle.disabled) return;
  if (intendedPlaying) pause();
  else void play();
}

function seekByFraction(direction) {
  const duration = audio.duration;
  if (songPosition.disabled || !Number.isFinite(duration) || duration <= 0 || scrubbing) return;
  const position = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
  try {
    audio.currentTime = Math.max(0, Math.min(duration, position + direction * duration * 0.05));
  } catch {
    showStatus("Couldn’t seek. Try again.");
  }
  updateProgress();
}

async function toggleFullscreen() {
  if (fullscreenPending) return;
  fullscreenPending = true;
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (document.documentElement.requestFullscreen && document.fullscreenEnabled !== false) {
      await document.documentElement.requestFullscreen();
    } else {
      showStatus("Fullscreen isn’t available in this browser.");
    }
  } catch {
    showStatus("Couldn’t enter fullscreen. Try again in your browser.");
  } finally {
    fullscreenPending = false;
  }
}

previous.addEventListener("click", () => step(-1));
next.addEventListener("click", () => step(1));
toggle.addEventListener("click", togglePlayback);

volumeInput.addEventListener("input", () => {
  volume = Math.max(0, Math.min(1, Number(volumeInput.value) / 100));
  audio.volume = volume;
  volumeInput.setAttribute("aria-valuetext", `${Math.round(volume * 100)}%`);
  volumeControl.style.setProperty("--volume", `${volume * 100}%`);
  volumeControl.dataset.muted = String(volume === 0);
});

room.addEventListener("click", event => {
  if (event.defaultPrevented || event.target.closest("a, button, input, select, textarea, [contenteditable], [role='button'], [role='slider'], .transport, .scrubber, .volume-control")) return;
  if (!intendedPlaying) void play();
});

document.addEventListener("keydown", event => {
  if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
  if (event.target.closest("input, textarea, select, [contenteditable], [role='textbox'], [role='slider']")) return;
  if (event.key === " " && event.target.closest("button, [role='button']")) return;
  const key = event.key.toLowerCase();
  if (!["f", " ", ".", ",", "arrowleft", "arrowright"].includes(key)) return;
  event.preventDefault();
  if (event.repeat && key !== "arrowleft" && key !== "arrowright") return;
  if (key === "f") void toggleFullscreen();
  else if (key === " ") togglePlayback();
  else if (key === ".") step(1);
  else if (key === ",") step(-1);
  else seekByFraction(key === "arrowleft" ? -1 : 1);
});

songPosition.addEventListener("pointerdown", () => { scrubSelection = selection; });
songPosition.addEventListener("input", () => {
  if (scrubSelection === null) scrubSelection = selection;
  if (scrubSelection !== selection) { updateProgress(); return; }
  scrubbing = true;
  paintProgress(Number(songPosition.value), audio.duration);
});
songPosition.addEventListener("change", () => {
  const position = Number(songPosition.value);
  const version = scrubSelection;
  scrubbing = false;
  scrubSelection = null;
  if (!songPosition.disabled && (version === null || version === selection)) {
    try {
      // The video is an independent loop; seek only the song and keep its pause state.
      audio.currentTime = position;
    } catch {
      showStatus("Couldn’t seek. Try again.");
    }
  }
  updateProgress();
});
songPosition.addEventListener("pointerup", () => {
  if (!scrubbing) scrubSelection = null;
});
for (const event of ["pointercancel", "blur"]) {
  songPosition.addEventListener(event, () => {
    scrubbing = false;
    scrubSelection = null;
    updateProgress();
  });
}

reducedMotion.addEventListener("change", () => setVideo(backgroundFile));

// Keep the poster visible when returning through the browser's back/forward cache;
// never unexpectedly resume audio after leaving the page.
window.addEventListener("pagehide", pause);

async function initialise() {
  try {
    const response = await fetch(new URL("playlist.json", mediaRoot), { cache: "no-cache" });
    if (!response.ok) throw new Error("Playlist unavailable");
    const playlist = await response.json();
    titleStyle = playlist.titleStyle === "filename" ? "filename" : "original";
    if (typeof playlist.fallbackVideo === "string" && playlist.fallbackVideo.trim()) {
      fallbackVideo = playlist.fallbackVideo;
    }
    if (playlist.soundcloud?.playlistId) {
      const { createSoundCloudSource } = await import("./soundcloud.js?v=controls-1");
      const source = await createSoundCloudSource(playlist.soundcloud);
      audio = source.audio;
      tracks = source.tracks;
    } else tracks = Array.isArray(playlist.tracks)
      ? playlist.tracks.filter(track => track
        && typeof track.title === "string" && track.title.trim()
        && typeof track.file === "string" && track.file.trim())
        .map(track => ({
          title: track.title,
          file: track.file,
          video: typeof track.video === "string" && track.video.trim() ? track.video : null,
        }))
      : [];

    if (!tracks.length) {
      title.textContent = "No tracks available";
      showStatus();
      return;
    }

    audio.volume = volume;
    volumeInput.disabled = false;
    previous.disabled = false;
    next.disabled = false;
    selectTrack(Math.floor(Math.random() * tracks.length), true);
  } catch {
    title.textContent = "Music is unavailable";
    showStatus("Please try again later.");
  }
}

void initialise();
