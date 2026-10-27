import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import profileData from "../generated/profile.json";
import projectsData from "../generated/projects.json";
import type { SiteProfile, SiteProject } from "../simple/render";
import { buildAboutStudio, buildBuilding, buildContactTower } from "./buildings";
import { createInput } from "./input";
import { layoutCity, PLOT, type Lot } from "./layout";
import { applyMaterialLook, createMaterials, ENGINE_HEX, type AccentKey, type Look, type Materials } from "./materials";
import { buildPlaza, buildScenery } from "./scenery";
import { groundTextTexture, infoBoardTexture, labelTexture, nameplateTexture, slateTexture } from "./textures";
import { createOverlay, drawMinimap } from "./ui";
import { buildHoverCar, Vehicle, type Collider } from "./vehicle";

export type { Look };
export type View = "drive" | "spectate";

export interface CityHandle {
  start(): void;
  stop(): void;
  handleEscape(): boolean;
  focusProject(id: string): boolean;
}

const projects = projectsData as unknown as SiteProject[];
const profile = profileData as unknown as SiteProfile;

const LOOKS: Look[] = ["day", "night", "blueprint"];
const RING_OFFSET = 20;
const RING_REACH = 7.5;
const VIDEO_RANGE = 85;
const MAX_PLAYING = 3;

const css = (hex: number) => `#${hex.toString(16).padStart(6, "0")}`;
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

function accentOf(project: SiteProject): AccentKey {
  return project.engines.length > 1 ? "dual" : project.engines[0];
}

function banner(m: Materials, screen: THREE.Texture, plate: THREE.Texture) {
  const group = new THREE.Group();
  for (const x of [-4.2, 4.2]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.2, 0.3), m.metal);
    leg.position.set(x, 2.1, 0);
    group.add(leg);
  }
  const frame = new THREE.Mesh(new THREE.BoxGeometry(9.2, 6.8, 0.4), m.dark);
  frame.position.y = 7.3;
  frame.castShadow = true;
  const screenMaterial = new THREE.MeshBasicMaterial({ map: screen, toneMapped: false });
  const display = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 4.84), screenMaterial);
  display.position.set(0, 6.75, 0.21);
  const nameplate = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 1.02), new THREE.MeshBasicMaterial({ map: plate, toneMapped: false }));
  nameplate.position.set(0, 9.95, 0.21);
  group.add(frame, display, nameplate);
  return { group, screenMaterial };
}

function label(name: string, sub: string, color: number, y: number) {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(name, sub, css(color)), transparent: true }));
  sprite.scale.set(26, 6.1, 1);
  sprite.position.y = y;
  return sprite;
}

function plotTag(lot: Lot, color: number) {
  const tag = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 1.5).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: groundTextTexture(`PLOT ${String(lot.index + 1).padStart(2, "0")}`, css(color), 384, 96, 52), transparent: true }),
  );
  tag.position.set(lot.x - 11, 0.43, lot.z + 14.5);
  return tag;
}

function ring(color: number) {
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false, toneMapped: false });
  const group = new THREE.Group();
  const outer = new THREE.Mesh(new THREE.RingGeometry(3, 3.6, 48).rotateX(-Math.PI / 2), material);
  const fill = new THREE.Mesh(
    new THREE.CircleGeometry(3, 48).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.12, depthWrite: false, toneMapped: false }),
  );
  outer.position.y = fill.position.y = 0.09;
  group.add(outer, fill);
  return { group, material };
}

interface Riser {
  group: THREE.Object3D;
  extras: THREE.Object3D[];
  delay: number;
}

interface Station {
  lot: Lot;
  kind: "project" | "about" | "contact";
  project?: SiteProject;
  color: number;
  ringAt: THREE.Vector3;
  ringMaterial: THREE.MeshBasicMaterial;
  bannerAt: THREE.Vector3;
  screen: THREE.MeshBasicMaterial;
  video?: HTMLVideoElement;
  videoTexture?: THREE.VideoTexture;
}

