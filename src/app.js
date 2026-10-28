/* Port of reference/maaz-online-prototype.html. Structure, numbers and behaviour follow the prototype;
   data comes from the content build instead of being hard-coded. */
import * as THREE from "three";
import profileData from "./generated/profile.json";
import projectsData from "./generated/projects.json";
import showreelData from "./generated/showreel.json";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { CSSCOL, esc, gridHTML, reelChapters, toProject } from "./site/templates";

/* ===================================================================== */
const PROJECTS = projectsData.map(toProject);
const PROFILE = profileData;
const SHORT = PROFILE.shortName || PROFILE.name.split(" ")[0];
const EMAIL = PROFILE.email;
const MAILTO = EMAIL ? "mailto:" + EMAIL : "#";
const GITHUB = PROFILE.github;
const CV_URL = PROFILE.cvPath || "";
const SHOWREEL = { ...showreelData, chapters: reelChapters(showreelData) };
const SPECIALS = [
  { kind: "about", name: "About me", sub: "My studio", color: "#FFD24A" },
  { kind: "contact", name: "Contact", sub: "Radio tower", color: "#7EE08F" },
];
const TOUR = ["kingdomland", "nayzak", "orionmeta", "kungfu-karate", "mars-simulation", "contact"];
function stopInfo(i) {
  if (i < PROJECTS.length) { const p = PROJECTS[i]; return { name: p.name, sub: p.engineLabel || "Details coming soon", color: CSSCOL[p.engine], role: p.role }; }
  const sp = SPECIALS[i - PROJECTS.length]; return { name: sp.name, sub: sp.sub, color: sp.color, role: "" };
}
const REVIEWS = PROFILE.reviews;

/* ===================================================================== */
const COLORS = { unity: 0x4DB6FF, unreal: 0xFF8A3D, tbd: 0xC7A6FF };
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (id) => document.getElementById(id);
const app = $("app");
["cvLink", "cvLink2", "cvLink3"].forEach((id) => { if (CV_URL) $(id).href = CV_URL; else $(id).addEventListener("click", (e) => e.preventDefault()); });
if (window.matchMedia("(pointer: coarse)").matches) document.body.classList.add("touch");

/* canvas text needs the web fonts loaded first */
const fontsReady = Promise.all(
  ['400 40px "Russo One"', "500 40px Rajdhani", "600 40px Rajdhani", "700 40px Rajdhani", '400 20px "IBM Plex Mono"'].map((f) => document.fonts.load(f)),
).then(() => document.fonts.ready, () => document.fonts.ready);

let view = "drive", look = "day", cardIndex = -1;
let hooks = { onView: null, onLook: null, travel: null };
if (/[?&]debug\b/.test(location.search)) window.__ui = { openTheater, indexOf: (id) => PROJECTS.findIndex((p) => p.id === id) };

/* ---------- remembered "tried" options (per viewer) ---------- */
let tried = {};
try { tried = JSON.parse(localStorage.getItem("maaz-tried") || "{}") || {}; } catch (e) { tried = {}; }
function markTried(k) { tried[k] = true; try { localStorage.setItem("maaz-tried", JSON.stringify(tried)); } catch (e) {} refreshDots(); }
const optionButtons = () => [...document.querySelectorAll("[data-view],[data-look]")];
function refreshDots() {
  const mb = document.getElementById("menuBtn");
  if (mb) mb.classList.toggle("new", ["drive", "spectate", "simple", "day", "night", "bp"].some((k) => !tried[k]));
  optionButtons().forEach((b) => {
    const k = b.dataset.view || b.dataset.look;
    b.classList.toggle("new", !tried[k] && b.getAttribute("aria-pressed") !== "true");
  });
}

/* ---------- card ---------- */
function cine(i) {
  if (view === "simple") return;
  const st = stopInfo(i);
  $("lowT").textContent = st.name; $("lowS").textContent = [st.sub, st.role].filter(Boolean).join(" — "); $("lowBar").style.background = st.color;
  document.body.classList.add("cine"); hideHint(); $("drawer").classList.remove("open"); $("menuBtn").setAttribute("aria-expanded", "false");
}
let arrivedIdx = -1;
function showDetails(i) { if (i < PROJECTS.length) openCard(i); else openSpecial(SPECIALS[i - PROJECTS.length].kind); document.body.classList.add("paneled"); }
function leaveArrival() { arrivedIdx = -1; endTheater(); document.body.classList.remove("cine", "arrived", "paneled"); }
/* theater: a banner's video played large, with the project panel beside it */
let theaterIdx = -1;
function openTheater(i) {
  const p = i < PROJECTS.length ? PROJECTS[i] : null;
  if (hooks.tour && document.body.classList.contains("touring")) hooks.tour.stop();
  if (view === "simple" || !p || !p.media.video) { endTheater(); showDetails(i); return; }
  document.body.classList.add("theater"); theaterIdx = i;
  showDetails(i); hooks.onTheater?.();
  const v = $("thVid");
  if (v.dataset.i !== String(i)) { v.src = p.media.video; v.poster = p.media.poster || ""; v.dataset.i = String(i); }
  v.play().catch(() => {});
}
function endTheater() {
  theaterIdx = -1;
  if (!document.body.classList.contains("theater")) return;
  document.body.classList.remove("theater"); $("thVid").pause();
}
function actBtn(label, fn, primary, href) {
  const el = document.createElement(href ? "a" : "button"); el.className = "btn" + (primary ? " primary" : "");
  if (href) { el.href = href; if (/^http/.test(href)) { el.target = "_blank"; el.rel = "noopener"; } } else { el.type = "button"; el.addEventListener("click", fn); }
  el.textContent = label; return el;
}
/* arriving at a building: the 3D banner carries the content; a small action bar offers more */
function arrive(i) {
  if (view === "simple") { showDetails(i); return; }
  arrivedIdx = i; if (i < PROJECTS.length && typeof markVisited === "function") markVisited(i);
  cine(i); document.body.classList.add("arrived"); document.body.classList.remove("paneled");
  const act = $("act"); act.innerHTML = "";
  if (i < PROJECTS.length) {
    const p = PROJECTS[i], nx = (i + 1) % PROJECTS.length;
    if (p.media.video) { act.append(actBtn("▶ Watch the video", () => openTheater(i), true)); act.append(actBtn("Project details", () => showDetails(i))); }
    else act.append(actBtn("See full project details", () => showDetails(i), true));
    if (p.links.length) act.append(actBtn(p.links[0].label, null, false, p.links[0].href));
    if (!document.body.classList.contains("touring")) act.append(actBtn("Next: " + PROJECTS[nx].name + " →", () => goTo(nx)));
  } else if (SPECIALS[i - PROJECTS.length].kind === "about") {
    act.append(actBtn("Read more about me", () => showDetails(i), true));
    act.append(actBtn("Download CV", null, false, CV_URL || "#"));
    act.append(actBtn("Contact me →", () => { if (hooks.driveTo) hooks.driveTo(PROJECTS.length + 1); }));
  } else {
    act.append(actBtn("Email me", null, true, MAILTO));
    act.append(actBtn("Start a project", null, false, MAILTO + "?subject=New%20project"));
    act.append(actBtn("GitHub", null, false, GITHUB));
  }
  const leave = document.createElement("button"); leave.type = "button"; leave.className = "btn"; leave.textContent = "Keep exploring"; leave.addEventListener("click", leaveArrival); act.append(leave);
}
function openStop(i) { arrive(i); }
function openSpecial(kind) {
  cardIndex = -1; let h = "";
  if (kind === "about") {
    $("cTitle").textContent = "About me"; $("cMeta").textContent = "Game developer, Unity and Unreal Engine, " + PROFILE.yearsExperience + "+ years";
    h += '<p class="note">I build gameplay systems and real-time worlds, then make them run fast on PC, mobile and the web. I have shipped mobile games, a WebGL metaverse, Unreal simulations and open-world city projects.</p>';
    h += '<div class="meta">What I work with</div><div class="sv-chips"><span>Unity</span><span>Unreal Engine 5</span><span>C#</span><span>C++</span><span>Blueprints</span><span>WebGL</span><span>iOS and Android</span><span>Multiplayer</span><span>Firebase</span><span>AWS S3</span></div>';
    const edu = PROFILE.education[0];
    if (edu) h += '<dl class="facts"><dt>Education</dt><dd>' + esc(edu.degree + ", " + edu.school + ", " + edu.period.split(/\s*[–-]\s*/).pop()) + "</dd></dl>";
    const r = REVIEWS[0]; if (r) h += '<div class="meta">What a client said</div><p class="note">“' + esc(r.short) + "” <br>★★★★★ " + esc(r.source) + "</p>";
    h += '<div class="card-actions"><a class="btn primary" href="' + (CV_URL || "#") + '">Download CV</a><a class="btn" href="' + esc(MAILTO) + '">Email me</a></div>';
  } else {
    $("cTitle").textContent = "Contact"; $("cMeta").textContent = "Freelance projects and full-time roles";
    h += '<p class="note">Building a game in Unity or Unreal? Tell me what you are making and where you are stuck.</p>';
    h += '<div class="card-actions"><a class="btn primary" href="' + esc(MAILTO) + '?subject=New%20project">Start a project</a><a class="btn" href="' + esc(MAILTO) + '">Email me</a><a class="btn" href="' + esc(GITHUB) + '" target="_blank" rel="noopener">GitHub</a></div>';
  }
  $("cBody").innerHTML = h; $("card").classList.add("show"); $("shade").classList.add("show");
  cine(PROJECTS.length + SPECIALS.findIndex((x) => x.kind === kind));
}
function openCard(i) {
  const p = PROJECTS[i]; cardIndex = i; if (typeof markVisited === "function") markVisited(i); cine(i);
  const bp = look === "bp";
  $("cTitle").textContent = p.name;
  $("cMeta").textContent = [p.engineLabel, p.platform, p.company, p.year].filter(Boolean).join(", ") || "Details coming soon";
  let h = "";
  if (p.visibility === "pending") h += '<p class="note">In development. Footage and details will be shared once the studio approves them.</p>';
  else if (!p.role && !p.built.length) h += '<p class="note">Details for this project are coming soon.</p>';
  else if (bp) {
    h += '<dl class="facts"><dt>Role</dt><dd>' + esc(p.role) + "</dd></dl>";
    if (p.stack.length) h += '<div class="meta">How I built it, top layer first</div><div class="stack">' + p.stack.map((s) => "<div><b>" + esc(s[0]) + "</b><span>" + esc(s[1]) + "</span></div>").join("") + "</div>";
  } else {
    if (view !== "simple" && theaterIdx === i) h += "";
    else if (p.media.video) h += '<div class="media"><video src="' + esc(p.media.video) + '" ' + (p.media.poster ? 'poster="' + esc(p.media.poster) + '" ' : "") + "controls playsinline preload=\"metadata\"></video></div>";
    else if (p.media.poster) h += '<div class="media"><img src="' + esc(p.media.poster) + '" alt="' + esc(p.name) + ' screenshot"></div>';
    else h += '<div class="media">Footage coming soon</div>';
    if (p.summary) h += '<p class="note">' + esc(p.summary) + "</p>";
    h += '<dl class="facts"><dt>My role</dt><dd>' + esc(p.role) + "</dd>" + (p.results ? "<dt>Results</dt><dd>" + esc(p.results) + "</dd>" : "") + "</dl>";
    if (p.built.length) h += '<div class="meta">What I built</div><ul>' + p.built.map((b) => "<li>" + esc(b) + "</li>").join("") + "</ul>";
    if (p.links.length) h += '<div class="card-actions">' + p.links.map((l) => '<a class="btn" href="' + esc(l.href) + '" target="_blank" rel="noopener">' + esc(l.label) + "</a>").join("") + "</div>";
  }
  $("cBody").innerHTML = h;
  $("card").classList.add("show"); $("shade").classList.add("show");
}
function closeCard() {
  const hadPanel = $("card").classList.contains("show");
  $("card").classList.remove("show"); $("shade").classList.remove("show"); cardIndex = -1; document.body.classList.remove("paneled"); endTheater();
  if (!hadPanel || view === "simple" || arrivedIdx < 0) leaveArrival();
}
function goTo(i) {
  if (view === "drive" && hooks.driveTo) hooks.driveTo(i);
  else { if (theaterIdx >= 0) openTheater(i); else openCard(i); if (view === "spectate" && hooks.focus) hooks.focus(i); }
}
$("cClose").addEventListener("click", closeCard);
$("cNext").addEventListener("click", () => goTo((Math.max(cardIndex, 0) + 1) % PROJECTS.length));
$("cPrev").addEventListener("click", () => goTo((Math.max(cardIndex, 0) - 1 + PROJECTS.length) % PROJECTS.length));
$("c3d").addEventListener("click", () => { const i = cardIndex; setView("drive"); if (hooks.travel) hooks.travel(i, true); });

/* ---------- simple view (2D site): markup is pre-rendered at build time; this wires it up ---------- */
let filter = "all";
function renderGrid() { $("sGrid").innerHTML = gridHTML(PROJECTS, filter); }
const svMore = $("svMore");
if (svMore) svMore.addEventListener("click", (e) => {
  const box = $("svReview"); box.classList.toggle("open"); const o = box.classList.contains("open");
  e.target.setAttribute("aria-expanded", String(o)); e.target.textContent = o ? "Show less" : "Read full review";
});
document.querySelectorAll(".filters button").forEach((b) => b.addEventListener("click", () => {
  filter = b.dataset.f;
  document.querySelectorAll(".filters button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  renderGrid();
}));
$("simple").addEventListener("click", (e) => {
  const go = e.target.closest("[data-go]"), op = e.target.closest("[data-open]"), d3 = e.target.closest("[data-3d]"), card = e.target.closest("[data-card]");
  if (go) { const t = $(go.dataset.go); if (t) t.scrollIntoView({ block: "start" }); }
  if (op) openCard(+op.dataset.open);
  if (d3) enter3D(+d3.dataset["3d"]);
  if (card) enter3D(+card.dataset.card);
  const ch = e.target.closest("[data-ch]");
  if (ch) { const c = SHOWREEL.chapters[+ch.dataset.ch], v = $("svReelVid"), i = PROJECTS.findIndex((p) => p.id === c.id);
    if (v && c.at != null) { v.currentTime = c.at; v.play().catch(() => {}); } else if (i >= 0) enter3D(i); }
});
$("shade").addEventListener("click", () => closeCard());
const reelVid = $("svReelVid");
if (reelVid) reelVid.addEventListener("timeupdate", () => {
  let on = -1; SHOWREEL.chapters.forEach((c, k) => { if (c.at != null && reelVid.currentTime >= c.at - 0.05) on = k; });
  document.querySelectorAll("#svChapters [data-ch]").forEach((b) => b.classList.toggle("on", +b.dataset.ch === on));
});

/* ---------- 2D → 3D bridge, visited tracker, toast, first-visit choice ---------- */
let simpleScroll = 0, has3D = true;
function enter3D(i) {
  if (!has3D) { if (i >= 0) openCard(i); return; }
  simpleScroll = $("simple").scrollTop;
  const name = i >= 0 ? stopInfo(i).name : "the city";
  $("warpT").textContent = i >= 0 ? "Driving to " + name + "…" : "Entering the city…";
  $("warp").classList.add("show");
  setTimeout(() => {
    setView("drive");
    if (i >= 0 && hooks.travel) hooks.travel(i, true);
    $("warp").classList.remove("show");
  }, reduceMotion ? 0 : 650);
}
let visited = new Set();
try { visited = new Set(JSON.parse(localStorage.getItem("maaz-visited") || "[]")); } catch (e) {}
let toastTimer = 0;
function toast(title, body, buttons) {
  $("toastT").textContent = title; $("toastB").textContent = body;
  const row = $("toastRow"); row.innerHTML = "";
  buttons.forEach(([label, fn, primary]) => { const b = document.createElement("button"); b.type = "button"; b.className = "btn" + (primary ? " primary" : ""); b.textContent = label; b.addEventListener("click", () => { $("toast").classList.remove("show"); fn(); }); row.append(b); });
  $("toast").classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => $("toast").classList.remove("show"), 10000);
}
function updateTrip() {
  const seen = PROJECTS.filter((p) => visited.has(p.id)).length;
  $("tripText").textContent = seen + " of " + PROJECTS.length + " projects visited";
  $("tripBar").style.width = (seen / PROJECTS.length * 100) + "%";
  const chip = $("tripChip"); chip.hidden = seen === 0; chip.textContent = seen + " / " + PROJECTS.length + " visited";
}
function markVisited(i) {
  if (view === "simple" || visited.has(PROJECTS[i].id)) return;
  visited.add(PROJECTS[i].id); try { localStorage.setItem("maaz-visited", JSON.stringify([...visited])); } catch (e) {}
  updateTrip();
  const seen = PROJECTS.filter((p) => visited.has(p.id)).length;
  if (seen === 3) toast("Nice, 3 down.", "Want to see all " + PROJECTS.length + " projects at once? The 1-page site has everything.", [["Open the 1-page site", () => setView("simple"), true], ["Keep driving", () => {}]]);
  if (seen === PROJECTS.length) toast("You explored the whole city.", "Thanks for visiting every building. Here is my CV, or just say hi.", [["Download CV", () => $("cvLink").click(), true], ["Email me", () => { location.href = MAILTO; }]]);
}
updateTrip();
function showChoice() { $("choice").classList.add("show"); const f = document.querySelector("#choice .opt"); if (f) f.focus(); }
document.querySelectorAll("[data-choose]").forEach((b) => b.addEventListener("click", () => {
  const v = b.dataset.choose; try { localStorage.setItem("maaz-choice", v); } catch (e) {}
  $("choice").classList.remove("show"); setView(v);
}));
$("svEnter").addEventListener("click", () => enter3D(-1));
$("svEnter2").addEventListener("click", () => enter3D(-1));
$("menuBtn").addEventListener("click", () => { const d = $("drawer"), o = !d.classList.contains("open"); d.classList.toggle("open", o); $("menuBtn").setAttribute("aria-expanded", String(o)); if (o) hideHint(); });
document.querySelectorAll("[data-stop]").forEach((b) => b.addEventListener("click", () => {
  const i = PROJECTS.length + SPECIALS.findIndex((x) => x.kind === b.dataset.stop);
  if (view !== "drive") setView("drive");
  if (hooks.driveTo) hooks.driveTo(i); else showDetails(i);
}));
$("tourBtn").addEventListener("click", () => { if (hooks.tour) hooks.tour.start(); });
$("tourNext").addEventListener("click", () => { if (hooks.tour) hooks.tour.next(); });
$("tourExit").addEventListener("click", () => { if (hooks.tour) hooks.tour.stop(); });

