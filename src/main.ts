import "@fontsource/russo-one/400.css";
import "@fontsource/rajdhani/500.css";
import "@fontsource/rajdhani/700.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./styles/tokens.css";
import "./styles/simple.css";
import "./styles/city.css";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

function play(video: HTMLVideoElement) {
  if (reducedMotion) return;
  if (!video.src && video.dataset.src) video.src = video.dataset.src;
  video.play().then(
    () => video.classList.add("is-playing"),
    () => video.classList.remove("is-playing"),
  );
}

function pause(video: HTMLVideoElement) {
  video.pause();
  video.classList.remove("is-playing");
}

// section links scroll without touching the URL hash, which is reserved for project deep links
document.querySelectorAll<HTMLButtonElement>("[data-scroll]").forEach((button) => {
  button.addEventListener("click", () => {
    const target = document.getElementById(button.dataset.scroll ?? "");
    target?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  });
});

const nav = document.querySelector<HTMLElement>("[data-nav]");
const updateNav = () => nav?.classList.toggle("is-solid", window.scrollY > 40);
window.addEventListener("scroll", updateNav, { passive: true });
updateNav();

// filters
const filterButtons = document.querySelectorAll<HTMLButtonElement>("[data-filter]");
const cards = document.querySelectorAll<HTMLElement>("[data-filter-grid] .card");
filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const filter = button.dataset.filter ?? "all";
    filterButtons.forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
    cards.forEach((card) => {
      const engines = card.dataset.engines?.split(" ") ?? [];
      card.hidden = !(filter === "all" || card.dataset.status === filter || engines.includes(filter));
      if (!card.hidden) card.classList.add("is-in");
    });
  });
});

// scroll reveal
const revealObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("is-in");
      revealObserver.unobserve(entry.target);
    }
  },
  { rootMargin: "0px 0px -8% 0px" },
);
document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

// card previews: hover on desktop, in-view on touch screens
document.querySelectorAll<HTMLVideoElement>("[data-card-video]").forEach((video) => {
  const card = video.closest<HTMLElement>(".card");
  if (!card) return;
  if (finePointer) {
    card.addEventListener("pointerenter", () => play(video));
    card.addEventListener("pointerleave", () => pause(video));
  }
});

const autoPlay = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      const video = entry.target as HTMLVideoElement;
      if (entry.isIntersecting) play(video);
      else pause(video);
    }
  },
  { threshold: 0.6 },
);
document.querySelectorAll<HTMLVideoElement>("[data-feature-video]").forEach((v) => autoPlay.observe(v));
if (!finePointer) document.querySelectorAll<HTMLVideoElement>("[data-card-video]").forEach((v) => autoPlay.observe(v));

// hero reel: cycles through every project preview
const reel = document.querySelector<HTMLVideoElement>("[data-reel]");
const reelName = document.querySelector<HTMLElement>("[data-reel-name]");
let reelActive = false;
if (reel && !reducedMotion) {
  reelActive = true;
  const clips = JSON.parse(reel.dataset.reel ?? "[]") as { src: string; name: string }[];
  let current = 0;
  const load = (i: number) => {
    current = i % clips.length;
    reel.src = clips[current].src;
    if (reelName) reelName.textContent = clips[current].name;
    play(reel);
  };
  reel.addEventListener("ended", () => load(current + 1));
  document.addEventListener("visibilitychange", () => {
    if (document.hidden || cityOpen) reel.pause();
    else reel.play().catch(() => {});
  });
  if (clips.length) load(0);
}

// 3D city, loaded only when a visitor asks for it
type CityModule = typeof import("./world/app");
type CityHandle = Awaited<ReturnType<CityModule["createCity"]>>;

const cityEl = document.getElementById("city");
const cityLoading = document.querySelector<HTMLElement>("[data-city-loading]");
const openButtons = document.querySelectorAll<HTMLButtonElement>("[data-open-city]");
let city: Promise<CityHandle> | null = null;
let cityHandle: CityHandle | null = null;
let cityOpen = false;
let opener: HTMLElement | null = null;

function hasWebGL() {
  try {
    return Boolean(document.createElement("canvas").getContext("webgl2"));
  } catch {
    return false;
  }
}

const webgl = hasWebGL();
if (!webgl) {
  openButtons.forEach((button) => {
    button.disabled = true;
    button.title = "Your browser can't show the 3D city (WebGL is unavailable).";
  });
}

async function openCity(trigger?: HTMLElement, projectId?: string) {
  if (!webgl || !cityEl || cityOpen) return;
  cityOpen = true;
  opener = trigger ?? null;
  cityEl.hidden = false;
  document.documentElement.classList.add("city-open");
  if (!projectId) history.replaceState(null, "", "#city");
  reel?.pause();
  cityEl.focus();

  city ??= import("./world/app").then((module) => module.createCity(cityEl, { reducedMotion }));
  try {
    const handle = await city;
    cityHandle = handle;
    if (cityLoading) cityLoading.hidden = true;
    if (projectId && !handle.focusProject(projectId)) history.replaceState(null, "", "#city");
    if (cityOpen) handle.start();
  } catch (error) {
    console.error(error);
    if (cityLoading) cityLoading.querySelector(".city-loading-text")!.textContent = "The 3D city couldn't load on this device.";
  }
}

function closeCity() {
  if (!cityEl || !cityOpen) return;
  cityOpen = false;
  cityEl.hidden = true;
  document.documentElement.classList.remove("city-open");
  history.replaceState(null, "", location.pathname + location.search);
  city?.then((handle) => handle.stop());
  if (reelActive) reel?.play().catch(() => {});
  opener?.focus();
}

openButtons.forEach((button) => button.addEventListener("click", () => openCity(button)));
// the city builds its own "1-page site" buttons, so listen at the document
document.addEventListener("click", (event) => {
  if (event.target instanceof Element && event.target.closest("[data-close-city]")) closeCity();
});
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || !cityOpen) return;
  if (cityHandle?.handleEscape()) return;
  closeCity();
});

// share links: #city opens the city, #<project-id> opens that project in Drive
const hash = location.hash.slice(1);
if (hash === "city") openCity();
else if (/^[a-z0-9-]+$/.test(hash) && hash !== "simple") openCity(undefined, hash);
