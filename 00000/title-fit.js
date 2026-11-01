// Fit the complete title on one line, retaining the CSS size for shorter names.
(() => {
  const title = document.querySelector("#track-title");
  let frame = 0;
  let lastWidth = 0;

  function fit() {
    title.style.removeProperty("font-size");
    const preferredSize = parseFloat(getComputedStyle(title).fontSize);
    const minimumSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const availableWidth = title.clientWidth;
    const textWidth = title.scrollWidth;

    if (availableWidth > 0 && textWidth > availableWidth) {
      const fittedSize = preferredSize * (availableWidth - 2) / textWidth;
      title.style.fontSize = `${Math.max(minimumSize, fittedSize)}px`;
    }

    // Extremely long future titles retain their full text for assistive technology
    // and a tooltip, while CSS safely clips at the readable minimum font size.
    if (title.scrollWidth > title.clientWidth) title.title = title.textContent;
    else title.removeAttribute("title");
  }

  function scheduleFit() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      fit();
    });
  }

  new MutationObserver(scheduleFit).observe(title, {
    childList: true, characterData: true, subtree: true,
  });
  new ResizeObserver(([entry]) => {
    if (entry.contentRect.width === lastWidth) return;
    lastWidth = entry.contentRect.width;
    scheduleFit();
  }).observe(title);
  window.addEventListener("resize", scheduleFit);
  document.fonts.ready.then(scheduleFit);
  document.fonts.addEventListener("loadingdone", scheduleFit);
  scheduleFit();
})();