/* ---------- view + look ---------- */
function setView(v) {
  if (v === view && document.body.classList.contains("view-" + v)) return;
  endTheater(); view = v;
  document.body.classList.remove("view-drive", "view-spectate", "view-simple");
  document.body.classList.add("view-" + v);
  document.querySelectorAll("[data-view]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === v)));
  if (v !== "simple") { closeCard(); leaveArrival(); } else { $("simple").scrollTop = simpleScroll; }
  markTried(v); hideHint(); scheduleHint(12000);
  if (hooks.onView) hooks.onView(v);
}
function setLook(l) {
  look = l;
  document.body.classList.toggle("bp", l === "bp"); document.body.classList.toggle("day", l === "day");
  document.querySelectorAll("[data-look]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.look === l)));
  if (cardIndex >= 0) openCard(cardIndex);
  markTried(l); hideHint(); scheduleHint(12000);
  if (hooks.onLook) hooks.onLook(l);
}
document.querySelectorAll("[data-view]").forEach((b) => b.addEventListener("click", () => setView(b.dataset.view)));
document.querySelectorAll("[data-look]").forEach((b) => b.addEventListener("click", () => setLook(b.dataset.look)));

/* ---------- hints: point at options not tried yet ---------- */
const HINTS = {
  spectate: "See the whole city from above. Try Spectate: drag to orbit and click any building.",
  simple: "Prefer no 3D? Simple view lists every project on one page.",
  bp: "Curious how each game is built? Switch to Blueprint to see the layers and my qualifications.",
  drive: "Want to explore it like a game? Try Drive and cruise to each building.",
  night: "See the city after dark. Switch to Night for the lit towers.",
  day: "Back to daylight? Switch to Day.",
};
let hintKey = null, hintTimer = 0, hintHide = 0, introOver = false; const dismissed = new Set();
function nextHintKey() {
  const order = ["spectate", "simple", "bp", "night", "drive", "day"];
  const open = order.filter((k) => !tried[k] && k !== view && k !== look);
  if (open.length && open.every((k) => dismissed.has(k))) dismissed.clear();
  return open.find((k) => !dismissed.has(k)) || null;
}
function hideHint() { $("hint").classList.remove("show"); optionButtons().forEach((b) => b.classList.remove("hint")); hintKey = null; clearTimeout(hintHide); }
function scheduleHint(ms) { clearTimeout(hintTimer); if (introOver) hintTimer = setTimeout(showHint, ms); }
function showHint() {
  const k = nextHintKey(); if (!k || $("card").classList.contains("show") || document.body.classList.contains("arrived") || $("choice").classList.contains("show")) { if (k) scheduleHint(15000); return; }
  let btn = [...document.querySelectorAll('.seg [data-view="' + k + '"], .seg [data-look="' + k + '"]')].find((x) => x.offsetParent !== null);
  if (!btn && view !== "simple") btn = $("menuBtn");
  if (!btn || document.body.classList.contains("cine") || document.body.classList.contains("touring")) { scheduleHint(15000); return; }
  hintKey = k; $("hintText").textContent = HINTS[k];
  const hint = $("hint"); hint.classList.add("show"); btn.classList.add("hint");
  const r = btn.getBoundingClientRect(), a = app.getBoundingClientRect(), w = hint.offsetWidth;
  let left = r.left + r.width / 2 - w / 2 - a.left; left = Math.max(10, Math.min(a.width - w - 10, left));
  hint.style.left = left + "px"; hint.style.top = (r.bottom - a.top + 14) + "px";
  hint.style.setProperty("--ax", (r.left + r.width / 2 - a.left - left) + "px");
  hintHide = setTimeout(() => { if (hintKey) dismissed.add(hintKey); hideHint(); scheduleHint(25000); }, 11000);
}
$("hintTry").addEventListener("click", () => { const k = hintKey; hideHint(); if (k === "bp" || k === "night" || k === "day") setLook(k); else if (k) setView(k); });
$("hintNo").addEventListener("click", () => { if (hintKey) dismissed.add(hintKey); hideHint(); scheduleHint(30000); });
window.addEventListener("resize", () => { if ($("hint").classList.contains("show")) { const k = hintKey; hideHint(); hintKey = k; showHint(); } });
refreshDots();

/* ---------- keyboard (global) ---------- */
window.addEventListener("keydown", (e) => {
  if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
  if (e.code === "KeyV") { const order = ["drive", "spectate", "simple"]; setView(order[(order.indexOf(view) + 1) % 3]); }
  if (e.code === "KeyB") setLook(look === "bp" ? "night" : "bp");
  if (e.code === "Escape") closeCard();
});

/* ---------- WebGL check ---------- */
let gl = true;
try { const c = document.createElement("canvas"); gl = !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl"))); } catch (e) { gl = false; }
if (!gl) {
  $("loader").classList.add("gone");
  document.querySelectorAll('[data-view="drive"],[data-view="spectate"]').forEach((b) => { b.disabled = true; b.title = "3D views need WebGL, which this browser has turned off."; });
  introOver = true; has3D = false; setView("simple");
  $("svCityWrap").classList.add("flat"); $("svCityWrap").innerHTML = "The live 3D city needs WebGL, which this browser has turned off.";
  document.querySelectorAll("[data-3d]").forEach((b) => b.remove());
}

/* ---------------- 3D ---------------- */
if (gl) startCity();

function startCity() {
const canvas = $("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
/* phones and tablets: lower pixel ratio and no real-time shadows to keep frame rate up */
const LOWPOWER = window.matchMedia("(pointer: coarse)").matches || Math.min(screen.width, screen.height) < 820;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, LOWPOWER ? 1.5 : 2));
const scene = new THREE.Scene();
const NIGHT = new THREE.Color(0x070A12), BLUE = new THREE.Color(0x0B2447);
/* day sky: a large gradient dome (more reliable than a background texture) */
const skyGeo = new THREE.SphereGeometry(700, 32, 16), skyCols = [];
const cTop = new THREE.Color(0x4E9BD8), cMid = new THREE.Color(0xA9D3F0), cLow = new THREE.Color(0xEAF2F4), tmpC = new THREE.Color();
for (let k = 0; k < skyGeo.attributes.position.count; k++) {
  const y = skyGeo.attributes.position.getY(k) / 700;
  if (y > 0.25) tmpC.copy(cMid).lerp(cTop, Math.min((y - 0.25) / 0.6, 1)); else tmpC.copy(cLow).lerp(cMid, Math.max(y + 0.05, 0) / 0.3);
  skyCols.push(tmpC.r, tmpC.g, tmpC.b);
}
skyGeo.setAttribute("color", new THREE.Float32BufferAttribute(skyCols, 3));
const skyDome = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
skyDome.renderOrder = -1; scene.add(skyDome);
const DAYSKY = new THREE.Color(0xA9D3F0);
const FOG = { day: new THREE.Fog(0xE3EEF3, 220, 820), night: new THREE.FogExp2(0x070A12, 0.0038), bp: new THREE.FogExp2(0x0B2447, 0.0035) };
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1600);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const hemi = new THREE.HemisphereLight(0x6680bb, 0x0a0c14, 0.55); scene.add(hemi);
const sun = new THREE.DirectionalLight(0x9aaee0, 0.55); sun.position.set(90, 160, 60); scene.add(sun); scene.add(sun.target);
sun.shadow.mapSize.set(2048, 2048); const sc = sun.shadow.camera; sc.near = 10; sc.far = 420 * 1.25; sun.shadow.bias = -0.0008;
const amb = new THREE.AmbientLight(0x223047, 0.5); scene.add(amb);

/* one extra street row (Unreal and personal) holds the six projects added after the prototype */
const PITCH = 58, NX = 5, NZ = 5, HALF = 11, LOT = PITCH - 18, PAD_Z = LOT / 2 + 6;   /* roads stay 18 wide; LOT = the slab each building stands on */
const lotCenter = (i, j) => new THREE.Vector3((i - (NX - 1) / 2) * PITCH, 0, (j - (NZ - 1) / 2) * PITCH);
const EX = NX / 2 * PITCH + 18, EZ = NZ / 2 * PITCH + 18, EXTENT = Math.max(EX, EZ), SCALE = EXTENT / 133;   /* 133 = the old city's extent, for scaling world-wide numbers */
sc.left = -(EXTENT + 20); sc.right = EXTENT + 20; sc.top = EXTENT + 20; sc.bottom = -(EXTENT + 20); sc.updateProjectionMatrix();
/* districts = portfolio sections, one per row */
const LAYOUT = { kingdomland: [0, 0], nayzak: [1, 0], wahm: [2, 0], "kick-arena": [3, 0], tamr: [4, 0],
  "mars-simulation": [0, 1], orionmeta: [1, 1], "island-of-deceit": [2, 1],
  "you-will-die": [0, 2], "tank-game": [1, 2], "hack-and-slash-arpg": [2, 2], "space-fighter": [3, 2], "scifi-sim-escape": [4, 2],
  "kungfu-karate": [0, 3], "mototraffic-rider": [1, 3], "fps-commando": [2, 3], "boba-tea": [3, 3], "reader-bee": [4, 3],
  "bank-manager": [0, 4], "bank-atm": [1, 4], "virtual-mom": [2, 4] };
const SPECIAL_LOTS = { about: [3, 1], contact: [4, 1] }, PARK_LOTS = [[4, 4]], PLAZA_LOT = [3, 4];
const DISTRICTS = ["Team projects", "Unreal and web", "Unreal and personal", "Mobile arcade", "Sim street"];
/* any project without a fixed lot takes the next free one, so new projects always get a building */
{
  const taken = new Set([...Object.values(LAYOUT), ...Object.values(SPECIAL_LOTS), ...PARK_LOTS, PLAZA_LOT].map(([a, b]) => a + "," + b));
  PROJECTS.forEach((p) => {
    if (LAYOUT[p.id]) return;
    for (let j = 0; j < NZ && !LAYOUT[p.id]; j++) for (let i = 0; i < NX; i++) if (!taken.has(i + "," + j)) { LAYOUT[p.id] = [i, j]; taken.add(i + "," + j); break; }
  });
}

/* materials that change with the look: every swappable mesh keeps {day, night} in userData.mats */
const bpMat = new THREE.MeshBasicMaterial({ color: 0x1C4A80, transparent: true, opacity: 0.55 });
const swappables = [];
function dual(mesh, day, night) { mesh.userData.mats = { day, night }; swappables.push(mesh); return mesh; }
const edgeMat = new THREE.LineBasicMaterial({ color: 0x9CC4FF });
const edgeList = [];
function withEdges(mesh) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), edgeMat); e.visible = false; mesh.add(e); edgeList.push(e); return mesh; }

/* ground, roads, sidewalks */
const groundMats = { day: new THREE.MeshStandardMaterial({ color: 0xE2BE88, roughness: 1 }), night: new THREE.MeshStandardMaterial({ color: 0x131A28, roughness: 1 }) };
const groundBp = new THREE.MeshBasicMaterial({ color: 0x123A6B });
const LX = EX + 26, LZ = EZ + 26;   /* land half-size: city + promenade + beach */
const ground = dual(new THREE.Mesh(new THREE.PlaneGeometry(LX * 2, LZ * 2), groundMats.day), groundMats.day, groundMats.night);
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const grid = new THREE.GridHelper(EXTENT * 2, 46, 0x6FA8FF, 0x2E5E9A); grid.position.y = 0.06; grid.visible = false; scene.add(grid);

const roadMats = { day: new THREE.MeshStandardMaterial({ color: 0x5D5F66, roughness: 0.95 }), night: new THREE.MeshStandardMaterial({ color: 0x181F2E, roughness: 1 }) };
const walkMats = { day: new THREE.MeshStandardMaterial({ color: 0xD3CCC0, roughness: 1 }), night: new THREE.MeshStandardMaterial({ color: 0x1C2436, roughness: 1 }) };
const world = new THREE.Group(); scene.add(world);
const dayOnly = [], nightOnly = [], notBp = [];
for (let k = 0; k <= NZ; k++) { const r = (k - NZ / 2) * PITCH;
  const a = dual(new THREE.Mesh(new THREE.PlaneGeometry(EX * 2, 18), roadMats.day), roadMats.day, roadMats.night); a.rotation.x = -Math.PI / 2; a.position.set(0, 0.02, r); a.receiveShadow = true; world.add(a); notBp.push(a); }
for (let k = 0; k <= NX; k++) { const r = (k - NX / 2) * PITCH;
  const b = dual(new THREE.Mesh(new THREE.PlaneGeometry(18, EZ * 2), roadMats.day), roadMats.day, roadMats.night); b.rotation.x = -Math.PI / 2; b.position.set(r, 0.021, 0); b.receiveShadow = true; world.add(b); notBp.push(b); }
const dashCanvas = document.createElement("canvas"); dashCanvas.width = 64; dashCanvas.height = 8;
const dctx = dashCanvas.getContext("2d"); dctx.fillStyle = "#FFFFFF"; dctx.fillRect(0, 2, 32, 4);
const dashTex = new THREE.CanvasTexture(dashCanvas); dashTex.wrapS = THREE.RepeatWrapping; dashTex.repeat.set(40, 1);
const dashMats = { day: new THREE.MeshBasicMaterial({ map: dashTex, transparent: true, color: 0xF4F1E8 }), night: new THREE.MeshBasicMaterial({ map: dashTex, transparent: true, color: 0x3A5A9E }) };
for (let k = 0; k <= NZ; k++) { const r = (k - NZ / 2) * PITCH;
  const a = dual(new THREE.Mesh(new THREE.PlaneGeometry(EX * 2, 0.5), dashMats.day), dashMats.day, dashMats.night); a.rotation.x = -Math.PI / 2; a.position.set(0, 0.04, r); world.add(a); notBp.push(a); }
for (let k = 0; k <= NX; k++) { const r = (k - NX / 2) * PITCH;
  const b = dual(new THREE.Mesh(new THREE.PlaneGeometry(EZ * 2, 0.5), dashMats.day), dashMats.day, dashMats.night); b.rotation.x = -Math.PI / 2; b.rotation.z = Math.PI / 2; b.position.set(r, 0.041, 0); world.add(b); notBp.push(b); }
/* plots: sidewalk slab + green plot outline (KingdomLand-style land grid) */
const lawnMats = { day: new THREE.MeshStandardMaterial({ color: 0x8CC56B, roughness: 1 }), night: new THREE.MeshStandardMaterial({ color: 0x14261A, roughness: 1 }) };
const plotLineMat = new THREE.LineBasicMaterial({ color: 0x2FBF63 });
for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) {
  const c = lotCenter(i, j);
  const w = dual(new THREE.Mesh(new THREE.BoxGeometry(LOT, 0.3, LOT), walkMats.day), walkMats.day, walkMats.night); w.position.set(c.x, 0.15, c.z); w.receiveShadow = true; world.add(w); notBp.push(w);
  const lawn = dual(new THREE.Mesh(new THREE.PlaneGeometry(LOT - 6, LOT - 6), lawnMats.day), lawnMats.day, lawnMats.night); lawn.rotation.x = -Math.PI / 2; lawn.position.set(c.x, 0.31, c.z); lawn.receiveShadow = true; world.add(lawn); notBp.push(lawn);
  const o = LOT / 2 - 0.4, pts = [[-o, -o], [o, -o], [o, o], [-o, o]].map(([dx, dz]) => new THREE.Vector3(c.x + dx, 0.34, c.z + dz));
  const loop = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), plotLineMat); world.add(loop); dayOnly.push(loop);
}

/* ---------- facades: every building is wrapped in its own game's art ----------
   Projects with footage use three stills from their video (wrap-1..3); the others get a drawn theme in the game's colours.
   Each face samples a cover-fit window of a 16:9 texture, so the art is never stretched. */
const WRAP_W = 512, WRAP_H = 288, WRAP_ASPECT = WRAP_W / WRAP_H;
const THEMES = {
  "kick-arena": { bg: ["#1F8A44", "#187236"], fg: "#FFFFFF", pattern: "pitch" },
  "kungfu-karate": { bg: ["#C62F24", "#7E1810"], fg: "#FFD24A", pattern: "rays" },
  "reader-bee": { bg: ["#FFC93C", "#F2A900"], fg: "#1C1C1C", pattern: "honeycomb" },
  "boba-tea": { bg: ["#F7B9CB", "#EE96B0"], fg: "#5A3420", pattern: "pearls" },
  "bank-manager": { bg: ["#1F2D4A", "#14203A"], fg: "#FFD24A", pattern: "coins" },
  "bank-atm": { bg: ["#127C86", "#0B5D66"], fg: "#FFFFFF", pattern: "cards" },
  "virtual-mom": { bg: ["#FFC9A8", "#F59E8B"], fg: "#7A2E4A", pattern: "hearts" },
};
function drawPattern(x, kind, fg, seed) {
  let r = seed; const rnd = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
  x.save(); x.globalAlpha = 0.22; x.fillStyle = fg; x.strokeStyle = fg; x.lineWidth = 4;
  if (kind === "pitch") {
    x.globalAlpha = 0.12; for (let k = 0; k < WRAP_W; k += 64) x.fillRect(k, 0, 32, WRAP_H);
    x.globalAlpha = 0.5; x.strokeRect(14, 14, WRAP_W - 28, WRAP_H - 28); x.beginPath(); x.moveTo(WRAP_W / 2, 14); x.lineTo(WRAP_W / 2, WRAP_H - 14); x.stroke();
    x.beginPath(); x.arc(WRAP_W / 2, WRAP_H / 2, 46, 0, Math.PI * 2); x.stroke();
  } else if (kind === "rays") {
    for (let k = 0; k < 18; k += 2) {
      const a0 = k / 18 * Math.PI * 2, a1 = (k + 1) / 18 * Math.PI * 2;
      x.beginPath(); x.moveTo(WRAP_W / 2, WRAP_H / 2); x.lineTo(WRAP_W / 2 + Math.cos(a0) * 600, WRAP_H / 2 + Math.sin(a0) * 600); x.lineTo(WRAP_W / 2 + Math.cos(a1) * 600, WRAP_H / 2 + Math.sin(a1) * 600); x.closePath(); x.fill();
    }
  } else if (kind === "honeycomb") {
    const R = 22, w = R * Math.sqrt(3);
    for (let row = -1; row < WRAP_H / (R * 1.5) + 1; row++) for (let col = -1; col < WRAP_W / w + 1; col++) {
      const cx = col * w + (row % 2 ? w / 2 : 0), cy = row * R * 1.5; x.beginPath();
      for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; if (k) x.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); else x.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); }
      x.closePath(); x.stroke();
    }
  } else if (kind === "pearls") {
    for (let k = 0; k < 70; k++) { x.beginPath(); x.arc(rnd() * WRAP_W, rnd() * WRAP_H, 6 + rnd() * 8, 0, Math.PI * 2); x.fill(); }
  } else if (kind === "coins") {
    x.font = "700 30px Rajdhani, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle";
    for (let k = 0; k < 26; k++) { const cx = rnd() * WRAP_W, cy = rnd() * WRAP_H; x.beginPath(); x.arc(cx, cy, 20, 0, Math.PI * 2); x.stroke(); x.fillText("$", cx, cy + 1); }
  } else if (kind === "cards") {
    for (let k = 0; k < 16; k++) { const cx = rnd() * WRAP_W, cy = rnd() * WRAP_H; x.save(); x.translate(cx, cy); x.rotate((rnd() - 0.5) * 0.8); x.strokeRect(-34, -21, 68, 42); x.fillRect(-26, -8, 16, 12); x.restore(); }
  } else if (kind === "hearts") {
    for (let k = 0; k < 22; k++) {
      const cx = rnd() * WRAP_W, cy = rnd() * WRAP_H, z = 8 + rnd() * 10; x.beginPath();
      x.moveTo(cx, cy + z); x.bezierCurveTo(cx - z * 2, cy - z / 2, cx - z / 2, cy - z * 1.6, cx, cy - z / 3); x.bezierCurveTo(cx + z / 2, cy - z * 1.6, cx + z * 2, cy - z / 2, cx, cy + z); x.fill();
    }
  } else {
    x.globalAlpha = 0.14;
    for (let k = -WRAP_H; k < WRAP_W; k += 40) { x.beginPath(); x.moveTo(k, WRAP_H); x.lineTo(k + WRAP_H, 0); x.lineTo(k + WRAP_H + 18, 0); x.lineTo(k + 18, WRAP_H); x.closePath(); x.fill(); }
  }
  x.restore();
}
/* the drawn theme: game colours, a motif, and the game's name large in the middle (the centre survives every crop) */
function drawTheme(x, p, k) {
  const th = THEMES[p.id] || { bg: [CSSCOL[p.engine], "#14213D"], fg: "#FFFFFF", pattern: "stripes" };
  const g = x.createLinearGradient(0, 0, 0, WRAP_H); g.addColorStop(0, th.bg[0]); g.addColorStop(1, th.bg[1]);
  x.fillStyle = g; x.fillRect(0, 0, WRAP_W, WRAP_H);
  drawPattern(x, th.pattern, th.fg, 17 + k * 31 + p.id.length * 7);
  x.save(); x.textAlign = "center"; x.textBaseline = "middle"; x.fillStyle = th.fg;
  x.shadowColor = "rgba(0,0,0,.35)"; x.shadowBlur = 10;
  const words = p.name.toUpperCase().split(" "), half = Math.ceil(words.length / 2);
  const lines = words.length > 1 && p.name.length > 10 ? [words.slice(0, half).join(" "), words.slice(half).join(" ")] : [words.join(" ")];
  x.font = '400 ' + (lines.length > 1 ? 54 : 62) + 'px "Russo One", sans-serif';
  lines.forEach((l, n) => x.fillText(l, WRAP_W / 2, WRAP_H / 2 + (n - (lines.length - 1) / 2) * 60, WRAP_W - 40));
  x.restore();
}
/* a still from the game, with a faint curtain-wall grid so it still reads as a building */
function drawStill(x, img) {
  const s = Math.max(WRAP_W / img.width, WRAP_H / img.height), w = img.width * s, h = img.height * s;
  x.drawImage(img, (WRAP_W - w) / 2, (WRAP_H - h) / 2, w, h);
  x.fillStyle = "rgba(10,14,24,.28)";
  for (let k = 0; k < WRAP_W; k += 32) x.fillRect(k, 0, 2, WRAP_H);
  for (let k = 0; k < WRAP_H; k += 36) x.fillRect(0, k, WRAP_W, 2);
  const g = x.createLinearGradient(0, 0, WRAP_W, WRAP_H); g.addColorStop(0, "rgba(255,255,255,.14)"); g.addColorStop(0.5, "rgba(255,255,255,0)");
  x.fillStyle = g; x.fillRect(0, 0, WRAP_W, WRAP_H);
}
/* one atlas per project: the three variations stacked (bands 0..2), with a plain roof strip underneath.
   One texture and one day + one night material per project; every wrapped box is a single draw call. */
