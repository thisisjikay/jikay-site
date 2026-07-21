(function exposeSetParser(globalScope) {
  "use strict";

  const { assignTrackDisplayIndexes, calculateArrangementLength, classifyClipContext } = globalScope.AbletonSetParserCore;
  const {
    allByTag,
    attributeNumber,
    booleanValue,
    directChild,
    directChildren,
    firstByTag,
    firstDirectDescendant,
    firstValueByTag,
    hasAncestorTag,
    isAbsolutePath,
    numberValue,
    plural,
    readColourIndex,
    readName,
    safeDecodeURIComponent,
    splitCamelCase,
    stripExtension,
    titleCase,
    trackTypeFromTag,
    uniqueElements,
    valueOf,
  } = globalScope.AbletonSetXmlUtils;

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

  const RACK_TAGS = new Set(["AudioEffectGroupDevice", "InstrumentGroupDevice", "MidiEffectGroupDevice", "DrumGroupDevice"]);

  const TRACK_TAGS = new Set(["AudioTrack", "MidiTrack", "GroupTrack", "ReturnTrack", "MasterTrack", "PreHearTrack"]);

  const WARP_MODES = {
    0: "Beats",
    1: "Tones",
    2: "Texture",
    3: "Re-Pitch",
    4: "Complex",
    5: "Rex",
    6: "Complex Pro",
  };

  function userError(message, cause = null) {
    const error = new Error(message, cause ? { cause } : undefined);
    error.userFacing = true;
    error.cause = cause;
    return error;
  }

  function parentOf(node) {
    return node?.parentElement || node?.parentNode || null;
  }

  function parseXml(xmlText) {
    const doc = new DOMParser().parseFromString(xmlText, "application/xml");
    const parserError = doc.querySelector ? doc.querySelector("parsererror") : doc.getElementsByTagName("parsererror")[0];
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
      generatedAt: fileMeta.generatedAt || new Date().toISOString(),
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
    assignTrackDisplayIndexes(report.tracks);

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

      const envelopes = uniqueElements([...allByTag(trackNode, "AutomationEnvelope"), ...allByTag(trackNode, "ClipEnvelope")]);
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

    report.session.arrangementLengthBeats = calculateArrangementLength({
      clips: [...report.clips.audio, ...report.clips.midi],
      locators: report.session.locators,
      loop: report.session.loop,
    });
    if (Number.isFinite(report.session.tempo) && report.session.tempo > 0) {
      report.session.arrangementLengthSeconds = (report.session.arrangementLengthBeats * 60) / report.session.tempo;
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
      displayIndex: "",
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
    return value == null ? null : map[value] || String(value);
  }

  function readRouting(node, tagNames) {
    for (const tag of tagNames) {
      const routing = firstByTag(node, tag);
      if (!routing) continue;
      const displayParts = [firstValueByTag(routing, "UpperDisplayString"), firstValueByTag(routing, "LowerDisplayString")].filter(Boolean);
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

    const manufacturer = pluginInfo ? firstValueByTag(pluginInfo, "Manufacturer") || parseBrowserContentPath(node).manufacturer : null;
    const path = pluginInfo ? firstValueByTag(pluginInfo, "Path") : isMax ? readMaxDevicePath(node) : null;

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
    if (/(instrument|analog|operator|sampler|simpler|collision|electric|tension|wavetable|meld|granulator)/.test(lower))
      return "instrument";
    if (/(midi|arpeggiator|chord|pitcher|velocity|notelength)/.test(lower)) return "midi-effect";
    return "audio-effect";
  }

  function findParentDevice(node, trackNode) {
    let current = parentOf(node);
    while (current && current !== trackNode) {
      if (parentOf(current)?.tagName === "Devices") return current;
      current = parentOf(current);
    }
    return null;
  }

  function findBranchName(node) {
    let current = parentOf(node);
    while (current) {
      if (current.tagName.endsWith("Branch")) return readName(current, current.tagName.replace("Branch", " Chain"));
      if (TRACK_TAGS.has(current.tagName)) break;
      current = parentOf(current);
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
        context: classifyClipContext(node, trackNode),
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
        clip.warpMode = warpModeRaw == null ? null : WARP_MODES[warpModeRaw] || String(warpModeRaw);
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
    const nodes = uniqueElements([...allByTag(clipNode, "MidiNoteEvent"), ...allByTag(clipNode, "NoteEvent")]);
    return nodes.map((node) => {
      const pitchAttribute = node.getAttribute("Pitch");
      let pitch = pitchAttribute == null || pitchAttribute === "" ? Number.NaN : Number(pitchAttribute);
      if (!Number.isFinite(pitch)) {
        let current = parentOf(node);
        while (current && current !== clipNode) {
          if (current.tagName === "KeyTrack") {
            pitch = Number(current.getAttribute("Id"));
            break;
          }
          current = parentOf(current);
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
      name: name || effectivePath.split(/[\\/]/).pop() || "Unknown file",
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
        detail:
          "The Set does not contain a usable relative path for these references. This does not prove the files are missing on this computer.",
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
      warnings.push({
        level: "error",
        title: "No tracks were recognised",
        detail: "The file may use an unsupported or unusual XML structure.",
      });
    }
    if (!warnings.length) {
      warnings.push({
        level: "info",
        title: "No obvious compatibility notices found",
        detail: "This is a structural scan, not a guarantee that the project will open or sound correctly.",
      });
    }
    return warnings;
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

  globalScope.AbletonSetParser = {
    groupDevices,
    parseAbletonDocument,
    parseXml,
  };
})(globalThis);