export async function createCity(root: HTMLElement, options: { reducedMotion: boolean }): Promise<CityHandle> {
  await Promise.all([
    document.fonts.load('56px "Russo One"'),
    document.fonts.load('700 32px "Rajdhani"'),
    document.fonts.load('500 36px "IBM Plex Mono"'),
  ]).catch(() => undefined);

  const container = root.querySelector<HTMLElement>("[data-city-canvas]")!;
  const hint = root.querySelector<HTMLElement>("[data-city-hint]");
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const lowPower = coarse || Math.min(window.innerWidth, window.innerHeight) < 820;
  root.classList.toggle("is-touch", coarse);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPower ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = !lowPower;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute("aria-label", `3D city of ${profile.name}'s projects. Each building is one project.`);
  renderer.domElement.setAttribute("role", "img");
  container.append(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 1, 2400);
  const m = createMaterials();
  const { lots, size, span } = layoutCity(projects);

  const scenery = buildScenery(lots, size, span);
  scene.add(scenery.group, scenery.sky);

  const hemi = new THREE.HemisphereLight(0xbfddf5, 0xd8b98a, 1.1);
  const sun = new THREE.DirectionalLight(0xfff1d6, 2.2);
  sun.position.set(160, 230, 120);
  sun.castShadow = !lowPower;
  sun.shadow.mapSize.set(2048, 2048);
  const reach = span / 2 + 40;
  Object.assign(sun.shadow.camera, { left: -reach, right: reach, top: reach, bottom: -reach, near: 50, far: 600 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.6;
  scene.add(hemi, sun);

  const loader = new THREE.TextureLoader();
  const risers: Riser[] = [];
  const stations: Station[] = [];
  const colliders: Collider[] = [];
  const lotColors = new Map<Lot, string>();
  const signs: THREE.Sprite[] = [];
  let plaza: ReturnType<typeof buildPlaza> | null = null;
  const redLight = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff3b3b }));

  const plazaLot = lots.find((l) => l.kind === "plaza")!;
  const order = (lot: Lot) => Math.hypot(lot.x - plazaLot.x, lot.z - plazaLot.z);

  for (const lot of lots) {
    const delay = 0.15 + (order(lot) / span) * 1.6;

    if (lot.kind === "plaza") {
      plaza = buildPlaza(lot);
      scene.add(plaza.group);
      continue;
    }
    if (lot.kind === "park") continue;

    let building: THREE.Group;
    let color: number;
    let name: string;
    let sub: string;
    let screen: THREE.Texture;
    let labelY: number;
    let posterUrl = "";

    if (lot.kind === "project" && lot.project) {
      const project = lot.project;
      const accent = accentOf(project);
      color = ENGINE_HEX[accent];
      name = project.name;
      sub = project.engineLabel || "Details coming soon";
      building = buildBuilding(m, lot.style, accent, lot.height);
      labelY = lot.height + (lot.style === "tower" ? 16 : 7);
      screen = slateTexture(project.status === "in-development" ? "In development" : "Demo video coming soon");
      posterUrl = project.poster;
    } else if (lot.kind === "about") {
      color = ENGINE_HEX.about;
      name = "About me";
      sub = "My studio";
      building = buildAboutStudio(m);
      labelY = 23;
      screen = infoBoardTexture([
        { text: profile.name.toUpperCase(), size: 44, color: "#eef2f8", font: '"Russo One", sans-serif' },
        { text: profile.title, size: 34, color: "#ffd24a" },
        { text: `${profile.yearsExperience}+ years · ${projects.length} projects`, size: 34, color: "#c3cddc" },
        { text: "Unity (C#) · Unreal (C++, Blueprints)", size: 30, color: "#9aa8bd" },
      ]);
    } else {
      color = ENGINE_HEX.contact;
      name = "Contact";
      sub = "Radio tower";
      building = buildContactTower(m, redLight);
      labelY = 58;
      screen = infoBoardTexture([
        { text: "Let's build your next game", size: 36, color: "#eef2f8", font: '"Russo One", sans-serif' },
        { text: profile.github.replace(/^https?:\/\//, ""), size: 34, color: "#7ee08f" },
        { text: "Open the ring for GitHub and LinkedIn", size: 30, color: "#c3cddc" },
      ]);
    }

    building.position.set(lot.x, 0.4, lot.z - 2);
    building.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(child.geometry, 25), m.edge);
        edges.userData.blueprintEdge = true;
        edges.visible = false;
        child.add(edges);
      }
    });
    scene.add(building);

    const bannerParts = banner(m, screen, nameplateTexture(name, css(color)));
    bannerParts.group.position.set(lot.x, 0.4, lot.z + 13);
    scene.add(bannerParts.group);
    if (posterUrl) {
      loader.load(posterUrl, (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        bannerParts.screenMaterial.map?.dispose();
        bannerParts.screenMaterial.map = texture;
        bannerParts.screenMaterial.needsUpdate = true;
      });
    }

    const sign = label(name, sub, color, labelY);
    sign.position.x = lot.x;
    sign.position.z = lot.z - 2;
    scene.add(sign);
    signs.push(sign);

    const tag = plotTag(lot, color);
    scene.add(tag);

    const ringParts = ring(color);
    ringParts.group.position.set(lot.x, 0, lot.z + RING_OFFSET);
    scene.add(ringParts.group);

    risers.push({ group: building, extras: [bannerParts.group, sign, tag, ringParts.group], delay });
    stations.push({
      lot,
      kind: lot.kind,
      project: lot.project,
      color,
      ringAt: new THREE.Vector3(lot.x, 0, lot.z + RING_OFFSET),
      ringMaterial: ringParts.material,
      bannerAt: new THREE.Vector3(lot.x, 7, lot.z + 13),
      screen: bannerParts.screenMaterial,
    });

    const half = PLOT / 2 - 0.5;
    colliders.push({ minX: lot.x - half, maxX: lot.x + half, minZ: lot.z - half, maxZ: lot.z + half, top: lot.height + 0.4 });
    lotColors.set(lot, css(color));
  }

  // projects first, in grid order, then About and Contact
  stations.sort((a, b) => (a.kind === "project" ? 0 : 1) - (b.kind === "project" ? 0 : 1) || a.lot.index - b.lot.index);

  const blueprintEdges: THREE.Object3D[] = [];
  scene.traverse((o) => o.userData.blueprintEdge && blueprintEdges.push(o));

  // hover car
  const carParts = buildHoverCar();
  scene.add(carParts.car);
  const vehicle = new Vehicle(carParts, colliders, span / 2 + 6, options.reducedMotion);
  vehicle.place(plazaLot.x, plazaLot.z + 4, 0);

  // looks
  let look: Look = "day";
  const lookButtons = root.querySelectorAll<HTMLButtonElement>("[data-look]");
  function setLook(next: Look) {
    look = next;
    const night = next === "night";
    const bp = next === "blueprint";
    lookButtons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.look === next)));
    applyMaterialLook(m, next);
    scenery.applyLook(next);
    plaza?.applyLook(next);
    for (const edge of blueprintEdges) edge.visible = bp;
    redLight.visible = night;
    carParts.light.intensity = night ? 3 : 0;
    scene.background = bp ? new THREE.Color(0x0b2447) : null;
    scene.fog = bp ? null : night ? new THREE.FogExp2(0x070a12, 0.0026) : new THREE.Fog(0xeaf2f4, 320, 900);
    hemi.color.set(bp ? 0xffffff : night ? 0x2a3a66 : 0xbfddf5);
    hemi.groundColor.set(bp ? 0xffffff : night ? 0x0a0c12 : 0xd8b98a);
    hemi.intensity = bp ? 1.6 : night ? 0.45 : 1.1;
    sun.color.set(night ? 0x9fb4ff : 0xfff1d6);
    sun.intensity = bp ? 0 : night ? 0.35 : 2.2;
    renderer.toneMappingExposure = night ? 1.05 : 1;
  }
  lookButtons.forEach((button) => button.addEventListener("click", () => setLook(button.dataset.look as Look)));
  setLook("day");

  // camera and views
  const lookTarget = new THREE.Vector3(0, 4, 0);
  const finalPosition = new THREE.Vector3(0, span * 0.62, span * 0.98);
  const introPosition = new THREE.Vector3(span * 0.25, span * 1.25, span * 1.7);
  camera.position.copy(options.reducedMotion ? finalPosition : introPosition);
  camera.lookAt(lookTarget);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 45;
  controls.maxDistance = 360;
  controls.minPolarAngle = 0.15;
  controls.maxPolarAngle = 1.32;
  controls.autoRotateSpeed = 0.45;
  controls.enabled = false;

  let lastInput = performance.now();
  controls.addEventListener("start", () => {
    lastInput = performance.now();
    controls.autoRotate = false;
  });
  controls.addEventListener("change", () => {
    const limit = span / 2;
    controls.target.x = THREE.MathUtils.clamp(controls.target.x, -limit, limit);
    controls.target.z = THREE.MathUtils.clamp(controls.target.z, -limit, limit);
    controls.target.y = THREE.MathUtils.clamp(controls.target.y, 0, 30);
  });

  let view: View = "drive";
  const viewButtons = root.querySelectorAll<HTMLButtonElement>("[data-view]");
  const HINTS: Record<View, string> = {
    drive: coarse ? "Use the arrows to drive · tap the prompt to open" : "W A S D to drive · Shift boost · E open · V view · B look",
    spectate: "Drag to orbit · scroll or pinch to zoom",
  };

  function setView(next: View) {
    view = next;
    root.dataset.view = next;
    viewButtons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === next)));
    if (hint) hint.textContent = HINTS[next];
    const introDone = introTime >= INTRO;
    controls.enabled = next === "spectate" && introDone;
    if (next === "spectate") {
      controls.target.set(vehicle.position.x, 4, vehicle.position.z);
      if (introDone) camera.position.set(vehicle.position.x + 40, 95, vehicle.position.z + 120);
      controls.update();
      lastInput = performance.now();
    } else {
      controls.autoRotate = false;
      chaseLook.copy(lookTarget);
    }
    input.clear();
  }
  viewButtons.forEach((button) => button.addEventListener("click", () => setView(button.dataset.view as View)));

  // overlay: prompt, project card, minimap, touch pads
  let current: Station | null = null;
  let nearest: Station | null = null;
  const overlay = createOverlay(root, {
    onPrev: () => step(-1),
    onNext: () => step(1),
    onClose: closeCard,
    onOpenNearby: () => nearest && openStation(nearest),
  });

  function openStation(station: Station) {
    current = station;
    const color = css(station.color);
    if (station.kind === "project" && station.project) {
      overlay.showProject(station.project, color);
      history.replaceState(null, "", `#${station.project.id}`);
    } else if (station.kind === "about") overlay.showAbout(profile, projects.length);
    else overlay.showContact(profile);
    overlay.showPrompt(null);
  }

  function closeCard() {
    if (!overlay.hideCard()) return false;
    current = null;
    history.replaceState(null, "", "#city");
    root.querySelector<HTMLButtonElement>(`[data-view="${view}"]`)?.focus();
    return true;
  }

  function parkAt(station: Station) {
    vehicle.place(station.ringAt.x, station.ringAt.z, 0);
    camera.position.set(station.ringAt.x, 9, station.ringAt.z + 10);
    if (view === "spectate") {
      controls.target.copy(station.bannerAt);
      controls.update();
    }
  }

  function step(direction: number) {
    const index = current ? stations.indexOf(current) : -1;
    const next = stations[(index + direction + stations.length) % stations.length];
    parkAt(next);
    openStation(next);
  }

  const input = createInput(
    (action) => {
      if (introTime < INTRO) return;
      if (action === "open" && nearest && !overlay.isOpen) openStation(nearest);
      if (action === "nextView") setView(view === "drive" ? "spectate" : "drive");
      if (action === "toggleLook") setLook(LOOKS[(LOOKS.indexOf(look) + 1) % LOOKS.length]);
    },
    () => running && !root.hidden,
  );
  input.onDriveKey = () => {
    if (view === "drive" && overlay.isOpen) closeCard();
  };

  for (const [key, pad] of Object.entries(overlay.pads)) {
    const set = (on: boolean) => {
      input.touch[key as keyof typeof input.touch] = on;
      pad.classList.toggle("is-down", on);
      if (on && overlay.isOpen) closeCard();
    };
    pad.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      pad.setPointerCapture(e.pointerId);
      set(true);
    });
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) pad.addEventListener(type, () => set(false));
  }

  // banner videos only play near the camera
  function updateBannerVideos() {
    const ranked = stations
      .filter((s) => s.project?.preview)
      .map((s) => ({ s, d: camera.position.distanceTo(s.bannerAt) }))
      .sort((a, b) => a.d - b.d);
    ranked.forEach(({ s, d }, i) => {
      const play = !options.reducedMotion && d < VIDEO_RANGE && i < MAX_PLAYING;
      if (play && !s.video) {
        const video = document.createElement("video");
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.crossOrigin = "anonymous";
        video.src = s.project!.preview;
        s.video = video;
        s.videoTexture = new THREE.VideoTexture(video);
        s.videoTexture.colorSpace = THREE.SRGBColorSpace;
      }
      if (!s.video) return;
      if (play && s.video.paused) {
        s.video.play().then(() => {
          s.screen.map = s.videoTexture!;
          s.screen.needsUpdate = true;
        }, () => {});
      } else if (!play && !s.video.paused) s.video.pause();
    });
  }

  function resize() {
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    camera.aspect = width / height;
    // keep at least ~72 degrees of horizontal view, so portrait phones still see enough
    const needed = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(36)) / camera.aspect));
    camera.fov = Math.min(100, Math.max(50, needed));
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();

  // intro: the city rises out of the ground
  const INTRO = 2.6;
  let introTime = options.reducedMotion ? INTRO : 0;
  for (const riser of risers) {
    riser.group.scale.y = options.reducedMotion ? 1 : 0.001;
    for (const extra of riser.extras) extra.visible = options.reducedMotion;
  }
  carParts.car.visible = options.reducedMotion;

  // chase camera that never ends up inside a building
  const chaseLook = new THREE.Vector3().copy(lookTarget);
  const desired = new THREE.Vector3();
  const desiredLook = new THREE.Vector3();
  const forward = new THREE.Vector3();
  const probe = new THREE.Vector3();

  function blocked(point: THREE.Vector3) {
    return colliders.some((c) => point.x > c.minX && point.x < c.maxX && point.z > c.minZ && point.z < c.maxZ && point.y < c.top + 1.5);
  }

  function chase(dt: number) {
    vehicle.forward(forward);
    const parked = nearest && Math.abs(vehicle.speed) < 1.5;
    if (parked && nearest) {
      desired.set(nearest.bannerAt.x, 10, nearest.bannerAt.z + 19);
      desiredLook.copy(nearest.bannerAt);
    } else {
      const back = 19 + Math.max(0, vehicle.speed) * 0.12;
      desired.copy(vehicle.position).addScaledVector(forward, -back);
      desired.y = 11;
      desiredLook.copy(vehicle.position).addScaledVector(forward, 12);
      desiredLook.y = 5;
      for (let i = 1; i <= 8; i++) {
        probe.lerpVectors(vehicle.position, desired, i / 8);
        if (blocked(probe)) {
          desired.lerpVectors(vehicle.position, desired, (i - 1) / 8);
          desired.y += 8;
          break;
        }
      }
    }
    const k = 1 - Math.exp(-5 * dt);
    camera.position.lerp(desired, k);
    chaseLook.lerp(desiredLook, k);
    camera.lookAt(chaseLook);
  }

  const clock = new THREE.Clock();
  let running = false;
  let videoTimer = 0;
  let elapsed = 0;

  function tick() {
    const dt = Math.min(clock.getDelta(), 0.1);
    elapsed += dt;

    if (introTime < INTRO) {
      introTime += dt;
      for (const riser of risers) {
        const p = clamp01((introTime - riser.delay) / 0.9);
        riser.group.scale.y = Math.max(0.001, easeOutCubic(p));
        if (p >= 0.95) for (const extra of riser.extras) extra.visible = true;
      }
      camera.position.lerpVectors(introPosition, finalPosition, easeInOut(clamp01(introTime / INTRO)));
      camera.lookAt(lookTarget);
      if (introTime >= INTRO) {
        for (const riser of risers) {
          riser.group.scale.y = 1;
          for (const extra of riser.extras) extra.visible = true;
        }
        carParts.car.visible = true;
        setView(view);
      }
    } else {
      const driving = view === "drive" && !(overlay.isOpen && coarse);
      vehicle.update(dt, driving ? input.read() : { throttle: 0, steer: 0, boost: false });

      nearest = null;
      let best = RING_REACH;
      for (const s of stations) {
        const d = Math.hypot(vehicle.position.x - s.ringAt.x, vehicle.position.z - s.ringAt.z);
        if (d < best) {
          best = d;
          nearest = s;
        }
      }
      if (!overlay.isOpen) {
        const title = nearest ? (nearest.kind === "project" ? nearest.project!.name : nearest.kind === "about" ? "About me" : "Contact") : null;
        overlay.showPrompt(view === "drive" && title ? `Open ${title}` : null);
      }

      if (view === "drive") chase(dt);
      else {
        controls.autoRotate = !options.reducedMotion && performance.now() - lastInput > 4000;
        controls.update(dt);
      }
      if (view === "drive") drawMinimap(overlay.minimap, lots, span, lotColors, { x: vehicle.position.x, z: vehicle.position.z, heading: vehicle.heading }, nearest?.lot ?? null);
    }

    const pulse = options.reducedMotion ? 0.8 : 0.6 + Math.sin(elapsed * 3) * 0.25;
    for (const s of stations) s.ringMaterial.opacity = s === nearest ? 1 : pulse;

    videoTimer -= dt;
    if (videoTimer <= 0) {
      videoTimer = 0.4;
      updateBannerVideos();
    }

    // labels keep a readable on-screen size: small up close, capped when far away
    for (const sign of signs) {
      const width = THREE.MathUtils.clamp(camera.position.distanceTo(sign.position) * 0.085, 7, 26);
      sign.scale.set(width, width * 0.234, 1);
    }

    scenery.sky.position.copy(camera.position);
    if (!options.reducedMotion) {
      scenery.clouds.rotation.y += dt * 0.004;
      if (plaza) plaza.ring.rotation.z += dt * 0.3;
    }
    if (look === "night") redLight.visible = Math.sin(performance.now() / 400) > -0.2;

    renderer.render(scene, camera);
  }

  function start() {
    if (running) return;
    running = true;
    clock.getDelta();
    renderer.setAnimationLoop(tick);
  }

  function stop() {
    running = false;
    input.clear();
    if (overlay.hideCard()) current = null;
    renderer.setAnimationLoop(null);
    for (const s of stations) s.video?.pause();
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) renderer.setAnimationLoop(null);
    else if (running) {
      clock.getDelta();
      renderer.setAnimationLoop(tick);
    }
  });

  setView("drive");

  return {
    start,
    stop,
    handleEscape: closeCard,
    focusProject(id: string) {
      const station = stations.find((s) => s.project?.id === id);
      if (!station) return false;
      introTime = INTRO;
      for (const riser of risers) {
        riser.group.scale.y = 1;
        for (const extra of riser.extras) extra.visible = true;
      }
      carParts.car.visible = true;
      setView("drive");
      parkAt(station);
      openStation(station);
      return true;
    },
  };
}