const ATLAS_STRIP = 32, ATLAS_H = WRAP_H * 3 + ATLAS_STRIP;
const ROOF_V = ATLAS_STRIP / 2 / ATLAS_H, FACADE_V = ATLAS_STRIP / ATLAS_H;   /* uv.y below FACADE_V is the roof strip */
/* roofs and floors sample the strip; the shader paints them the plain roof colour (and keeps them dark at night) */
function roofPatch(mat, rgb, key, unlit) {
  const col = rgb.map((c) => (c / 255).toFixed(4)).join(", ");
  mat.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace("#include <map_fragment>", "#include <map_fragment>\n  float wrapFacade = step(" + FACADE_V.toFixed(6) + ", vUv.y);\n  diffuseColor.rgb = mix(vec3(" + col + "), diffuseColor.rgb, wrapFacade);");
    if (unlit) sh.fragmentShader = sh.fragmentShader.replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n  totalEmissiveRadiance *= wrapFacade;");
  };
  mat.customProgramCacheKey = () => key;
  return mat;
}
const wrapSets = [];
function wrapSet(i) {
  if (wrapSets[i]) return wrapSets[i];
  const p = PROJECTS[i], c = document.createElement("canvas"); c.width = WRAP_W; c.height = ATLAS_H; const x = c.getContext("2d");
  const tex = new THREE.CanvasTexture(c); tex.anisotropy = 4;
  const band = (k, draw) => { x.save(); x.translate(0, k * WRAP_H); x.beginPath(); x.rect(0, 0, WRAP_W, WRAP_H); x.clip(); draw(); x.restore(); };
  x.fillStyle = "#D6C7AE"; x.fillRect(0, WRAP_H * 3, WRAP_W, ATLAS_STRIP);
  const still = [false, false, false];
  for (let k = 0; k < 3; k++) {
    band(k, () => drawTheme(x, p, k));
    const url = p.media.wraps.length ? p.media.wraps[k % p.media.wraps.length] : "";
    if (url) { const img = new Image(); img.onload = () => { still[k] = true; band(k, () => drawStill(x, img)); tex.needsUpdate = true; }; img.src = url; }
  }
  fontsReady.then(() => { for (let k = 0; k < 3; k++) if (!still[k]) band(k, () => drawTheme(x, p, k)); tex.needsUpdate = true; });
  const set = {
    day: roofPatch(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }), [0xD6, 0xC7, 0xAE], "wrapDay"),
    night: roofPatch(new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.6, color: 0x6a7080, roughness: 0.8 }), [0x2A, 0x35, 0x50], "wrapNight", true),
  };
  return (wrapSets[i] = set);
}
/* facade of building i, variation k: part() turns this into the project's wrap material and atlas UVs */
function facadeMats(i, k) { return { wrap: { i, k } }; }
/* map each side face of a box into its variation's band of the atlas, as a cover-fit window of the 16:9 art (never stretched);
   faces 0,1 = sides, 4,5 = front (street side) and back; the roof and floor (2,3) sample the plain strip */
function fitBoxUV(geo, k) {
  const { width: W, height: H, depth: D } = geo.parameters, uv = geo.attributes.uv;
  [[0, D, H, (k + 1) % 3], [1, D, H, (k + 2) % 3], [4, W, H, k % 3], [5, W, H, (k + 1) % 3]].forEach(([f, fw, fh, n]) => {
    const af = fw / fh, su = af > WRAP_ASPECT ? 1 : af / WRAP_ASPECT, sv = af > WRAP_ASPECT ? WRAP_ASPECT / af : 1;
    const v0 = 1 - ((n + 1) * WRAP_H - 1.5) / ATLAS_H, v1 = 1 - (n * WRAP_H + 1.5) / ATLAS_H;   /* the band, inset so filtering never reaches its neighbour */
    for (let v = f * 4; v < f * 4 + 4; v++) uv.setXY(v, 0.5 + (uv.getX(v) - 0.5) * su, v0 + (0.5 + (uv.getY(v) - 0.5) * sv) * (v1 - v0));
  });
  for (let v = 8; v < 16; v++) uv.setXY(v, 0.5, ROOF_V);
  uv.needsUpdate = true;
}
function wrapMats({ i, k }, geo) {
  fitBoxUV(geo, k);
  const set = wrapSet(i);
  return { day: set.day, night: set.night };
}
const roofMats = { day: new THREE.MeshStandardMaterial({ color: 0xD6C7AE, roughness: 1 }), night: new THREE.MeshStandardMaterial({ color: 0x2A3550, roughness: 0.9 }) };
const detailMats = { day: new THREE.MeshStandardMaterial({ color: 0xBDB6AA, roughness: 0.8 }), night: new THREE.MeshStandardMaterial({ color: 0x222B42 }) };
const glassMats = { day: new THREE.MeshStandardMaterial({ color: 0x6F98B8, metalness: 0.5, roughness: 0.15 }), night: new THREE.MeshStandardMaterial({ color: 0x332a10, emissive: 0xFFD98A, emissiveIntensity: 0.8 }) };

function labelTexture(name, sub, color, mode) {
  const c = document.createElement("canvas"); c.width = 640; c.height = 160; const x = c.getContext("2d");
  x.fillStyle = mode === "day" ? "rgba(255,255,255,0.95)" : "rgba(10,14,24,0.92)"; x.strokeStyle = color; x.lineWidth = 6;
  const r = 24; x.beginPath(); x.moveTo(r, 3); x.arcTo(637, 3, 637, 157, r); x.arcTo(637, 157, 3, 157, r); x.arcTo(3, 157, 3, 3, r); x.arcTo(3, 3, 637, 3, r); x.closePath(); x.fill(); x.stroke();
  x.textAlign = "center"; x.fillStyle = mode === "day" ? "#14213D" : "#FFFFFF"; x.font = "700 58px Rajdhani, sans-serif";
  let n = name; while (x.measureText(n).width > 590 && n.length > 4) n = n.slice(0, -2);
  if (n !== name) n = n.trim() + "…";
  x.fillText(n, 320, 76); x.fillStyle = mode === "day" ? "#14213D" : color; x.globalAlpha = mode === "day" ? 0.7 : 1; x.font = "700 36px Rajdhani, sans-serif"; x.fillText(sub, 320, 126);
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
}
function plotTag(n, color) {
  const c = document.createElement("canvas"); c.width = 256; c.height = 64; const x = c.getContext("2d");
  x.fillStyle = "rgba(20,33,61,.85)"; x.fillRect(0, 0, 256, 64); x.fillStyle = color; x.fillRect(0, 0, 10, 64);
  x.fillStyle = "#FFFFFF"; x.font = "700 34px Rajdhani, sans-serif"; x.fillText("PLOT " + String(n).padStart(2, "0"), 24, 44);
  return new THREE.CanvasTexture(c);
}

/* building archetypes */
const buildings = [], colliders = [], pickables = [];
function part(holder, geo, x, y, z, mats, pickIndex) {
  if (mats.wrap) mats = wrapMats(mats.wrap, geo);
  const m = dual(new THREE.Mesh(geo, mats.day), mats.day, mats.night); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  withEdges(m); holder.add(m); if (pickIndex !== undefined) { m.userData.i = pickIndex; pickables.push(m); } return m;
}
function autoStyle(p, i) { if (p.style) return p.style; if (p.height >= 34) return "tower"; return ["midrise", "mall", "courtyard", "midrise", "stepped"][i % 5]; }
function buildArchetype(holder, p, i, col) {
  const style = autoStyle(p, i), h = p.height, seed = i * 97 + 13;
  const accentMats = { day: new THREE.MeshStandardMaterial({ color: col, roughness: 0.6 }), night: new THREE.MeshBasicMaterial({ color: col }) };
  let top = h, screenZ = HALF, screenW = HALF * 1.5;
  if (style === "tower") {
    const f1 = facadeMats(i, 0), f2 = facadeMats(i, 1), f3 = facadeMats(i, 2);
    part(holder, new THREE.BoxGeometry(22, h * 0.55, 22), 0, h * 0.275, 0, f1, i);
    part(holder, new THREE.BoxGeometry(17, h * 0.3, 17), 0, h * 0.55 + h * 0.15, 0, f2, i);
    part(holder, new THREE.BoxGeometry(11, h * 0.15, 11), 0, h * 0.85 + h * 0.075, 0, f3, i);
    part(holder, new THREE.BoxGeometry(17.4, 0.8, 17.4), 0, h * 0.55, 0, accentMats);
    part(holder, new THREE.BoxGeometry(11.4, 0.8, 11.4), 0, h * 0.85, 0, accentMats);
    part(holder, new THREE.CylinderGeometry(0.25, 0.6, 7, 6), 0, h + 3.5, 0, detailMats); top = h + 7;
  } else if (style === "mall") {
    const hh = Math.min(h, 12), f = facadeMats(i, 0);
    part(holder, new THREE.BoxGeometry(22, hh, 22), 0, hh / 2, 0, f, i);
    part(holder, new THREE.BoxGeometry(22.4, 1.2, 22.4), 0, hh - 0.6, 0, accentMats);
    part(holder, new THREE.BoxGeometry(18, 4, 0.4), 0, 2, HALF + 0.25, glassMats);
    part(holder, new THREE.BoxGeometry(22.4, 0.6, 22.4), 0, hh + 0.3, 0, roofMats);
    for (let k = 0; k < 4; k++) part(holder, new THREE.BoxGeometry(2.2, 1.4, 2.2), -6 + k * 4, hh + 1.3, -4, detailMats);
    top = hh + 2; screenZ = HALF + 0.3; screenW = 12;
  } else if (style === "courtyard") {
    const hh = Math.min(h, 14), fA = facadeMats(i, 0), fB = facadeMats(i, 1);
    part(holder, new THREE.BoxGeometry(22, hh, 9), 0, hh / 2, -6.5, fA, i);
    part(holder, new THREE.BoxGeometry(9, hh, 13), -6.5, hh / 2, 4.5, fB, i);
    part(holder, new THREE.BoxGeometry(9, hh * 0.6, 13), 6.5, hh * 0.3, 4.5, fB, i);
    part(holder, new THREE.BoxGeometry(22.4, 0.7, 9.4), 0, hh + 0.35, -6.5, accentMats);
    part(holder, new THREE.BoxGeometry(4, 0.3, 4), 0, 0.5, 5, detailMats);
    top = hh + 1;
  } else if (style === "stepped") {
    const f1 = facadeMats(i, 0), f2 = facadeMats(i, 1);
    part(holder, new THREE.BoxGeometry(22, h * 0.5, 22), 0, h * 0.25, 0, f1, i);
    part(holder, new THREE.BoxGeometry(16, h * 0.5, 14), -3, h * 0.75, -4, f2, i);
    part(holder, new THREE.BoxGeometry(22.4, 0.7, 22.4), 0, h * 0.5 + 0.35, 0, accentMats);
    part(holder, new THREE.CylinderGeometry(1.6, 1.6, 3, 12), 5, h * 0.5 + 2, 5, detailMats);
  } else {
    const f = facadeMats(i, 0);
    part(holder, new THREE.BoxGeometry(22, h, 22), 0, h / 2, 0, f, i);
    part(holder, new THREE.BoxGeometry(22.6, 0.9, 22.6), 0, h + 0.45, 0, accentMats);
    part(holder, new THREE.BoxGeometry(5, 2, 3), -5, h + 1.9, -5, detailMats);
    part(holder, new THREE.CylinderGeometry(1.5, 1.5, 3.2, 12), 5, h + 2.5, 4, detailMats);
    top = h + 4;
  }
  return { top, screenZ, screenW, style };
}

/* ---------- demo-video banners ---------- */
/* Banners carry the content; buildings are scenery. Each screen is as wide as the block allows (neighbours sit 46 apart),
   raised on pylons so the jet, traffic and the character pass underneath, and double-sided so it reads from both streets. */
const BW = 36, BH = 20.25, BY = 9, BZ = HALF + 3.5;
const PLATE_H = 3.8, BANNER_TOP = BY + BH + 0.4 + PLATE_H, LEG_X = BW * 0.36;
const BANNER_MID = (BY - 0.4 + BANNER_TOP) / 2, BANNER_HALF_H = (BANNER_TOP - BY + 0.4) / 2 + 0.6;
/* some banners face straight down the street, some turn a little left or right (lot indices, so neighbours differ) */
const bannerYaw = (li, lj) => [0, 10, -10, 16, -16][(li * 2 + lj * 3) % 5] * Math.PI / 180;
function bannerTexture(p) {
  const c = document.createElement("canvas"); c.width = 1024; c.height = 576; const x = c.getContext("2d");
  x.fillStyle = "#0B0F17"; x.fillRect(0, 0, 1024, 576);
  x.strokeStyle = "rgba(255,255,255,.08)"; x.lineWidth = 2;
  for (let k = 0; k < 1024; k += 64) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k, 576); x.stroke(); }
  x.fillStyle = "rgba(255,255,255,.12)"; x.beginPath(); x.arc(512, 250, 96, 0, Math.PI * 2); x.fill();
  x.fillStyle = "#FFFFFF"; x.beginPath(); x.moveTo(482, 196); x.lineTo(482, 304); x.lineTo(574, 250); x.closePath(); x.fill();
  x.textAlign = "center"; x.fillStyle = "#EEF2F8"; x.font = "700 46px Rajdhani, sans-serif";
  x.fillText(p.visibility === "pending" ? "Footage after studio approval" : "Demo video coming soon", 512, 420);
  x.fillStyle = "#A7B2C3"; x.font = "600 32px Rajdhani, sans-serif"; x.fillText(p.role || p.engineLabel || "", 512, 470);
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
}
function nameplateTexture(p, col) {
  const c = document.createElement("canvas"); c.width = 1024; c.height = 112; const x = c.getContext("2d");
  x.fillStyle = col; x.fillRect(0, 0, 1024, 112);
  x.fillStyle = "#0B0F17"; x.font = "700 56px Rajdhani, sans-serif"; x.textBaseline = "middle";
  let n = p.name; while (x.measureText(n).width > 760 && n.length > 4) n = n.slice(0, -2); if (n !== p.name) n = n.trim() + "…";
  x.fillText(n, 32, 60);
  x.textAlign = "right"; x.font = "700 40px Rajdhani, sans-serif"; x.fillText(p.media && p.media.video ? "▶  CLICK TO WATCH" : (p.engineLabel || ""), 992, 60);
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
}
const frameMats = { day: new THREE.MeshStandardMaterial({ color: 0x2B3038, metalness: 0.4, roughness: 0.5 }), night: new THREE.MeshStandardMaterial({ color: 0x1A1F2A, metalness: 0.4, roughness: 0.5 }) };
const legGeo = new THREE.BoxGeometry(1.1, BY, 1.1);
/* frame + pylons; every banner part is clickable and opens the video player */
const bannerPicks = new Set();
function bannerFrame(g, i) {
  bannerPicks.add(part(g, new THREE.BoxGeometry(BW + 0.8, BH + 0.8, 0.6), 0, BY + BH / 2, 0, frameMats, i));
  part(g, legGeo, -LEG_X, BY / 2, 0, frameMats); part(g, legGeo, LEG_X, BY / 2, 0, frameMats);
}
/* the same picture on the front and the back (a plane turned round reads correctly from behind) */
function bannerScreen(g, mat, i) {
  const geo = new THREE.PlaneGeometry(BW, BH), front = new THREE.Mesh(geo, mat), back = new THREE.Mesh(geo, mat);
  front.position.set(0, BY + BH / 2, 0.31); back.position.set(0, BY + BH / 2, -0.31); back.rotation.y = Math.PI;
  [front, back].forEach((m) => { m.userData.i = i; g.add(m); pickables.push(m); bannerPicks.add(m); });
  return front;
}
function bannerPlate(g, mat) {
  const geo = new THREE.PlaneGeometry(BW + 0.8, PLATE_H), front = new THREE.Mesh(geo, mat), back = new THREE.Mesh(geo, mat);
  front.position.set(0, BY + BH + 0.4 + PLATE_H / 2, 0.05); back.position.set(0, BY + BH + 0.4 + PLATE_H / 2, -0.05); back.rotation.y = Math.PI;
  g.add(front); g.add(back); return front;
}
/* solid parts of a banner: the screen only blocks things at its own height, the pylons block at ground level */
function bannerColliders(c, yaw) {
  const cs = Math.cos(yaw), sn = Math.sin(yaw), rot = yaw || undefined;   /* pylons turn with the banner around its centre */
  colliders.push({ x: c.x, z: c.z + BZ, rx: BW / 2 + 0.6, rz: 0.9, h: BANNER_TOP, y0: BY - 0.4, rot });
  [-LEG_X, LEG_X].forEach((dx) => colliders.push({ x: c.x + dx * cs, z: c.z + BZ - dx * sn, rx: 0.9, rz: 0.9, h: BY, rot }));
}
function makeBanner(holder, p, i, col, yaw) {
  const g = new THREE.Group(); g.position.set(0, 0, BZ); g.rotation.y = yaw; holder.add(g);
  bannerFrame(g, i);
  const screenMat = new THREE.MeshBasicMaterial({ map: bannerTexture(p) });
  const screen = bannerScreen(g, screenMat, i);
  const plate = bannerPlate(g, new THREE.MeshBasicMaterial({ map: nameplateTexture(p, CSSCOL[p.engine]) }));
  let video = null;
  if (p.media.loop) {
    video = document.createElement("video"); video.src = p.media.loop; video.muted = true; video.loop = true; video.playsInline = true; video.crossOrigin = "anonymous"; video.preload = "none";
    if (p.media.poster) new THREE.TextureLoader().load(p.media.poster, (t) => { if (screenMat.map && !screenMat.map.isVideoTexture) { screenMat.map = t; screenMat.needsUpdate = true; } });
    screen.userData.videoTex = new THREE.VideoTexture(video);
  } else if (p.media.poster) {
    new THREE.TextureLoader().load(p.media.poster, (t) => { screenMat.map = t; screenMat.needsUpdate = true; });
  }
  fontsReady.then(() => {
    if (!screenMat.map || !screenMat.map.isVideoTexture) { if (!p.media.poster) { screenMat.map = bannerTexture(p); screenMat.needsUpdate = true; } }
    plate.material.map = nameplateTexture(p, CSSCOL[p.engine]); plate.material.needsUpdate = true;
  });
  return { group: g, screen, screenMat, video, playing: false, world: new THREE.Vector3() };
}
/* play a banner's video only while the camera is close, and at most the 4 nearest at once, to save battery;
   nothing plays while the theater is open (it covers the city) */
const BANNER_PLAY_R = 110 * PITCH / 46, BANNER_PLAY_MAX = 4;
function updateBanners() {
  const off = view === "simple" || document.body.classList.contains("theater"), near = [];
  buildings.forEach((b) => {
    const bn = b.banner; if (!bn || !bn.video) return;
    bn.group.getWorldPosition(bn.world); bn.dist = camera.position.distanceTo(bn.world);
    if (!off && bn.dist < BANNER_PLAY_R) near.push(bn);
  });
  const play = new Set(near.sort((a, b) => a.dist - b.dist).slice(0, BANNER_PLAY_MAX));
  buildings.forEach((b) => {
    const bn = b.banner; if (!bn || !bn.video) return;
    const close = play.has(bn);
    if (close && !bn.playing) { bn.playing = true; bn.screenMat.map = bn.screen.userData.videoTex; bn.screenMat.needsUpdate = true; bn.video.play().catch(() => { bn.playing = false; }); }
    else if (!close && bn.playing) { bn.playing = false; bn.video.pause(); }
  });
}

PROJECTS.forEach((p, i) => {
  const [li, lj] = LAYOUT[p.id] || [0, 0]; const c = lotCenter(li, lj); const col = COLORS[p.engine];
  const holder = new THREE.Group(); holder.position.copy(c); scene.add(holder);
  const info = buildArchetype(holder, p, i, col);
  /* demo-video banner: a framed billboard in front of each building, facing the road */
  const yaw = bannerYaw(li, lj), banner = makeBanner(holder, p, i, col, yaw);
  const label = [p.name, p.engineLabel || "Details coming soon", CSSCOL[p.engine]];
  const tex = { day: labelTexture(...label, "day"), night: labelTexture(...label, "night") };
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.day, transparent: true, depthWrite: false }));
  sprite.scale.set(16, 4, 1); sprite.position.set(c.x, Math.max(info.top, BANNER_TOP) + 5, c.z); sprite.userData = { label, tex }; scene.add(sprite);
  const tag = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.5), new THREE.MeshBasicMaterial({ map: plotTag(i + 1, CSSCOL[p.engine]), transparent: true }));
  tag.rotation.x = -Math.PI / 2; tag.position.set(c.x - 8, 0.36, c.z + 12.2); scene.add(tag); notBp.push(tag);
  const pad = new THREE.Mesh(new THREE.RingGeometry(4.2, 5.4, 40), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
  pad.rotation.x = -Math.PI / 2; pad.position.set(c.x, 0.08, c.z + PAD_Z); scene.add(pad);
  buildings.push({ p, i, holder, sprite, pad, center: c, padPos: pad.position.clone(), h: info.top, banner, yaw });
  colliders.push({ x: c.x, z: c.z, rx: HALF + 2.2, rz: HALF + 2.2, h: info.top + 1 }); bannerColliders(c, yaw);
});

