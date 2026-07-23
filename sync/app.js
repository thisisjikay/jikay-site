(() => {
  const content = window.SYNC_CONTENT || { placements: [], clients: [] };
  const placementsContainer = document.querySelector("#placements");
  const projectCount = document.querySelector("#project-count");
  const emptyState = document.querySelector("#empty-state");
  const clientsSection = document.querySelector("#clients");
  const logosContainer = document.querySelector("#client-logos");
  const logosTrack = document.querySelector(".client-logos__track");

  const createDetails = (placement, index) => {
    const details = document.createElement("div");
    details.className = "placement__details";

    const number = document.createElement("span");
    number.className = "placement__number";
    number.textContent = String(index + 1).padStart(2, "0");

    const titleGroup = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = placement.title;
    const brand = document.createElement("p");
    brand.textContent = placement.brand;
    titleGroup.append(title, brand);

    const role = document.createElement("p");
    role.className = "placement__role";
    role.textContent = placement.role;

    details.append(number, titleGroup, role);
    return details;
  };

  const createAudioMedia = (placement) => {
    const wrapper = document.createElement("div");
    wrapper.className = "placement__media placement__media--audio";

    const image = document.createElement("img");
    image.src = placement.poster;
    image.alt = placement.alt || "";
    image.loading = "lazy";
    image.decoding = "async";

    const player = document.createElement("audio");
    player.controls = true;
    player.preload = "metadata";
    player.src = placement.audio;
    player.setAttribute("aria-label", `Play ${placement.title} by ${placement.brand}`);
    player.addEventListener("play", () => {
      document.querySelectorAll("audio").forEach((otherPlayer) => {
        if (otherPlayer !== player) otherPlayer.pause();
      });
    });

    wrapper.append(image, player);
    return wrapper;
  };

  const createYouTubeMedia = (placement) => {
    const isFilePreview = window.location.protocol === "file:";
    const wrapper = document.createElement("div");
    wrapper.className = "placement__media placement__media--video";

    const image = document.createElement("img");
    image.src = placement.poster;
    image.alt = placement.alt || "";
    image.loading = "lazy";
    image.decoding = "async";

    const button = document.createElement("button");
    button.className = "video-trigger";
    button.type = "button";
    button.setAttribute(
      "aria-label",
      `${isFilePreview ? "Watch" : "Play"} ${placement.title} by ${placement.brand}`,
    );
    button.innerHTML = `<span class="video-trigger__icon" aria-hidden="true"></span><span>${isFilePreview ? "Watch on YouTube" : "Play film"}</span>`;
    button.addEventListener("click", () => {
      if (isFilePreview) {
        window.open(
          `https://www.youtube.com/watch?v=${encodeURIComponent(placement.youtubeId)}`,
          "_blank",
          "noopener",
        );
        return;
      }

      const frame = document.createElement("iframe");
      frame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(placement.youtubeId)}?autoplay=1&playsinline=1&rel=0`;
      frame.title = `${placement.title} — ${placement.brand}`;
      frame.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      frame.allowFullscreen = true;
      frame.referrerPolicy = "strict-origin-when-cross-origin";
      wrapper.replaceChildren(frame);
    });

    wrapper.append(image, button);
    return wrapper;
  };

  const createSpotifyMedia = (placement) => {
    const wrapper = document.createElement("div");
    wrapper.className = "placement__media placement__media--spotify";
    wrapper.style.setProperty("--spotify-artwork", `url("${placement.poster}")`);

    const image = document.createElement("img");
    image.src = placement.poster;
    image.alt = placement.alt || "";
    image.loading = "lazy";
    image.decoding = "async";

    const link = document.createElement("a");
    link.className = "spotify-link";
    link.href = placement.spotifyUrl;
    link.target = "_blank";
    link.rel = "noopener";
    link.setAttribute("aria-label", `Listen to ${placement.title} on Spotify`);
    link.innerHTML = '<span class="spotify-link__mark" aria-hidden="true"></span><span class="action-label action-label--full">Listen on Spotify</span><span class="action-label action-label--short">Spotify</span><span aria-hidden="true">↗</span>';

    wrapper.append(image, link);
    return wrapper;
  };

  const createCampaignMedia = (placement) => {
    const wrapper = document.createElement("div");
    wrapper.className = "placement__media placement__media--campaign";
    wrapper.style.setProperty("--campaign-artwork", `url("${placement.poster}")`);

    const image = document.createElement("img");
    image.src = placement.poster;
    image.alt = placement.alt || "";
    image.loading = "lazy";
    image.decoding = "async";

    const actions = document.createElement("div");
    actions.className = "campaign-actions";

    const campaignLink = document.createElement("a");
    campaignLink.className = "campaign-link campaign-link--instagram";
    campaignLink.href = placement.campaignUrl;
    campaignLink.target = "_blank";
    campaignLink.rel = "noopener";
    campaignLink.setAttribute("aria-label", `Watch ${placement.title} by ${placement.brand} on Instagram`);
    campaignLink.innerHTML = '<span class="campaign-link__mark" aria-hidden="true"></span><span class="action-label action-label--full">Watch campaign</span><span class="action-label action-label--short">Watch</span><span aria-hidden="true">↗</span>';

    const spotifyLink = document.createElement("a");
    spotifyLink.className = "campaign-link campaign-link--spotify";
    spotifyLink.href = placement.spotifyUrl;
    spotifyLink.target = "_blank";
    spotifyLink.rel = "noopener";
    spotifyLink.setAttribute("aria-label", `Listen to music from ${placement.title} on Spotify`);
    spotifyLink.innerHTML = '<span class="campaign-link__mark" aria-hidden="true"></span><span class="action-label action-label--full">Listen on Spotify</span><span class="action-label action-label--short">Spotify</span><span aria-hidden="true">↗</span>';

    actions.append(campaignLink, spotifyLink);
    wrapper.append(image, actions);
    return wrapper;
  };

  const createDiscoMedia = (placement) => {
    const wrapper = document.createElement("div");
    wrapper.className = "placement__media placement__media--disco";

    const frame = document.createElement("iframe");
    frame.id = "disco-track-209492479";
    frame.name = "disco-track-209492479";
    frame.className = "disco-embed";
    frame.src = placement.discoUrl;
    frame.title = `${placement.title} — ${placement.brand} audio player`;
    frame.loading = "lazy";
    frame.allow = "autoplay; fullscreen";
    frame.allowFullscreen = true;

    wrapper.append(frame);
    return wrapper;
  };

  const createPlacement = (placement, index) => {
    const article = document.createElement("article");
    article.className = "placement";

    const media = placement.type === "youtube"
      ? createYouTubeMedia(placement)
      : placement.type === "spotify"
        ? createSpotifyMedia(placement)
        : placement.type === "campaign"
          ? createCampaignMedia(placement)
          : placement.type === "disco"
            ? createDiscoMedia(placement)
            : createAudioMedia(placement);

    article.append(media, createDetails(placement, index));
    return article;
  };

  content.placements.forEach((placement, index) => {
    placementsContainer.append(createPlacement(placement, index));
  });

  projectCount.textContent = `${String(content.placements.length).padStart(2, "0")} ${content.placements.length === 1 ? "project" : "projects"}`;

  if (!content.placements.length) emptyState.hidden = false;

  if (content.clients.length) {
    const createLogoSet = (duplicate = false) => {
      const set = document.createElement("div");
      set.className = "client-logos__set";
      if (duplicate) set.setAttribute("aria-hidden", "true");

      content.clients.forEach((client) => {
        const item = document.createElement("div");
        item.className = "client-logo";
        item.dataset.client = client.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

        const image = document.createElement("img");
        image.src = client.src;
        image.alt = duplicate ? "" : client.name;
        image.loading = "lazy";
        image.decoding = "async";
        item.append(image);
        set.append(item);
      });

      return set;
    };

    logosTrack.append(createLogoSet(), createLogoSet(true));
    clientsSection.hidden = false;
  }
})();
