(function exposeXmlUtils(globalScope) {
  "use strict";

  function directChildren(node, tagName = null) {
    if (!node) return [];
    const children = node.children ? [...node.children] : [...node.childNodes].filter((child) => child.nodeType === 1);
    return children.filter((child) => !tagName || child.tagName === tagName);
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
    const value = Number(valueOf(node, Number.NaN));
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
    const raw = node.getAttribute(attr);
    if (raw == null || raw === "") return null;
    const value = Number(raw);
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
    const colorNode =
      directChild(node, "Color") ||
      directChild(node, "ColorIndex") ||
      firstDirectDescendant(node, "Color") ||
      firstDirectDescendant(node, "ColorIndex");
    return numberValue(colorNode, null);
  }

  function hasAncestorTag(node, tagName) {
    let current = node.parentElement || node.parentNode;
    while (current) {
      if (current.tagName === tagName) return true;
      current = current.parentElement || current.parentNode;
    }
    return false;
  }

  function uniqueElements(nodes) {
    return [...new Set(nodes.filter(Boolean))];
  }

  function trackTypeFromTag(tag) {
    return (
      {
        AudioTrack: "audio",
        MidiTrack: "midi",
        GroupTrack: "group",
        ReturnTrack: "return",
        MasterTrack: "master",
        PreHearTrack: "cue",
      }[tag] || tag.replace("Track", "").toLowerCase()
    );
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
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
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

  globalScope.AbletonSetXmlUtils = {
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
  };
})(globalThis);