const plazaC = lotCenter(PLAZA_LOT[0], PLAZA_LOT[1]);
const plaza = new THREE.Group(); plaza.position.copy(plazaC); scene.add(plaza);
const ring = new THREE.Mesh(new THREE.TorusGeometry(7, 0.35, 8, 48), new THREE.MeshBasicMaterial({ color: 0xFFD24A })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.5; plaza.add(ring);
const holo = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 2.4, 9, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xFFD24A, transparent: true, opacity: 0.18, side: THREE.DoubleSide })); holo.position.y = 4.5; plaza.add(holo); nightOnly.push(holo);
/* welcome billboard at the plaza (replaces the HUD brand panel) */
function welcomeTexture() {
  const c = document.createElement("canvas"); c.width = 1024; c.height = 512; const x = c.getContext("2d");
  x.fillStyle = "#14213D"; x.fillRect(0, 0, 1024, 512); x.fillStyle = "#FFD24A"; x.fillRect(0, 0, 1024, 14);
  const W = 910;
  x.fillStyle = "#FFFFFF"; x.font = '400 150px "Russo One", sans-serif'; x.fillText(SHORT.toUpperCase(), 56, 190, W);
  x.fillStyle = "#EEF2F8"; x.font = "700 50px Rajdhani, sans-serif"; x.fillText("Game Developer, Unity and Unreal Engine", 60, 270, W);
  x.fillStyle = "#FFD24A"; x.font = "700 46px Rajdhani, sans-serif"; x.fillText(PROFILE.yearsExperience + "+ years  ·  " + PROJECTS.length + " projects  ·  PC, mobile and web", 60, 345, W);
  x.fillStyle = "#B8C3D6"; x.font = "600 38px Rajdhani, sans-serif"; x.fillText("Every building is one of my games.", 60, 425, W); x.fillText("Drive to a glowing ring, or press Take the tour.", 60, 470, W);
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
}
const welcome = new THREE.Group(); welcome.position.set(plazaC.x, 0, plazaC.z - 3); scene.add(welcome);
const welcomeMat = new THREE.MeshBasicMaterial({ map: welcomeTexture() });
part(welcome, new THREE.BoxGeometry(25, 13, 0.6), 0, 12.5, 0, frameMats);
part(welcome, new THREE.BoxGeometry(0.7, 6, 0.7), -8, 3, 0, frameMats); part(welcome, new THREE.BoxGeometry(0.7, 6, 0.7), 8, 3, 0, frameMats);
const welcomeScreen = new THREE.Mesh(new THREE.PlaneGeometry(24, 12), welcomeMat); welcomeScreen.position.set(0, 12.5, 0.31); welcome.add(welcomeScreen);
/* controls painted on the road at the spawn point */
function paintTexture() {
  const c = document.createElement("canvas"); c.width = 1024; c.height = 220; const x = c.getContext("2d");
  x.fillStyle = "rgba(20,33,61,.85)"; x.textAlign = "center";
  x.font = "700 78px Rajdhani, sans-serif"; x.fillText("W A S D  TO DRIVE", 512, 92, 980);
  x.font = "700 50px Rajdhani, sans-serif"; x.fillText("SHIFT BOOST  ·  HOLD F FLY UP  ·  HOLD E FLY DOWN  ·  E OPEN", 512, 178, 980);
  return new THREE.CanvasTexture(c);
}
const paint = new THREE.Mesh(new THREE.PlaneGeometry(20, 4.3), new THREE.MeshBasicMaterial({ map: paintTexture(), transparent: true }));
paint.rotation.x = -Math.PI / 2; paint.position.set(plazaC.x, 0.34, plazaC.z + 8); scene.add(paint); notBp.push(paint);
/* district signs on the main avenue */
function signTexture(t) {
  const c = document.createElement("canvas"); c.width = 640; c.height = 140; const x = c.getContext("2d");
  x.fillStyle = "#1E6B3A"; x.fillRect(0, 0, 640, 140); x.strokeStyle = "#FFFFFF"; x.lineWidth = 6; x.strokeRect(8, 8, 624, 124);
  x.fillStyle = "#FFFFFF"; x.font = "700 62px Rajdhani, sans-serif"; x.textBaseline = "middle"; x.fillText(t, 40, 74, 500);
  x.beginPath(); x.moveTo(560, 44); x.lineTo(600, 70); x.lineTo(560, 96); x.closePath(); x.fill();
  return new THREE.CanvasTexture(c);
}
const signs = [];
DISTRICTS.forEach((d, j) => {
  const c = lotCenter(2, j); const sx = c.x + PITCH / 2 - 6, sz = c.z + PITCH / 2 - 6;
  const pole = dual(new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 9, 8), detailMats.day), detailMats.day, detailMats.night); pole.position.set(sx, 4.5, sz); scene.add(pole);
  const sg = new THREE.Sprite(new THREE.SpriteMaterial({ map: signTexture(d), depthWrite: false })); sg.scale.set(11, 2.4, 1); sg.position.set(sx, 9.5, sz); scene.add(sg); notBp.push(sg); signs.push({ sg, d });
});
/* special buildings: About (studio) and Contact (radio tower) */
const studioMats = { day: new THREE.MeshStandardMaterial({ color: 0xF5F3EE, roughness: 0.6 }), night: new THREE.MeshStandardMaterial({ color: 0x2A3550, emissive: 0x1A2236 }) };
const goldMats = { day: new THREE.MeshStandardMaterial({ color: 0xFFD24A, roughness: 0.5 }), night: new THREE.MeshBasicMaterial({ color: 0xFFD24A }) };
const greenMats = { day: new THREE.MeshStandardMaterial({ color: 0x2FBF63, roughness: 0.5 }), night: new THREE.MeshBasicMaterial({ color: 0x7EE08F }) };
const redLight = new THREE.MeshBasicMaterial({ color: 0xFF3B3B });
function infoTexture(kind) {
  const c = document.createElement("canvas"); c.width = 1024; c.height = 576; const x = c.getContext("2d"); const W = 940;
  x.fillStyle = "#0B0F17"; x.fillRect(0, 0, 1024, 576);
  if (kind === "about") {
    const edu = PROFILE.education[0];
    x.fillStyle = "#FFFFFF"; x.font = '400 92px "Russo One", sans-serif'; x.fillText(SHORT.toUpperCase(), 48, 120, W);
    x.fillStyle = "#EEF2F8"; x.font = "700 42px Rajdhani, sans-serif"; x.fillText("Game developer, Unity and Unreal Engine", 50, 180, W);
    x.fillStyle = "#FFD24A"; x.font = "700 40px Rajdhani, sans-serif"; x.fillText(PROFILE.yearsExperience + "+ years  ·  " + PROJECTS.length + " projects  ·  PC, mobile and web", 50, 240, W);
    x.fillStyle = "#B8C3D6"; x.font = "600 34px Rajdhani, sans-serif";
    x.fillText("Unity · Unreal Engine 5 · C# · C++ · Blueprints · WebGL · Multiplayer", 50, 310, W);
    if (edu) x.fillText(edu.degree + ", " + edu.school + ", " + edu.period.split(/\s*[–-]\s*/).pop(), 50, 360, W);
    if (REVIEWS[0]) {
      x.fillStyle = "#FFD24A"; x.font = "700 36px Rajdhani, sans-serif"; x.fillText("★★★★★  " + PROFILE.upworkRating + " Upwork client review", 50, 440, W);
      x.fillStyle = "#EEF2F8"; x.font = "italic 600 32px Rajdhani, sans-serif"; x.fillText("“Excellent work on a complex Zombie AI system for our", 50, 488, W); x.fillText("Unreal Engine multiplayer survival game.”", 50, 528, W);
    }
  } else {
    x.fillStyle = "#FFFFFF"; x.font = '400 70px "Russo One", sans-serif'; x.fillText("Let's build your", 48, 120, W); x.fillText("next game.", 48, 200, W);
    x.fillStyle = "#B8C3D6"; x.font = "600 36px Rajdhani, sans-serif"; x.fillText("Open to freelance projects and full-time roles in Unity or Unreal.", 50, 265, W);
    x.fillStyle = "#7EE08F"; x.font = "700 46px Rajdhani, sans-serif"; x.fillText(EMAIL, 50, 360, W);
    x.fillStyle = "#EEF2F8"; x.font = "700 40px Rajdhani, sans-serif"; x.fillText(GITHUB.replace(/^https?:\/\//, ""), 50, 425, W);
    x.fillStyle = "#B8C3D6"; x.font = "600 32px Rajdhani, sans-serif"; x.fillText("Park on the ring and press E for buttons to email me or start a project.", 50, 510, W);
  }
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
}
SPECIALS.forEach((sp, k) => {
  const idx = PROJECTS.length + k, [li, lj] = SPECIAL_LOTS[sp.kind], c = lotCenter(li, lj);
  const holder = new THREE.Group(); holder.position.copy(c); scene.add(holder); let top;
  if (sp.kind === "about") {
    part(holder, new THREE.BoxGeometry(22, 9, 18), 0, 4.5, -2, studioMats, idx);
    part(holder, new THREE.BoxGeometry(14, 6, 10), -2, 12, -4, studioMats, idx);
    part(holder, new THREE.BoxGeometry(18, 5, 0.4), 0, 3.5, 7.2, glassMats);
    part(holder, new THREE.BoxGeometry(22.4, 0.9, 18.4), 0, 9.2, -2, goldMats);
    top = 16;
  } else {
    part(holder, new THREE.BoxGeometry(10, 5, 10), 0, 2.5, 0, studioMats, idx);
    part(holder, new THREE.CylinderGeometry(0.9, 1.6, 44, 8), 0, 22, 0, detailMats, idx);
    [12, 22, 32].forEach((y) => part(holder, new THREE.TorusGeometry(3.2 - y / 20, 0.25, 6, 24), 0, y, 0, greenMats));
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(1.1, 12, 10), redLight); bulb.position.y = 44.8; holder.add(bulb); nightOnly.push(bulb);
    top = 46;
  }
  const label = [sp.name, sp.sub, sp.color];
  const tex = { day: labelTexture(...label, "day"), night: labelTexture(...label, "night") };
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.day, transparent: true, depthWrite: false }));
  sprite.scale.set(16, 4, 1); sprite.position.set(c.x, Math.max(top, BANNER_TOP) + 5, c.z); sprite.userData = { label, tex }; scene.add(sprite);
  const pad = new THREE.Mesh(new THREE.RingGeometry(4.2, 5.4, 40), new THREE.MeshBasicMaterial({ color: sp.color, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
  pad.rotation.x = -Math.PI / 2; pad.position.set(c.x, 0.08, c.z + PAD_Z); scene.add(pad);
  /* info banner in front of the special building, same frame as the project banners */
  const yaw = bannerYaw(li, lj), ig = new THREE.Group(); ig.position.set(0, 0, BZ); ig.rotation.y = yaw; holder.add(ig);
  bannerFrame(ig, idx);
  const infoMat = new THREE.MeshBasicMaterial({ map: infoTexture(sp.kind) });
  bannerScreen(ig, infoMat, idx);
  const iplate = bannerPlate(ig, new THREE.MeshBasicMaterial({ map: nameplateTexture({ name: sp.name, engineLabel: sp.sub }, sp.color) }));
  fontsReady.then(() => { infoMat.map = infoTexture(sp.kind); infoMat.needsUpdate = true; iplate.material.map = nameplateTexture({ name: sp.name, engineLabel: sp.sub }, sp.color); iplate.material.needsUpdate = true; });
  buildings.push({ p: null, special: sp.kind, color: sp.color, i: idx, holder, sprite, pad, center: c, padPos: pad.position.clone(), h: top, banner: { video: null }, yaw });
  colliders.push({ x: c.x, z: c.z, rx: HALF + 2.2, rz: HALF + 2.2, h: top + 1 }); bannerColliders(c, yaw);
});
function relabel() {
  const m = look === "day" ? "day" : "night";
  buildings.forEach((b) => { b.sprite.material.map = b.sprite.userData.tex[m]; b.sprite.material.needsUpdate = true; });
}
fontsReady.then(() => {
  buildings.forEach((b) => { const l = b.sprite.userData.label; b.sprite.userData.tex = { day: labelTexture(...l, "day"), night: labelTexture(...l, "night") }; });
  welcomeMat.map = welcomeTexture(); welcomeMat.needsUpdate = true; paint.material.map = paintTexture(); paint.material.needsUpdate = true;
  signs.forEach(({ sg, d }) => { sg.material.map = signTexture(d); sg.material.needsUpdate = true; });
  relabel();
});

/* small modelling helpers */
const SKIN = 0xC99872;
const M = (c, extra) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.7 }, extra || {}));
function box(g, w, h, d, c, x, y, z) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof c === "number" ? M(c) : c); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; }
function ball(g, r, c, x, y, z, sy) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), typeof c === "number" ? M(c) : c); m.position.set(x, y, z); if (sy) m.scale.y = sy; m.castShadow = true; g.add(m); return m; }
function limb(parent, w, h, c, x, y) { const pv = new THREE.Group(); pv.position.set(x, y, 0); parent.add(pv); const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), M(c)); m.position.y = -h / 2; m.castShadow = true; pv.add(m); return pv; }

/* ---------- waterfront: animated sea shader, seawall, beaches, bridges, lighthouse, pier, sailboats ---------- */
const seaUniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
  uTime: { value: 0 }, uDeep: { value: new THREE.Color(0x0E5C92) }, uShallow: { value: new THREE.Color(0x3FD0C9) },
  uSky: { value: new THREE.Color(0xBFE3F5) }, uSun: { value: new THREE.Vector3(0.5, 0.75, 0.4).normalize() }, uGlint: { value: 1.0 }, uLand: { value: new THREE.Vector2(LX, LZ) },
}]);
const seaMat = new THREE.ShaderMaterial({
  uniforms: seaUniforms, fog: true,
  vertexShader: `
    uniform float uTime; varying vec3 vW; varying vec3 vN;
    #include <fog_pars_vertex>
    float wh(vec2 p){ return sin(p.x*0.045+uTime*0.8)*0.45 + sin(p.y*0.06+uTime*1.05)*0.35 + sin((p.x+p.y)*0.12+uTime*1.6)*0.18 + sin((p.x-p.y)*0.21+uTime*2.3)*0.08; }
    void main(){
      vec4 wp = modelMatrix * vec4(position, 1.0);
      float h = wh(wp.xz), hx = wh(wp.xz + vec2(1.0, 0.0)), hz = wh(wp.xz + vec2(0.0, 1.0));
      wp.y += h; vN = normalize(vec3(h - hx, 1.0, h - hz)); vW = wp.xyz;
      vec4 mvPosition = viewMatrix * wp; gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
    }`,
  fragmentShader: `
    uniform float uTime, uGlint; uniform vec3 uDeep, uShallow, uSky, uSun; uniform vec2 uLand; varying vec3 vW; varying vec3 vN;
    #include <common>
    #include <fog_pars_fragment>
    void main(){
      vec3 n = normalize(vN + vec3(sin(vW.x*0.8+uTime*2.1)*0.06 + sin(vW.z*1.7-uTime*1.3)*0.04, 0.0, cos(vW.z*0.9+uTime*1.8)*0.06 + cos(vW.x*1.5+uTime*1.1)*0.04));
      vec3 v = normalize(cameraPosition - vW);
      float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
      vec2 d = max(abs(vW.xz) - uLand, 0.0); float dist = length(d);
      float shallow = 1.0 - smoothstep(0.0, 70.0, dist);
      vec3 col = mix(uDeep, uShallow, shallow * 0.8);
      col = mix(col, uSky, clamp(fres * 0.7, 0.0, 0.75));
      vec3 hv = normalize(uSun + v); float spec = pow(max(dot(n, hv), 0.0), 220.0);
      col += vec3(1.0, 0.96, 0.85) * spec * 1.6 * uGlint;
      float foam = (1.0 - smoothstep(0.0, 7.0, dist)) * (0.55 + 0.45 * sin(dist * 1.4 - uTime * 2.6));
      col = mix(col, vec3(0.97, 0.99, 1.0), clamp(foam, 0.0, 1.0) * 0.75);
      gl_FragColor = vec4(col, 1.0);
      #include <fog_fragment>
    }`,
});
const sea = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400, 220, 220), seaMat);
sea.rotation.x = -Math.PI / 2; sea.position.y = -1.6; scene.add(sea); notBp.push(sea);
function seaLook(mode) {
  const day = mode === "day";
  seaUniforms.uDeep.value.set(day ? 0x0E5C92 : 0x061325); seaUniforms.uShallow.value.set(day ? 0x3FD0C9 : 0x0F3B4A);
  seaUniforms.uSky.value.set(day ? 0xBFE3F5 : 0x16233D); seaUniforms.uGlint.value = day ? 1.0 : 0.55;
}
const wallMats = { day: new THREE.MeshStandardMaterial({ color: 0xCFC6B4, roughness: 0.9 }), night: new THREE.MeshStandardMaterial({ color: 0x2A3142 }) };
const beachMats = { day: new THREE.MeshStandardMaterial({ color: 0xEBD3A6, roughness: 1 }), night: new THREE.MeshStandardMaterial({ color: 0x1D2433 }) };
[[0, -LZ, LX * 2 + 2, 2], [0, LZ, LX * 2 + 2, 2], [-LX, 0, 2, LZ * 2 + 2], [LX, 0, 2, LZ * 2 + 2]].forEach(([x, z, w, d]) => {
  const m = dual(new THREE.Mesh(new THREE.BoxGeometry(w, 3.2, d), wallMats.day), wallMats.day, wallMats.night); m.position.set(x, -1.5, z); m.receiveShadow = true; scene.add(m); notBp.push(m);
});
[[0, LZ + 11, LX * 2, 20], [-LX - 11, 0, 20, LZ * 2]].forEach(([x, z, w, d]) => {
  const b = dual(new THREE.Mesh(new THREE.BoxGeometry(w, 2.4, d), beachMats.day), beachMats.day, beachMats.night); b.position.set(x, -2.1, z); scene.add(b); notBp.push(b);
});
/* beach umbrellas and loungers along the south beach */
const umbCols = [0xFF5A5F, 0xFFD24A, 0x4DB6FF, 0x7EE08F];
for (let k = -6; k <= 6; k += 2) {
  const g = new THREE.Group(); g.position.set(k * 22 + 6, -0.9, LZ + 12); scene.add(g); notBp.push(g);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4, 6), M(0xEEEEEE)); pole.position.y = 2; g.add(pole);
  const top = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.1, 10), M(umbCols[(k + 6) / 2 % 4])); top.position.y = 4.2; top.castShadow = true; g.add(top);
  const lounger = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.3, 3.2), M(0xFFFFFF)); lounger.position.set(2.3, 0.4, 0.3); g.add(lounger);
}
const deckMats = { day: new THREE.MeshStandardMaterial({ color: 0x6A6C73, roughness: 0.9 }), night: new THREE.MeshStandardMaterial({ color: 0x1A2130 }) };
function bridge(x, z, len, alongX) {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g); notBp.push(g);
  const deck = dual(new THREE.Mesh(new THREE.BoxGeometry(alongX ? len : 18, 1, alongX ? 18 : len), deckMats.day), deckMats.day, deckMats.night); deck.position.y = -0.4; deck.castShadow = true; g.add(deck);
  for (let k = 0; k < len; k += 28) {
    const px = alongX ? -len / 2 + k + 14 : 0, pz = alongX ? 0 : -len / 2 + k + 14;
    [-7, 7].forEach((o) => { const pl = dual(new THREE.Mesh(new THREE.CylinderGeometry(1, 1.2, 8, 10), wallMats.day), wallMats.day, wallMats.night); pl.position.set(px + (alongX ? 0 : o), -4.6, pz + (alongX ? o : 0)); g.add(pl); });
  }
  [-8.6, 8.6].forEach((o) => { const r = dual(new THREE.Mesh(new THREE.BoxGeometry(alongX ? len : 0.4, 1.2, alongX ? 0.4 : len), wallMats.day), wallMats.day, wallMats.night); r.position.set(alongX ? 0 : o, 0.6, alongX ? o : 0); g.add(r); });
  /* suspension towers and cables */
  [len * 0.3, len * 0.7].forEach((off) => {
    const tx = alongX ? -len / 2 + off : 0, tz = alongX ? 0 : -len / 2 + off;
    [-8, 8].forEach((o) => { const tw = dual(new THREE.Mesh(new THREE.BoxGeometry(1.4, 26, 1.4), wallMats.day), wallMats.day, wallMats.night); tw.position.set(tx + (alongX ? 0 : o), 13, tz + (alongX ? o : 0)); g.add(tw); });
  });
}
bridge(-0.5 * PITCH, -LZ - 160, 320, false);
bridge(LX + 160, 0, 320, true);
/* lighthouse on the south-west corner, with a sweeping beam at night */
const lh = new THREE.Group(); lh.position.set(-LX - 4, 0, LZ + 4); scene.add(lh); notBp.push(lh);
for (let k = 0; k < 6; k++) { const seg = new THREE.Mesh(new THREE.CylinderGeometry(2.6 - k * 0.18, 2.8 - k * 0.18, 4, 16), M(k % 2 ? 0xD94141 : 0xFFFFFF)); seg.position.y = 2 + k * 4; seg.castShadow = true; lh.add(seg); }
const lamp = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 2.6, 12), new THREE.MeshBasicMaterial({ color: 0xFFF2B0 })); lamp.position.y = 25.3; lh.add(lamp);
const cap = new THREE.Mesh(new THREE.ConeGeometry(2.2, 2.4, 12), M(0x26282E)); cap.position.y = 27.8; lh.add(cap);
const beam = new THREE.Mesh(new THREE.ConeGeometry(9, 80, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xFFF2B0, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }));
beam.rotation.z = Math.PI / 2; beam.position.set(40, 0, 0); const beamPivot = new THREE.Group(); beamPivot.position.y = 25.3; beamPivot.add(beam); lh.add(beamPivot); nightOnly.push(beamPivot);
/* wooden pier on the south beach */
const pierMat = M(0x9C7653);
const pier = new THREE.Group(); pier.position.set(0.5 * PITCH, -0.4, LZ + 20); scene.add(pier); notBp.push(pier);
const pd = new THREE.Mesh(new THREE.BoxGeometry(6, 0.6, 70), pierMat); pd.position.z = 35; pd.castShadow = true; pier.add(pd);
for (let k = 0; k < 70; k += 10) [-2.6, 2.6].forEach((o) => { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 5, 8), pierMat); post.position.set(o, -2.2, k + 2); pier.add(post); });
/* sailboats */
const boats = [];
function makeSailboat(color) {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 0.9, 1.4, 4, 1), M(0xFFFFFF)); hull.scale.set(1, 1, 3.4); hull.rotation.y = Math.PI / 4; hull.position.y = -0.9; g.add(hull);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.2, 7), M(0xC89B6D)); deck.position.y = -0.2; g.add(deck);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 11, 6), M(0xEEEEEE)); mast.position.set(0, 5.3, 0.5); g.add(mast);
  const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.lineTo(0, 10); shape.lineTo(4.6, 0.6); shape.closePath();
  const sail = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, roughness: 0.8 })); sail.rotation.y = Math.PI / 2; sail.position.set(0, 0.3, 0.6); g.add(sail);
  const jib = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshStandardMaterial({ color: 0xFFFFFF, side: THREE.DoubleSide })); jib.scale.set(0.7, 0.75, 1); jib.rotation.y = -Math.PI / 2; jib.position.set(0, 0.3, 0.4); g.add(jib);
  scene.add(g); notBp.push(g); return g;
}
[[0xFF5A5F, 0, 0.018], [0x4DB6FF, 1, -0.013], [0xFFD24A, 2, 0.011], [0x7EE08F, 3, -0.009]].forEach(([c, k, sp]) => boats.push({ g: makeSailboat(c), rx: LX + 40 + k * 30, rz: LZ + 36 + k * 26, sp, a: k * 1.6 }));
function stepWater(dt) {
  seaUniforms.uTime.value += dt * (reduceMotion ? 0.3 : 1);
  seaUniforms.uSun.value.copy(sun.position).normalize();
  beamPivot.rotation.y += dt * 0.6;
  boats.forEach((b) => { b.a += b.sp * dt * (reduceMotion ? 0.5 : 1);
    b.g.position.set(Math.cos(b.a) * b.rx, Math.sin(t * 1.2 + b.a * 3) * 0.25, Math.sin(b.a) * b.rz);
    b.g.rotation.y = Math.atan2(-Math.sin(b.a) * b.rx, Math.cos(b.a) * b.rz) + (b.sp < 0 ? Math.PI : 0);
    b.g.rotation.z = Math.sin(t * 0.9 + b.a * 2) * 0.06; });
}

