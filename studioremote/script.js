(() => {
  const video = document.querySelector('.hero__video');
  const control = document.querySelector('.video-control');
  const icon = control.querySelector('.video-control__icon path');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let wantsPlayback = !reducedMotion.matches;
  let inView = true;
  const connection = document.querySelector('.product-connection');
  const updateConnection = () => {
    connection.classList.toggle('is-paused', !inView || document.hidden || !wantsPlayback);
  };

  const updateControl = () => {
    const playing = !video.paused && !video.ended;
    icon.setAttribute('d', playing ? 'M4 3H6V13H4Z M10 3H12V13H10Z' : 'M5 3 13 8 5 13Z');
    control.setAttribute('aria-label', playing ? 'Pause background video' : 'Play background video');
    updateConnection();
  };

  const play = async () => {
    if (!video.getAttribute('src')) {
      video.src = window.matchMedia('(max-width: 40rem)').matches
        ? '../assets/video/studio-remote-mobile.mp4'
        : '../assets/video/studio-remote-desktop.mp4';
      video.muted = true;
    }
    try {
      await video.play();
    } catch {
      // The poster stays visible if autoplay is blocked or the source cannot load.
      updateControl();
    }
  };

  video.addEventListener('playing', () => {
    if (!wantsPlayback || !inView || document.hidden) {
      video.pause();
      return;
    }
    video.classList.add('is-ready');
    updateControl();
  });
  video.addEventListener('pause', updateControl);
  video.addEventListener('error', () => {
    video.classList.remove('is-ready');
    control.hidden = true;
  });
  control.addEventListener('click', () => {
    wantsPlayback = video.paused;
    if (wantsPlayback) play();
    else video.pause();
  });
  reducedMotion.addEventListener('change', () => {
    wantsPlayback = !reducedMotion.matches;
    updateConnection();
    if (!wantsPlayback) {
      video.pause();
      video.classList.remove('is-ready');
    } else if (inView && !document.hidden) play();
  });
  document.addEventListener('visibilitychange', () => {
    updateConnection();
    if (document.hidden) video.pause();
    else if (wantsPlayback && inView) play();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      updateConnection();
      if (!inView) video.pause();
      else if (wantsPlayback && !document.hidden) play();
    }, { threshold: 0 }).observe(document.querySelector('.hero'));
  }

  control.hidden = false;
  updateConnection();
  if (wantsPlayback && !document.hidden) play();
})();
