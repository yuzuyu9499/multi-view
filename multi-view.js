const htmlEl = document.documentElement;
const input = document.getElementById("youtube-url");
const btn = document.getElementById("add-video");
const grid = document.getElementById("grid");
const gridSizeSelect = document.getElementById("grid-size");
const fullscreenBtn = document.getElementById("fullscreen-toggle");
const reloadBtn = document.getElementById("reload-btn");
let players = [];


function updateGridSize() {
  const n = parseInt(gridSizeSelect.value, 10);
  grid.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
  grid.style.gridTemplateRows = `repeat(${n}, 1fr)`;
}

gridSizeSelect.addEventListener("change", updateGridSize);
updateGridSize();

fullscreenBtn.addEventListener("click", () => {
  if (!document.fullscreenElement) {
    grid.requestFullscreen().catch(err => {
      alert(`フルスクリーンにできません: ${err.message}`);
    });
  } else {
    document.exitFullscreen();
  }
});

function syncPlayerOrder() {
  if (players.length === 0) return;
  const youtubeIframes = Array.from(grid.querySelectorAll('iframe[data-provider="youtube"]'));
  players.sort((a, b) => youtubeIframes.indexOf(a.iframe) - youtubeIframes.indexOf(b.iframe));
}

function createVideoContainer(iframe, provider) {
  const container = document.createElement("div");
  container.className = "video-item";
  container.dataset.provider = provider;

  const controls = document.createElement("div");
  controls.className = "video-controls";

  const movePrevBtn = document.createElement("button");
  movePrevBtn.type = "button";
  movePrevBtn.className = "video-control video-control--move";
  movePrevBtn.dataset.action = "move-prev";
  movePrevBtn.title = "ひとつ前へ移動";
  movePrevBtn.setAttribute("aria-label", "ひとつ前へ移動");
  const movePrevIcon = document.createElement("i");
  movePrevIcon.className = "fa-solid fa-arrow-left";
  movePrevIcon.setAttribute("aria-hidden", "true");
  movePrevBtn.appendChild(movePrevIcon);

  const moveNextBtn = document.createElement("button");
  moveNextBtn.type = "button";
  moveNextBtn.className = "video-control video-control--move";
  moveNextBtn.dataset.action = "move-next";
  moveNextBtn.title = "ひとつ後ろへ移動";
  moveNextBtn.setAttribute("aria-label", "ひとつ後ろへ移動");
  const moveNextIcon = document.createElement("i");
  moveNextIcon.className = "fa-solid fa-arrow-right";
  moveNextIcon.setAttribute("aria-hidden", "true");
  moveNextBtn.appendChild(moveNextIcon);

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "video-control video-control--remove";
  removeBtn.dataset.action = "remove";
  removeBtn.title = "動画を削除";
  removeBtn.setAttribute("aria-label", "動画を削除");
  const removeIcon = document.createElement("i");
  removeIcon.className = "fa-solid fa-xmark";
  removeIcon.setAttribute("aria-hidden", "true");
  removeBtn.appendChild(removeIcon);

  controls.appendChild(movePrevBtn);
  controls.appendChild(moveNextBtn);
  controls.appendChild(removeBtn);

  container.appendChild(controls);
  container.appendChild(iframe);

  return container;
}

grid.addEventListener("click", event => {
  const button = event.target.closest(".video-control");
  if (!button) return;

  const container = button.closest(".video-item");
  if (!container) return;

  const action = button.dataset.action;
  if (action === "remove") {
    removeVideo(container);
  } else if (action === "move-prev") {
    moveVideo(container, -1);
  } else if (action === "move-next") {
    moveVideo(container, 1);
  }
});

function moveVideo(container, direction) {
  const items = Array.from(grid.children);
  const currentIndex = items.indexOf(container);
  if (currentIndex === -1) return;

  const targetIndex = currentIndex + direction;
  if (targetIndex < 0 || targetIndex >= items.length) return;

  if (direction > 0) {
    const referenceNode = items[targetIndex].nextElementSibling;
    grid.insertBefore(container, referenceNode);
  } else {
    grid.insertBefore(container, items[targetIndex]);
  }

  syncPlayerOrder();
}

function removeVideo(container) {
  const iframe = container.querySelector("iframe");
  if (!iframe) return;

  const playerIndex = players.findIndex(entry => entry.iframe === iframe);
  if (playerIndex !== -1) {
    const [entry] = players.splice(playerIndex, 1);
    if (entry && entry.player && typeof entry.player.destroy === "function") {
      entry.player.destroy();
    }
  }

  container.remove();
  updateGridSizeAuto();
  syncPlayerOrder();
}

reloadBtn.addEventListener("click", () => {
  players.forEach(({ player }) => {
    if (!player) return;
    try {
      player.setPlaybackRate(2);
      player.seekTo(player.getDuration(), true);
    } catch (error) {
      console.error(error);
    }
  });
});

function getYouTubeId(url) {
  if (!url) return null;
  url = url.trim().replace(/^http:\/\//i, "https://");

  let match = url.match(/^https?:\/\/(?:www\.)?youtu\.be\/([A-Za-z0-9_-]{11})/);
  if (match) return match[1];

  match = url.match(/[?&]v=([A-Za-z0-9_-]{11})/);
  if (match) return match[1];

  match = url.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{11})/);
  if (match) return match[1];

  match = url.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/);
  if (match) return match[1];

  match = url.match(/youtube\.com\/live\/([A-Za-z0-9_-]{11})/);
  if (match) return match[1];

  return null;
}

function updateGridSizeAuto() {
  const count = grid.children.length;
  if (count === 0) {
    updateGridSize();
    return;
  }

  const n = Math.ceil(Math.sqrt(count)) || 1;
  grid.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
  grid.style.gridTemplateRows = `repeat(${n}, 1fr)`;

  const matchingOption = Array.from(gridSizeSelect.options).find(option => parseInt(option.value, 10) === n);
  if (matchingOption) {
    gridSizeSelect.value = matchingOption.value;
  }
}

function isTwitchUrl(url) {
  return /twitch\.tv/.test(url);
}

function handleAddVideo() {
  const url = input.value.trim();
  if (!url) return;

  let iframe;
  let provider;

  if (isTwitchUrl(url)) {
    const match = url.match(/twitch\.tv\/([^\/\?]+)/);
    if (!match) {
      alert("有効なTwitch URLを入力してください");
      return;
    }
    const channel = match[1];

    iframe = document.createElement("iframe");
    iframe.src = `https://player.twitch.tv/?channel=${channel}&parent=${location.hostname}`;
    iframe.allowFullscreen = true;
    iframe.frameBorder = "0";
    provider = "twitch";
  } else {
    const id = getYouTubeId(url);
    if (!id) {
      alert("有効なYouTube/Twitch URLを入力してください");
      return;
    }

    iframe = document.createElement("iframe");
    iframe.src = `https://www.youtube.com/embed/${id}?enablejsapi=1&autoplay=1&mute=1`;
    iframe.allow = "autoplay; encrypted-media; picture-in-picture";
    iframe.allowFullscreen = true;
    provider = "youtube";
  }

  iframe.dataset.provider = provider;
  const container = createVideoContainer(iframe, provider);
  grid.appendChild(container);

  if (provider === "youtube") {
    const player = new YT.Player(iframe);
    players.push({ iframe, player });
  }

  input.value = "";
  updateGridSizeAuto();
  syncPlayerOrder();
}

btn.addEventListener("click", handleAddVideo);
input.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    event.preventDefault();
    handleAddVideo();
  }
});