/* ---------- game characters: one hero per building, with its own props and idle ---------- */
/* Placeholders built from primitives. In the real site each project supplies media.character (GLB with Idle/Wave clips). */
const CHARACTERS = {
  "kingdomland": { type: "thobe", label: "KingdomLand citizen", hi: "Welcome to KingdomLand!" },
  "nayzak": { type: "hooded", label: "NAYZAK", hi: "NAYZAK is coming soon." },
  "wahm": { type: "mystery", label: "WAHM", hi: "WAHM: character coming soon" },
  "kick-arena": { type: "mystery", label: "Kick Arena", hi: "Kick Arena: character coming soon" },
  "tamr": { type: "mystery", label: "Tamr", hi: "Tamr: character coming soon" },
  "mars-simulation": { type: "astronaut", label: "Mars explorer", hi: "Ready for the Mars mission?" },
  "orionmeta": { type: "avatar", label: "OrionMeta avatar", hi: "Join me in the metaverse!" },
  "kungfu-karate": { type: "fighter", label: "Karate fighter", hi: "Hi-yah! Fight me in KungFu Karate!" },
  "mototraffic-rider": { type: "rider", label: "Moto rider", hi: "Let’s race through traffic!" },
  "fps-commando": { type: "soldier", label: "Commando", hi: "Mission briefing inside, soldier." },
  "boba-tea": { type: "shopkeeper", label: "Boba shop owner", hi: "One boba tea coming up!" },
  "reader-bee": { type: "bee", label: "Reader Bee", hi: "Buzz! Let’s read together!" },
  "bank-manager": { type: "banker", label: "Bank manager", hi: "Welcome to the bank!" },
  "bank-atm": { type: "teller", label: "ATM helper", hi: "Insert card to learn banking!" },
  "virtual-mom": { type: "parent", label: "Virtual Mom", hi: "Busy day at home today!" },
  /* the six projects added after the prototype, in the same style */
  "you-will-die": { type: "zombie", label: "Zombie", hi: "Braaains… You Will Die!" },
  "tank-game": { type: "tanker", label: "Tank commander", hi: "Tanks rolling! Watch your six." },
  "hack-and-slash-arpg": { type: "swordsman", label: "Serath", hi: "Blades ready. Face the boss!" },
  "space-fighter": { type: "marine", label: "Space marine", hi: "Gear up, pilot!" },
  "scifi-sim-escape": { type: "robot", label: "Enforcer", hi: "Intruder detected. Can you escape?" },
  "island-of-deceit": { type: "pirate", label: "Pirate", hi: "Arr! Can ye spot the traitor?" },
};
function makeHero(type, accent) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const H = { g, body, type, armR: null, armL: null, legs: null, x: {} };
  if (type === "bee") {
    const bee = new THREE.Group(); body.add(bee); H.x.bee = bee;
    ball(bee, 1.1, 0xFFC93C, 0, 0, 0, 1.0).scale.set(1, 1, 1.35);
    [-0.35, 0.35].forEach((z) => { const r = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.16, 8, 24), M(0x1C1C1C)); r.position.z = z; bee.add(r); });
    ball(bee, 0.65, 0xFFC93C, 0, 0.35, 1.45);
    ball(bee, 0.12, 0x111111, -0.25, 0.5, 2.02); ball(bee, 0.12, 0x111111, 0.25, 0.5, 2.02);
    [-1, 1].forEach((sd) => { const a = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 6), M(0x111111)); a.position.set(sd * 0.25, 1.15, 1.6); a.rotation.z = sd * 0.4; bee.add(a); ball(bee, 0.1, 0x111111, sd * 0.45, 1.55, 1.6); });
    H.x.wings = [-1, 1].map((sd) => { const w = new THREE.Mesh(new THREE.CircleGeometry(1.1, 16), new THREE.MeshStandardMaterial({ color: 0xE8F6FF, transparent: true, opacity: 0.7, side: THREE.DoubleSide })); w.position.set(sd * 0.9, 1.0, -0.2); w.rotation.set(-Math.PI / 2, 0, 0); bee.add(w); return w; });
    const book = new THREE.Group(); book.position.set(0, -0.6, 1.6); bee.add(book);
    [-1, 1].forEach((sd) => { const pg = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 1.1), M(0xFFFFFF)); pg.position.x = sd * 0.46; pg.rotation.z = sd * 0.2; book.add(pg); });
    return H;
  }
  if (type === "mystery") {
    const sil = new THREE.Group(); body.add(sil);
    const mat = new THREE.MeshStandardMaterial({ color: accent, transparent: true, opacity: 0.35, emissive: accent, emissiveIntensity: 0.4 });
    const tor = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.1, 0.55), mat); tor.position.y = 1.75; sil.add(tor);
    const hd = new THREE.Mesh(new THREE.SphereGeometry(0.38, 14, 10), mat); hd.position.y = 2.62; sil.add(hd);
    [-0.22, 0.22].forEach((x) => { const lg = new THREE.Mesh(new THREE.BoxGeometry(0.36, 1.15, 0.36), mat); lg.position.set(x, 0.6, 0); sil.add(lg); });
    const qc = document.createElement("canvas"); qc.width = 128; qc.height = 128; const qx = qc.getContext("2d"); qx.fillStyle = "#FFFFFF"; qx.font = "700 110px Rajdhani, sans-serif"; qx.textAlign = "center"; qx.fillText("?", 64, 104);
    const q = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(qc), transparent: true })); q.scale.set(1.6, 1.6, 1); q.position.y = 3.8; body.add(q); H.x.q = q;
    return H;
  }
  const pal = { shirt: accent, pants: 0x2B3242, skin: SKIN };
  const set = (o) => Object.assign(pal, o);
  const PALS = { fighter: { shirt: 0xF4F4F2, pants: 0xF4F4F2 }, soldier: { shirt: 0x4E5D3A, pants: 0x3E4A2E }, rider: { shirt: 0x1C1F26, pants: 0x2A2F3A },
    astronaut: { shirt: 0xF2F2F0, pants: 0xF2F2F0 }, shopkeeper: { shirt: 0xF5B7C8, pants: 0x3A3A48 }, banker: { shirt: 0x1F2D4A, pants: 0x1F2D4A },
    teller: { shirt: 0x6A7484, pants: 0x3A4150 }, thobe: { shirt: 0xFAFAF7, pants: 0xFAFAF7 }, hooded: { shirt: 0x1E2129, pants: 0x1E2129 },
    avatar: { shirt: 0x4DB6FF, pants: 0x2A6FB0 }, parent: { shirt: 0xE57AA6, pants: 0xE57AA6 },
    zombie: { shirt: 0x5C4B3C, pants: 0x3A3A4A, skin: 0x8FB36B }, tanker: { shirt: 0x6B705C, pants: 0x3F4238 }, swordsman: { shirt: 0x6A4C93, pants: 0x2B2D42 },
    marine: { shirt: 0x3D5A80, pants: 0x293241, skin: 0x6C8FB5 }, robot: { shirt: 0x5C6670, pants: 0x3D444B, skin: 0x9AA3AD }, pirate: { shirt: 0xF1E3C6, pants: 0x2B2D42 } };
  if (PALS[type]) set(PALS[type]);
  if (type === "thobe" || type === "hooded" || type === "parent") {
    const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.62, type === "parent" ? 1.05 : 0.82, 2.2, 14), M(pal.shirt)); robe.position.y = 1.1; robe.castShadow = true; body.add(robe);
  } else if (type !== "rider") {
    H.legs = [limb(body, 0.36, 1.15, pal.pants, -0.22, 1.15), limb(body, 0.36, 1.15, pal.pants, 0.22, 1.15)];
  }
  box(body, 1.0, 1.1, 0.55, pal.shirt, 0, 1.75, 0);
  const head = ball(body, 0.38, pal.skin, 0, 2.62, 0); H.x.head = head;
  H.armL = limb(body, 0.28, 1.0, pal.shirt, -0.66, 2.22); H.armR = limb(body, 0.28, 1.0, pal.shirt, 0.66, 2.22);
  if (type === "fighter") {
    box(body, 1.04, 0.16, 0.6, 0x111111, 0, 1.25, 0); box(body, 0.82, 0.14, 0.82, 0xD94141, 0, 2.8, 0);
    const tail = box(body, 0.1, 0.5, 0.08, 0xD94141, 0.1, 2.6, -0.42); tail.rotation.x = 0.4;
    H.armL.rotation.x = -1.3; H.armR.rotation.x = -1.0; H.armL.rotation.z = 0.25; H.armR.rotation.z = -0.25;
  }
  if (type === "soldier") {
    ball(body, 0.46, 0x3E4A2E, 0, 2.76, 0, 0.72); box(body, 1.08, 0.9, 0.7, 0x2F3A24, 0, 1.8, -0.05); box(body, 0.8, 1.0, 0.4, 0x2F3A24, 0, 1.9, -0.55);
    const rifle = new THREE.Group(); rifle.position.set(0.35, 1.95, 0.55); body.add(rifle); H.x.rifle = rifle;
    box(rifle, 0.2, 0.26, 2.0, 0x1C1C1C, 0, 0, 0.2); box(rifle, 0.14, 0.4, 0.2, 0x1C1C1C, 0, -0.3, -0.2); box(rifle, 0.08, 0.08, 0.8, 0x111111, 0, 0.05, 1.5);
    H.armR.rotation.x = -1.35; H.armL.rotation.x = -1.35; H.armL.rotation.z = 0.55;
  }
  if (type === "rider") {
    const bike = new THREE.Group(); body.add(bike); H.x.bike = bike;
    const wheelGeo = new THREE.TorusGeometry(0.62, 0.2, 10, 24);
    [-1.25, 1.25].forEach((z) => { const w = new THREE.Mesh(wheelGeo, M(0x111214)); w.rotation.y = Math.PI / 2; w.position.set(0, 0.62, z); bike.add(w); });
    box(bike, 0.5, 0.55, 1.9, 0xD94141, 0, 1.15, 0); box(bike, 0.55, 0.3, 0.9, 0x1C1C1C, 0, 1.48, -0.35); box(bike, 1.1, 0.1, 0.1, 0x888888, 0, 1.75, 0.95);
    body.position.y = 0; H.x.head.material = M(0xD94141, { metalness: 0.3, roughness: 0.3 }); H.x.head.scale.setScalar(1.25); box(body, 0.62, 0.22, 0.1, 0x1D2633, 0, 2.66, 0.44);
    [-0.22, 0.22].forEach((x) => { const lg = limb(body, 0.36, 1.05, pal.pants, x, 1.35); lg.rotation.x = -1.1; });
    body.children.forEach((c) => { if (c !== bike) c.position.y += 0.2; });
    H.armL.rotation.x = -1.2; H.armR.rotation.x = -1.2; H.armL.rotation.z = 0.15; H.armR.rotation.z = -0.15;
  }
  if (type === "astronaut") {
    head.material = M(0xF2F2F0); head.scale.setScalar(1.4);
    const v = ball(body, 0.36, M(0xC8941E, { metalness: 0.8, roughness: 0.15 }), 0, 2.64, 0.26, 0.9); v.scale.z = 0.55;
    box(body, 0.85, 1.1, 0.5, 0xDADAD6, 0, 1.85, -0.52);
    const flag = new THREE.Group(); flag.position.set(-1.2, 0, 0.2); body.add(flag);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4.2, 6), M(0xDDDDDD)); pole.position.y = 2.1; flag.add(pole);
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.0, 8, 1), new THREE.MeshStandardMaterial({ color: 0xFF8A3D, side: THREE.DoubleSide })); cloth.position.set(0.8, 3.65, 0); flag.add(cloth); H.x.cloth = cloth;
    H.armL.rotation.z = 0.5; H.armL.rotation.x = -0.4;
  }
  if (type === "shopkeeper") {
    box(body, 0.84, 1.25, 0.05, 0xFFFFFF, 0, 1.55, 0.3);
    const cart = new THREE.Group(); cart.position.set(1.6, 0, 0.9); body.add(cart);
    box(cart, 2.0, 1.3, 1.0, 0xFFF4E6, 0, 0.9, 0); box(cart, 2.3, 0.12, 1.3, 0xFF8FB1, 0, 2.9, 0);
    [-0.9, 0.9].forEach((x) => box(cart, 0.08, 1.5, 0.08, 0xCCCCCC, x, 2.15, 0.5));
    [-0.5, 0, 0.5].forEach((x, k) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.45, 10), M([0xC08A5B, 0xF5B7C8, 0x8FD3A8][k])); c.position.set(x, 1.8, 0.2); cart.add(c); });
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.55, 12), M(0xB98557)); cup.position.set(0, -1.05, 0.2); H.armR.add(cup);
  }
  if (type === "banker" || type === "teller") {
    box(body, 0.16, 0.7, 0.05, 0xD94141, 0, 1.85, 0.3); box(body, 0.5, 0.12, 0.05, 0xFFFFFF, 0, 2.25, 0.3);
    if (type === "banker") { box(H.armL, 0.85, 0.65, 0.22, 0x5A3A22, 0, -1.15, 0); ball(body, 0.42, 0x222222, 0, 2.95, 0, 0.35); }
    else {
      const atm = new THREE.Group(); atm.position.set(1.7, 0, 0.2); body.add(atm);
      box(atm, 1.4, 2.6, 0.9, 0x2B3A55, 0, 1.3, 0); box(atm, 1.0, 0.7, 0.05, new THREE.MeshBasicMaterial({ color: 0x6FE3FF }), 0, 1.9, 0.46); box(atm, 0.6, 0.08, 0.05, 0x111111, 0, 1.25, 0.46);
      box(H.armR, 0.5, 0.05, 0.32, 0x2F6FD6, 0, -1.0, 0.2);
    }
  }
  if (type === "parent") {
    ball(body, 0.44, 0x3A2A22, 0, 2.72, -0.1);
    const kid = makeHero("generic", 0x4DB6FF); kid.g.scale.setScalar(0.55); kid.g.position.set(1.2, 0, 0.2); body.add(kid.g); H.x.kid = kid;
  }
  if (type === "thobe") {
    ball(body, 0.45, 0xFFFFFF, 0, 2.73, -0.02, 0.8);
    const sh = new THREE.Mesh(new THREE.ConeGeometry(0.64, 1.05, 14, 1, true), M(0xC8343A, { side: THREE.DoubleSide })); sh.position.set(0, 2.45, -0.08); body.add(sh);
    box(body, 0.9, 0.1, 0.9, 0x111111, 0, 3.0, 0);
    const sign = new THREE.Group(); sign.position.set(-1.4, 0, 0.3); body.add(sign);
    box(sign, 0.12, 3.0, 0.12, 0x8A6A4A, 0, 1.5, 0); box(sign, 1.8, 1.0, 0.1, 0x2FBF63, 0, 2.9, 0);
    H.x.sign = sign;
  }
  if (type === "hooded") {
    const hood = new THREE.Mesh(new THREE.ConeGeometry(0.58, 1.15, 14), M(0x1E2129)); hood.position.set(0, 2.88, -0.05); body.add(hood);
    head.material = M(0x0B0C10);
    H.x.eyes = [-0.13, 0.13].map((x) => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0x6FE3FF })); e.position.set(x, 2.66, 0.34); body.add(e); return e; });
    const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35, 0), new THREE.MeshBasicMaterial({ color: 0xFF8A3D })); orb.position.set(0.9, 2.2, 0.6); body.add(orb); H.x.orb = orb;
  }
  if (type === "avatar") {
    body.traverse((o) => { if (o.material && o.material.color) { o.material = o.material.clone(); o.material.emissive = new THREE.Color(0x1E6FB0); o.material.emissiveIntensity = 0.7; o.material.transparent = true; o.material.opacity = 0.85; } });
    H.x.halos = [0.7, 1.0].map((r, k) => { const h = new THREE.Mesh(new THREE.TorusGeometry(r, 0.05, 8, 40), new THREE.MeshBasicMaterial({ color: k ? 0x9FE3FF : 0xFFD24A })); h.position.y = k ? 1.2 : 3.3; h.rotation.x = Math.PI / 2; body.add(h); return h; });
  }
  if (type === "zombie") {
    box(body, 1.04, 0.5, 0.6, 0x3A3026, 0, 1.45, 0.02);
    H.armL.rotation.x = -1.45; H.armR.rotation.x = -1.35; H.x.head.position.x = 0.08;
  }
  if (type === "tanker") {
    box(body, 0.84, 0.18, 0.84, 0x3F4238, 0, 2.9, 0); box(body, 0.6, 0.12, 0.1, 0x1C1C1C, 0, 2.7, 0.38);
    const tank = new THREE.Group(); tank.position.set(2.1, 0, 0.3); body.add(tank); H.x.tank = tank;
    box(tank, 1.8, 0.7, 2.6, 0x5B8C5A, 0, 0.5, 0); box(tank, 2.0, 0.4, 2.8, 0x2B2D30, 0, 0.2, 0);
    const turret = new THREE.Group(); turret.position.y = 1.1; tank.add(turret); H.x.turret = turret;
    box(turret, 1.1, 0.5, 1.1, 0x4A7449, 0, 0, 0); box(turret, 0.18, 0.18, 1.6, 0x333333, 0, 0, 1.1);
  }
  if (type === "swordsman") {
    box(body, 1.1, 0.14, 0.62, 0x2B2D42, 0, 1.3, 0);
    const sword = box(H.armR, 0.1, 0.1, 1.8, M(0xE0E6ED, { metalness: 0.8, roughness: 0.2 }), 0, -1.0, 0.8);
    box(H.armL, 0.9, 1.0, 0.1, 0x8A6A4A, 0, -0.8, 0.25); H.x.sword = sword;
    H.armL.rotation.x = -0.6;
  }
  if (type === "marine") {
    ball(body, 0.46, 0x3D5A80, 0, 2.72, 0, 0.95); box(body, 0.6, 0.18, 0.1, new THREE.MeshBasicMaterial({ color: 0x6FE3FF }), 0, 2.72, 0.42);
    box(body, 1.12, 0.6, 0.66, 0x293241, 0, 2.05, 0);
    const gun = new THREE.Group(); gun.position.set(0.35, 1.95, 0.55); body.add(gun);
    box(gun, 0.24, 0.3, 1.5, 0x1C1C1C, 0, 0, 0.1); box(gun, 0.1, 0.1, 0.5, 0x6FE3FF, 0, 0.05, 0.95);
    H.armR.rotation.x = -1.35; H.armL.rotation.x = -1.35; H.armL.rotation.z = 0.55;
  }
  if (type === "robot") {
    H.x.head.material = M(0x9AA3AD, { metalness: 0.6, roughness: 0.3 });
    box(body, 0.6, 0.1, 0.05, new THREE.MeshBasicMaterial({ color: 0xFF3B3B }), 0, 2.66, 0.38);
    box(body, 0.06, 0.6, 0.06, 0x5C6670, 0, 3.25, 0); ball(body, 0.1, 0xFF3B3B, 0, 3.6, 0);
    box(body, 1.2, 0.3, 0.7, 0x3D444B, 0, 2.35, 0);
  }
  if (type === "pirate") {
    box(body, 0.84, 0.16, 0.84, 0xD94141, 0, 2.86, 0); box(body, 0.16, 0.12, 0.05, 0x111111, 0.13, 2.68, 0.36);
    box(body, 1.04, 0.14, 0.6, 0x5A3A22, 0, 1.3, 0);
    box(H.armR, 0.08, 0.08, 1.4, M(0xCFD6DD, { metalness: 0.8, roughness: 0.2 }), 0, -1.0, 0.6);
  }
  return H;
}
function charLabel(text, sub, color) {
  const c = document.createElement("canvas"); c.width = 640; c.height = 150; const x = c.getContext("2d");
  x.fillStyle = "rgba(255,255,255,.96)"; x.strokeStyle = color; x.lineWidth = 7;
  const r = 30; x.beginPath(); x.moveTo(r, 4); x.arcTo(636, 4, 636, 146, r); x.arcTo(636, 146, 4, 146, r); x.arcTo(4, 146, 4, 4, r); x.arcTo(4, 4, 636, 4, r); x.closePath(); x.fill(); x.stroke();
  x.textAlign = "center"; x.fillStyle = "#14213D"; x.font = "700 54px Rajdhani, sans-serif"; x.fillText(text, 320, 68, 590);
  x.fillStyle = color; x.font = "700 36px Rajdhani, sans-serif"; x.fillText(sub, 320, 118, 590);
  return new THREE.CanvasTexture(c);
}
/* speech bubble: wraps to up to three lines */
function bubbleTex(text) {
  const c = document.createElement("canvas"); c.width = 720; c.height = 230; const x = c.getContext("2d");
  x.font = "700 40px Rajdhani, sans-serif";
  const lines = []; let cur = "";
  text.split(/\s+/).forEach((w) => { const t = cur ? cur + " " + w : w; if (x.measureText(t).width > 650 && cur) { lines.push(cur); cur = w; } else cur = t; });
  if (cur) lines.push(cur);
  if (lines.length > 3) { lines.length = 3; lines[2] = lines[2].replace(/\s*\S*$/, "") + "…"; }
  const bh = 34 + lines.length * 46, B = bh + 6;
  x.fillStyle = "#FFFFFF"; x.strokeStyle = "#14213D"; x.lineWidth = 6;
  x.beginPath(); x.moveTo(40, 6); x.arcTo(714, 6, 714, B, 34); x.arcTo(714, B, 6, B, 34); x.lineTo(150, B); x.lineTo(110, B + 36); x.lineTo(110, B); x.arcTo(6, B, 6, 6, 34); x.arcTo(6, 6, 714, 6, 34); x.closePath(); x.fill(); x.stroke();
  x.fillStyle = "#14213D"; x.font = "700 40px Rajdhani, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle";
  lines.forEach((l, k) => x.fillText(l, 360, 6 + 17 + 23 + k * 46, 660));
  const tex = new THREE.CanvasTexture(c); tex.offset.y = 0; return tex;
}
/* what each character says while you are parked: its greeting, then the project's talk lines (or its summary) */
function talkLines(p, hi) {
  const more = p.talk.length ? p.talk : (p.summary.match(/[^.!?]+[.!?]+/g) || []).map((x) => x.trim()).slice(0, 2);
  return [hi, ...more];
}
/* real 3D characters: a project's media.character GLB replaces the placeholder figure; clips named Idle / Wave are used when present */
const gltf = new GLTFLoader();
function loadCharacter(f, url) {
  gltf.load(url, (res) => {
    const model = res.scene;
    model.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    const box3 = new THREE.Box3().setFromObject(model), size = box3.getSize(new THREE.Vector3());
    const k = 3.2 / Math.max(size.y, 0.001);   /* about the placeholder's height; the stage scales it 2x */
    model.scale.setScalar(k); model.position.set(-(box3.min.x + size.x / 2) * k, -box3.min.y * k, -(box3.min.z + size.z / 2) * k);
    f.body.visible = false; f.g.add(model);
    if (res.animations.length) {
      const mixer = new THREE.AnimationMixer(model), find = (re) => res.animations.find((a) => re.test(a.name));
      const idle = mixer.clipAction(find(/idle/i) || res.animations[0]), wave = find(/wave|greet|talk|hello/i);
      idle.play(); f.glb = { mixer, idle, wave: wave ? mixer.clipAction(wave) : null, waving: false };
    } else f.glb = { mixer: null };
  }, undefined, () => console.warn("character model failed to load: " + url));
}
const figures = [];
PROJECTS.forEach((p, i) => {
  const ch = CHARACTERS[p.id] || { type: "mystery", label: p.name, hi: p.name };
  const b = buildings[i], col = COLORS[p.engine], css = CSSCOL[p.engine];
  /* the stage stands in the banner's own frame (8 left of centre, 1.8 in front of the screen), so it stays in front of an angled banner */
  const cs = Math.cos(b.yaw), sn = Math.sin(b.yaw), sx = -8, sz = 1.8;
  const spot = new THREE.Group(); spot.position.set(b.center.x + sx * cs + sz * sn, 0.3, b.center.z + BZ - sx * sn + sz * cs); scene.add(spot); notBp.push(spot);
  /* hero stage: a low disc with a glowing ring in the engine colour, and a light cone at night */
  const stage = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.6, 0.5, 28), M(0x1E2533)); stage.position.y = 0.25; stage.receiveShadow = true; spot.add(stage);
  const glowRing = new THREE.Mesh(new THREE.TorusGeometry(2.45, 0.12, 8, 40), new THREE.MeshBasicMaterial({ color: col })); glowRing.rotation.x = Math.PI / 2; glowRing.position.y = 0.52; spot.add(glowRing);
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 2.6, 14, 24, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false })); cone.position.y = 7.3; spot.add(cone); nightOnly.push(cone);
  const H = makeHero(ch.type, col); H.g.position.y = 0.5; H.g.scale.setScalar(2.0); H.g.rotation.y = 0.5; spot.add(H.g);
  const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: charLabel(ch.label, p.name, css), depthWrite: false })); tag.scale.set(6.8, 1.6, 1); tag.position.set(0, 7.4, 0); spot.add(tag);
  const bub = new THREE.Sprite(new THREE.SpriteMaterial({ map: bubbleTex(ch.hi), depthWrite: false, transparent: true })); bub.scale.set(6.6, 1.55, 1); bub.position.set(0, 8.3, 0); bub.visible = false; spot.add(bub);
  bub.scale.set(6.6, 6.6 * 230 / 720, 1);
  const fig = Object.assign(H, { i, spot, tag, bub, label: ch.label, hi: ch.hi, lines: talkLines(p, ch.hi), talkK: -1, talkT: 0, css, phase: i * 0.9, glb: null });
  figures.push(fig);
  if (p.media.character) loadCharacter(fig, p.media.character);
});
fontsReady.then(() => figures.forEach((f) => {
  f.tag.material.map = charLabel(f.label, PROJECTS[f.i].name, f.css); f.tag.material.needsUpdate = true; f.talkK = -1; }));
