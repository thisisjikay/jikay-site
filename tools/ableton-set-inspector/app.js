(() => {
  "use strict";

  const state = {
    report: null,
    sourceXml: "",
    detail: false,
    search: "",
    currentFile: null,
  };

  const $ = (selector) => document.querySelector(selector);
  const els = {
    dropSection: $("#dropSection"),
    dropZone: $("#dropZone"),
    fileInput: $("#fileInput"),
    chooseButton: $("#chooseButton"),
    demoButton: $("#demoButton"),
    supportNote: $("#supportNote"),
    processingSection: $("#processingSection"),
    processingTitle: $("#processingTitle"),
    processingDetail: $("#processingDetail"),
    progressBar: $("#progressBar"),
    errorSection: $("#errorSection"),
    errorTitle: $("#errorTitle"),
    errorMessage: $("#errorMessage"),
    errorDetailsWrap: $("#errorDetailsWrap"),
    errorDetails: $("#errorDetails"),
    tryAgainButton: $("#tryAgainButton"),
    reportSection: $("#reportSection"),
    reportFilename: $("#reportFilename"),
    reportSubhead: $("#reportSubhead"),
    scanStatus: $("#scanStatus"),
    summaryGrid: $("#summaryGrid"),
    reportContent: $("#reportContent"),
    sectionNav: $("#sectionNav"),
    reportSearch: $("#reportSearch"),
    detailToggle: $("#detailToggle"),
    newSetButton: $("#newSetButton"),
    copyButton: $("#copyButton"),
    textButton: $("#textButton"),
    jsonButton: $("#jsonButton"),
    printButton: $("#printButton"),
    themeButton: $("#themeButton"),
  };

  const FRIENDLY_DEVICE_NAMES = {
    AudioEffectGroupDevice: "Audio Effect Rack",
    InstrumentGroupDevice: "Instrument Rack",
    MidiEffectGroupDevice: "MIDI Effect Rack",
    DrumGroupDevice: "Drum Rack",
    Eq8: "EQ Eight",
    Compressor2: "Compressor",
    GlueCompressor: "Glue Compressor",
    AutoFilter: "Auto Filter",
    AutoPan: "Auto Pan",
    BeatRepeat: "Beat Repeat",
    ChannelEq: "Channel EQ",
    Corpus: "Corpus",
    Delay: "Delay",
    Echo: "Echo",
    FilterDelay: "Filter Delay",
    FrequencyShifter: "Frequency Shifter",
    Gate: "Gate",
    Limiter: "Limiter",
    Looper: "Looper",
    MultibandDynamics: "Multiband Dynamics",
    Overdrive: "Overdrive",
    Phaser: "Phaser",
    PhaserNew: "Phaser-Flanger",
    Redux: "Redux",
    Reverb: "Reverb",
    Saturator: "Saturator",
    SimpleDelay: "Simple Delay",
    Spectrum: "Spectrum",
    Tuner: "Tuner",
    Utility: "Utility",
    Vinyl: "Vinyl Distortion",
    Amp: "Amp",
    Cabinet: "Cabinet",
    Pedal: "Pedal",
    DynamicTube: "Dynamic Tube",
    Erosion: "Erosion",
    Resonator: "Resonators",
    Vocoder: "Vocoder",
    Hybrid: "Hybrid Reverb",
    ConvolutionReverb: "Convolution Reverb",
    Roar: "Roar",
    Meld: "Meld",
    GranulatorIII: "Granulator III",
    UltraAnalog: "Analog",
    Collision: "Collision",
    Electric: "Electric",
    InstrumentVector: "Wavetable",
    Operator: "Operator",
    OriginalSimpler: "Simpler",
    MultiSampler: "Sampler",
    StringStudio: "Tension",
    MidiArpeggiator: "Arpeggiator",
    MidiChord: "Chord",
    MidiPitcher: "Pitch",
    MidiRandom: "Random",
    MidiScale: "Scale",
    MidiVelocity: "Velocity",
    NoteLength: "Note Length",
  };

  const RACK_TAGS = new Set([
    "AudioEffectGroupDevice",
    "InstrumentGroupDevice",
    "MidiEffectGroupDevice",
    "DrumGroupDevice",
  ]);

  const TRACK_TAGS = new Set([
    "AudioTrack",
    "MidiTrack",
    "GroupTrack",
    "ReturnTrack",
    "MasterTrack",
    "PreHearTrack",
  ]);

  const WARP_MODES = {
    0: "Beats",
    1: "Tones",
    2: "Texture",
    3: "Re-Pitch",
    4: "Complex",
    5: "Rex",
    6: "Complex Pro",
  };

  const TRACK_COLOURS = [
    "#ff94a6", "#ffa529", "#f9df4b", "#b7d95c", "#69d59d", "#63d3d6", "#6cb6ff", "#8ba1ff",
    "#b79aff", "#e392d0", "#d3d3d3", "#f26767", "#f58f33", "#d1bc3a", "#85b44b", "#4db37a",
    "#34b8b3", "#4a98d1", "#6f7bd3", "#8b68c9", "#c36bb0", "#a5a5a5", "#b95757", "#c06c2f",
    "#9b8d31", "#63873a", "#348459", "#258683", "#33739a", "#515b9b", "#674c91", "#8e4e80",
    "#777777", "#843838", "#8c4f24", "#6e6424", "#486126", "#245d3e", "#175c5b", "#24516e",
    "#3c416f", "#49346a", "#66365c", "#555555", "#ff3636", "#ff6f00", "#e7b800", "#7cb600",
    "#00a65a", "#00a9a5", "#0089d4", "#3f5bdb", "#7351d8", "#c53aa8", "#b5b5b5", "#d31b1b",
    "#d65300", "#b58f00", "#5b8700", "#008440", "#008380", "#0069a2", "#3046a7", "#583ca5",
    "#982980", "#8b8b8b", "#5e1616", "#652f00", "#5c4b00", "#2f4b00", "#004b24", "#004946",
  ];

  function init() {
    bindEvents();
    restoreTheme();
    detectSupport();
  }

  function bindEvents() {
    els.chooseButton.addEventListener("click", (event) => {
      event.stopPropagation();
      els.fileInput.click();
    });
    els.demoButton.addEventListener("click", (event) => {
      event.stopPropagation();
      loadDemo();
    });
    els.dropZone.addEventListener("click", (event) => {
      if (event.target.closest("button")) return;
      els.fileInput.click();
    });
    els.dropZone.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        els.fileInput.click();
      }
    });
    els.fileInput.addEventListener("change", () => {
      const [file] = els.fileInput.files;
      if (file) inspectFile(file);
    });

    ["dragenter", "dragover"].forEach((type) => {
      els.dropZone.addEventListener(type, (event) => {
        event.preventDefault();
        event.stopPropagation();
        els.dropZone.classList.add("dragging");
      });
    });
    ["dragleave", "drop"].forEach((type) => {
      els.dropZone.addEventListener(type, (event) => {
        event.preventDefault();
        event.stopPropagation();
        els.dropZone.classList.remove("dragging");
      });
    });
    els.dropZone.addEventListener("drop", (event) => {
      const file = [...event.dataTransfer.files].find((item) => item.name.toLowerCase().endsWith(".als")) || event.dataTransfer.files[0];
      if (file) inspectFile(file);
    });

    els.tryAgainButton.addEventListener("click", resetToDropZone);
    els.newSetButton.addEventListener("click", resetToDropZone);
    els.detailToggle.addEventListener("change", () => {
      state.detail = els.detailToggle.checked;
      renderReport();
    });
    els.reportSearch.addEventListener("input", () => {
      state.search = els.reportSearch.value.trim().toLowerCase();
      applySearchFilter();
    });
    els.copyButton.addEventListener("click", copyReport);
    els.textButton.addEventListener("click", exportText);
    els.jsonButton.addEventListener("click", exportJson);
    els.printButton.addEventListener("click", () => window.print());
    els.themeButton.addEventListener("click", toggleTheme);
  }

  function detectSupport() {
    if (!("DecompressionStream" in window)) {
      els.supportNote.hidden = false;
      els.supportNote.textContent = "This browser does not provide native gzip decompression. Use a current version of Chrome, Edge, Firefox or Safari.";
    }
  }

  function restoreTheme() {
    try {
      const stored = localStorage.getItem("asi-theme");
      if (stored === "light" || stored === "dark") {
        document.documentElement.dataset.theme = stored;
      }
    } catch {
      // Storage can be unavailable in privacy-restricted or embedded contexts.
    }
  }

  function toggleTheme() {
    const current = document.documentElement.dataset.theme || "dark";
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("asi-theme", next); } catch { /* Storage is optional. */ }
  }

  async function inspectFile(file) {
    try {
      validateFile(file);
      state.currentFile = file;
      showProcessing("Reading Set…", `${formatBytes(file.size)} • ${file.name}`, 10);
      await nextFrame();

      showProcessing("Decompressing…", "Opening the gzip-compressed Ableton XML.", 28);
      const xmlText = await decompressAls(file);
      state.sourceXml = xmlText;
      await nextFrame();

      showProcessing("Parsing structure…", "Finding Set, track and device data.", 51);
      const xmlDocument = parseXml(xmlText);
      await nextFrame();

      showProcessing("Building report…", "Normalising clips, media references and warnings.", 76);
      const report = parseAbletonDocument(xmlDocument, {
        name: file.name,
        size: file.size,
        lastModified: file.lastModified,
      });
      state.report = report;
      await nextFrame();

      showProcessing("Finishing…", "Preparing the interactive report.", 96);
      await delay(80);
      showReport();
    } catch (error) {
      showError(error);
    }
  }

  function validateFile(file) {
    if (!file) throw userError("No file was selected.");
    if (!file.name.toLowerCase().endsWith(".als")) {
      throw userError("Choose an Ableton Live Set with the .als extension.");
    }
    if (file.size === 0) throw userError("This file is empty.");
    if (file.size > 250 * 1024 * 1024) {
      throw userError("This Set is larger than the current 250 MB safety limit.");
    }
    if (!("DecompressionStream" in window)) {
      throw userError("This browser cannot decompress .als files. Use a current version of Chrome, Edge, Firefox or Safari.");
    }
  }

  async function decompressAls(file) {
    try {
      const stream = file.stream().pipeThrough(new DecompressionStream("gzip"));
      return await new Response(stream).text();
    } catch (error) {
      throw userError("The file could not be decompressed. It may be damaged or may not be a standard Ableton Live Set.", error);
    }
  }

  function parseXml(xmlText) {
    const doc = new DOMParser().parseFromString(xmlText, "application/xml");
    const parserError = doc.querySelector("parsererror");
    if (parserError) {
      throw userError("The Set was decompressed, but its XML could not be read.", parserError.textContent);
    }
    if (!doc.documentElement || doc.documentElement.tagName !== "Ableton") {
      throw userError("The file contains XML, but it does not appear to be an Ableton Live Set.");
    }
    return doc;
  }

  function parseAbletonDocument(doc, fileMeta) {
    const root = doc.documentElement;
    const liveSet = firstByTag(root, "LiveSet");
    if (!liveSet) throw userError("No LiveSet section was found in this file.");

    const report = {
      generatedAt: new Date().toISOString(),
      file: {
        name: fileMeta.name,
        size: fileMeta.size,
        lastModified: fileMeta.lastModified ? new Date(fileMeta.lastModified).toISOString() : null,
      },
      live: {
        creator: root.getAttribute("Creator") || "Unknown",
        majorVersion: root.getAttribute("MajorVersion") || "Unknown",
        minorVersion: root.getAttribute("MinorVersion") || "Unknown",
        schemaChangeCount: root.getAttribute("SchemaChangeCount") || "Unknown",
      },
      session: {
        tempo: null,
        timeSignature: null,
        sceneCount: 0,
        scenes: [],
        locatorCount: 0,
        locators: [],
        arrangementLengthBeats: 0,
        arrangementLengthSeconds: null,
        loop: null,
      },
      tracks: [],
      devices: [],
      clips: { audio: [], midi: [] },
      media: { references: [], uniqueFiles: [] },
      automation: { trackEnvelopeCount: 0, clipEnvelopeCount: 0, tracksWithAutomation: 0 },
      routing: { externalInputs: [], externalOutputs: [] },
      warnings: [],
      stats: {},
      parser: { unrecognisedDeviceClasses: [] },
    };

    report.session.tempo = parseTempo(liveSet);
    report.session.timeSignature = parseTimeSignature(liveSet);
    report.session.scenes = parseScenes(liveSet);
    report.session.sceneCount = report.session.scenes.length;
    report.session.locators = parseLocators(liveSet);
    report.session.locatorCount = report.session.locators.length;
    report.session.loop = parseArrangementLoop(liveSet);

    const trackNodes = collectTrackNodes(liveSet);
    const trackMap = new Map();

    trackNodes.forEach((trackNode, index) => {
      const track = parseTrack(trackNode, index);
      report.tracks.push(track);
      trackMap.set(String(track.id), track);
    });

    report.tracks.forEach((track) => {
      if (track.parentGroupId != null && trackMap.has(String(track.parentGroupId))) {
        track.parentGroupName = trackMap.get(String(track.parentGroupId)).name;
      }
    });

    trackNodes.forEach((trackNode, index) => {
      const track = report.tracks[index];
      const devices = parseDevices(trackNode, track);
      track.deviceIds = devices.map((device) => device.id);
      track.deviceCount = devices.length;
      report.devices.push(...devices);

      const audioClips = parseClips(trackNode, track, "audio");
      const midiClips = parseClips(trackNode, track, "midi");
      track.audioClipIds = audioClips.map((clip) => clip.id);
      track.midiClipIds = midiClips.map((clip) => clip.id);
      track.audioClipCount = audioClips.length;
      track.midiClipCount = midiClips.length;
      report.clips.audio.push(...audioClips);
      report.clips.midi.push(...midiClips);

      const envelopes = uniqueElements([
        ...allByTag(trackNode, "AutomationEnvelope"),
        ...allByTag(trackNode, "ClipEnvelope"),
      ]);
      const clipEnvelopeCount = envelopes.filter((node) => hasAncestorTag(node, "AudioClip") || hasAncestorTag(node, "MidiClip")).length;
      const trackEnvelopeCount = Math.max(0, envelopes.length - clipEnvelopeCount);
      track.automationEnvelopeCount = trackEnvelopeCount;
      track.clipEnvelopeCount = clipEnvelopeCount;
      track.hasAutomation = envelopes.length > 0;
      report.automation.trackEnvelopeCount += trackEnvelopeCount;
      report.automation.clipEnvelopeCount += clipEnvelopeCount;
      if (track.hasAutomation) report.automation.tracksWithAutomation += 1;

      collectRouting(report, track);
    });

    report.media.references = report.clips.audio
      .filter((clip) => clip.sample)
      .map((clip) => ({
        ...clip.sample,
        clipId: clip.id,
        clipName: clip.name,
        trackId: clip.trackId,
        trackName: clip.trackName,
      }));
    report.media.uniqueFiles = groupMediaReferences(report.media.references);

    const allClipEnds = [...report.clips.audio, ...report.clips.midi]
      .map((clip) => clip.end)
      .filter(Number.isFinite);
    const locatorTimes = report.session.locators.map((locator) => locator.time).filter(Number.isFinite);
    const loopEnd = report.session.loop?.enabled && Number.isFinite(report.session.loop.end) ? report.session.loop.end : 0;
    report.session.arrangementLengthBeats = Math.max(0, loopEnd, ...allClipEnds, ...locatorTimes);
    if (Number.isFinite(report.session.tempo) && report.session.tempo > 0) {
      report.session.arrangementLengthSeconds = report.session.arrangementLengthBeats * 60 / report.session.tempo;
    }

    report.stats = calculateStats(report);
    report.warnings = buildWarnings(report);
    return report;
  }

  function parseTempo(liveSet) {
    const tempoNodes = allByTag(liveSet, "Tempo");
    for (const tempoNode of tempoNodes) {
      const manual = directChild(tempoNode, "Manual") || firstByTag(tempoNode, "Manual");
      const value = numberValue(manual);
      if (Number.isFinite(value) && value > 0 && value < 1000) return value;
    }
    const manualTempo = firstByTag(liveSet, "TempoAutomationTarget");
    return numberValue(manualTempo, null);
  }

  function parseTimeSignature(liveSet) {
    const signatures = allByTag(liveSet, "RemoteableTimeSignature");
    for (const signature of signatures) {
      const numerator = numberValue(directChild(signature, "Numerator") || firstByTag(signature, "Numerator"));
      const denominator = numberValue(directChild(signature, "Denominator") || firstByTag(signature, "Denominator"));
      if (Number.isFinite(numerator) && Number.isFinite(denominator) && denominator > 0) {
        return `${numerator}/${denominator}`;
      }
    }
    const numerator = numberValue(firstByTag(liveSet, "Numerator"));
    const denominator = numberValue(firstByTag(liveSet, "Denominator"));
    return Number.isFinite(numerator) && Number.isFinite(denominator) ? `${numerator}/${denominator}` : null;
  }

  function parseScenes(liveSet) {
    const scenesContainer = directChild(liveSet, "Scenes");
    if (!scenesContainer) return [];
    return directChildren(scenesContainer, "Scene").map((node, index) => ({
      index: index + 1,
      id: node.getAttribute("Id") || String(index),
      name: readName(node, `Scene ${index + 1}`),
      color: readColourIndex(node),
      tempo: numberValue(firstByTag(node, "Tempo"), null),
    }));
  }

  function parseLocators(liveSet) {
    return allByTag(liveSet, "Locator").map((node, index) => ({
      id: node.getAttribute("Id") || String(index),
      name: readName(node, `Locator ${index + 1}`),
      time: numberValue(directChild(node, "Time") || firstByTag(node, "Time"), null),
    }));
  }

  function parseArrangementLoop(liveSet) {
    const loopOn = firstByTag(liveSet, "LoopOn");
    const loopStart = firstByTag(liveSet, "LoopStart");
    const loopLength = firstByTag(liveSet, "LoopLength");
    const start = numberValue(loopStart, null);
    const length = numberValue(loopLength, null);
    return {
      enabled: booleanValue(loopOn, false),
      start,
      length,
      end: Number.isFinite(start) && Number.isFinite(length) ? start + length : null,
    };
  }

  function collectTrackNodes(liveSet) {
    const nodes = [];
    const seen = new Set();
    const add = (node) => {
      if (!node || seen.has(node)) return;
      if (!TRACK_TAGS.has(node.tagName)) return;
      seen.add(node);
      nodes.push(node);
    };

    const tracksContainer = directChild(liveSet, "Tracks");
    if (tracksContainer) directChildren(tracksContainer).forEach(add);

    const returnsContainer = directChild(liveSet, "ReturnTracks");
    if (returnsContainer) directChildren(returnsContainer).forEach(add);

    add(directChild(liveSet, "MasterTrack"));
    add(directChild(liveSet, "PreHearTrack"));

    if (!nodes.length) {
      allByTag(liveSet, "AudioTrack").forEach(add);
      allByTag(liveSet, "MidiTrack").forEach(add);
      allByTag(liveSet, "GroupTrack").forEach(add);
      allByTag(liveSet, "ReturnTrack").forEach(add);
      allByTag(liveSet, "MasterTrack").forEach(add);
    }
    return nodes;
  }

  function parseTrack(node, index) {
    const type = trackTypeFromTag(node.tagName);
    const mixer = firstByTag(node, "Mixer");
    const onNode = mixer ? directChild(mixer, "On") : null;
    const isOn = booleanValue(onNode ? directChild(onNode, "Manual") || firstByTag(onNode, "Manual") : null, true);
    const parentGroup = directChild(node, "TrackGroupId") || firstDirectDescendant(node, "TrackGroupId");
    const rawParentId = valueOf(parentGroup, null);
    const parentGroupId = rawParentId == null || String(rawParentId) === "-1" ? null : rawParentId;

    return {
      id: node.getAttribute("Id") || `${type}-${index}`,
      index,
      displayIndex: type === "return" ? `R${index + 1}` : type === "master" ? "M" : type === "cue" ? "C" : String(index + 1).padStart(2, "0"),
      name: readName(node, `${titleCase(type)} Track ${index + 1}`),
      type,
      rawType: node.tagName,
      color: readColourIndex(node),
      parentGroupId,
      parentGroupName: null,
      muted: !isOn,
      solo: readMixerBoolean(mixer, "Solo", false),
      armed: readMixerBoolean(mixer, "Arm", false),
      frozen: readTrackFrozen(node),
      volume: readMixerNumber(mixer, "Volume"),
      pan: readMixerNumber(mixer, "Pan"),
      trackDelay: numberValue(firstByTag(node, "TrackDelay"), null),
      monitoring: readMonitoring(node),
      inputRouting: readRouting(node, ["AudioInputRouting", "MidiInputRouting"]),
      outputRouting: readRouting(node, ["AudioOutputRouting", "MidiOutputRouting"]),
      deviceIds: [],
      audioClipIds: [],
      midiClipIds: [],
      deviceCount: 0,
      audioClipCount: 0,
      midiClipCount: 0,
      automationEnvelopeCount: 0,
      clipEnvelopeCount: 0,
      hasAutomation: false,
    };
  }

  function readTrackFrozen(node) {
    const candidates = ["Freeze", "IsFrozen", "Frozen"];
    for (const tag of candidates) {
      const found = directChild(node, tag) || firstDirectDescendant(node, tag);
      if (found) {
        const manual = directChild(found, "Manual");
        return booleanValue(manual || found, false);
      }
    }
    return false;
  }

  function readMixerBoolean(mixer, tag, fallback) {
    if (!mixer) return fallback;
    const container = directChild(mixer, tag) || firstDirectDescendant(mixer, tag);
    if (!container) return fallback;
    return booleanValue(directChild(container, "Manual") || container, fallback);
  }

  function readMixerNumber(mixer, tag) {
    if (!mixer) return null;
    const container = directChild(mixer, tag) || firstDirectDescendant(mixer, tag);
    if (!container) return null;
    return numberValue(directChild(container, "Manual") || container, null);
  }

  function readMonitoring(node) {
    const monitor = firstByTag(node, "MonitoringEnum");
    const value = valueOf(monitor, null);
    const map = { 0: "In", 1: "Auto", 2: "Off" };
    return value == null ? null : (map[value] || String(value));
  }

  function readRouting(node, tagNames) {
    for (const tag of tagNames) {
      const routing = firstByTag(node, tag);
      if (!routing) continue;
      const displayParts = [
        firstValueByTag(routing, "UpperDisplayString"),
        firstValueByTag(routing, "LowerDisplayString"),
      ].filter(Boolean);
      if (displayParts.length) return displayParts.join(" — ");
      const target = firstValueByTag(routing, "Target");
      if (target) return target;
      const external = firstValueByTag(routing, "ExternalOnly");
      if (external) return external;
    }
    return null;
  }

  function parseDevices(trackNode, track) {
    const devices = [];
    const seen = new Set();
    const containers = allByTag(trackNode, "Devices");
    let position = 0;

    containers.forEach((container) => {
      directChildren(container).forEach((node) => {
        if (seen.has(node)) return;
        seen.add(node);
        position += 1;
        devices.push(parseDevice(node, track, position, trackNode));
      });
    });
    return devices;
  }

  function parseDevice(node, track, position, trackNode) {
    const rawClass = node.tagName;
    const vst3Info = firstByTag(node, "Vst3PluginInfo");
    const vst2Info = firstByTag(node, "VstPluginInfo");
    const auInfo = firstByTag(node, "AuPluginInfo");
    const pluginInfo = vst3Info || vst2Info || auInfo;
    const isPlugin = rawClass === "PluginDevice" || Boolean(pluginInfo);
    const isMax = rawClass.startsWith("MxDevice") || rawClass.toLowerCase().includes("maxforlive");
    const isRack = RACK_TAGS.has(rawClass);

    let format = "Ableton";
    if (vst3Info) format = "VST3";
    else if (vst2Info) format = "VST2";
    else if (auInfo) format = "Audio Unit";
    else if (isMax) format = "Max for Live";
    else if (isRack) format = "Rack";

    let name;
    if (pluginInfo) {
      name = firstValueByTag(pluginInfo, "PlugName") || firstValueByTag(pluginInfo, "Name");
    }
    if (!name && isMax) name = readMaxDeviceName(node);
    const customName = valueOf(directChild(node, "UserName"), "");
    if (!name && customName) name = customName;
    if (!name) name = FRIENDLY_DEVICE_NAMES[rawClass] || splitCamelCase(rawClass);

    const manufacturer = pluginInfo
      ? firstValueByTag(pluginInfo, "Manufacturer") || parseBrowserContentPath(node).manufacturer
      : null;
    const path = pluginInfo
      ? firstValueByTag(pluginInfo, "Path")
      : isMax ? readMaxDevicePath(node) : null;

    const on = directChild(node, "On");
    const enabled = booleanValue(on ? directChild(on, "Manual") || firstByTag(on, "Manual") : null, true);
    const parentRack = findParentDevice(node, trackNode);
    const branchName = findBranchName(node);

    return {
      id: `${track.id}-device-${position}-${node.getAttribute("Id") || position}`,
      internalId: node.getAttribute("Id") || null,
      name,
      customName: customName || null,
      rawClass,
      format,
      category: classifyDevice(rawClass, pluginInfo, isRack, isMax),
      manufacturer: manufacturer || null,
      path: path || null,
      trackId: track.id,
      trackName: track.name,
      position,
      enabled,
      parentRackClass: parentRack?.tagName || null,
      parentRackName: parentRack ? FRIENDLY_DEVICE_NAMES[parentRack.tagName] || splitCamelCase(parentRack.tagName) : null,
      branchName,
      browserPath: firstValueByTag(node, "BrowserContentPath") || null,
    };
  }

  function readMaxDeviceName(node) {
    const userName = valueOf(directChild(node, "UserName"), "");
    if (userName) return userName;
    const fileRefs = allByTag(node, "FileRef");
    for (const ref of fileRefs) {
      const name = firstValueByTag(ref, "Name");
      const path = firstValueByTag(ref, "Path");
      if (name && name.toLowerCase().endsWith(".amxd")) return stripExtension(name);
      if (path && path.toLowerCase().includes(".amxd")) return stripExtension(path.split(/[\\/]/).pop());
    }
    return firstValueByTag(node, "OriginalFileName") || FRIENDLY_DEVICE_NAMES[node.tagName] || splitCamelCase(node.tagName);
  }

  function readMaxDevicePath(node) {
    const fileRefs = allByTag(node, "FileRef");
    for (const ref of fileRefs) {
      const path = firstValueByTag(ref, "Path");
      const name = firstValueByTag(ref, "Name");
      if ((path && path.toLowerCase().includes(".amxd")) || (name && name.toLowerCase().endsWith(".amxd"))) {
        return path || name;
      }
    }
    return null;
  }

  function parseBrowserContentPath(node) {
    const value = firstValueByTag(node, "BrowserContentPath") || "";
    const decoded = safeDecodeURIComponent(value);
    const parts = decoded.split(":");
    return {
      manufacturer: parts.length >= 3 ? parts[parts.length - 2] : null,
      name: parts.length ? parts[parts.length - 1] : null,
    };
  }

  function classifyDevice(rawClass, pluginInfo, isRack, isMax) {
    if (isRack) return "rack";
    if (isMax) {
      if (rawClass.toLowerCase().includes("instrument")) return "instrument";
      if (rawClass.toLowerCase().includes("midi")) return "midi-effect";
      return "audio-effect";
    }
    if (pluginInfo) {
      const type = Number(firstValueByTag(pluginInfo, "DeviceType"));
      if (type === 1) return "instrument";
      if (type === 2) return "audio-effect";
      return "plugin";
    }
    const lower = rawClass.toLowerCase();
    if (/(instrument|analog|operator|sampler|simpler|collision|electric|tension|wavetable|meld|granulator)/.test(lower)) return "instrument";
    if (/(midi|arpeggiator|chord|pitcher|velocity|notelength)/.test(lower)) return "midi-effect";
    return "audio-effect";
  }

  function findParentDevice(node, trackNode) {
    let current = node.parentElement;
    while (current && current !== trackNode) {
      if (current.parentElement?.tagName === "Devices") return current;
      current = current.parentElement;
    }
    return null;
  }

  function findBranchName(node) {
    let current = node.parentElement;
    while (current) {
      if (current.tagName.endsWith("Branch")) return readName(current, current.tagName.replace("Branch", " Chain"));
      if (TRACK_TAGS.has(current.tagName)) break;
      current = current.parentElement;
    }
    return null;
  }

  function parseClips(trackNode, track, kind) {
    const tag = kind === "audio" ? "AudioClip" : "MidiClip";
    return uniqueElements(allByTag(trackNode, tag)).map((node, index) => {
      const start = readClipStart(node);
      const end = readClipEnd(node, start);
      const clip = {
        id: `${track.id}-${kind}-clip-${index}-${node.getAttribute("Id") || index}`,
        internalId: node.getAttribute("Id") || null,
        kind,
        name: readClipName(node, `${titleCase(kind)} Clip ${index + 1}`),
        trackId: track.id,
        trackName: track.name,
        context: hasAncestorTag(node, "ClipSlot") ? "Session" : "Arrangement",
        start,
        end,
        duration: Number.isFinite(start) && Number.isFinite(end) ? Math.max(0, end - start) : null,
        loopOn: booleanValue(firstByTag(node, "LoopOn"), false),
        loopStart: numberValue(firstByTag(node, "LoopStart"), null),
        loopEnd: numberValue(firstByTag(node, "LoopEnd"), null),
        color: readColourIndex(node),
        envelopeCount: allByTag(node, "ClipEnvelope").length,
      };

      if (kind === "audio") {
        clip.warped = booleanValue(firstByTag(node, "IsWarped"), false);
        const warpModeRaw = valueOf(firstByTag(node, "WarpMode"), null);
        clip.warpMode = warpModeRaw == null ? null : (WARP_MODES[warpModeRaw] || String(warpModeRaw));
        clip.gain = numberValue(firstByTag(node, "SampleVolume"), null);
        clip.transpose = numberValue(firstByTag(node, "PitchCoarse"), null);
        clip.detune = numberValue(firstByTag(node, "PitchFine"), null);
        clip.warpMarkerCount = allByTag(node, "WarpMarker").length;
        clip.sample = parseSampleReference(node);
      } else {
        const notes = parseMidiNotes(node);
        clip.noteCount = notes.length;
        clip.lowestNote = notes.length ? Math.min(...notes.map((note) => note.pitch).filter(Number.isFinite)) : null;
        clip.highestNote = notes.length ? Math.max(...notes.map((note) => note.pitch).filter(Number.isFinite)) : null;
        clip.notesWithProbability = notes.filter((note) => Number.isFinite(note.probability) && note.probability < 1).length;
      }
      return clip;
    });
  }

  function readClipName(node, fallback) {
    const directName = directChild(node, "Name");
    if (directName) {
      const directValue = valueOf(directName, "");
      if (directValue) return directValue;
      const effective = firstValueByTag(directName, "EffectiveName");
      const user = firstValueByTag(directName, "UserName");
      if (user || effective) return user || effective;
    }
    return fallback;
  }

  function readClipStart(node) {
    const current = numberValue(directChild(node, "CurrentStart") || firstByTag(node, "CurrentStart"), null);
    if (Number.isFinite(current)) return current;
    const timeAttr = Number(node.getAttribute("Time"));
    return Number.isFinite(timeAttr) ? timeAttr : null;
  }

  function readClipEnd(node, start) {
    const current = numberValue(directChild(node, "CurrentEnd") || firstByTag(node, "CurrentEnd"), null);
    if (Number.isFinite(current)) return current;
    const loopEnd = numberValue(firstByTag(node, "LoopEnd"), null);
    if (Number.isFinite(loopEnd)) return Number.isFinite(start) ? start + Math.max(0, loopEnd) : loopEnd;
    return start;
  }

  function parseMidiNotes(clipNode) {
    const nodes = uniqueElements([
      ...allByTag(clipNode, "MidiNoteEvent"),
      ...allByTag(clipNode, "NoteEvent"),
    ]);
    return nodes.map((node) => {
      let pitch = Number(node.getAttribute("Pitch"));
      if (!Number.isFinite(pitch)) {
        let current = node.parentElement;
        while (current && current !== clipNode) {
          if (current.tagName === "KeyTrack") {
            pitch = Number(current.getAttribute("Id"));
            break;
          }
          current = current.parentElement;
        }
      }
      return {
        pitch: Number.isFinite(pitch) ? pitch : null,
        time: attributeNumber(node, "Time"),
        duration: attributeNumber(node, "Duration"),
        velocity: attributeNumber(node, "Velocity"),
        probability: attributeNumber(node, "Probability"),
      };
    });
  }

  function parseSampleReference(clipNode) {
    const sampleRef = firstByTag(clipNode, "SampleRef");
    if (!sampleRef) return null;
    const fileRef = firstByTag(sampleRef, "FileRef");
    if (!fileRef) return null;

    const name = firstValueByTag(fileRef, "Name");
    const absolutePath = firstValueByTag(fileRef, "Path");
    const relativePathNode = firstByTag(fileRef, "RelativePath");
    let relativePath = valueOf(relativePathNode, "");
    if (!relativePath) {
      relativePath = allByTag(relativePathNode || fileRef, "RelativePathElement")
        .map((node) => node.getAttribute("Dir"))
        .filter(Boolean)
        .join("/");
      if (relativePath && name && !relativePath.endsWith(name)) relativePath += `/${name}`;
    }
    const hasRelative = booleanValue(firstByTag(fileRef, "HasRelativePath"), Boolean(relativePath));
    const effectivePath = relativePath || absolutePath || name || "Unknown file";

    return {
      name: name || (effectivePath.split(/[\\/]/).pop() || "Unknown file"),
      absolutePath: absolutePath || null,
      relativePath: relativePath || null,
      hasRelativePath: hasRelative,
      effectivePath,
      originalSize: numberValue(firstByTag(fileRef, "OriginalFileSize"), null),
      originalCrc: valueOf(firstByTag(fileRef, "OriginalCrc"), null),
      sampleRate: numberValue(firstByTag(sampleRef, "SampleRate"), null),
      referenceType: hasRelative ? "Relative reference" : absolutePath ? "Absolute-only reference" : "Unresolved reference",
    };
  }

  function groupMediaReferences(references) {
    const map = new Map();
    references.forEach((ref) => {
      const key = (ref.relativePath || ref.absolutePath || ref.name || "unknown").toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          key,
          name: ref.name,
          absolutePath: ref.absolutePath,
          relativePath: ref.relativePath,
          effectivePath: ref.effectivePath,
          hasRelativePath: ref.hasRelativePath,
          referenceType: ref.referenceType,
          originalSize: ref.originalSize,
          sampleRate: ref.sampleRate,
          occurrences: [],
        });
      }
      map.get(key).occurrences.push({
        clipName: ref.clipName,
        trackName: ref.trackName,
        clipId: ref.clipId,
      });
    });
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  function collectRouting(report, track) {
    const input = track.inputRouting || "";
    const output = track.outputRouting || "";
    if (isExternalRouting(input)) report.routing.externalInputs.push({ trackId: track.id, trackName: track.name, routing: input });
    if (isExternalRouting(output)) report.routing.externalOutputs.push({ trackId: track.id, trackName: track.name, routing: output });
  }

  function isExternalRouting(value) {
    return /\bext(?:ernal)?\b|hardware|audio to|midi to/i.test(value || "");
  }

  function calculateStats(report) {
    const regularTracks = report.tracks.filter((track) => ["audio", "midi", "group"].includes(track.type));
    const returns = report.tracks.filter((track) => track.type === "return");
    const groups = report.tracks.filter((track) => track.type === "group");
    const plugins = report.devices.filter((device) => ["VST2", "VST3", "Audio Unit"].includes(device.format));
    const maxDevices = report.devices.filter((device) => device.format === "Max for Live");
    const racks = report.devices.filter((device) => device.format === "Rack");
    return {
      trackCount: regularTracks.length,
      returnCount: returns.length,
      groupCount: groups.length,
      deviceCount: report.devices.length,
      pluginCount: plugins.length,
      uniquePluginCount: groupDevices(plugins).length,
      maxDeviceCount: maxDevices.length,
      rackCount: racks.length,
      audioClipCount: report.clips.audio.length,
      midiClipCount: report.clips.midi.length,
      uniqueMediaCount: report.media.uniqueFiles.length,
      absoluteOnlyMediaCount: report.media.uniqueFiles.filter((file) => !file.hasRelativePath && file.absolutePath).length,
      frozenTrackCount: report.tracks.filter((track) => track.frozen).length,
      mutedTrackCount: report.tracks.filter((track) => track.muted).length,
    };
  }

  function buildWarnings(report) {
    const warnings = [];
    const auDevices = report.devices.filter((device) => device.format === "Audio Unit");
    const absoluteMedia = report.media.uniqueFiles.filter((file) => !file.hasRelativePath && file.absolutePath);
    const maxAbsolute = report.devices.filter((device) => device.format === "Max for Live" && isAbsolutePath(device.path));
    const externalRouteCount = report.routing.externalInputs.length + report.routing.externalOutputs.length;
    const frozenTracks = report.tracks.filter((track) => track.frozen);
    const disabledDevices = report.devices.filter((device) => !device.enabled);

    if (absoluteMedia.length) {
      warnings.push({
        level: "warning",
        title: `${plural(absoluteMedia.length, "audio file uses", "audio files use")} an absolute-only reference`,
        detail: "The Set does not contain a usable relative path for these references. This does not prove the files are missing on this computer.",
      });
    }
    if (auDevices.length) {
      warnings.push({
        level: "notice",
        title: `${plural(auDevices.length, "Audio Unit plug-in", "Audio Unit plug-ins")} detected`,
        detail: "Audio Units are macOS-specific and may require an equivalent VST format when transferring the Set to Windows.",
      });
    }
    if (maxAbsolute.length) {
      warnings.push({
        level: "warning",
        title: `${plural(maxAbsolute.length, "Max for Live device has", "Max for Live devices have")} an absolute path`,
        detail: "The device path may not resolve on another computer unless the device is also available in that user’s library.",
      });
    }
    if (externalRouteCount) {
      warnings.push({
        level: "notice",
        title: `${plural(externalRouteCount, "external routing assignment", "external routing assignments")} detected`,
        detail: "External hardware input and output availability cannot be verified from a web browser.",
      });
    }
    if (frozenTracks.length) {
      warnings.push({
        level: "info",
        title: `${plural(frozenTracks.length, "track is", "tracks are")} frozen`,
        detail: "Frozen tracks may make project transfer safer when the receiving system lacks a device or plug-in.",
      });
    }
    if (disabledDevices.length) {
      warnings.push({
        level: "info",
        title: `${plural(disabledDevices.length, "device is", "devices are")} disabled`,
        detail: "Disabled devices are still included in the required-device inventory because their saved state remains part of the Set.",
      });
    }
    if (!report.tracks.length) {
      warnings.push({ level: "error", title: "No tracks were recognised", detail: "The file may use an unsupported or unusual XML structure." });
    }
    if (!warnings.length) {
      warnings.push({ level: "info", title: "No obvious compatibility notices found", detail: "This is a structural scan, not a guarantee that the project will open or sound correctly." });
    }
    return warnings;
  }

  function showProcessing(title, detail, progress) {
    hideAllPrimarySections();
    els.processingSection.hidden = false;
    els.processingTitle.textContent = title;
    els.processingDetail.textContent = detail;
    els.progressBar.style.width = `${progress}%`;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showReport() {
    hideAllPrimarySections();
    els.reportSection.hidden = false;
    state.search = "";
    els.reportSearch.value = "";
    renderReport();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showError(error) {
    hideAllPrimarySections();
    els.errorSection.hidden = false;
    els.errorTitle.textContent = error.userFacing ? "The Set could not be read" : "Something went wrong";
    els.errorMessage.textContent = error.message || "An unexpected error occurred.";
    const detail = error.cause ? String(error.cause.stack || error.cause) : error.stack;
    if (detail) {
      els.errorDetailsWrap.hidden = false;
      els.errorDetails.textContent = detail;
    } else {
      els.errorDetailsWrap.hidden = true;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function hideAllPrimarySections() {
    els.dropSection.hidden = true;
    els.processingSection.hidden = true;
    els.errorSection.hidden = true;
    els.reportSection.hidden = true;
  }

  function resetToDropZone() {
    hideAllPrimarySections();
    els.dropSection.hidden = false;
    els.fileInput.value = "";
    state.report = null;
    state.sourceXml = "";
    state.currentFile = null;
    state.search = "";
    els.errorDetails.textContent = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderReport() {
    const report = state.report;
    if (!report) return;

    els.reportFilename.textContent = report.file.name;
    els.reportSubhead.textContent = `${formatBytes(report.file.size)} • ${report.live.creator} • scanned ${formatDateTime(report.generatedAt)}`;
    els.scanStatus.textContent = report.file.name === "Demo Project.als" ? "DEMO REPORT" : "SET INSPECTED LOCALLY";

    const summaryItems = [
      [formatLiveVersion(report), "Live version"],
      [formatNumber(report.session.tempo, "—"), "Tempo"],
      [report.session.timeSignature || "—", "Time signature"],
      [String(report.stats.trackCount), "Tracks"],
      [String(report.stats.pluginCount), "Plug-ins"],
      [formatDuration(report.session.arrangementLengthSeconds), "Arrangement"],
    ];
    els.summaryGrid.innerHTML = summaryItems.map(([value, label]) => `
      <div class="summary-card">
        <div class="value">${escapeHtml(value)}</div>
        <div class="label">${escapeHtml(label)}</div>
      </div>
    `).join("");

    const sections = [
      renderWarningsSection(report),
      renderDevicesSection(report),
      renderTracksSection(report),
      renderClipsSection(report),
      renderMediaSection(report),
      renderRoutingSection(report),
      renderTechnicalSection(report),
    ];
    els.reportContent.innerHTML = sections.join("");
    bindReportInteractions();
    buildSectionNavigation();
    applySearchFilter();
  }

  function renderWarningsSection(report) {
    return sectionTemplate("warnings", "Warnings & notices", report.warnings.length, `
      <div class="warning-list">
        ${report.warnings.map((warning) => `
          <div class="warning-row ${escapeHtml(warning.level)}" data-searchable="${escapeAttr(`${warning.title} ${warning.detail}`)}">
            <div class="warning-level">${escapeHtml(warning.level.toUpperCase())}</div>
            <div><strong>${escapeHtml(warning.title)}</strong><p>${escapeHtml(warning.detail)}</p></div>
          </div>
        `).join("")}
      </div>
    `);
  }

  function renderDevicesSection(report) {
    const groups = groupDevices(report.devices);
    if (!groups.length) return sectionTemplate("devices", "Required devices", 0, emptyState("No devices were found."));
    return sectionTemplate("devices", "Required devices", report.devices.length, `
      <div class="compact-list">
        ${groups.map((group) => {
          const formats = [...new Set(group.items.map((item) => item.format))];
          const tracks = [...new Set(group.items.map((item) => item.trackName))];
          return `
            <div class="compact-row" data-searchable="${escapeAttr(`${group.name} ${formats.join(" ")} ${tracks.join(" ")}`)}">
              <div class="compact-main">
                <strong>${escapeHtml(group.name)}</strong>
                <small>${escapeHtml(group.manufacturer || formats.join(" / "))}</small>
                ${state.detail ? `<ul class="detail-occurrences">${group.items.map((item) => `<li>• ${escapeHtml(item.trackName)}${item.branchName ? ` / ${escapeHtml(item.branchName)}` : ""}${!item.enabled ? " — disabled" : ""}</li>`).join("")}</ul>` : ""}
              </div>
              <div><span class="badge ${formats.includes("Audio Unit") ? "warning" : formats.includes("Max for Live") ? "accent" : ""}">${escapeHtml(formats.join(" / "))}</span></div>
              <div class="compact-count">×${group.items.length}</div>
            </div>
          `;
        }).join("")}
      </div>
    `);
  }

  function renderTracksSection(report) {
    if (!report.tracks.length) return sectionTemplate("tracks", "Tracks", 0, emptyState("No recognised tracks were found."));
    const trackMap = new Map(report.tracks.map((track) => [String(track.id), track]));
    return sectionTemplate("tracks", "Tracks", report.tracks.length, `
      <div class="track-list">
        ${report.tracks.map((track) => {
          const depth = calculateTrackDepth(track, trackMap);
          const devices = report.devices.filter((device) => device.trackId === track.id);
          const searchText = `${track.name} ${track.type} ${track.inputRouting || ""} ${track.outputRouting || ""} ${devices.map((device) => device.name).join(" ")}`;
          return `
            <div class="track-row" data-searchable="${escapeAttr(searchText)}">
              <button class="track-summary" type="button" aria-expanded="false">
                <span class="track-number">${escapeHtml(track.displayIndex)}</span>
                <span class="track-name" style="padding-left:${Math.min(depth, 5) * 18}px">
                  <span class="track-color" style="--track-color:${escapeAttr(trackColour(track.color))}"></span>
                  <span>${escapeHtml(track.name)}</span>
                </span>
                <span class="track-type">${escapeHtml(titleCase(track.type))}</span>
                <span class="track-counts">${track.deviceCount} devices • ${track.audioClipCount + track.midiClipCount} clips</span>
                <span class="track-state">${renderTrackStates(track)} <span class="track-chevron">›</span></span>
              </button>
              <div class="track-details">
                <div class="track-meta-grid">
                  ${trackMeta("Input", track.inputRouting || "—")}
                  ${trackMeta("Output", track.outputRouting || "—")}
                  ${trackMeta("Monitoring", track.monitoring || "—")}
                  ${trackMeta("Parent group", track.parentGroupName || "—")}
                  ${trackMeta("Volume", formatNumber(track.volume, "—", 3))}
                  ${trackMeta("Pan", formatNumber(track.pan, "—", 3))}
                  ${trackMeta("Automation", track.hasAutomation ? `${track.automationEnvelopeCount + track.clipEnvelopeCount} envelopes` : "None detected")}
                  ${trackMeta("State", trackStateText(track))}
                </div>
                <ul class="inline-list">
                  ${devices.length ? devices.map((device) => `
                    <li>
                      <span>${escapeHtml(device.name)}${device.branchName ? `<small> — ${escapeHtml(device.branchName)}</small>` : ""}</span>
                      <small>${escapeHtml(device.format)}${device.enabled ? "" : " • disabled"}</small>
                    </li>
                  `).join("") : `<li><span>No devices</span><small>Empty chain</small></li>`}
                </ul>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `);
  }

  function renderClipsSection(report) {
    const clips = [...report.clips.audio, ...report.clips.midi].sort((a, b) => (a.start ?? 0) - (b.start ?? 0));
    if (!clips.length) return sectionTemplate("clips", "Clips", 0, emptyState("No audio or MIDI clips were found."));
    return sectionTemplate("clips", "Clips", clips.length, `
      <div class="data-table-wrap">
        <table class="data-table">
          <thead><tr><th>Clip</th><th>Track</th><th>Type</th><th>Location</th><th>Start</th><th>Length</th><th>Detail</th></tr></thead>
          <tbody>
            ${clips.map((clip) => `
              <tr data-searchable="${escapeAttr(`${clip.name} ${clip.trackName} ${clip.kind} ${clip.context}`)}">
                <td><span class="table-primary">${escapeHtml(clip.name)}</span></td>
                <td>${escapeHtml(clip.trackName)}</td>
                <td><span class="badge">${escapeHtml(titleCase(clip.kind))}</span></td>
                <td>${escapeHtml(clip.context)}</td>
                <td class="mono">${formatBeat(clip.start)}</td>
                <td class="mono">${formatBeat(clip.duration)}</td>
                <td class="muted">${clip.kind === "audio"
                  ? `${clip.warped ? `Warped${clip.warpMode ? ` • ${escapeHtml(clip.warpMode)}` : ""}` : "Unwarped"}${clip.sample ? ` • ${escapeHtml(clip.sample.name)}` : ""}`
                  : `${clip.noteCount} notes${Number.isFinite(clip.lowestNote) ? ` • ${midiNoteName(clip.lowestNote)}–${midiNoteName(clip.highestNote)}` : ""}`
                }</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `);
  }

  function renderMediaSection(report) {
    const files = report.media.uniqueFiles;
    if (!files.length) return sectionTemplate("media", "Media references", 0, emptyState("No referenced audio files were found."));
    return sectionTemplate("media", "Media references", files.length, `
      <div class="data-table-wrap">
        <table class="data-table">
          <thead><tr><th>File</th><th>Reference</th><th>Used by</th><th>Original size</th><th>Path</th></tr></thead>
          <tbody>
            ${files.map((file) => `
              <tr data-searchable="${escapeAttr(`${file.name} ${file.effectivePath} ${file.occurrences.map((item) => item.trackName).join(" ")}`)}">
                <td><span class="table-primary">${escapeHtml(file.name)}</span></td>
                <td><span class="badge ${!file.hasRelativePath && file.absolutePath ? "warning" : ""}">${escapeHtml(file.referenceType)}</span></td>
                <td>${escapeHtml(state.detail ? file.occurrences.map((item) => `${item.trackName} / ${item.clipName}`).join(", ") : `${file.occurrences.length} ${file.occurrences.length === 1 ? "clip" : "clips"}`)}</td>
                <td class="mono">${file.originalSize ? formatBytes(file.originalSize) : "—"}</td>
                <td class="path-cell mono">${escapeHtml(file.relativePath || file.absolutePath || file.name)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `);
  }

  function renderRoutingSection(report) {
    const rows = [
      ...report.routing.externalInputs.map((item) => ({ ...item, direction: "Input" })),
      ...report.routing.externalOutputs.map((item) => ({ ...item, direction: "Output" })),
    ];
    if (!rows.length) return sectionTemplate("routing", "External routing", 0, emptyState("No obvious external hardware routing was detected."));
    return sectionTemplate("routing", "External routing", rows.length, `
      <div class="data-table-wrap">
        <table class="data-table">
          <thead><tr><th>Track</th><th>Direction</th><th>Routing</th></tr></thead>
          <tbody>${rows.map((row) => `
            <tr data-searchable="${escapeAttr(`${row.trackName} ${row.direction} ${row.routing}`)}">
              <td class="table-primary">${escapeHtml(row.trackName)}</td>
              <td><span class="badge">${escapeHtml(row.direction)}</span></td>
              <td class="mono">${escapeHtml(row.routing)}</td>
            </tr>
          `).join("")}</tbody>
        </table>
      </div>
    `);
  }

  function renderTechnicalSection(report) {
    const items = [
      ["Creator", report.live.creator],
      ["Major version", report.live.majorVersion],
      ["Minor version", report.live.minorVersion],
      ["Schema changes", report.live.schemaChangeCount],
      ["File size", formatBytes(report.file.size)],
      ["Last modified", report.file.lastModified ? formatDateTime(report.file.lastModified) : "Unknown"],
      ["Scenes", String(report.session.sceneCount)],
      ["Locators", String(report.session.locatorCount)],
      ["Return tracks", String(report.stats.returnCount)],
      ["Group tracks", String(report.stats.groupCount)],
      ["Track automation envelopes", String(report.automation.trackEnvelopeCount)],
      ["Clip envelopes", String(report.automation.clipEnvelopeCount)],
      ["Parser", "Browser DOMParser + gzip stream"],
      ["Data handling", "Local browser memory only"],
    ];
    return sectionTemplate("technical", "Technical details", items.length, `
      <div class="key-value-list">
        ${items.map(([key, value]) => `
          <div class="key-value" data-searchable="${escapeAttr(`${key} ${value}`)}"><span>${escapeHtml(key)}</span><strong>${escapeHtml(value)}</strong></div>
        `).join("")}
      </div>
    `);
  }

  function sectionTemplate(id, title, count, body) {
    return `
      <section class="report-section" id="section-${escapeAttr(id)}" data-section-title="${escapeAttr(title)}">
        <div class="section-heading"><h3>${escapeHtml(title)}</h3><span class="count">${count}</span></div>
        <div class="section-body">${body}</div>
      </section>
    `;
  }

  function emptyState(message) {
    return `<div class="empty-state">${escapeHtml(message)}</div>`;
  }

  function bindReportInteractions() {
    document.querySelectorAll(".track-summary").forEach((button) => {
      button.addEventListener("click", () => {
        const row = button.closest(".track-row");
        const open = row.classList.toggle("open");
        button.setAttribute("aria-expanded", String(open));
      });
    });
  }

  function buildSectionNavigation() {
    const sections = [...els.reportContent.querySelectorAll(".report-section")];
    els.sectionNav.innerHTML = sections.map((section) => `
      <a href="#${escapeAttr(section.id)}">${escapeHtml(section.dataset.sectionTitle)}</a>
    `).join("");
  }

  function applySearchFilter() {
    const query = state.search;
    const rows = els.reportContent.querySelectorAll("[data-searchable]");
    rows.forEach((row) => {
      const text = (row.dataset.searchable || "").toLowerCase();
      row.classList.toggle("filtered-out", Boolean(query) && !text.includes(query));
    });
    els.reportContent.querySelectorAll(".report-section").forEach((section) => {
      const searchable = [...section.querySelectorAll("[data-searchable]")];
      const visibleCount = searchable.filter((item) => !item.classList.contains("filtered-out")).length;
      section.classList.toggle("filtered-out", Boolean(query) && searchable.length > 0 && visibleCount === 0);
    });
  }

  function groupDevices(devices) {
    const map = new Map();
    devices.forEach((device) => {
      const key = `${device.name.toLowerCase()}|${device.format.toLowerCase()}`;
      if (!map.has(key)) {
        map.set(key, { name: device.name, manufacturer: device.manufacturer, format: device.format, items: [] });
      }
      map.get(key).items.push(device);
    });
    return [...map.values()].sort((a, b) => {
      if (b.items.length !== a.items.length) return b.items.length - a.items.length;
      return a.name.localeCompare(b.name);
    });
  }

  function calculateTrackDepth(track, trackMap) {
    let depth = 0;
    let current = track;
    const visited = new Set();
    while (current.parentGroupId != null && depth < 8) {
      const key = String(current.parentGroupId);
      if (visited.has(key) || !trackMap.has(key)) break;
      visited.add(key);
      current = trackMap.get(key);
      depth += 1;
    }
    return depth;
  }

  function renderTrackStates(track) {
    const badges = [];
    if (track.frozen) badges.push(`<span class="badge accent">Frozen</span>`);
    if (track.muted) badges.push(`<span class="badge off">Muted</span>`);
    if (track.solo) badges.push(`<span class="badge">Solo</span>`);
    if (track.armed) badges.push(`<span class="badge warning">Armed</span>`);
    return badges.join(" ") || `<span class="badge">Active</span>`;
  }

  function trackStateText(track) {
    const states = [];
    if (track.frozen) states.push("Frozen");
    if (track.muted) states.push("Muted");
    if (track.solo) states.push("Solo");
    if (track.armed) states.push("Armed");
    return states.join(", ") || "Active";
  }

  function trackMeta(label, value) {
    return `<div class="track-meta"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong></div>`;
  }

  function createTextReport(report) {
    const groups = groupDevices(report.devices);
    const lines = [];
    lines.push("ABLETON SET INSPECTOR REPORT");
    lines.push("────────────────────────────");
    lines.push("");
    lines.push(report.file.name);
    lines.push(`${formatLiveVersion(report)} • ${formatNumber(report.session.tempo, "Unknown tempo")} BPM • ${report.session.timeSignature || "Unknown time signature"}`);
    lines.push(`${report.stats.trackCount} Tracks • ${report.stats.returnCount} Returns • ${report.session.sceneCount} Scenes • ${formatDuration(report.session.arrangementLengthSeconds)}`);
    lines.push("");
    lines.push("WARNINGS & NOTICES");
    lines.push("──────────────────");
    lines.push("");
    report.warnings.forEach((warning) => lines.push(`• [${warning.level.toUpperCase()}] ${warning.title} — ${warning.detail}`));
    lines.push("");
    lines.push("REQUIRED DEVICES");
    lines.push("────────────────");
    lines.push("");
    if (groups.length) {
      groups.forEach((group) => {
        lines.push(`• ${group.name} ×${group.items.length} (${[...new Set(group.items.map((item) => item.format))].join(" / ")})`);
        if (state.detail) group.items.forEach((item) => lines.push(`  - ${item.trackName}${item.branchName ? ` / ${item.branchName}` : ""}${item.enabled ? "" : " [disabled]"}`));
      });
    } else lines.push("• No devices found");
    lines.push("");
    lines.push("TRACKS");
    lines.push("──────");
    lines.push("");
    report.tracks.forEach((track) => {
      lines.push(`${track.displayIndex}  ${track.name} — ${titleCase(track.type)} — ${track.deviceCount} devices — ${track.audioClipCount + track.midiClipCount} clips${track.frozen ? " — Frozen" : ""}${track.muted ? " — Muted" : ""}`);
      if (state.detail) {
        const devices = report.devices.filter((device) => device.trackId === track.id);
        devices.forEach((device) => lines.push(`    • ${device.name} (${device.format})${device.enabled ? "" : " [disabled]"}`));
      }
    });
    lines.push("");
    lines.push("MEDIA");
    lines.push("─────");
    lines.push("");
    lines.push(`${report.media.uniqueFiles.length} unique audio references`);
    lines.push(`${report.stats.absoluteOnlyMediaCount} absolute-only references`);
    if (state.detail) report.media.uniqueFiles.forEach((file) => lines.push(`• ${file.name} — ${file.referenceType} — ${file.relativePath || file.absolutePath || "No path"}`));
    lines.push("");
    lines.push(`Generated locally on ${formatDateTime(report.generatedAt)}`);
    return lines.join("\n");
  }

  async function copyReport() {
    if (!state.report) return;
    const text = createTextReport(state.report);
    try {
      await navigator.clipboard.writeText(text);
      temporaryButtonLabel(els.copyButton, "Copied");
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
      temporaryButtonLabel(els.copyButton, "Copied");
    }
  }

  function exportText() {
    if (!state.report) return;
    downloadBlob(createTextReport(state.report), `${baseFilename(state.report.file.name)}-report.txt`, "text/plain;charset=utf-8");
  }

  function exportJson() {
    if (!state.report) return;
    downloadBlob(JSON.stringify(state.report, null, 2), `${baseFilename(state.report.file.name)}-report.json`, "application/json;charset=utf-8");
  }

  function downloadBlob(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  async function loadDemo() {
    try {
      showProcessing("Loading demo…", "Creating a representative Live Set report.", 35);
      await delay(100);
      const doc = parseXml(DEMO_XML);
      state.report = parseAbletonDocument(doc, {
        name: "Demo Project.als",
        size: new Blob([DEMO_XML]).size,
        lastModified: Date.now(),
      });
      state.sourceXml = DEMO_XML;
      showProcessing("Building report…", "Preparing tracks, devices and media.", 85);
      await delay(100);
      showReport();
    } catch (error) {
      showError(error);
    }
  }

  function userError(message, cause = null) {
    const error = new Error(message, cause ? { cause } : undefined);
    error.userFacing = true;
    error.cause = cause;
    return error;
  }

  function directChildren(node, tagName = null) {
    if (!node) return [];
    return [...node.children].filter((child) => !tagName || child.tagName === tagName);
  }

  function directChild(node, tagName) {
    return directChildren(node, tagName)[0] || null;
  }

  function firstDirectDescendant(node, tagName) {
    if (!node) return null;
    for (const child of directChildren(node)) {
      if (child.tagName === tagName) return child;
      if (["Name", "Mixer", "DeviceChain"].includes(child.tagName)) {
        const nested = directChild(child, tagName);
        if (nested) return nested;
      }
    }
    return null;
  }

  function allByTag(node, tagName) {
    if (!node) return [];
    return [...node.getElementsByTagName(tagName)];
  }

  function firstByTag(node, tagName) {
    return allByTag(node, tagName)[0] || null;
  }

  function firstByPath(node, tags) {
    let current = node;
    for (const tag of tags) {
      current = directChild(current, tag) || firstByTag(current, tag);
      if (!current) return null;
    }
    return current;
  }

  function firstValueByTag(node, tagName) {
    return valueOf(firstByTag(node, tagName), "");
  }

  function valueOf(node, fallback = null) {
    if (!node) return fallback;
    const attr = node.getAttribute("Value");
    if (attr != null) return attr;
    const text = node.textContent?.trim();
    return text || fallback;
  }

  function numberValue(node, fallback = null) {
    const value = Number(valueOf(node, NaN));
    return Number.isFinite(value) ? value : fallback;
  }

  function booleanValue(node, fallback = false) {
    const value = valueOf(node, null);
    if (value == null) return fallback;
    if (typeof value === "boolean") return value;
    const normalized = String(value).toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off"].includes(normalized)) return false;
    return fallback;
  }

  function attributeNumber(node, attr) {
    if (!node) return null;
    const value = Number(node.getAttribute(attr));
    return Number.isFinite(value) ? value : null;
  }

  function readName(node, fallback) {
    if (!node) return fallback;
    const nameContainer = directChild(node, "Name") || firstDirectDescendant(node, "Name");
    if (nameContainer) {
      const direct = valueOf(nameContainer, "");
      if (direct) return direct;
      const user = firstValueByTag(nameContainer, "UserName");
      const effective = firstValueByTag(nameContainer, "EffectiveName");
      if (user || effective) return user || effective;
    }
    const user = valueOf(directChild(node, "UserName"), "");
    const effective = valueOf(directChild(node, "EffectiveName"), "");
    return user || effective || fallback;
  }

  function readColourIndex(node) {
    const colorNode = directChild(node, "Color") || directChild(node, "ColorIndex") || firstDirectDescendant(node, "Color") || firstDirectDescendant(node, "ColorIndex");
    return numberValue(colorNode, null);
  }

  function hasAncestorTag(node, tagName) {
    let current = node.parentElement;
    while (current) {
      if (current.tagName === tagName) return true;
      current = current.parentElement;
    }
    return false;
  }

  function uniqueElements(nodes) {
    return [...new Set(nodes.filter(Boolean))];
  }

  function trackTypeFromTag(tag) {
    return {
      AudioTrack: "audio",
      MidiTrack: "midi",
      GroupTrack: "group",
      ReturnTrack: "return",
      MasterTrack: "master",
      PreHearTrack: "cue",
    }[tag] || tag.replace("Track", "").toLowerCase();
  }

  function trackColour(index) {
    if (!Number.isFinite(index)) return "var(--line-strong)";
    return TRACK_COLOURS[Math.abs(index) % TRACK_COLOURS.length];
  }

  function isAbsolutePath(path) {
    return typeof path === "string" && (/^\//.test(path) || /^[A-Za-z]:[\\/]/.test(path));
  }

  function splitCamelCase(value) {
    return String(value || "Unknown Device")
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
      .replace(/\bMidi\b/g, "MIDI")
      .replace(/\bEq\b/g, "EQ")
      .trim();
  }

  function stripExtension(name) {
    return String(name || "").replace(/\.[^.]+$/, "");
  }

  function safeDecodeURIComponent(value) {
    try { return decodeURIComponent(value); } catch { return value; }
  }

  function titleCase(value) {
    return String(value || "")
      .replace(/-/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
      .replace("Midi", "MIDI")
      .replace("Vst", "VST");
  }

  function plural(count, singular, pluralForm) {
    return `${count} ${count === 1 ? singular : pluralForm}`;
  }

  function formatBytes(bytes) {
    const value = Number(bytes);
    if (!Number.isFinite(value) || value < 0) return "—";
    if (value === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
    const number = value / (1024 ** index);
    return `${number.toFixed(index === 0 || number >= 10 ? 0 : 1)} ${units[index]}`;
  }

  function formatNumber(value, fallback = "—", decimals = 2) {
    return Number.isFinite(value) ? Number(value.toFixed(decimals)).toString() : fallback;
  }

  function formatDuration(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0) return "—";
    const total = Math.round(seconds);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}` : `${minutes}:${String(secs).padStart(2, "0")}`;
  }

  function formatBeat(value) {
    return Number.isFinite(value) ? Number(value.toFixed(3)).toString() : "—";
  }

  function formatDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown";
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
  }

  function formatLiveVersion(report) {
    const creator = report.live.creator || "";
    const creatorMatch = creator.match(/(?:Ableton\s+)?Live\s+([\w.]+)/i);
    if (creatorMatch) return `Live ${creatorMatch[1]}`;
    const minor = report.live.minorVersion;
    return minor && minor !== "Unknown" ? `Live ${minor}` : "Unknown";
  }

  function midiNoteName(pitch) {
    if (!Number.isFinite(pitch)) return "—";
    const notes = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
    const note = notes[((pitch % 12) + 12) % 12];
    const octave = Math.floor(pitch / 12) - 2;
    return `${note}${octave}`;
  }

  function baseFilename(filename) {
    return String(filename || "ableton-set").replace(/\.als$/i, "").replace(/[^a-z0-9._-]+/gi, "-");
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, "&#096;");
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function nextFrame() {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }

  function temporaryButtonLabel(button, label) {
    const original = button.textContent;
    button.textContent = label;
    setTimeout(() => { button.textContent = original; }, 1300);
  }

  const DEMO_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Ableton MajorVersion="5" MinorVersion="12.4_3" SchemaChangeCount="12" Creator="Ableton Live 12.4.3">
  <LiveSet>
    <Tracks>
      <GroupTrack Id="1">
        <Name><EffectiveName Value="DRUMS"/><UserName Value="DRUMS"/></Name>
        <Color Value="12"/><TrackGroupId Value="-1"/>
        <DeviceChain><Mixer><On><Manual Value="true"/></On><Volume><Manual Value="0.85"/></Volume><Pan><Manual Value="0"/></Pan></Mixer><DeviceChain><Devices><AudioEffectGroupDevice Id="10"><On><Manual Value="true"/></On><UserName Value="Drum Rack FX"/><Branches><AudioEffectBranch Id="1"><Name><EffectiveName Value="Main"/><UserName Value="Main"/></Name><DeviceChain><AudioToAudioDeviceChain><Devices><GlueCompressor Id="11"><On><Manual Value="true"/></On></GlueCompressor></Devices></AudioToAudioDeviceChain></DeviceChain></AudioEffectBranch></Branches></AudioEffectGroupDevice></Devices></DeviceChain></DeviceChain>
      </GroupTrack>
      <AudioTrack Id="2">
        <Name><EffectiveName Value="KICK"/><UserName Value="KICK"/></Name><Color Value="44"/><TrackGroupId Value="1"/><Freeze Value="false"/>
        <DeviceChain><AudioInputRouting><Target Value="AudioIn/External/S0"/><UpperDisplayString Value="Ext. In"/><LowerDisplayString Value="1"/></AudioInputRouting><AudioOutputRouting><Target Value="AudioOut/Master"/><UpperDisplayString Value="Master"/></AudioOutputRouting><Mixer><On><Manual Value="true"/></On><Solo Value="false"/><Arm Value="false"/><Volume><Manual Value="0.78"/></Volume><Pan><Manual Value="0"/></Pan></Mixer><MainSequencer><Sample><ArrangerAutomation><Events><AudioClip Id="21" Time="0"><CurrentStart Value="0"/><CurrentEnd Value="128"/><Name Value="Kick Print"/><Color Value="44"/><IsWarped Value="false"/><SampleRef><FileRef><HasRelativePath Value="true"/><RelativePath Value="Samples/Recorded/Kick Print.wav"/><Name Value="Kick Print.wav"/><Path Value="/Users/jim/Music/Demo Project/Samples/Recorded/Kick Print.wav"/><OriginalFileSize Value="4821440"/></FileRef><SampleRate Value="48000"/></SampleRef><Loop><LoopStart Value="0"/><LoopEnd Value="128"/><LoopOn Value="false"/></Loop></AudioClip></Events></ArrangerAutomation></Sample></MainSequencer><DeviceChain><Devices><PluginDevice Id="12"><On><Manual Value="true"/></On><PluginDesc><Vst3PluginInfo Id="0"><Name Value="Pro-Q 3"/><Manufacturer Value="FabFilter"/><DeviceType Value="2"/></Vst3PluginInfo></PluginDesc></PluginDevice><Utility Id="13"><On><Manual Value="true"/></On></Utility></Devices></DeviceChain></DeviceChain>
      </AudioTrack>
      <MidiTrack Id="3">
        <Name><EffectiveName Value="BASS"/><UserName Value="BASS"/></Name><Color Value="18"/><TrackGroupId Value="-1"/><Freeze Value="true"/>
        <DeviceChain><MidiInputRouting><UpperDisplayString Value="All Ins"/><LowerDisplayString Value="All Channels"/></MidiInputRouting><AudioOutputRouting><UpperDisplayString Value="Master"/></AudioOutputRouting><Mixer><On><Manual Value="true"/></On><Arm Value="true"/><Volume><Manual Value="0.7"/></Volume><Pan><Manual Value="0"/></Pan></Mixer><MainSequencer><ClipSlotList><ClipSlot><Value><MidiClip Id="31" Time="0"><CurrentStart Value="0"/><CurrentEnd Value="16"/><Name Value="Bass Pattern"/><Loop><LoopStart Value="0"/><LoopEnd Value="16"/><LoopOn Value="true"/></Loop><Notes><KeyTracks><KeyTrack Id="36"><Notes><MidiNoteEvent Time="0" Duration="1" Velocity="105" Probability="1"/><MidiNoteEvent Time="4" Duration="1" Velocity="100" Probability="0.8"/></Notes></KeyTrack><KeyTrack Id="39"><Notes><MidiNoteEvent Time="8" Duration="2" Velocity="98" Probability="1"/></Notes></KeyTrack></KeyTracks></Notes></MidiClip></Value></ClipSlot></ClipSlotList></MainSequencer><DeviceChain><Devices><PluginDevice Id="14"><On><Manual Value="true"/></On><PluginDesc><Vst3PluginInfo Id="0"><Name Value="Serum 2"/><Manufacturer Value="Xfer Records"/><DeviceType Value="1"/></Vst3PluginInfo></PluginDesc></PluginDevice><PluginDevice Id="15"><On><Manual Value="false"/></On><PluginDesc><AuPluginInfo Id="0"><Name Value="Kickstart 2"/><Manufacturer Value="Nicky Romero"/></AuPluginInfo></PluginDesc></PluginDevice><MxDeviceAudioEffect Id="16"><On><Manual Value="true"/></On><UserName Value="Cloudy"/><SourceContext><OriginalFileRef><FileRef><Name Value="Cloudy.amxd"/><Path Value="/Users/jim/Music/Ableton/User Library/Presets/Audio Effects/Max Audio Effect/Cloudy.amxd"/></FileRef></OriginalFileRef></SourceContext></MxDeviceAudioEffect></Devices></DeviceChain></DeviceChain>
      </MidiTrack>
      <AudioTrack Id="4">
        <Name><EffectiveName Value="VOCAL"/><UserName Value="VOCAL"/></Name><Color Value="8"/><TrackGroupId Value="-1"/>
        <DeviceChain><AudioOutputRouting><UpperDisplayString Value="Ext. Out"/><LowerDisplayString Value="3/4"/></AudioOutputRouting><Mixer><On><Manual Value="false"/></On><Volume><Manual Value="0.65"/></Volume><Pan><Manual Value="-0.1"/></Pan></Mixer><MainSequencer><Sample><ArrangerAutomation><Events><AudioClip Id="41" Time="32"><CurrentStart Value="32"/><CurrentEnd Value="96"/><Name Value="Lead Vocal"/><IsWarped Value="true"/><WarpMode Value="6"/><WarpMarkers><WarpMarker SecTime="0" BeatTime="0"/><WarpMarker SecTime="10" BeatTime="20"/></WarpMarkers><SampleRef><FileRef><HasRelativePath Value="false"/><Name Value="Lead Vocal.wav"/><Path Value="/Volumes/Sessions/Vocals/Lead Vocal.wav"/><OriginalFileSize Value="16821440"/></FileRef><SampleRate Value="48000"/></SampleRef></AudioClip></Events></ArrangerAutomation></Sample></MainSequencer><DeviceChain><Devices><PluginDevice Id="17"><On><Manual Value="true"/></On><PluginDesc><VstPluginInfo Id="0"><Path Value="/Library/Audio/Plug-Ins/VST/Soundtoys/EchoBoy.vst"/><PlugName Value="EchoBoy"/></VstPluginInfo></PluginDesc></PluginDevice></Devices></DeviceChain></DeviceChain>
      </AudioTrack>
    </Tracks>
    <ReturnTracks><ReturnTrack Id="5"><Name><EffectiveName Value="A-Reverb"/><UserName Value="A-Reverb"/></Name><Color Value="29"/><TrackGroupId Value="-1"/><DeviceChain><Mixer><On><Manual Value="true"/></On><Volume><Manual Value="0.55"/></Volume></Mixer><DeviceChain><Devices><Reverb Id="18"><On><Manual Value="true"/></On></Reverb></Devices></DeviceChain></DeviceChain></ReturnTrack></ReturnTracks>
    <MasterTrack Id="0"><Name><EffectiveName Value="Main"/><UserName Value=""/></Name><DeviceChain><Mixer><Tempo><Manual Value="143"/></Tempo><On><Manual Value="true"/></On><Volume><Manual Value="0.8"/></Volume></Mixer><DeviceChain><Devices><Limiter Id="19"><On><Manual Value="true"/></On></Limiter></Devices></DeviceChain></DeviceChain></MasterTrack>
    <Scenes><Scene Id="0"><Name><EffectiveName Value="INTRO"/><UserName Value="INTRO"/></Name><Color Value="12"/></Scene><Scene Id="1"><Name><EffectiveName Value="VERSE"/><UserName Value="VERSE"/></Name><Color Value="18"/></Scene></Scenes>
    <Locators><Locator Id="0"><Time Value="0"/><Name Value="INTRO"/></Locator><Locator Id="1"><Time Value="32"/><Name Value="VERSE"/></Locator><Locator Id="2"><Time Value="96"/><Name Value="OUTRO"/></Locator></Locators>
    <TimeSignature><TimeSignatures><RemoteableTimeSignature><Numerator Value="4"/><Denominator Value="4"/><Time Value="0"/></RemoteableTimeSignature></TimeSignatures></TimeSignature>
    <LoopOn Value="true"/><LoopStart Value="0"/><LoopLength Value="128"/>
  </LiveSet>
</Ableton>`;

  init();
})();
