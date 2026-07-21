(() => {
  "use strict";

  const { groupDevices, parseAbletonDocument, parseXml } = globalThis.AbletonSetParser;
  const { titleCase } = globalThis.AbletonSetXmlUtils;

  const state = {
    report: null,
    sourceXml: "",
    detail: false,
    search: "",
    showNativeDevices: false,
    collapsedSections: new Set(),
    currentFile: null,
  };

  const $ = (selector) => document.querySelector(selector);
  const els = {
    dropSection: $("#dropSection"),
    dropZone: $("#dropZone"),
    fileInput: $("#fileInput"),
    chooseButton: $("#chooseButton"),
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
    printButton: $("#printButton"),
    themeButton: $("#themeButton"),
  };

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
    els.printButton.addEventListener("click", () => window.print());
    els.themeButton.addEventListener("click", toggleTheme);
  }

  function detectSupport() {
    if (!("DecompressionStream" in window)) {
      els.supportNote.hidden = false;
      els.supportNote.textContent =
        "This browser does not provide native gzip decompression. Use a current version of Chrome, Edge, Firefox or Safari.";
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
    try {
      localStorage.setItem("asi-theme", next);
    } catch {
      /* Storage is optional. */
    }
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
    state.showNativeDevices = false;
    state.collapsedSections.clear();
    els.errorDetails.textContent = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderReport() {
    const report = state.report;
    if (!report) return;

    els.reportFilename.textContent = report.file.name;
    els.reportSubhead.textContent = `${formatBytes(report.file.size)} • ${report.live.creator} • scanned ${formatDateTime(report.generatedAt)}`;
    els.scanStatus.textContent = "SET INSPECTED LOCALLY";

    const summaryItems = [
      [formatLiveVersion(report), "Live version"],
      [formatNumber(report.session.tempo, "—"), "Tempo"],
      [report.session.timeSignature || "—", "Time signature"],
      [String(report.stats.trackCount), "Tracks"],
      [String(report.stats.pluginCount), "Plug-ins"],
      [formatDuration(report.session.arrangementLengthSeconds), "Arrangement"],
    ];
    els.summaryGrid.innerHTML = summaryItems
      .map(
        ([value, label]) => `
      <div class="summary-card">
        <div class="value">${escapeHtml(value)}</div>
        <div class="label">${escapeHtml(label)}</div>
      </div>
    `,
      )
      .join("");

    const sections = [
      renderWarningsSection(report),
      renderDevicesSection(report),
      renderTracksSection(report),
      renderMediaSection(report),
      renderTechnicalSection(report),
    ];
    els.reportContent.innerHTML = sections.join("");
    bindReportInteractions();
    buildSectionNavigation();
    applySearchFilter();
  }

  function renderWarningsSection(report) {
    return sectionTemplate(
      "warnings",
      "Warnings & notices",
      report.warnings.length,
      `
      <div class="warning-list">
        ${report.warnings
          .map(
            (warning) => `
          <div class="warning-row ${escapeHtml(warning.level)}" data-searchable="${escapeAttr(`${warning.title} ${warning.detail}`)}">
            <div class="warning-level">${escapeHtml(warning.level.toUpperCase())}</div>
            <div><strong>${escapeHtml(warning.title)}</strong><p>${escapeHtml(warning.detail)}</p></div>
          </div>
        `,
          )
          .join("")}
      </div>
    `,
    );
  }

  function renderDevicesSection(report) {
    const allGroups = groupDevices(report.devices);
    if (!allGroups.length) return sectionTemplate("devices", "Required devices", 0, emptyState("No devices were found."));
    const groups = state.showNativeDevices ? allGroups : allGroups.filter((group) => !group.items.every(isAbletonNativeDevice));
    return sectionTemplate(
      "devices",
      "Required devices",
      report.devices.length,
      `
      <div class="section-controls">
        <label class="toggle-control">
          <input id="nativeDevicesToggle" type="checkbox"${state.showNativeDevices ? " checked" : ""}>
          <span class="toggle-ui" aria-hidden="true"></span>
          Ableton native devices
        </label>
      </div>
      ${
        groups.length
          ? `
      <div class="compact-list">
        ${groups
          .map((group) => {
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
          })
          .join("")}
      </div>
      `
          : emptyState("No third-party, Max for Live or other required devices were found. Enable Ableton native devices to include them.")
      }
    `,
    );
  }

  function isAbletonNativeDevice(device) {
    return device.format === "Ableton" || device.format === "Rack";
  }

  function renderTracksSection(report) {
    if (!report.tracks.length) return sectionTemplate("tracks", "Tracks", 0, emptyState("No recognised tracks were found."));
    const trackMap = new Map(report.tracks.map((track) => [String(track.id), track]));
    return sectionTemplate(
      "tracks",
      "Tracks",
      report.tracks.length,
      `
      <div class="track-list">
        ${report.tracks
          .map((track) => {
            const depth = calculateTrackDepth(track, trackMap);
            const devices = report.devices.filter((device) => device.trackId === track.id);
            const searchText = `${track.name} ${track.type} ${track.inputRouting || ""} ${track.outputRouting || ""} ${devices.map((device) => device.name).join(" ")}`;
            return `
            <div class="track-row" data-searchable="${escapeAttr(searchText)}">
              <button class="track-summary" type="button" aria-expanded="false">
                <span class="track-number">${escapeHtml(track.displayIndex)}</span>
                <span class="track-name" style="padding-left:${Math.min(depth, 5) * 18}px">
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
                  ${
                    devices.length
                      ? devices
                          .map(
                            (device) => `
                    <li>
                      <span>${escapeHtml(device.name)}${device.branchName ? `<small> — ${escapeHtml(device.branchName)}</small>` : ""}</span>
                      <small>${escapeHtml(device.format)}${device.enabled ? "" : " • disabled"}</small>
                    </li>
                  `,
                          )
                          .join("")
                      : `<li><span>No devices</span><small>Empty chain</small></li>`
                  }
                </ul>
              </div>
            </div>
          `;
          })
          .join("")}
      </div>
    `,
    );
  }

  function renderMediaSection(report) {
    const files = report.media.uniqueFiles;
    if (!files.length) return sectionTemplate("media", "Media references", 0, emptyState("No referenced audio files were found."));
    return sectionTemplate(
      "media",
      "Media references",
      files.length,
      `
      <div class="data-table-wrap">
        <table class="data-table">
          <thead><tr><th>File</th><th>Reference</th><th>Used by</th><th>Original size</th><th>Path</th></tr></thead>
          <tbody>
            ${files
              .map(
                (file) => `
              <tr data-searchable="${escapeAttr(`${file.name} ${file.effectivePath} ${file.occurrences.map((item) => item.trackName).join(" ")}`)}">
                <td><span class="table-primary">${escapeHtml(file.name)}</span></td>
                <td><span class="badge ${!file.hasRelativePath && file.absolutePath ? "warning" : ""}">${escapeHtml(file.referenceType)}</span></td>
                <td>${escapeHtml(state.detail ? file.occurrences.map((item) => `${item.trackName} / ${item.clipName}`).join(", ") : `${file.occurrences.length} ${file.occurrences.length === 1 ? "clip" : "clips"}`)}</td>
                <td class="mono">${file.originalSize ? formatBytes(file.originalSize) : "—"}</td>
                <td class="path-cell mono">${escapeHtml(file.relativePath || file.absolutePath || file.name)}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `,
    );
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
    return sectionTemplate(
      "technical",
      "Technical details",
      items.length,
      `
      <div class="key-value-list">
        ${items
          .map(
            ([key, value]) => `
          <div class="key-value" data-searchable="${escapeAttr(`${key} ${value}`)}"><span>${escapeHtml(key)}</span><strong>${escapeHtml(value)}</strong></div>
        `,
          )
          .join("")}
      </div>
    `,
    );
  }

  function sectionTemplate(id, title, count, body) {
    const collapsed = state.collapsedSections.has(id);
    return `
      <section class="report-section${collapsed ? " collapsed" : ""}" id="section-${escapeAttr(id)}" data-section-id="${escapeAttr(id)}" data-section-title="${escapeAttr(title)}">
        <button class="section-heading" type="button" aria-expanded="${String(!collapsed)}" aria-controls="section-body-${escapeAttr(id)}">
          <h3>${escapeHtml(title)}</h3>
          <span class="section-heading-meta"><span class="count">${count}</span><span class="section-chevron" aria-hidden="true">›</span></span>
        </button>
        <div class="section-body" id="section-body-${escapeAttr(id)}">${body}</div>
      </section>
    `;
  }

  function emptyState(message) {
    return `<div class="empty-state">${escapeHtml(message)}</div>`;
  }

  function bindReportInteractions() {
    document.querySelectorAll(".section-heading").forEach((button) => {
      button.addEventListener("click", () => {
        const section = button.closest(".report-section");
        const collapsed = section.classList.toggle("collapsed");
        button.setAttribute("aria-expanded", String(!collapsed));
        if (collapsed) state.collapsedSections.add(section.dataset.sectionId);
        else state.collapsedSections.delete(section.dataset.sectionId);
      });
    });
    const nativeDevicesToggle = document.querySelector("#nativeDevicesToggle");
    nativeDevicesToggle?.addEventListener("change", () => {
      state.showNativeDevices = nativeDevicesToggle.checked;
      renderReport();
    });
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
    els.sectionNav.innerHTML = sections
      .map(
        (section) => `
      <a href="#${escapeAttr(section.id)}">${escapeHtml(section.dataset.sectionTitle)}</a>
    `,
      )
      .join("");
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
    lines.push(
      `${formatLiveVersion(report)} • ${formatNumber(report.session.tempo, "Unknown tempo")} BPM • ${report.session.timeSignature || "Unknown time signature"}`,
    );
    lines.push(
      `${report.stats.trackCount} Tracks • ${report.stats.returnCount} Returns • ${report.session.sceneCount} Scenes • ${formatDuration(report.session.arrangementLengthSeconds)}`,
    );
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
        if (state.detail)
          group.items.forEach((item) =>
            lines.push(`  - ${item.trackName}${item.branchName ? ` / ${item.branchName}` : ""}${item.enabled ? "" : " [disabled]"}`),
          );
      });
    } else lines.push("• No devices found");
    lines.push("");
    lines.push("TRACKS");
    lines.push("──────");
    lines.push("");
    report.tracks.forEach((track) => {
      lines.push(
        `${track.displayIndex}  ${track.name} — ${titleCase(track.type)} — ${track.deviceCount} devices — ${track.audioClipCount + track.midiClipCount} clips${track.frozen ? " — Frozen" : ""}${track.muted ? " — Muted" : ""}`,
      );
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
    if (state.detail)
      report.media.uniqueFiles.forEach((file) =>
        lines.push(`• ${file.name} — ${file.referenceType} — ${file.relativePath || file.absolutePath || "No path"}`),
      );
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

  function userError(message, cause = null) {
    const error = new Error(message, cause ? { cause } : undefined);
    error.userFacing = true;
    error.cause = cause;
    return error;
  }

  function formatBytes(bytes) {
    const value = Number(bytes);
    if (!Number.isFinite(value) || value < 0) return "—";
    if (value === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
    const number = value / 1024 ** index;
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
    return hours
      ? `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
      : `${minutes}:${String(secs).padStart(2, "0")}`;
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

  function baseFilename(filename) {
    return String(filename || "ableton-set")
      .replace(/\.als$/i, "")
      .replace(/[^a-z0-9._-]+/gi, "-");
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
    setTimeout(() => {
      button.textContent = original;
    }, 1300);
  }

  init();
})();