/* solid props: the welcome billboard and hero stages */
colliders.push({ x: plazaC.x, z: plazaC.z - 3, rx: 13.5, rz: 1.8, h: 19.5 });
figures.forEach((f) => colliders.push({ x: f.spot.position.x, z: f.spot.position.z, rx: 3, rz: 3, h: 10 }));
/* pedestrians walking the sidewalks */
const walkers = [];
const SHIRTS = [0xD94141, 0x2F6FD6, 0x3BAA6B, 0xF0B429, 0x8E5BD9, 0xF4F4F2, 0xE57AA6, 0x26282E];
[[0, 3], [1, 3], [2, 3], [3, 3], [0, 4], [1, 1], [2, 0], [3, 0]].forEach(([li, lj], k) => {
  const f = makeHero("generic", SHIRTS[k % SHIRTS.length]); f.g.scale.setScalar(1.05); scene.add(f.g); notBp.push(f.g);
  walkers.push(Object.assign(f, { c: lotCenter(li, lj), t: k / 8, sp: (k % 2 ? 1 : -1) * 0.018 }));
});
function rectPos(t, h) { const L = 8 * h, d = (((t % 1) + 1) % 1) * L;
  if (d < 2 * h) return [-h + d, -h, Math.PI / 2]; if (d < 4 * h) return [h, -h + d - 2 * h, 0]; if (d < 6 * h) return [h - (d - 4 * h), h, -Math.PI / 2]; return [-h, h - (d - 6 * h), Math.PI]; }
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
function stepPeople(dt, now) {
  const s0 = now / 1000, still = reduceMotion;
  figures.forEach((f) => {
    const s = s0 + f.phase, here = (arrivedIdx === f.i) || (near === f.i);
    /* turn toward the car when it is close, otherwise face the street at an angle */
    const wx = f.spot.position.x, wz = f.spot.position.z, dx = state.x - wx, dz = state.z - wz;
    const close = Math.hypot(dx, dz) < 34 && view === "drive";
    const want = close ? Math.atan2(dx, dz) : 0.5; f.g.rotation.y += angDiff(want, f.g.rotation.y) * Math.min(1, dt * 4);
    f.bub.visible = here && view !== "simple"; f.tag.visible = !f.bub.visible;   /* the bubble takes the name tag's place while talking */
    /* while parked, the character talks through its lines, one every few seconds */
    if (here && (f.talkK < 0 || now - f.talkT > 4500)) {
      f.talkK = f.talkK < 0 ? 0 : (f.talkK + 1) % f.lines.length; f.talkT = now;
      if (f.bub.material.map) f.bub.material.map.dispose();
      f.bub.material.map = bubbleTex(f.lines[f.talkK]); f.bub.material.needsUpdate = true;
    } else if (!here && f.talkK >= 0) f.talkK = -1;
    if (f.glb) {
      if (f.glb.wave && here !== f.glb.waving) { f.glb.waving = here; if (here) { f.glb.wave.reset().fadeIn(0.3).play(); f.glb.idle.fadeOut(0.3); } else { f.glb.idle.reset().fadeIn(0.3).play(); f.glb.wave.fadeOut(0.3); } }
      if (f.glb.mixer) f.glb.mixer.update(dt);
      return;
    }
    if (still) return;
    const T = f.type;
    if (T === "fighter") { const k = (s % 3) / 3; const kick = k > 0.7 ? Math.sin((k - 0.7) / 0.3 * Math.PI) : 0; f.legs[1].rotation.x = -kick * 1.5; f.legs[0].rotation.x = kick * 0.2; f.armR.rotation.x = -1.0 - Math.max(0, Math.sin(s * 5)) * 0.6; f.body.position.y = Math.abs(Math.sin(s * 4)) * 0.08; }
    if (T === "soldier" || T === "marine") { f.body.rotation.y = Math.sin(s * 0.7) * 0.3; f.body.position.y = Math.sin(s * 2) * 0.03; }
    if (T === "rider") { f.body.rotation.z = Math.sin(s * 1.3) * 0.12; f.x.bike.children.forEach((c, k) => { if (k < 2) c.rotation.x += dt * 2; }); }
    if (T === "astronaut") { f.body.position.y = 0.4 + Math.sin(s * 1.2) * 0.35; f.x.cloth.rotation.y = Math.sin(s * 3) * 0.35; }
    if (T === "avatar") { f.body.position.y = 0.6 + Math.sin(s * 2) * 0.25; f.x.halos[0].rotation.z += dt * 1.5; f.x.halos[1].rotation.z -= dt * 2; f.body.rotation.y += dt * 0.4; }
    if (T === "bee") { const a = s * 0.9; f.x.bee.position.set(Math.cos(a) * 1.6, 3.2 + Math.sin(s * 3) * 0.4, Math.sin(a) * 1.6); f.x.bee.rotation.y = -a; f.x.wings.forEach((w, k) => { w.rotation.y = (k ? -1 : 1) * Math.sin(s * 40) * 0.6; }); }
    if (T === "shopkeeper") { f.armR.rotation.x = -0.6 - Math.max(0, Math.sin(s * 1.5)) * 1.6; }
    if (T === "hooded") { f.x.orb.position.set(Math.cos(s * 1.4) * 1.0, 2.2 + Math.sin(s * 2.1) * 0.3, Math.sin(s * 1.4) * 1.0); f.x.orb.rotation.y += dt * 3; f.x.eyes.forEach((e) => { e.visible = Math.sin(s * 7) > -0.92; }); }
    if (T === "mystery") { f.x.q.position.y = 3.8 + Math.sin(s * 2) * 0.3; }
    if (T === "thobe") { f.x.sign.rotation.z = Math.sin(s * 1.1) * 0.06; }
    if (T === "parent") { f.x.kid.g.position.y = Math.abs(Math.sin(s * 3)) * 0.25; }
    if (T === "zombie") { f.body.rotation.z = Math.sin(s * 1.3) * 0.12; f.legs[0].rotation.x = Math.sin(s * 1.3) * 0.3; f.legs[1].rotation.x = -Math.sin(s * 1.3) * 0.3; }
    if (T === "tanker") { f.x.turret.rotation.y = Math.sin(s * 0.6) * 0.8; }
    if (T === "swordsman" || T === "pirate") { f.armR.rotation.x = -0.6 - Math.max(0, Math.sin(s * 2.4)) * 1.4; }
    if (T === "robot") { f.x.head.rotation.y = Math.sin(s * 0.9) * 0.7; f.body.position.y = Math.abs(Math.sin(s * 2)) * 0.05; }
    /* wave at the visitor when they park here */
    if (f.armR && T !== "soldier" && T !== "rider" && T !== "marine" && T !== "zombie") {
      if (here) { f.armR.rotation.x = -0.2; f.armR.rotation.z = -2.5 + Math.sin(s * 9) * 0.35; }
      else if (T !== "fighter" && T !== "shopkeeper") { f.armR.rotation.z += (0 - f.armR.rotation.z) * Math.min(1, dt * 5); }
      else f.armR.rotation.z += (-0.25 - f.armR.rotation.z) * Math.min(1, dt * 5);
    }
  });
  walkers.forEach((w) => {
    w.t += w.sp * dt * (still ? 0.5 : 1); const [x, z, r] = rectPos(w.t, LOT / 2 - 0.6);
    w.g.position.set(w.c.x + x, 0.3, w.c.z + z); w.g.rotation.y = w.sp > 0 ? r : r + Math.PI;
    if (w.legs && !still) { const a = Math.sin(now / 160 + w.t * 50) * 0.55; w.legs[0].rotation.x = a; w.legs[1].rotation.x = -a; }
  });
}

/* palms */
const palms = new THREE.Group(); scene.add(palms);
const trunkGeo = new THREE.CylinderGeometry(0.28, 0.45, 6, 6);
const trunkMats = { day: new THREE.MeshStandardMaterial({ color: 0x8A6A4A }), night: new THREE.MeshStandardMaterial({ color: 0x5A4636 }) };
const frondGeo = new THREE.BoxGeometry(0.55, 0.12, 4.2);
const frondMats = { day: new THREE.MeshStandardMaterial({ color: 0x5E9E48 }), night: new THREE.MeshStandardMaterial({ color: 0x3F7A55, emissive: 0x10261a }) };
const glowGeo = new THREE.CircleGeometry(1.4, 16), glowMat = new THREE.MeshBasicMaterial({ color: 0xFFD98A, transparent: true, opacity: 0.3 });
function addPalm(x, z) {
  const g = new THREE.Group(); g.position.set(x, 0.3, z);
  const tr = dual(new THREE.Mesh(trunkGeo, trunkMats.day), trunkMats.day, trunkMats.night); tr.position.y = 3; tr.rotation.z = 0.06; tr.castShadow = true; g.add(tr);
  for (let k = 0; k < 7; k++) { const f = dual(new THREE.Mesh(frondGeo, frondMats.day), frondMats.day, frondMats.night); f.position.y = 6; f.rotation.y = k * Math.PI * 2 / 7; f.rotation.x = 0.38; f.translateZ(1.8); f.castShadow = true; g.add(f); }
  const gl2 = new THREE.Mesh(glowGeo, glowMat); gl2.rotation.x = -Math.PI / 2; gl2.position.y = 0.05; g.add(gl2); nightOnly.push(gl2);
  palms.add(g);
}
for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) {
  const c = lotCenter(i, j);
  if (PARK_LOTS.some(([a, b]) => a === i && b === j)) { [[-7, -7], [0, -8], [7, -6], [-6, 2], [6, 3], [-2, 8], [8, 9]].forEach(([dx, dz]) => addPalm(c.x + dx, c.z + dz)); continue; }
  [[-(LOT / 2 - 1.5), -(LOT / 2 - 1.5)], [LOT / 2 - 1.5, -(LOT / 2 - 1.5)]].forEach(([dx, dz]) => addPalm(c.x + dx, c.z + dz));   /* front corners stay clear so banners are never blocked */
}
for (let x = -LX + 8; x <= LX - 8; x += 21) { addPalm(x, -LZ + 8); addPalm(x, LZ - 8); } for (let z = -LZ + 8; z <= LZ - 8; z += 19) { addPalm(-LX + 8, z); addPalm(LX - 8, z); }

/* clouds (day) */
const clouds = new THREE.Group(); scene.add(clouds); dayOnly.push(clouds);
const cloudMat = new THREE.MeshLambertMaterial({ color: 0xFFFFFF, emissive: 0x8899aa, emissiveIntensity: 0.35 });
for (let k = 0; k < 14; k++) {
  const g = new THREE.Group(); const n = 3 + (k % 3);
  for (let q = 0; q < n; q++) { const s = new THREE.Mesh(new THREE.SphereGeometry(6 + (q % 2) * 3, 10, 8), cloudMat); s.position.set(q * 7 - n * 3, (q % 2) * 2, (q % 3) * 3); s.scale.y = 0.55; g.add(s); }
  const a = k / 14 * Math.PI * 2, r = (120 + (k % 4) * 60) * SCALE; g.position.set(Math.cos(a) * r, 95 + (k % 5) * 12, Math.sin(a) * r); clouds.add(g);
}

/* hover jet (VTOL): nose points along +z, banks on body.rotation.z, pitches on body.rotation.x */
const car = new THREE.Group(); scene.add(car);
const body = new THREE.Group(); car.add(body);
const shellMat = new THREE.MeshStandardMaterial({ color: 0xE8ECF2, metalness: 0.6, roughness: 0.3 });
const darkMat = new THREE.MeshStandardMaterial({ color: 0x1A2030, metalness: 0.5, roughness: 0.4 });
const accentMat = new THREE.MeshStandardMaterial({ color: 0xFFD24A, metalness: 0.3, roughness: 0.4 });
const glowBlue = new THREE.MeshBasicMaterial({ color: 0x6FE3FF });
function jetMesh(geo, mat, x, y, z) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; body.add(m); return m; }
/* flat outline in the x/z plane, given as [x, z] points, extruded a little in y */
function plate(points, thick, mat, y) {
  const sh = new THREE.Shape(); points.forEach(([x, z], k) => (k ? sh.lineTo(x, -z) : sh.moveTo(x, -z)));
  const g = new THREE.ExtrudeGeometry(sh, { depth: thick, bevelEnabled: false }); g.rotateX(-Math.PI / 2);
  return jetMesh(g, mat, 0, y, 0);
}
/* fuselage, nose and cockpit */
jetMesh(new THREE.CylinderGeometry(0.62, 0.78, 6.4, 14), shellMat, 0, 0.3, 0).rotation.x = Math.PI / 2;
jetMesh(new THREE.ConeGeometry(0.62, 2.6, 14), shellMat, 0, 0.3, 4.5).rotation.x = Math.PI / 2;
const canopy = jetMesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshStandardMaterial({ color: 0x223a5e, metalness: 0.2, roughness: 0.1, transparent: true, opacity: 0.85 }), 0, 0.82, 1.7);
canopy.scale.set(0.5, 0.42, 1.5);
/* swept wings, tailplanes and twin fins */
plate([[0.5, 1.6], [4.6, -1.3], [4.6, -2.2], [0.5, -2.0]], 0.16, shellMat, 0.12);
plate([[-0.5, 1.6], [-4.6, -1.3], [-4.6, -2.2], [-0.5, -2.0]], 0.16, shellMat, 0.12);
plate([[0.4, -2.4], [2.0, -3.4], [2.0, -3.9], [0.4, -3.7]], 0.12, shellMat, 0.3);
plate([[-0.4, -2.4], [-2.0, -3.4], [-2.0, -3.9], [-0.4, -3.7]], 0.12, shellMat, 0.3);
[-0.45, 0.45].forEach((x) => {
  const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(-1.4, 0); sh.lineTo(-2.0, 1.6); sh.lineTo(-1.5, 1.6); sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.1, bevelEnabled: false }); g.rotateY(-Math.PI / 2);
  const fin = jetMesh(g, darkMat, x, 0.7, -1.8); fin.rotation.z = x > 0 ? -0.2 : 0.2;
});
/* wingtip stripes and nose stripe in the site accent */
[-4.4, 4.4].forEach((x) => jetMesh(new THREE.BoxGeometry(0.3, 0.2, 1.0), accentMat, x, 0.2, -1.75));
jetMesh(new THREE.BoxGeometry(1.3, 0.08, 0.25), accentMat, 0, 0.94, 3.3);
/* twin engines with glowing exhausts; the flames grow with speed */
const flames = [];
[-0.75, 0.75].forEach((x) => {
  jetMesh(new THREE.CylinderGeometry(0.42, 0.48, 2.4, 12), darkMat, x, 0.1, -2.6).rotation.x = Math.PI / 2;
  const jet = jetMesh(new THREE.CircleGeometry(0.36, 14), glowBlue, x, 0.1, -3.82); jet.rotation.y = Math.PI;
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.34, 1.6, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0x6FE3FF, transparent: true, opacity: 0.55, depthWrite: false }));
  flame.rotation.x = -Math.PI / 2; flame.position.set(x, 0.1, -4.6); body.add(flame); flames.push(flame);
});
/* lift fans under the wings, so it can hover */
[-2.3, 2.3].forEach((x) => { const fan = jetMesh(new THREE.CircleGeometry(0.7, 16), glowBlue, x, 0.08, -0.6); fan.rotation.x = Math.PI / 2; });
const under = new THREE.Mesh(new THREE.CircleGeometry(2.8, 24), new THREE.MeshBasicMaterial({ color: 0x6FE3FF, transparent: true, opacity: 0.25 })); under.rotation.x = -Math.PI / 2; under.position.y = 0.06; car.add(under);
const carLight = new THREE.PointLight(0x6FE3FF, 1.2, 16); carLight.position.y = 1.5; car.add(carLight);
const state = { x: plazaC.x, z: plazaC.z + 18, h: Math.PI, v: 0 };

/* traffic: small cars looping two ring roads in both directions */
function makeCar(color) {
  const g = new THREE.Group();
  const paintM = new THREE.MeshStandardMaterial({ color, metalness: 0.45, roughness: 0.35 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x1D2633, metalness: 0.6, roughness: 0.15 });
  const b = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.8, 4.6), paintM); b.position.y = 0.8; b.castShadow = true; g.add(b);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.72, 2.3), glass); cab.position.set(0, 1.55, -0.25); cab.castShadow = true; g.add(cab);
  const roofM = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.12, 2.0), paintM); roofM.position.set(0, 1.95, -0.3); g.add(roofM);
  const wheelGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.42, 14), wheelMat = new THREE.MeshStandardMaterial({ color: 0x111214, roughness: 0.9 });
  [[-1.1, 1.5], [1.1, 1.5], [-1.1, -1.5], [1.1, -1.5]].forEach(([wx, wz]) => { const w = new THREE.Mesh(wheelGeo, wheelMat); w.rotation.z = Math.PI / 2; w.position.set(wx, 0.46, wz); g.add(w); });
  const head = new THREE.MeshBasicMaterial({ color: 0xFFF4D6 }), tail = new THREE.MeshBasicMaterial({ color: 0xFF3B3B });
  [-0.7, 0.7].forEach((hx) => {
    const h1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.06), head); h1.position.set(hx, 0.9, 2.31); g.add(h1);
    const t1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.06), tail); t1.position.set(hx, 0.9, -2.31); g.add(t1);
  });
  return g;
}
const npcs = [];
[
  { X: 2.5, Z: 2.5, dir: 1, t: 0.00, c: 0xD94141 }, { X: 2.5, Z: 2.5, dir: 1, t: 0.50, c: 0xF2F2F2 }, { X: 2.5, Z: 2.5, dir: -1, t: 0.25, c: 0x2F6FD6 },
  { X: 1.5, Z: 1.5, dir: 1, t: 0.10, c: 0xF0B429 }, { X: 1.5, Z: 1.5, dir: -1, t: 0.60, c: 0x26282E }, { X: 1.5, Z: 1.5, dir: -1, t: 0.85, c: 0x3BAA6B },
].forEach((o) => { const m = makeCar(o.c); scene.add(m); const off = o.dir > 0 ? -3.6 : 3.6, Rx = o.X * PITCH + off, Rz = o.Z * PITCH + off;
  npcs.push({ m, t: o.t, dir: o.dir, Rx, Rz, speed: 13 / (4 * (Rx + Rz)) }); });
function loopPos(tt, Rx, Rz) {
  const a = Rx * 2, b = Rz * 2, d = (((tt % 1) + 1) % 1) * (2 * a + 2 * b);
  if (d < a) return [-Rx + d, -Rz, 0];
  if (d < a + b) return [Rx, -Rz + (d - a), Math.PI / 2];
  if (d < 2 * a + b) return [Rx - (d - a - b), Rz, Math.PI];
  return [-Rx, Rz - (d - 2 * a - b), -Math.PI / 2];
}

/* drive input */
const keys = { up: false, down: false, left: false, right: false, boost: false, rise: false, sink: false };
const map = { KeyW: "up", ArrowUp: "up", KeyS: "down", ArrowDown: "down", KeyA: "left", ArrowLeft: "left", KeyD: "right", ArrowRight: "right", ShiftLeft: "boost", ShiftRight: "boost",
  KeyF: "rise", Space: "rise", NumpadAdd: "rise", PageUp: "rise", KeyC: "sink", NumpadSubtract: "sink", PageDown: "sink" };
/* hover flight: hold F (Space, Numpad +, Page Up) to climb, hold E (C, Numpad -, Page Down) to descend.
   E is shared with "open the building": on the ground beside a ring a fresh press opens it, anywhere else it descends. */
const fly = { on: false, alt: 0, target: 0, vy: 0 };
const JET_TOP = 2.4;   /* height of the jet's top above its altitude */
const beneath = (c) => c.y0 !== undefined && fly.alt + JET_TOP < c.y0;
/* the one rectangle test every collider check uses; a collider with `rot` (radians, like rotation.y) is tested in its own frame */
function insideCollider(c, x, z) {
  let dx = x - c.x, dz = z - c.z;
  if (c.rot) { const cs = Math.cos(c.rot), sn = Math.sin(c.rot), lx = dx * cs - dz * sn; dz = dx * sn + dz * cs; dx = lx; }
  return Math.abs(dx) < c.rx && Math.abs(dz) < c.rz;
}
function overRoof(x, z) { return colliders.some((c) => !beneath(c) && insideCollider(c, x, z)); }
/* lowest height the jet may climb to while under a raised banner at (x, z); Infinity when none */
function ceilingAbove(x, z) { let m = Infinity; for (const c of colliders) if (c.y0 !== undefined && beneath(c) && insideCollider(c, x, z)) m = Math.min(m, c.y0 - JET_TOP - 0.3); return m; }
/* move in substeps of at most 0.6 units so thin colliders cannot be tunnelled at any frame rate */
function moveWithCollisions(dx, dz) {
  const n = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.6)), sx = dx / n, sz = dz / n; let bounced = false;
  for (let k = 0; k < n; k++) {
    let nx = state.x + sx, nz = state.z + sz;
    for (const c of colliders) {
      if (fly.alt > c.h || beneath(c)) continue;   /* flying above it, or passing under a raised banner */
      if (insideCollider(c, nx, nz)) {
        if (!insideCollider(c, state.x, nz)) nx = state.x; else if (!insideCollider(c, nx, state.z)) nz = state.z; else { nx = state.x; nz = state.z; }
        if (!bounced) { state.v *= -0.25; bounced = true; }
      }
    }
    state.x = nx; state.z = nz;
  }
}
function liftOff() { fly.on = true; document.body.classList.add("flying"); closeCard(); leaveArrival(); }
function land() {
  if (overRoof(state.x, state.z)) toast("Find a street to land on.", "You are above a building. Fly over a road or a ring, then hold E to come down.", [["OK", () => {}]]);
  else fly.target = 0;
}
let near = -1;
hooks.onTheater = () => Object.keys(keys).forEach((k) => keys[k] = false);
window.addEventListener("keydown", (e) => {
  if (document.body.classList.contains("theater") && e.code !== "Escape") return;
  if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
  if (view !== "drive") return;
  if (map[e.code]) { keys[map[e.code]] = true; if (e.code.startsWith("Arrow")) e.preventDefault(); }
  if (e.code === "KeyE") {
    if (near >= 0 && fly.alt < 0.5 && !keys.sink) { if (!e.repeat) openStop(near); }
    else keys.sink = true;
  }
  if (e.code === "Space" || e.code === "PageUp" || e.code === "PageDown") e.preventDefault();
  if (map[e.code] && (touring || auto)) { endTour(); cancelAuto(); }
});
window.addEventListener("keyup", (e) => { if (map[e.code]) keys[map[e.code]] = false; if (e.code === "KeyE") keys.sink = false; });
window.addEventListener("blur", () => Object.keys(keys).forEach((k) => keys[k] = false));
document.querySelectorAll("#touch button").forEach((b) => {
  const k = b.dataset.k;
  if (!k) return;
  const on = (e) => { e.preventDefault(); keys[k] = true; }, off = () => { keys[k] = false; };
  b.addEventListener("pointerdown", on); b.addEventListener("pointerup", off); b.addEventListener("pointerleave", off); b.addEventListener("pointercancel", off);
});
$("prompt").addEventListener("click", () => { if ($("prompt").dataset.mode === "land") land(); else if (near >= 0) openStop(near); });

/* spectate orbit */
const orbit = { theta: 0.7, phi: 0.95, r: 190 * SCALE, target: new THREE.Vector3(0, 6, 0), goal: new THREE.Vector3(0, 6, 0), goalR: 190 * SCALE, last: 0 };
if (window.__ui) window.__city = { THREE, renderer, state, fly, orbit, camera, buildings, figures, colliders, insideCollider, setFrameCap: (s) => { frameCap = s; } };
const ptrs = new Map(); let down = null, pinch0 = 0, r0 = 0;
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
canvas.addEventListener("pointerdown", (e) => {
  if (view !== "spectate") return;
  canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptrs.size === 1) down = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 };
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); r0 = orbit.goalR; }
  orbit.last = performance.now();
});
canvas.addEventListener("pointermove", (e) => {
  if (view !== "spectate" || !ptrs.has(e.pointerId)) return;
  const p = ptrs.get(e.pointerId), dx = e.clientX - p.x, dy = e.clientY - p.y;
  p.x = e.clientX; p.y = e.clientY;
  if (ptrs.size === 1) {
    orbit.theta -= dx * 0.006; orbit.phi = Math.max(0.25, Math.min(1.4, orbit.phi - dy * 0.005));
    if (down) down.moved += Math.abs(dx) + Math.abs(dy);
  } else if (ptrs.size === 2) {
    const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (pinch0 > 0) orbit.goalR = Math.max(45 * SCALE, Math.min(280 * SCALE, r0 * pinch0 / d));
    if (down) down.moved = 99;
  }
  orbit.last = performance.now();
});
function endPtr(e) {
  if (!ptrs.has(e.pointerId)) return;
  ptrs.delete(e.pointerId);
  if (ptrs.size === 0 && down && down.moved < 8 && performance.now() - down.t < 500) pick(e.clientX, e.clientY);
  if (ptrs.size === 0) down = null;
}
canvas.addEventListener("pointerup", endPtr); canvas.addEventListener("pointercancel", endPtr);
canvas.addEventListener("wheel", (e) => { if (view !== "spectate") return; e.preventDefault(); orbit.goalR = Math.max(45 * SCALE, Math.min(280 * SCALE, orbit.goalR * (1 + e.deltaY * 0.001))); orbit.last = performance.now(); }, { passive: false });
function pick(cx, cy) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(pickables, false)[0];
  if (hit) { const i = hit.object.userData.i; if (bannerPicks.has(hit.object)) openTheater(i); else openStop(i); focus(i); }
}
/* drive: tap or click a banner to watch it; the cursor shows what can be clicked */
function nearestHit(cx, cy) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  return ray.intersectObjects(pickables, false)[0];
}
/* the nearest thing under the pointer must itself be a banner, so a building in front hides one behind it */
function pickBanner(cx, cy) {
  const hit = nearestHit(cx, cy);
  return hit && bannerPicks.has(hit.object) ? hit.object.userData.i : -1;
}
if (window.__ui) window.__ui.pickBanner = pickBanner;
let tap = null, hoverT = 0;
canvas.addEventListener("pointerdown", (e) => { if (view === "drive") tap = { x: e.clientX, y: e.clientY, t: performance.now() }; });
canvas.addEventListener("pointerup", (e) => {
  if (view !== "drive" || !tap) return;
  const still = Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y) < 8 && performance.now() - tap.t < 500; tap = null;
  if (!still) return;
  const i = pickBanner(e.clientX, e.clientY);
  if (i >= 0) { if (touring) endTour(); cancelAuto(); openTheater(i); }
});
canvas.addEventListener("pointermove", (e) => {
  if (e.pointerType !== "mouse" || view === "simple" || e.buttons) return;
  const now = performance.now(); if (now - hoverT < 90) return; hoverT = now;
  canvas.classList.toggle("can-click", (view === "drive" ? pickBanner(e.clientX, e.clientY) >= 0 : !!nearestHit(e.clientX, e.clientY)));
});
function focus(i) { const b = buildings[i]; orbit.goal.set(b.center.x, b.h * 0.5, b.center.z); orbit.goalR = 80; orbit.last = performance.now(); }

/* hooks for the shared UI */
let camSnap = true;
function travel(i, open) {
  const b = buildings[i];
  state.x = b.padPos.x; state.z = b.padPos.z + 3; state.h = Math.PI + b.yaw; state.v = 0; camSnap = true;   /* parked facing the screen */
  if (open) arrive(i);
}
hooks.travel = travel; hooks.focus = focus;
hooks.onView = (v) => {
  Object.keys(keys).forEach((k) => keys[k] = false);
  if (v === "spectate") { orbit.goal.set(state.x * 0.3, 6, state.z * 0.3); orbit.goalR = 190 * SCALE; orbit.last = 0; }
  if (v === "drive") camSnap = true;
};
hooks.onLook = (l) => {
  const bp = l === "bp", day = l === "day", mode = day ? "day" : "night";
  if (bp) { scene.background = BLUE; } else if (day) { scene.background = DAYSKY; } else { scene.background = NIGHT; }
  scene.fog = FOG[l];
  swappables.forEach((m) => { m.material = bp ? bpMat : m.userData.mats[mode]; });
  notBp.forEach((m) => { m.visible = !bp; });
  edgeList.forEach((e) => { e.visible = bp; });
  dayOnly.forEach((o) => { o.visible = day; }); skyDome.visible = day;
  nightOnly.forEach((o) => { o.visible = l === "night"; });
  grid.visible = bp; palms.visible = !bp;
  sun.color.set(day ? 0xFFF1D6 : 0x9aaee0); sun.intensity = day ? 1.15 : 0.55; sun.castShadow = day && !LOWPOWER;
  hemi.color.set(day ? 0xBFDDF5 : 0x6680bb); hemi.groundColor.set(day ? 0xD8B98A : 0x0a0c14); hemi.intensity = day ? 0.7 : 0.55;
  amb.intensity = day ? 0.25 : 0.5;
  carLight.intensity = day ? 0.3 : 1.2; under.material.opacity = day ? 0.12 : 0.25;
  if (bp) ground.material = groundBp;
  seaLook(day ? "day" : "night");
  relabel();
};

/* minimap */
const mm = $("minimap"), mx = mm.getContext("2d");
function drawMini() {
  const W = mm.width, s = W / (EXTENT * 2), toM = (v) => (v + EXTENT) * s;
  mx.fillStyle = look === "bp" ? "#0B2447" : look === "day" ? "#E2BE88" : "#0D1320"; mx.fillRect(0, 0, W, W);
  buildings.forEach((b) => { mx.fillStyle = b.i === near ? "#FFD24A" : (b.p ? CSSCOL[b.p.engine] : b.color); mx.fillRect(toM(b.center.x - HALF), toM(b.center.z - HALF), HALF * 2 * s, HALF * 2 * s); });
  mx.strokeStyle = look === "day" ? "#14213D" : "#FFD24A"; mx.lineWidth = 3; mx.beginPath(); mx.arc(toM(plazaC.x), toM(plazaC.z), 7 * s, 0, Math.PI * 2); mx.stroke();
  mx.save(); mx.translate(toM(state.x), toM(state.z)); mx.rotate(-state.h + Math.PI);
  mx.fillStyle = look === "day" ? "#14213D" : "#FFFFFF"; mx.beginPath(); mx.moveTo(0, -12); mx.lineTo(8, 9); mx.lineTo(-8, 9); mx.closePath(); mx.fill(); mx.restore();
}

/* keep at least ~72 degrees of horizontal view, so portrait phones still see the whole banner */
function fitFov(cam, aspect, vfov) { const hMin = 72 * Math.PI / 180; const needV = 2 * Math.atan(Math.tan(hMin / 2) / aspect) * 180 / Math.PI; cam.fov = Math.min(Math.max(vfov, needV), 100); }
let redrawOnce = false;
function resize() { const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); redrawOnce = true; camera.aspect = w / h; fitFov(camera, w / h, 60); camera.updateProjectionMatrix(); }
window.addEventListener("orientationchange", () => setTimeout(resize, 250));
window.addEventListener("resize", resize); resize();

/* ---------- hover-drive along the streets to a building (header links, Next, tour) ---------- */
const ROADS_X = Array.from({ length: NX + 1 }, (_, k) => (k - NX / 2) * PITCH), ROADS_Z = Array.from({ length: NZ + 1 }, (_, k) => (k - NZ / 2) * PITCH);
const nearestOf = (arr, v) => arr.reduce((a, b) => Math.abs(b - v) < Math.abs(a - v) ? b : a);
const ease = (x) => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
let auto = null, autoAlt = 0, autoBank = 0;
function routeTo(to) {
  const pts = [{ x: state.x, z: state.z }];
  const z0 = nearestOf(ROADS_Z, state.z), z1 = nearestOf(ROADS_Z, to.z), x0 = nearestOf(ROADS_X, state.x);
  const onRoadZ = Math.abs(state.z - z0) < 6, onRoadX = Math.abs(state.x - x0) < 6;
  if (!onRoadZ && onRoadX) { pts.push({ x: x0, z: z1 }); }
  else { pts.push({ x: state.x, z: z0 }); if (z0 !== z1) { const xv = nearestOf(ROADS_X, (state.x + to.x) / 2); pts.push({ x: xv, z: z0 }); pts.push({ x: xv, z: z1 }); } }
  pts.push({ x: to.x, z: z1 }); pts.push({ x: to.x, z: to.z });
  return pts.filter((p, k) => k === 0 || Math.hypot(p.x - pts[k - 1].x, p.z - pts[k - 1].z) > 1.5);
}
function driveTo(i, after) {
  closeCard(); leaveArrival();
  if (fly.on || fly.alt > 0.5) { fly.on = false; fly.target = 0; }
  const b = buildings[i], to = { x: b.padPos.x, z: b.padPos.z + 3 };
  const pts = routeTo(to);
  if (reduceMotion || pts.length < 2 || Math.hypot(to.x - state.x, to.z - state.z) < 2) { state.x = to.x; state.z = to.z; state.h = Math.PI + b.yaw; state.v = 0; arrive(i); if (after) after(); return; }
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p.x, 0, p.z)), false, "centripetal", 0.35);
  const len = curve.getLength();
  auto = { curve, len, u: 0, i, dur: Math.min(8, Math.max(1.6, len / 52)), after, startAlt: fly.alt };
  state.v = 0; document.body.classList.add("autodrive");
}
function stepAuto(dt) {
  auto.u = Math.min(1, auto.u + dt / auto.dur);
  const e = ease(auto.u), pt = auto.curve.getPointAt(e), tg = auto.curve.getTangentAt(Math.min(e, 0.999));
  state.x = pt.x; state.z = pt.z;
  const want = auto.u < 0.88 ? Math.atan2(tg.x, tg.z) : Math.PI + buildings[auto.i].yaw, d = angDiff(want, state.h);
  state.h += d * Math.min(1, dt * (auto.u < 0.88 ? 7 : 4)); autoBank = Math.max(-1, Math.min(1, d * 2));
  /* gentle hover: lift a little as it sets off, settle as it arrives, follow the road in between */
  const k = Math.min(1, auto.u / 0.15, (1 - auto.u) / 0.15); autoAlt = 2.4 * ease(Math.max(0, k)) + auto.startAlt * (1 - Math.min(1, auto.u / 0.35));
  if (auto.u >= 1) { const a = auto; auto = null; autoAlt = 0; autoBank = 0; state.h = Math.PI + buildings[a.i].yaw; document.body.classList.remove("autodrive"); arrive(a.i); if (a.after) a.after(); }
}
function cancelAuto() { if (auto) { auto = null; autoAlt = 0; autoBank = 0; document.body.classList.remove("autodrive"); } }
hooks.driveTo = driveTo;

/* ---------- guided tour: drives the streets stop to stop ---------- */
let touring = false, tourK = -1, tourTimer = 0;
function tourIndex(id) { const p = PROJECTS.findIndex((x) => x.id === id); return p >= 0 ? p : PROJECTS.length + SPECIALS.findIndex((x) => x.kind === id); }
function startTour() { $("drawer").classList.remove("open"); hideHint(); if (view !== "drive") setView("drive"); touring = true; document.body.classList.add("touring"); tourK = -1; nextTour(); }
function nextTour() {
  clearTimeout(tourTimer); tourK++;
  if (tourK >= TOUR.length) { endTour(); return; }
  const idx = tourIndex(TOUR[tourK]);
  $("tourT").textContent = "Tour " + (tourK + 1) + " of " + TOUR.length + ": " + stopInfo(idx).name;
  $("tourNext").textContent = tourK === TOUR.length - 1 ? "Finish" : "Next stop";
  driveTo(idx, () => { if (touring && TOUR[tourK] !== "contact") tourTimer = setTimeout(() => { if (touring) nextTour(); }, 9000); });
}
function endTour() { touring = false; clearTimeout(tourTimer); document.body.classList.remove("touring"); }
hooks.tour = { start: startTour, next: nextTour, stop: endTour };

/* ---------- live city in the Simple hero (second renderer, same scene) ---------- */
const hc = $("svCity"), r2 = new THREE.WebGLRenderer({ canvas: hc, antialias: true });
r2.setPixelRatio(Math.min(window.devicePixelRatio || 1, LOWPOWER ? 1.25 : 2));
const cam2 = new THREE.PerspectiveCamera(38, 4 / 3, 1, 2000);
let heroTheta = 0.75, heroVisible = false, heroHover = -1, heroLast = 0, heroDrag = null;
if ("IntersectionObserver" in window) new IntersectionObserver((es) => { heroVisible = es[0].isIntersecting; }).observe(hc); else heroVisible = true;
const ray2 = new THREE.Raycaster(), ndc2 = new THREE.Vector2();
function heroPick(e) {
  const r = hc.getBoundingClientRect(); ndc2.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray2.setFromCamera(ndc2, cam2); const hit = ray2.intersectObjects(pickables, false)[0];
  return hit ? hit.object.userData.i : -1;
}
hc.addEventListener("pointermove", (e) => {
  heroLast = performance.now();
  if (heroDrag) { heroTheta -= (e.clientX - heroDrag.x) * 0.006; heroDrag.moved += Math.abs(e.clientX - heroDrag.x); heroDrag.x = e.clientX; }
  const i = heroPick(e); heroHover = i; const tip = $("svTip");
  if (i >= 0) { const r = hc.getBoundingClientRect(), p = stopInfo(i); tip.innerHTML = esc(p.name) + "<span>" + esc(p.sub) + " · click to drive there</span>"; tip.style.left = (e.clientX - r.left) + "px"; tip.style.top = (e.clientY - r.top) + "px"; tip.classList.add("show"); }
  else tip.classList.remove("show");
});
hc.addEventListener("pointerleave", () => { $("svTip").classList.remove("show"); heroHover = -1; heroDrag = null; });
hc.addEventListener("pointerdown", (e) => { heroDrag = { x: e.clientX, moved: 0 }; heroLast = performance.now(); });
hc.addEventListener("pointerup", (e) => { const d = heroDrag; heroDrag = null; if (d && d.moved > 6) return; const i = heroPick(e); if (i >= 0) enter3D(i); });
function renderHero(dt) {
  if (!heroVisible) return;
  const w = hc.clientWidth, h = hc.clientHeight; if (!w || !h) return;
  if (hc.width !== Math.floor(w * r2.getPixelRatio()) || hc.height !== Math.floor(h * r2.getPixelRatio())) { r2.setSize(w, h, false); cam2.aspect = w / h; fitFov(cam2, w / h, 38); cam2.updateProjectionMatrix(); }
  if (!reduceMotion && heroHover < 0 && !heroDrag && performance.now() - heroLast > 1500) heroTheta += dt * 0.12;
  cam2.position.set(Math.sin(heroTheta) * 240 * SCALE, 165 * SCALE, Math.cos(heroTheta) * 240 * SCALE); cam2.lookAt(0, 8, 0);
  buildings.forEach((b) => { b.sprite.scale.set(b.i === heroHover ? 34 : 26, b.i === heroHover ? 8.5 : 6.5, 1); });
  r2.render(scene, cam2);
}

/* intro */
look = "day"; hooks.onLook("day"); document.body.classList.add("day"); document.body.classList.remove("bp");
buildings.forEach((b) => { b.holder.scale.y = reduceMotion ? 1 : 0.001; b.sprite.visible = reduceMotion; });
let introDone = false; const introStart = performance.now();
function finishIntro() {
  if (introDone) return; introDone = true;
  buildings.forEach((b) => { b.holder.scale.y = 1; b.sprite.visible = true; });
  document.body.classList.remove("bp"); document.body.classList.add("day"); look = "day"; hooks.onLook("day");
  $("loader").classList.add("gone");
  markTried("drive"); markTried("day");
  introOver = true;
  const hash = (location.hash || "").slice(1), idx = PROJECTS.findIndex((p) => p.id === hash);
  let chosen = null; try { chosen = localStorage.getItem("maaz-choice"); } catch (e) {}
  if (idx >= 0) travel(idx, true);
  else if (hash === "simple") setView("simple");
  else if (hash === "city") setView("drive");
  else if (chosen) setView(chosen);
  else showChoice();
  scheduleHint(6000);
}
window.addEventListener("hashchange", () => { const idx = PROJECTS.findIndex((p) => p.id === location.hash.slice(1)); if (idx >= 0) goTo(idx); });
setTimeout(() => $("loader").classList.add("gone"), reduceMotion ? 0 : 700);

/* loop */
let last = performance.now(), t = 0, frameCap = null;   /* frameCap: debug only, forces every frame's dt */
const camPos = new THREE.Vector3(), look3 = new THREE.Vector3(), bannerAim = new THREE.Vector3(), fitPos = new THREE.Vector3(); let frame = 0;
/* every other building whose footprint the line from `cam` to building i's banner centre passes through (so it would block the framed view) */
function occludersOf(i, cam) {
  const b = buildings[i]; if (!b) return [];
  const ex = b.center.x, ez = b.center.z + BZ, n = Math.ceil(Math.hypot(cam.x - ex, cam.z - ez) / 1.5) + 1;
  return buildings.filter((o) => {
    if (o === b) return false;
    for (let k = 0; k <= n; k++) { const f = k / n; if (Math.abs(cam.x + (ex - cam.x) * f - o.center.x) < HALF + 2.2 && Math.abs(cam.z + (ez - cam.z) * f - o.center.z) < HALF + 2.2) return true; }
    return false;
  });
}
let hiddenAcross = [];
/* hide exactly the buildings in `list` (and restore any previously hidden ones no longer listed) */
function setHidden(list) {
  hiddenAcross.forEach((o) => { if (!list.includes(o)) { o.holder.visible = true; o.sprite.visible = true; } });
  list.forEach((o) => { o.holder.visible = false; o.sprite.visible = false; });
  hiddenAcross = list;
}
function insideBuilding(x, y, z) { return buildings.some((b) => Math.abs(x - b.center.x) < HALF + 2 && Math.abs(z - b.center.z) < HALF + 2.5 && y < b.h + 2); }
function step(now) {
  requestAnimationFrame(step);
  const rawDt = Math.min((now - last) / 1000, 0.25), dt = frameCap != null ? frameCap : Math.min(rawDt, 0.05); last = now; t += dt;
  if (!introDone) {
    const intro = reduceMotion ? 1 : (now - introStart) / 2200;
    buildings.forEach((b, k) => { const lp = Math.min(Math.max(intro * 1.6 - k * 0.04, 0), 1); b.holder.scale.y = Math.max(0.001, 1 - Math.pow(1 - lp, 3)); });
    if (intro >= 1) finishIntro();
  }
  if (view === "simple") { if (hiddenAcross.length) setHidden([]); renderHero(dt); return; }   /* only the hero city draws in the 2D view */

  /* guided tour: hover-fly between stops, park, show the case study */
  if (auto) stepAuto(rawDt);
  if (document.body.classList.contains("cine")) { state.v *= Math.pow(0.02, dt); if (!touring && !auto && (keys.up || keys.down)) { closeCard(); leaveArrival(); } }
  /* drive physics (car coasts to a stop in spectate) */
  const driving = view === "drive";
  if (driving && !auto) {
    if (keys.rise) { if (!fly.on) liftOff(); fly.target = Math.min(90, Math.max(fly.target, fly.alt + 1.5) + 26 * dt); }
    if (keys.sink && fly.on) fly.target = Math.max(0, fly.target - 26 * dt);
  }
  if (!auto) fly.target = Math.min(fly.target, ceilingAbove(state.x, state.z));   /* never climb into a banner from below, rising or not */
  if (fly.on && fly.target <= 0 && fly.alt < 0.05) fly.on = false;
  { const diff = fly.target - fly.alt, rate = Math.sign(diff) * Math.min(Math.abs(diff) * 1.6, 9); fly.vy = rate; fly.alt += rate * dt; if (Math.abs(diff) < 0.02) fly.alt = fly.target; }
  if (!fly.on && fly.alt < 0.05) { fly.alt = 0; document.body.classList.remove("flying"); }
  const max = (keys.boost ? 62 : 38) * (fly.on ? 1.3 : 1), acc = keys.boost ? 60 : 34;
  if (auto) state.v = 0; else if (driving && keys.up) state.v += acc * dt; else if (driving && keys.down) state.v -= acc * 1.2 * dt; else state.v *= Math.pow(0.25, dt);
  state.v = Math.max(-14, Math.min(max, state.v));
  if (Math.abs(state.v) < 0.3 && !(driving && (keys.up || keys.down))) state.v = 0;
  const turn = driving ? (keys.left ? 1 : 0) - (keys.right ? 1 : 0) : 0;
  state.h += turn * dt * (1.6 + Math.min(Math.abs(state.v), 30) * 0.03) * (state.v < -0.5 ? -1 : 1);
  if (!auto) moveWithCollisions(Math.sin(state.h) * state.v * dt, Math.cos(state.h) * state.v * dt);
  /* descending onto a roof is blocked: hold height above it */
  if (fly.on || fly.alt > 0) for (const c of colliders) { if (beneath(c)) continue; if (insideCollider(c, state.x, state.z) && fly.alt < c.h + 0.5 && fly.target < c.h + 2) { fly.target = Math.max(fly.target, c.h + 3); if (!fly.on) fly.on = true; } }
  if (!auto) { state.x = Math.max(-EX + 4, Math.min(EX - 4, state.x)); state.z = Math.max(-EZ + 4, Math.min(EZ - 4, state.z)); }
  const alt = autoAlt + fly.alt;
  car.position.set(state.x, 1.2 + alt + (reduceMotion ? 0 : Math.sin(t * 3) * 0.12), state.z);
  car.rotation.y = state.h;
  body.rotation.z = reduceMotion ? 0 : -turn * Math.min(Math.abs(state.v) / 38, 1) * (alt > 2 ? 0.32 : 0.18);
  body.rotation.x = reduceMotion ? 0 : -(fly.vy || 0) * 0.03 - (alt > 2 ? Math.min(state.v / 70, 0.14) : 0);
  if (auto && !reduceMotion) body.rotation.z = -autoBank * 0.2;
  { const sy = 0.5 + Math.min(Math.abs(auto ? 30 : state.v) / 38, 1.6) * 1.2 + (keys.boost ? 0.6 : 0) + (reduceMotion ? 0 : Math.sin(t * 40) * 0.08);
    flames.forEach((f) => { f.scale.set(1, sy, 1); f.position.z = -3.82 - 0.8 * sy; }); }
  under.material.opacity = (look === "day" ? 0.12 : 0.25) * Math.max(0.2, 1 - alt / 40);

  /* camera */
  if (driving) {
    /* higher, further chase camera; when parked on a ring it frames that building's banner and name */
    const fx = Math.sin(state.h), fz = Math.cos(state.h);
    const focusIdx = arrivedIdx >= 0 ? arrivedIdx : (auto ? -1 : near);
    frame += ((focusIdx >= 0 && Math.abs(state.v) < 12 ? 1 : 0) - frame) * (1 - Math.pow(0.08, dt));
    const dist = 19 + Math.max(state.v, 0) * 0.1, height = 11;
    camPos.set(state.x - fx * dist, height + alt * 0.95, state.z - fz * dist);
    /* keep the camera out of buildings: pull it toward the car (and lift it) if the path is blocked */
    const ddx = camPos.x - state.x, ddz = camPos.z - state.z; let clear = 1;
    for (let k = 1; k <= 14; k++) { const f = k / 14; if (insideBuilding(state.x + ddx * f, camPos.y, state.z + ddz * f)) { clear = (k - 1) / 14; break; } }
    clear = Math.max(clear, 0.3); camPos.set(state.x + ddx * clear, camPos.y + (1 - clear) * 7, state.z + ddz * clear);
    /* parked: frame the whole banner and its nameplate, square on, at the distance where it just fits the screen
       (the building across the street may contain the camera; its walls face away, so it does not block the view) */
    const fitW = arrivedIdx >= 0 ? frame : 0;   /* only an actual arrival frames the banner; merely passing a pad keeps the chase camera */
    if (fitW > 0.01) {
      const b = buildings[arrivedIdx], tv = Math.tan(camera.fov * Math.PI / 360), th = tv * camera.aspect;
      const d = Math.max(BANNER_HALF_H / tv, (BW / 2 + 0.8) / th) * 1.24;
      bannerAim.set(b.center.x, BANNER_MID + 1.4, b.center.z + BZ);   /* aim a little high so the header never covers the nameplate */
      fitPos.set(b.center.x + Math.sin(b.yaw) * d, BANNER_MID + 1.5, b.center.z + BZ + Math.cos(b.yaw) * d); camPos.lerp(fitPos, fitW);   /* along the banner's normal: square on */
    }
    setHidden(fitW > 0.5 ? occludersOf(arrivedIdx, fitPos) : []);
    if (camSnap) { camera.position.copy(camPos); camSnap = false; } else camera.position.lerp(camPos, 1 - Math.pow(auto ? 0.0002 : 0.002, rawDt));
    look3.set(state.x + fx * 12, 5 + alt * 0.85, state.z + fz * 12);
    if (fitW > 0.01) look3.lerp(bannerAim, fitW);
    camera.lookAt(look3);
  } else {
    if (hiddenAcross.length) setHidden([]);
    if (!reduceMotion && now - orbit.last > 4000) orbit.theta += dt * 0.07;
    orbit.target.lerp(orbit.goal, 1 - Math.pow(0.02, dt));
    orbit.r += (orbit.goalR - orbit.r) * (1 - Math.pow(0.02, dt));
    camPos.set(orbit.target.x + orbit.r * Math.sin(orbit.phi) * Math.sin(orbit.theta), orbit.target.y + orbit.r * Math.cos(orbit.phi), orbit.target.z + orbit.r * Math.sin(orbit.phi) * Math.cos(orbit.theta));
    camera.position.lerp(camPos, 1 - Math.pow(0.0005, dt)); camera.lookAt(orbit.target);
  }

  /* pads */
  near = -1; let best = 7.5;
  buildings.forEach((b) => {
    const d = Math.hypot(b.padPos.x - state.x, b.padPos.z - state.z);
    if (driving && alt < 3 && d < best) { best = d; near = b.i; }
    const pulse = reduceMotion ? 1 : 1 + Math.sin(t * 3 + b.i) * 0.06;
    b.pad.scale.set(pulse, pulse, 1); b.pad.material.opacity = b.i === near ? 1 : 0.7;
    b.sprite.scale.set(driving ? 16 : 24, driving ? 4 : 6, 1);
  });
  if (near >= 0 && introDone) { $("promptText").textContent = "Open " + stopInfo(near).name; $("prompt").classList.add("show"); $("prompt").dataset.mode = "open"; }
  else if (driving && fly.on && introDone) { $("promptText").textContent = overRoof(state.x, state.z) ? "Flying: hold F to climb, E to descend" : "Hold E to land"; $("prompt").classList.add("show"); $("prompt").dataset.mode = "land"; }
  else $("prompt").classList.remove("show");

  if (!reduceMotion) { holo.rotation.y += dt; ring.rotation.z += dt * 0.4; }
  npcs.forEach((n) => { n.t += n.dir * n.speed * dt * (reduceMotion ? 0.5 : 1); const [x, z, r] = loopPos(n.t, n.Rx, n.Rz); n.m.position.set(x, 0, z); n.m.rotation.y = -r + Math.PI / 2 + (n.dir < 0 ? Math.PI : 0); });
  updateBanners();
  stepWater(dt); stepPeople(dt, now);
  if (driving) drawMini();
  /* the theater overlay covers the city: keep the last frame instead of drawing under it (redraw once after a resize clears the canvas) */
  if (!document.body.classList.contains("theater") || redrawOnce) { renderer.render(scene, camera); redrawOnce = false; }
}
requestAnimationFrame(step);
}
